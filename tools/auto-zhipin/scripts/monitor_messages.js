#!/usr/bin/env node

const { loadConfig } = require('../lib/config');
const { launchContext, getPrimaryPage } = require('../lib/browser');
const { ZhipinStore } = require('../lib/store');
const { buildDraftReply, shouldCreateDraft } = require('../lib/reply');
const { buildActionsForIntent, processPendingActions } = require('../lib/action_runner');
const { enforceRuntimeGuard, formatGuardError } = require('../lib/runtime_guard');
const {
  gotoAndWait,
  waitForChatReady,
  collectChatSnapshot,
  makeMessageId,
  sendActiveReply,
  openConversation,
} = require('../lib/zhipin');
const { nowIso, normalizeWhitespace, parseArgs, sleep } = require('../lib/utils');

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

function queueIncomingMessage({ store, message, conversation, config }) {
  const job = matchConversationJob(store, conversation);
  const draft = buildDraftReply(message, config, { conversation, job });
  const actions = buildActionsForIntent({
    intent: draft.intent,
    message,
    conversation,
    job,
    config,
    existingActions: Object.values(store.ledger.actions || {}),
  });

  if (shouldCreateDraft(draft.intent, config) && draft.text) {
    store.upsertDraft({
      conversationId: conversation?.id || message.conversationId,
      messageId: message.id,
      generatedAt: nowIso(),
      intent: draft.intent,
      text: draft.text,
      status: 'pending',
      conversationTitle: conversation?.title || 'active-thread',
    });
  }

  for (const action of actions) {
    store.upsertAction(action);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { config } = loadConfig(args.config);
  const store = new ZhipinStore();
  const activeRestriction = store.getActiveRestriction();
  if (activeRestriction) {
    throw new Error(formatGuardError({
      status: 'restricted',
      reason: activeRestriction.reason,
      recoveryAt: activeRestriction.recoveryAt || null,
    }));
  }
  const runId = store.startRun('monitor_messages', {
    once: Boolean(args.once),
        sendDrafts: Boolean(args['send-drafts']),
        runActions: Boolean(args['run-actions']),
  });
  store.save();

  const context = await launchContext(config, {
    headed: Boolean(args.headed || !config.browser.headless),
    channel: args.channel || config.browser.channel,
  });

  try {
    const page = await getPrimaryPage(context);
    await gotoAndWait(page, config.chat.url);
    const guard = await enforceRuntimeGuard({ page, store, mode: 'chat' });
    store.save();
    if (guard.blocked) {
      throw new Error(formatGuardError(guard));
    }
    if (guard.probeOnly) {
      console.log('[monitor] restriction cooldown elapsed; health probe passed. Rerun to resume automation.');
      store.finishRun(runId, 'ok', {
        probeOnly: true,
        summary: store.summary(),
      });
      store.save();
      return;
    }

    await waitForChatReady(page, Number(args['timeout-ms'] || 30000));

    const maxLoops = args.once ? 1 : Number(config.chat.maxLoops || 0);
    let loop = 0;
    let totalNewMessages = 0;

    while (maxLoops === 0 || loop < maxLoops) {
      loop += 1;
      const loopGuard = await enforceRuntimeGuard({ page, store, mode: 'chat' });
      store.save();
      if (loopGuard.blocked) {
        throw new Error(formatGuardError(loopGuard));
      }
      const snapshot = await collectChatSnapshot(page, Number(config.chat.conversationScanLimit || 8));
      let newMessagesThisLoop = 0;

      for (const conversation of snapshot.conversations) {
        const existingConversation = store.ledger.conversations[conversation.id];
        store.upsertConversation(conversation);
        const previewChanged = normalizeWhitespace(conversation.preview)
          && normalizeWhitespace(existingConversation?.preview) !== normalizeWhitespace(conversation.preview);
        if (conversation.unreadCount > 0 && previewChanged) {
          const previewMessage = {
            id: makeMessageId({
              conversationId: conversation.id,
              text: conversation.preview,
              timeText: conversation.timeText,
              direction: 'incoming',
            }),
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
            queueIncomingMessage({
              store,
              message: previewMessage,
              conversation,
              config,
            });
          }
        }
      }

      const activeConversationId = snapshot.activeConversation
        ? store.upsertConversation(snapshot.activeConversation)
        : 'active-thread';

      for (const rawMessage of snapshot.messages) {
        const message = {
          ...rawMessage,
          id: makeMessageId(rawMessage),
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

        queueIncomingMessage({
          store,
          message,
          conversation: snapshot.activeConversation || { id: activeConversationId, title: 'active-thread' },
          config,
        });

        if (args['send-drafts'] && config.chat.autoReplyEnabled && config.chat.autoReplySend && snapshot.activeConversation) {
          const pendingDraft = store.getPendingDrafts()
            .find((draft) => draft.messageId === message.id && draft.conversationId === activeConversationId && !draft.sentAt);
          if (!pendingDraft) {
            continue;
          }
          await openConversation(page, snapshot.activeConversation);
          const result = await sendActiveReply(page, pendingDraft.text);
          if (result.ok) {
            store.markDraftSent(pendingDraft.id, result);
          }
        }
      }

      if (args['run-actions'] || config.chat.autoSendResumeButton || config.chat.autoRejectionFollowup) {
        await processPendingActions({
          page,
          store,
          config,
          conversations: snapshot.conversations,
        });
      }

      store.save();
      console.log(`[monitor] loop=${loop} conversations=${snapshot.conversations.length} new_messages=${newMessagesThisLoop}`);

      if (args.once) {
        break;
      }

      await sleep(Number(config.chat.pollIntervalMs || 15000));
    }

    store.finishRun(runId, 'ok', {
      totalNewMessages,
      summary: store.summary(),
    });
    store.save();
  } catch (error) {
    store.finishRun(runId, 'failed', { error: error.message });
    store.save();
    throw error;
  } finally {
    await context.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
