#!/usr/bin/env node

const { classifySiteHealth } = require('../lib/site_health');
const { loadConfig } = require('../lib/config');
const { launchContext, getPrimaryPage } = require('../lib/browser');
const { ZhipinStore } = require('../lib/store');
const { processPendingActions } = require('../lib/action_runner');
const {
  captureWithPinchTab,
  createPinchTabActionExecutor,
  pinchTabHealth,
} = require('../lib/pinchtab');
const { enforceRuntimeGuard, formatGuardError } = require('../lib/runtime_guard');
const { gotoAndWait, waitForChatReady, extractConversations, openConversation, sendActiveReply } = require('../lib/zhipin');
const { parseArgs } = require('../lib/utils');

function findConversation(conversations, target = {}) {
  const targetTitle = String(target.conversationTitle || '');
  return (conversations || []).find((conversation) => {
    const title = String(conversation.title || '');
    return conversation.id === target.conversationId
      || (targetTitle && title && (title === targetTitle || title.includes(targetTitle) || targetTitle.includes(title)));
  }) || null;
}

function formatPinchTabGuardError(siteHealth) {
  if (siteHealth.status === 'restricted' && siteHealth.recoveryAt) {
    return `site restricted: ${siteHealth.reason}; retry after ${siteHealth.recoveryAt}`;
  }
  return `site blocked: ${siteHealth.reason}`;
}

async function runPinchTabWorker({ config, store, args, pendingDrafts, pendingActions }) {
  const previousSiteHealth = store.getSiteHealth();
  await pinchTabHealth(config);
  const capture = await captureWithPinchTab(config, {
    url: config.chat.url,
    mode: 'chat',
  });
  const siteHealth = classifySiteHealth({
    url: capture.url,
    title: capture.title,
    bodyText: capture.readableText,
    looksReady: capture.looksReady,
  });

  store.setSiteHealth({
    ...siteHealth,
    sourceUrl: capture.url,
    title: capture.title,
    backend: 'pinchtab',
  });
  store.save();

  if (siteHealth.status === 'auth_gate' || siteHealth.status === 'restricted') {
    throw new Error(formatPinchTabGuardError(siteHealth));
  }

  const recoveredFromRestriction = Boolean(
    previousSiteHealth
    && previousSiteHealth.status === 'restricted'
    && previousSiteHealth.recoveryAt
    && Date.now() >= Date.parse(previousSiteHealth.recoveryAt)
    && siteHealth.status === 'healthy'
  );
  if (recoveredFromRestriction) {
    console.log('[reply] restriction cooldown elapsed; pinchtab health probe passed. Rerun to resume automation.');
    return;
  }

  const executor = createPinchTabActionExecutor(config, {
    tabId: capture.tabId,
    url: capture.url,
  });
  const conversations = await executor.listConversations();

  if (args['send-all']) {
    for (const draft of pendingDrafts) {
      const conversation = findConversation(conversations, draft);
      if (!conversation) {
        console.warn(`Unable to locate conversation for draft ${draft.id}`);
        continue;
      }

      await executor.openConversation(conversation);
      const result = await executor.sendReply(draft.text);
      if (!result.ok) {
        console.warn(`Draft ${draft.id} was not sent: ${result.reason}`);
        continue;
      }
      store.markDraftSent(draft.id, result);
      store.save();
      console.log(`Draft ${draft.id} sent via ${result.via}`);
    }
  }

  if (args['run-actions']) {
    const summary = await processPendingActions({
      store,
      config,
      conversations,
      executor,
    });
    store.save();
    console.log(JSON.stringify(summary, null, 2));
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
  const pendingDrafts = store.getPendingDrafts();
  const pendingActions = store.getPendingActions();

  if (!pendingDrafts.length && !pendingActions.length) {
    console.log('No pending drafts or actions.');
    return;
  }

  if (!args['send-all'] && !args['run-actions']) {
    console.log(JSON.stringify({ pendingDrafts, pendingActions }, null, 2));
    return;
  }

  const backend = String(args.backend || 'playwright').toLowerCase();
  if (backend === 'pinchtab') {
    await runPinchTabWorker({
      config,
      store,
      args,
      pendingDrafts,
      pendingActions,
    });
    return;
  }

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
      console.log('[reply] restriction cooldown elapsed; health probe passed. Rerun to resume automation.');
      return;
    }
    await waitForChatReady(page, Number(args['timeout-ms'] || 30000));
    const conversations = await extractConversations(page);

    if (args['send-all']) {
      for (const draft of pendingDrafts) {
        const conversation = conversations.find((item) => item.id === draft.conversationId || item.title === draft.conversationTitle);
        if (!conversation) {
          console.warn(`Unable to locate conversation for draft ${draft.id}`);
          continue;
        }

        await openConversation(page, conversation);
        const result = await sendActiveReply(page, draft.text);
        if (!result.ok) {
          console.warn(`Draft ${draft.id} was not sent: ${result.reason}`);
          continue;
        }
        store.markDraftSent(draft.id, result);
        store.save();
        console.log(`Draft ${draft.id} sent via ${result.via}`);
      }
    }

    if (args['run-actions']) {
      const summary = await processPendingActions({
        page,
        store,
        config,
        conversations,
      });
      store.save();
      console.log(JSON.stringify(summary, null, 2));
    }
  } finally {
    await context.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
