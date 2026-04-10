#!/usr/bin/env node

const { loadConfig } = require('../lib/config');
const {
  createCurrentTabAdapter,
  evalCurrentTab,
  evalCurrentTabMainWorld,
  getCurrentTabState,
  navigateCurrentTab,
} = require('../lib/chrome_current');
const { requireBossCoreModule } = require('../lib/opencli_core');
const { ZhipinStore } = require('../lib/store');
const { generateReplyPlan } = require('../lib/reply_llm');
const { buildActionsForIntent, processPendingActions } = require('../lib/action_runner');
const { collectActiveHistoryPayload } = require('../lib/chat_history');
const { classifySiteHealth } = require('../lib/site_health');
const { nowIso, normalizeWhitespace, parseArgs, sleep } = require('../lib/utils');
const { CHAT_READY_SELECTORS, classifyChatPageState } = requireBossCoreModule('chat-core');
const chatBrowserCore = requireBossCoreModule('chat-browser');

function chatLooksReady() {
  return String(evalCurrentTab(`(() => {
    const selectors = ${JSON.stringify(CHAT_READY_SELECTORS)};
    return selectors.some((selector) => document.querySelector(selector)) ? 'true' : 'false';
  })()`) || '').trim() === 'true';
}
const currentTabAdapter = createCurrentTabAdapter();

async function collectChatSnapshot(scanLimit) {
  return chatBrowserCore.collectChatSnapshot(currentTabAdapter, scanLimit);
}

function waitForChatReady(timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const state = getCurrentTabState(2400);
    const chatState = classifyChatPageState({
      url: state.url,
      bodyText: state.bodyText,
      looksReady: chatLooksReady(),
    });
    if (chatState.kind === 'auth_gate' || chatState.kind === 'restricted') {
      const recoveryText = chatState.recoveryAt ? ` until ${chatState.recoveryAt}` : '';
      throw new Error(`chrome monitor blocked: ${chatState.reason}${recoveryText}`);
    }
    if (chatState.kind === 'chat_ready') {
      return state;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }
  throw new Error(`chrome monitor chat not ready within ${timeoutMs}ms`);
}

function createChromeCurrentActionExecutor() {
  return {
    async listConversations() {
      return chatBrowserCore.extractConversations(currentTabAdapter, 20);
    },
    async openConversation(conversation) {
      return chatBrowserCore.openConversation(currentTabAdapter, conversation);
    },
    async containsText(text) {
      return chatBrowserCore.activeConversationContainsText(currentTabAdapter, text);
    },
    async sendReply(text) {
      return chatBrowserCore.sendActiveReply(currentTabAdapter, text);
    },
    async sendResume() {
      return chatBrowserCore.sendResumeFromActiveConversation(currentTabAdapter);
    },
  };
}

function matchConversationJob(store, conversation) {
  const haystack = normalizeWhitespace(`${conversation?.title || ''} ${conversation?.preview || ''}`).toLowerCase();
  if (!haystack) {
    return null;
  }

  const applications = store.ledger.applications || {};
  const jobs = Object.values(store.ledger.jobs || {});
  let best = null;

  for (const job of jobs) {
    let score = applications[job.id]?.status === 'applied' ? 1 : 0;
    if (job.company && haystack.includes(String(job.company).toLowerCase())) {
      score += 2;
    }
    if (job.title && haystack.includes(String(job.title).toLowerCase())) {
      score += 2;
    }
    if (score && (!best || score > best.score)) {
      best = { score, job };
    }
  }

  return best?.job || null;
}

async function queueIncomingMessage({ store, message, conversation, config }) {
  const job = matchConversationJob(store, conversation);
  const draft = await generateReplyPlan({ message, conversation, job, config });
  const actions = buildActionsForIntent({
    intent: draft.intent,
    message,
    conversation,
    job,
    config,
    existingActions: Object.values(store.ledger.actions || {}),
    replyText: draft.replyText,
    replySource: draft.source,
  });

  if (config.chat?.draftReplyMode === 'llm' && draft.shouldCreateDraft && draft.replyText) {
    store.upsertDraft({
      conversationId: conversation?.id || message.conversationId,
      messageId: message.id,
      generatedAt: nowIso(),
      intent: draft.intent,
      text: draft.replyText,
      source: draft.source,
      sourceModel: draft.model || null,
      status: 'pending',
      conversationTitle: conversation?.title || 'active-thread',
    });
  }

  for (const action of actions) {
    store.upsertAction(action);
  }
}

function enrichActiveConversationWithHistory(conversation, config) {
  try {
    const history = collectActiveHistoryPayload({
      evalInMainWorld: evalCurrentTabMainWorld,
      timeoutMs: Number(config.chat?.replyTimeoutMs || 15000),
      limit: Number(config.chat?.replyHistoryLimit || 12),
    });
    if (!history.ok || !(history.contextLines || []).length) {
      return conversation;
    }
    return {
      ...conversation,
      historyContext: history.contextLines,
      historySecretId: history.secretId || null,
      historyLastId: history.lastId ?? null,
      historyHasMore: history.hasMore,
      historyResourceUrl: history.resourceUrl || null,
    };
  } catch (_error) {
    return conversation;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { config } = loadConfig(args.config);
  const store = new ZhipinStore();
  const activeRestriction = store.getActiveRestriction();
  if (activeRestriction) {
    throw new Error(`site restricted: ${activeRestriction.reason}; retry after ${activeRestriction.recoveryAt || 'unknown'}`);
  }

  const runId = store.startRun('chrome_monitor_queue', {
    once: Boolean(args.once),
    sendDrafts: Boolean(args['send-drafts']),
    runActions: Boolean(args['run-actions']),
  });
  store.save({ operation: 'chrome_monitor_queue', phase: 'start', runId });

  try {
    navigateCurrentTab(config.chat.url, Number(args['wait-ms'] || 3000));
    waitForChatReady(Number(args['timeout-ms'] || 30000));

    const maxLoops = args.once ? 1 : Number(config.chat.maxLoops || 0);
    const executor = createChromeCurrentActionExecutor();
    let loop = 0;
    let totalNewMessages = 0;

    while (maxLoops === 0 || loop < maxLoops) {
      loop += 1;
      const snapshot = await collectChatSnapshot(Number(config.chat.conversationScanLimit || 8));
      const siteHealth = classifySiteHealth({
        url: snapshot.url,
        title: snapshot.title,
        bodyText: snapshot.bodyText,
        looksReady: snapshot.looksReady,
      });

      store.setSiteHealth({
        ...siteHealth,
        sourceUrl: snapshot.url,
        title: snapshot.title,
        backend: 'chrome_current',
      });
      if (siteHealth.status === 'auth_gate' || siteHealth.status === 'restricted') {
        store.save({ operation: 'chrome_monitor_queue', phase: 'blocked', runId, loop });
        throw new Error(`chrome monitor blocked: ${siteHealth.reason}${siteHealth.recoveryAt ? ` until ${siteHealth.recoveryAt}` : ''}`);
      }

      let newMessagesThisLoop = 0;
      for (const conversation of snapshot.conversations || []) {
        const existingConversation = store.ledger.conversations[conversation.id];
        store.upsertConversation(conversation);
        const previewChanged = normalizeWhitespace(conversation.preview)
          && normalizeWhitespace(existingConversation?.preview) !== normalizeWhitespace(conversation.preview);
        if (conversation.unreadCount > 0 && previewChanged) {
          const previewMessage = {
            id: `${conversation.id}:preview:${conversation.timeText || 'now'}:${conversation.preview}`,
            conversationId: conversation.id,
            text: conversation.preview,
            timeText: conversation.timeText,
            direction: 'incoming',
            seenAt: nowIso(),
            source: 'conversation_preview',
          };
          const { isNew } = store.upsertMessage(previewMessage);
          if (isNew) {
            newMessagesThisLoop += 1;
            totalNewMessages += 1;
            await queueIncomingMessage({
              store,
              message: previewMessage,
              conversation,
              config,
            });
          }
        }
      }

      let activeConversation = snapshot.activeConversation || null;
      const activeConversationId = activeConversation
        ? store.upsertConversation(activeConversation)
        : 'active-thread';

      for (const rawMessage of snapshot.messages || []) {
        const message = {
          ...rawMessage,
          conversationId: activeConversationId,
          seenAt: nowIso(),
        };
        const { isNew } = store.upsertMessage(message);
        if (!isNew) {
          continue;
        }

        newMessagesThisLoop += 1;
        totalNewMessages += 1;

        if (message.direction !== 'incoming') {
          continue;
        }

        if (activeConversation && !Array.isArray(activeConversation.historyContext)) {
          activeConversation = enrichActiveConversationWithHistory(activeConversation, config);
          store.upsertConversation(activeConversation);
        }

        await queueIncomingMessage({
          store,
          message,
          conversation: activeConversation || { id: activeConversationId, title: 'active-thread' },
          config,
        });

        if (args['send-drafts'] && config.chat.autoReplyEnabled && config.chat.autoReplySend && activeConversation) {
          const pendingDraft = store.getPendingDrafts()
            .find((draft) => draft.messageId === message.id && draft.conversationId === activeConversationId && !draft.sentAt);
          if (!pendingDraft) {
            continue;
          }
          await executor.openConversation(activeConversation);
          const result = await executor.sendReply(pendingDraft.text);
          if (result.ok) {
            store.markDraftSent(pendingDraft.id, result);
          }
        }
      }

      if (args['run-actions'] || config.chat.autoSendResumeButton || config.chat.autoRejectionFollowup) {
        await processPendingActions({
          store,
          config,
          conversations: snapshot.conversations,
          executor,
        });
      }

      store.save({ operation: 'chrome_monitor_queue', phase: 'loop', runId, loop });
      console.log(`[chrome-monitor] loop=${loop} conversations=${snapshot.conversations?.length || 0} new_messages=${newMessagesThisLoop}`);

      if (args.once) {
        break;
      }

      await sleep(Number(config.chat.pollIntervalMs || 15000));
    }

    store.finishRun(runId, 'ok', {
      totalNewMessages,
      summary: store.summary(),
    });
    store.save({ operation: 'chrome_monitor_queue', phase: 'finish', runId, status: 'ok' });
  } catch (error) {
    store.finishRun(runId, 'failed', { error: error.message });
    store.save({ operation: 'chrome_monitor_queue', phase: 'finish', runId, status: 'failed' });
    throw error;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
