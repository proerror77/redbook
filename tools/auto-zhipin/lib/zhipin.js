const { normalizeWhitespace, sleep, stableHash } = require('./utils');
const { classifySiteHealth } = require('./site_health');
const { requireBossCoreModule } = require('./opencli_core');
const {
  APPLY_BUTTON_TEXTS,
  CHAT_READY_SELECTORS,
  RESUME_BUTTON_TEXTS,
  classifyChatPageState,
  detectResumeFlowState,
  isTransientNavigationError,
  messageListContainsText,
  pickResumeButtonLabel,
} = requireBossCoreModule('chat-core');
const chatBrowserCore = requireBossCoreModule('chat-browser');
const jobBrowserCore = requireBossCoreModule('job-browser');

const JOB_READY_SELECTORS = [
  'a[href*="/job_detail/"]',
  'a[href*="job_detail"]',
  '.job-card-wrapper',
  '.job-card-box',
  '[class*=job-card]',
  '[class*=search-job-result]',
  '[class*=job-list]',
];

async function gotoAndWait(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await sleep(1200);
}

async function inspectChatPage(page) {
  const url = page.url();
  const bodyText = normalizeWhitespace(await page.locator('body').innerText().catch(() => ''));
  const looksReady = await page.evaluate((selectors) => {
    return selectors.some((selector) => document.querySelector(selector));
  }, CHAT_READY_SELECTORS);
  return classifyChatPageState({ url, bodyText, looksReady });
}

async function inspectPageHealth(page, readySelectors = []) {
  const url = page.url();
  const title = await page.title().catch(() => '');
  const bodyText = normalizeWhitespace(await page.locator('body').innerText().catch(() => ''));
  const looksReady = readySelectors.length
    ? await page.evaluate((selectors) => selectors.some((selector) => document.querySelector(selector)), readySelectors)
    : false;
  return classifySiteHealth({ url, title, bodyText, looksReady });
}

async function detectBlocker(page, options = {}) {
  const state = options.mode === 'chat'
    ? await inspectChatPage(page)
    : await inspectPageHealth(page, options.readySelectors || []);
  const status = state.kind || state.status;
  return {
    blocked: status === 'auth_gate' || status === 'restricted',
    status,
    reason: state.reason,
    recoveryAt: state.recoveryAt || null,
  };
}

async function waitForChatReady(page, timeoutMs = 180000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    let state;
    try {
      state = await inspectChatPage(page);
    } catch (error) {
      if (isTransientNavigationError(error)) {
        await sleep(500);
        continue;
      }
      throw error;
    }
    if (state.kind === 'auth_gate' || state.kind === 'restricted') {
      const recoveryText = state.recoveryAt ? ` until ${state.recoveryAt}` : '';
      throw new Error(`chat blocked: ${state.reason}${recoveryText}`);
    }

    if (state.kind === 'chat_ready') {
      return true;
    }
    await sleep(1000);
  }
  throw new Error(`chat not ready within ${timeoutMs}ms`);
}

async function waitForBootstrapReady(page, timeoutMs = 600000, onStateChange = null) {
  const start = Date.now();
  let previousReason = null;
  while (Date.now() - start < timeoutMs) {
    let state;
    try {
      state = await inspectChatPage(page);
    } catch (error) {
      if (isTransientNavigationError(error)) {
        state = { kind: 'loading', reason: 'transient_navigation' };
      } else {
        throw error;
      }
    }
    const descriptor = `${state.kind}:${state.reason || ''}`;
    if (descriptor !== previousReason) {
      previousReason = descriptor;
      if (typeof onStateChange === 'function') {
        await onStateChange(state);
      }
    }

    if (state.kind === 'restricted') {
      const recoveryText = state.recoveryAt ? ` until ${state.recoveryAt}` : '';
      throw new Error(`bootstrap blocked: ${state.reason}${recoveryText}`);
    }

    if (state.kind === 'chat_ready') {
      return true;
    }
    await sleep(1000);
  }
  throw new Error(`bootstrap did not reach chat_ready within ${timeoutMs}ms`);
}

function createSharedBrowserAdapter(page) {
  return {
    evaluate(script) {
      return page.evaluate((source) => eval(source), script);
    },
    waitMs(ms) {
      return sleep(ms);
    },
  };
}

async function extractConversations(page) {
  return chatBrowserCore.extractConversations(createSharedBrowserAdapter(page), 20);
}

async function extractActiveConversation(page, fallbackConversation) {
  return chatBrowserCore.extractActiveConversation(
    createSharedBrowserAdapter(page),
    fallbackConversation || null,
    20
  );
}

async function openConversation(page, conversation) {
  const result = await chatBrowserCore.openConversation(
    createSharedBrowserAdapter(page),
    conversation
  );
  return Boolean(result?.ok);
}

async function extractMessages(page, conversationId) {
  return chatBrowserCore.extractMessages(
    createSharedBrowserAdapter(page),
    conversationId || 'active-thread',
    20
  );
}

async function collectChatSnapshot(page, scanLimit = 8) {
  const snapshot = await chatBrowserCore.collectChatSnapshot(
    createSharedBrowserAdapter(page),
    scanLimit
  );
  return {
    conversations: snapshot.conversations || [],
    activeConversation: snapshot.activeConversation || null,
    messages: snapshot.messages || [],
  };
}

async function sendActiveReply(page, text) {
  return chatBrowserCore.sendActiveReply(createSharedBrowserAdapter(page), text);
}

async function sendResumeFromActiveConversation(page, options = {}) {
  return chatBrowserCore.sendResumeFromActiveConversation(
    createSharedBrowserAdapter(page),
    options
  );
}

async function extractJobsFromPage(page) {
  return jobBrowserCore.extractJobsFromPage(createSharedBrowserAdapter(page));
}

async function applyToJob(page, job, options = {}) {
  await gotoAndWait(page, job.url);
  const blocker = await detectBlocker(page, { readySelectors: JOB_READY_SELECTORS });
  if (blocker.blocked) {
    return { ok: false, reason: blocker.reason, blocker };
  }

  return jobBrowserCore.applyOnActiveJobDetail(
    createSharedBrowserAdapter(page),
    {
      ...options,
      buttonTextCandidates: options.buttonTextCandidates || APPLY_BUTTON_TEXTS,
    }
  );
}

function makeMessageId(message) {
  return stableHash(`${message.conversationId}:${message.text}:${message.timeText}:${message.direction}`);
}

module.exports = {
  APPLY_BUTTON_TEXTS,
  JOB_READY_SELECTORS,
  RESUME_BUTTON_TEXTS,
  classifyChatPageState,
  gotoAndWait,
  inspectChatPage,
  inspectPageHealth,
  isTransientNavigationError,
  detectBlocker,
  waitForChatReady,
  waitForBootstrapReady,
  extractConversations,
  extractMessages,
  collectChatSnapshot,
  extractActiveConversation,
  messageListContainsText,
  openConversation,
  pickResumeButtonLabel,
  detectResumeFlowState,
  sendActiveReply,
  sendResumeFromActiveConversation,
  extractJobsFromPage,
  applyToJob,
  makeMessageId,
};
