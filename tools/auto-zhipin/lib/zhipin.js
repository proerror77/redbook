const { normalizeWhitespace, sleep, stableHash } = require('./utils');
const { classifySiteHealth } = require('./site_health');
const JOB_READY_SELECTORS = [
  'a[href*="/job_detail/"]',
  'a[href*="job_detail"]',
  '.job-card-wrapper',
  '.job-card-box',
  '[class*=job-card]',
  '[class*=search-job-result]',
  '[class*=job-list]',
];
const CONVERSATION_ITEM_SELECTORS = [
  '.user-list .list-item',
  '[class*=user-list] [class*=list-item]',
  '.chat-user',
  '[class*=chat-user]',
];
const MESSAGE_ITEM_SELECTORS = [
  '.chat-record [class*=message]',
  '.chat-record li',
  '[class*=chat-record] [class*=message]',
  '[class*=chat-message]',
];
const CHAT_READY_SELECTORS = [
  ...CONVERSATION_ITEM_SELECTORS,
  '.chat-controls',
  '[class*=chat-controls]',
  '.chat-input',
  '[class*=chat-input]',
  '.chat-record',
  '[class*=chat-record]',
];
const CHAT_INPUT_SELECTORS = [
  '.chat-input [contenteditable="true"]',
  '[class*=chat-input] [contenteditable="true"]',
  'textarea',
  '[contenteditable="true"]',
];
const SEND_BUTTON_TEXTS = ['发送', '立即沟通', '发送简历', '发出', '确认'];
const APPLY_BUTTON_TEXTS = ['立即沟通', '立即投递', '投递简历', '立即申请', '聊一聊'];
const RESUME_BUTTON_TEXTS = ['发送简历', '投递简历', '发简历', '发送附件', '发送在线简历'];
const RESUME_CONSENT_BUTTON_TEXTS = ['同意', '确认', '发送'];
const RESUME_SENT_TEXTS = ['附件简历已发送给对方', '已发送给Boss', '点击查看附件', '点击预览附件简历'];
const RESUME_CONSENT_HINT_TEXTS = ['我想要一份您的附件简历', '您是否同意'];
const RESUME_INLINE_ACTION_HINT_TEXTS = ['发简历', '换电话', '换微信'];

async function gotoAndWait(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await sleep(1200);
}

function classifyChatPageState({ url, bodyText, looksReady }) {
  const siteHealth = classifySiteHealth({
    url,
    bodyText,
    looksReady,
  });

  if (siteHealth.status === 'restricted') {
    return {
      kind: 'restricted',
      reason: siteHealth.reason,
      recoveryAt: siteHealth.recoveryAt,
    };
  }

  if (siteHealth.status === 'auth_gate') {
    return { kind: 'auth_gate', reason: siteHealth.reason };
  }

  if (looksReady) {
    return { kind: 'chat_ready', reason: null };
  }

  return { kind: 'loading', reason: null };
}

function isTransientNavigationError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('execution context was destroyed')
    || message.includes('cannot find context')
    || message.includes('target closed')
    || message.includes('navigation');
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

async function extractConversations(page) {
  return page.evaluate((selectors) => {
    function textOf(node) {
      return (node?.innerText || node?.textContent || '').replace(/\s+/g, ' ').trim();
    }

    for (const selector of selectors) {
      const nodes = Array.from(document.querySelectorAll(selector));
      if (!nodes.length) {
        continue;
      }

      return nodes.map((node, index) => {
        const text = textOf(node);
        const unreadMatch = text.match(/(\d+)/);
        const titleNode = node.querySelector('h2,h3,h4,strong,[class*=name],[class*=title]');
        const timeNode = node.querySelector('time,[class*=time]');
        const idCandidate = node.getAttribute('data-id')
          || node.getAttribute('data-key')
          || node.querySelector('a')?.getAttribute('href')
          || `${selector}:${index}:${text}`;
        return {
          id: idCandidate,
          title: textOf(titleNode) || text.split(' ')[0] || `conversation-${index}`,
          preview: text,
          unreadCount: unreadMatch ? Number(unreadMatch[1]) : 0,
          timeText: textOf(timeNode),
          domIndex: index,
          selector,
        };
      });
    }
    return [];
  }, CONVERSATION_ITEM_SELECTORS);
}

async function extractActiveConversation(page, fallbackConversation) {
  return page.evaluate((fallback) => {
    function textOf(node) {
      return (node?.innerText || node?.textContent || '').replace(/\s+/g, ' ').trim();
    }

    const activeNode = document.querySelector('.user-list .active, .user-list .selected, [class*=user-list] [class*=active], [class*=user-list] [class*=selected]');
    if (!activeNode) {
      return fallback || null;
    }

    const titleNode = activeNode.querySelector('h2,h3,h4,strong,[class*=name],[class*=title]');
    const timeNode = activeNode.querySelector('time,[class*=time]');
    return {
      id: activeNode.getAttribute('data-id')
        || activeNode.getAttribute('data-key')
        || activeNode.querySelector('a')?.getAttribute('href')
        || fallback?.id
        || textOf(activeNode),
      title: textOf(titleNode) || fallback?.title || textOf(activeNode),
      preview: textOf(activeNode),
      unreadCount: fallback?.unreadCount || 0,
      timeText: textOf(timeNode),
      selector: fallback?.selector || null,
      domIndex: fallback?.domIndex ?? 0,
    };
  }, fallbackConversation || null);
}

async function openConversation(page, conversation) {
  const selectors = [
    conversation.selector,
    ...CONVERSATION_ITEM_SELECTORS.filter((selector) => selector !== conversation.selector),
  ].filter(Boolean);

  for (const selector of selectors) {
    const locator = page.locator(selector).nth(conversation.domIndex);
    if ((await locator.count()) > 0) {
      await locator.click({ timeout: 5000 });
      await sleep(1000);
      return true;
    }
  }
  return false;
}

async function extractMessages(page, conversationId) {
  return page.evaluate(({ selectors, conversationId: convoId }) => {
    function normalize(value) {
      return (value || '').replace(/\s+/g, ' ').trim();
    }

    function directionFromNode(node) {
      const signature = `${node.className || ''} ${node.getAttribute?.('class') || ''}`.toLowerCase();
      if (/mine|self|right|geek|send|outgoing/.test(signature)) {
        return 'outgoing';
      }
      if (/left|boss|receive|incoming/.test(signature)) {
        return 'incoming';
      }
      return 'unknown';
    }

    for (const selector of selectors) {
      const nodes = Array.from(document.querySelectorAll(selector))
        .filter((node) => normalize(node.innerText || node.textContent));
      if (!nodes.length) {
        continue;
      }

      return nodes.map((node, index) => {
        const text = normalize(node.innerText || node.textContent);
        const timeNode = node.querySelector('time,[class*=time]');
        const id = node.getAttribute('data-mid')
          || node.getAttribute('data-id')
          || `${convoId}:${index}:${text}`;
        return {
          id,
          conversationId: convoId,
          text,
          timeText: normalize(timeNode?.innerText || timeNode?.textContent),
          direction: directionFromNode(node),
        };
      });
    }
    return [];
  }, { selectors: MESSAGE_ITEM_SELECTORS, conversationId });
}

function pickResumeButtonLabel(labels) {
  const normalizedLabels = (labels || []).map((label) => normalizeWhitespace(label));
  for (const candidate of RESUME_BUTTON_TEXTS) {
    const matched = normalizedLabels.find((label) => label.includes(candidate));
    if (matched) {
      return matched;
    }
  }
  return null;
}

function detectResumeFlowState(bodyText) {
  const normalized = normalizeWhitespace(bodyText);
  const alreadySent = RESUME_SENT_TEXTS.some((text) => normalized.includes(text));
  const needsConsent = RESUME_CONSENT_HINT_TEXTS.some((text) => normalized.includes(text));
  const hasInlineActions = RESUME_INLINE_ACTION_HINT_TEXTS.every((text) => normalized.includes(text));
  return {
    alreadySent,
    needsConsent,
    hasInlineActions,
  };
}

function messageListContainsText(messages, text) {
  const needle = normalizeWhitespace(text);
  if (!needle) {
    return false;
  }
  return (messages || []).some((message) => normalizeWhitespace(message.text).includes(needle));
}

async function collectChatSnapshot(page, scanLimit = 8) {
  const conversations = await extractConversations(page);
  const trimmed = conversations.slice(0, scanLimit);
  const activeConversation = await extractActiveConversation(page, trimmed[0] || null);
  const messages = await extractMessages(page, activeConversation?.id || 'active-thread');
  return {
    conversations: trimmed,
    activeConversation,
    messages,
  };
}

async function fillActiveChatInput(page, text) {
  for (const selector of CHAT_INPUT_SELECTORS) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) === 0) {
      continue;
    }

    const tagName = await locator.evaluate((node) => node.tagName.toLowerCase()).catch(() => null);
    if (tagName === 'textarea' || tagName === 'input') {
      await locator.fill(text);
    } else {
      await locator.click();
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
      await page.keyboard.type(text, { delay: 20 });
    }
    return true;
  }
  return false;
}

async function clickVisibleButtonByText(page, texts) {
  return page.evaluate((candidates) => {
    function normalize(value) {
      return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function isVisible(node) {
      if (!node) {
        return false;
      }
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
        return false;
      }
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }

    function isDisabled(node) {
      const signature = `${node.className || ''} ${node.getAttribute?.('class') || ''}`.toLowerCase();
      return node.disabled || /disabled|is-disabled/.test(signature);
    }

    const nodes = Array.from(document.querySelectorAll('button, [role="button"], a, span, div'));
    for (const text of candidates) {
      for (const node of nodes) {
        const label = normalize(node.innerText || node.textContent || node.getAttribute('aria-label') || '');
        if (!label || !label.includes(text)) {
          continue;
        }
        if (!isVisible(node) || isDisabled(node)) {
          continue;
        }
        node.click();
        return label;
      }
    }
    return null;
  }, texts);
}

async function clickButtonByText(page, texts) {
  for (const text of texts) {
    const byRole = page.getByRole('button', { name: new RegExp(text, 'i') }).first();
    if ((await byRole.count()) > 0) {
      await byRole.click();
      return text;
    }

    const locator = page.locator(`text=${text}`).first();
    if ((await locator.count()) > 0) {
      await locator.click();
      return text;
    }
  }
  return null;
}

async function readResumeFlowState(page) {
  const bodyText = normalizeWhitespace(await page.locator('body').innerText().catch(() => ''));
  return detectResumeFlowState(bodyText);
}

async function waitForResumeDelivery(page, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = await readResumeFlowState(page);
    if (state.alreadySent) {
      return state;
    }
    await sleep(400);
  }
  return readResumeFlowState(page);
}

async function sendActiveReply(page, text) {
  const filled = await fillActiveChatInput(page, text);
  if (!filled) {
    return { ok: false, reason: 'input_not_found' };
  }
  const clicked = await clickButtonByText(page, SEND_BUTTON_TEXTS);
  if (!clicked) {
    await page.keyboard.press('Enter').catch(() => null);
    return { ok: true, via: 'keyboard_enter' };
  }
  return { ok: true, via: clicked };
}

async function sendResumeFromActiveConversation(page) {
  let state = await readResumeFlowState(page);
  if (state.alreadySent) {
    return { ok: true, via: 'already_sent' };
  }

  let firstClick = null;
  if (!state.needsConsent && !state.hasInlineActions) {
    firstClick = await clickVisibleButtonByText(page, RESUME_BUTTON_TEXTS);
    if (!firstClick) {
      firstClick = await clickButtonByText(page, RESUME_BUTTON_TEXTS);
    }
    if (!firstClick) {
      return { ok: false, reason: 'resume_button_not_found' };
    }
    await sleep(700);
    state = await waitForResumeDelivery(page, 1800);
  }

  if (!state.alreadySent && state.hasInlineActions) {
    const inlineClick = await clickVisibleButtonByText(page, ['发简历']);
    if (!inlineClick && !firstClick) {
      return { ok: false, reason: 'resume_inline_button_not_found' };
    }
    firstClick = firstClick || inlineClick;
    await sleep(700);
    state = await waitForResumeDelivery(page, 1800);
  }

  if (!state.alreadySent && state.needsConsent) {
    const consentClick = await clickVisibleButtonByText(page, RESUME_CONSENT_BUTTON_TEXTS);
    if (!consentClick) {
      return {
        ok: false,
        reason: 'resume_consent_not_found',
        state,
        via: firstClick || null,
      };
    }
    await sleep(900);
    state = await waitForResumeDelivery(page, 5000);
    if (state.alreadySent) {
      return { ok: true, via: consentClick, initial: firstClick || null };
    }
    return {
      ok: false,
      reason: 'resume_delivery_unconfirmed',
      state,
      via: consentClick,
      initial: firstClick || null,
    };
  }

  if (state.alreadySent) {
    return { ok: true, via: firstClick || 'resume_button' };
  }

  return {
    ok: false,
    reason: 'resume_delivery_unconfirmed',
    state,
    via: firstClick || null,
  };
}

async function extractJobsFromPage(page) {
  return page.evaluate(() => {
    function textOf(node) {
      return (node?.innerText || node?.textContent || '').replace(/\s+/g, ' ').trim();
    }

    const anchors = Array.from(document.querySelectorAll('a[href*="/job_detail/"], a[href*="job_detail"]'));
    const seen = new Set();
    const jobs = [];

    for (const anchor of anchors) {
      const href = new URL(anchor.getAttribute('href'), location.origin).toString();
      if (seen.has(href)) {
        continue;
      }
      seen.add(href);

      const card = anchor.closest('.job-card-wrapper, .job-card-box, li, [class*=job-card], [class*=search-job-result], [class*=card]');
      const titleNode = card?.querySelector('.job-name, [class*=job-name], [class*=title]') || anchor;
      const salaryNode = card?.querySelector('.salary, [class*=salary]');
      const companyNode = card?.querySelector('.company-name, [class*=company-name], [class*=company] a');
      const locationNode = card?.querySelector('.job-area, [class*=location], [class*=area]');
      const experienceNode = card?.querySelector('.job-limit, [class*=experience], [class*=year]');
      const recruiterNode = card?.querySelector('.boss-name, [class*=boss], [class*=recruiter]');
      const recruiterTitleNode = card?.querySelector('.boss-title, [class*=recruiter-title], [class*=boss-title]');
      const stageNode = card?.querySelector('[class*=stage], [class*=finance]');
      const sizeNode = card?.querySelector('[class*=scale], [class*=size]');
      const summary = textOf(card || anchor);

      jobs.push({
        id: href,
        url: href,
        title: textOf(titleNode),
        salaryText: textOf(salaryNode),
        company: textOf(companyNode),
        location: textOf(locationNode),
        experienceText: textOf(experienceNode),
        degreeText: summary.match(/博士|硕士|本科|大专|学历不限|不限/)?.[0] || '',
        recruiterName: textOf(recruiterNode),
        recruiterTitle: textOf(recruiterTitleNode),
        stage: textOf(stageNode),
        companySize: textOf(sizeNode),
        summary,
      });
    }

    return jobs;
  });
}

async function applyToJob(page, job, options = {}) {
  await gotoAndWait(page, job.url);
  const blocker = await detectBlocker(page, { readySelectors: JOB_READY_SELECTORS });
  if (blocker.blocked) {
    return { ok: false, reason: blocker.reason, blocker };
  }

  const clicked = await clickButtonByText(page, options.buttonTextCandidates || APPLY_BUTTON_TEXTS);
  if (!clicked) {
    return { ok: false, reason: 'apply_button_not_found' };
  }

  if (options.dryRun) {
    return { ok: true, dryRun: true, button: clicked };
  }

  if (options.greeting) {
    await sleep(800);
    const filled = await fillActiveChatInput(page, options.greeting);
    if (!filled) {
      return { ok: false, reason: 'greeting_input_not_found', button: clicked };
    }
  }

  const confirmClicked = await clickButtonByText(page, ['发送', '确认投递', '继续沟通', '立即沟通', '发送简历']);
  if (!confirmClicked) {
    return { ok: false, reason: 'submission_unconfirmed', button: clicked };
  }
  return {
    ok: true,
    dryRun: false,
    button: clicked,
    confirm: confirmClicked,
  };
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
