#!/usr/bin/env node
/*
 * Post reviewed X replies from a fixed JSON target list.
 *
 * Safety defaults:
 * - no foreground activation unless --allow-focus is passed
 * - no new tab unless --allow-new-tab or --background-worker is passed
 * - no publishing unless every target has review.status=approved
 * - deterministic review blocks template-like, overlong, risky, or language-mismatched replies
 * - submitted replies that are not immediately visible become pending, not failed
 */
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import {
  CDPTargetClient,
  closePageTarget,
  createPageTarget,
  listPageTargets,
  waitForTargetById,
} from '../../browser-core/interactive/chrome-cdp.mjs';

const DEFAULT_ENDPOINT = process.env.AUTO_X_AGENT_BROWSER_CDP_ENDPOINT
  || (process.env.AUTO_X_AGENT_BROWSER_CDP_PORT
    ? `http://127.0.0.1:${process.env.AUTO_X_AGENT_BROWSER_CDP_PORT}`
    : 'http://127.0.0.1:9224');

const PROJECT_ROOT = resolve(new URL('../../../', import.meta.url).pathname);
const TODAY = new Date().toISOString().slice(0, 10);

const DEFAULT_TARGETS = [
  {
    handle: '0xViviennn',
    url: 'https://x.com/0xViviennn/status/2050987880399704382',
    language: 'zh',
    reply: '这个其实挺说明问题的：Codex 把“会写代码”和“会还原审美”之间那段距离拉近了。现在差距反而更像是人会不会判断什么是好。',
  },
  {
    handle: 'reach_vb',
    url: 'https://x.com/reach_vb/status/2051430523004694608',
    language: 'en',
    reply: 'This is the interesting direction: Codex as a review/adversarial layer inside Claude Code, not just another chat window. The workflow boundary is getting blurry fast.',
  },
  {
    handle: 'vmiss33',
    url: 'https://x.com/vmiss33/status/2050984556790939731',
    language: 'en',
    reply: 'The hard part of multi-agent setups is not launching more agents, it is keeping memory, handoff, and recovery sane. Curious what part of Hermes made it finally click for you.',
  },
  {
    handle: 'eastweb3eth',
    url: 'https://x.com/eastweb3eth/status/2051113395940897089',
    language: 'zh',
    reply: '中转站这事最后拼的不是“能不能搭起来”，而是计费、稳定性、风控和信任怎么做。AI 可以把搭建门槛打低，但运营门槛还在。',
  },
  {
    handle: 'zstmfhy',
    url: 'https://x.com/zstmfhy/status/2051435958072160763',
    language: 'zh',
    reply: '这个说法更接近真实情况。中转站看起来暴利，但只要模型不掺假、号池正规、数据不乱卖，利润空间其实会被稳定性和风控吃掉很多。',
  },
  {
    handle: 'sunyuchentron',
    url: 'https://x.com/sunyuchentron/status/2051465703673491940',
    language: 'zh',
    reply: '让用户自己验证 API 质量这点是对的。AI 中转站真正缺的不是低价广告，而是可审计、可复现、可追责的信任层。',
  },
  {
    handle: 'realNyarime',
    url: 'https://x.com/realNyarime/status/2051360143850561875',
    language: 'zh',
    reply: '我也觉得这类工具迁移最后看的不是名字，而是长任务里会不会卡、记忆能不能带走、失败后能不能恢复。能一键迁移记忆是很关键的信号。',
  },
  {
    handle: 'Barret_China',
    url: 'https://x.com/Barret_China/status/2051204497410789755',
    language: 'zh',
    reply: '这个场景很真实。下一代“会用 AI”的差距，可能不是会不会写 prompt，而是能不能把任务、材料、目标一次性交给 agent。',
  },
  {
    handle: 'jinchenma_ai',
    url: 'https://x.com/jinchenma_ai/status/2051132455491629292',
    language: 'zh',
    reply: '验证码这类问题其实会变成 coding agent 的新基础设施门槛。模型再强，账号、权限、会话恢复这些东西不稳，工作流还是会断。',
  },
  {
    handle: 'DLKFZWilliam2',
    url: 'https://x.com/DLKFZWilliam2/status/2051387174617317425',
    language: 'zh',
    reply: '这个判断很对。很多 AI 工作流的问题不是模型不够强，而是把生成、动画、拆帧、后处理这些步骤放错了位置。',
  },
  {
    handle: 'laogui',
    url: 'https://x.com/laogui/status/2051135096661713176',
    language: 'zh',
    reply: '审美这块 AI 现在能补执行，但很难替代“什么叫干净”的判断。好 dashboard 往往不是元素多，而是敢删。',
  },
  {
    handle: 'xbanboo',
    url: 'https://x.com/xbanboo/status/2051334781389136009',
    language: 'zh',
    reply: '这个结论很有价值。AI 真正让一人公司变可能，不是替你做一个任务，而是开始能维护一张持续更新的任务看板。',
  },
  {
    handle: 'CryptoDoggyCN',
    url: 'https://x.com/CryptoDoggyCN/status/2051246744860754380',
    language: 'zh',
    reply: 'Polymarket 这个数据很关键。预测市场表面是大众下注，实际利润会高度集中到信息、执行和风控更强的一小撮人手里。',
  },
  {
    handle: 'lnkybtc',
    url: 'https://x.com/lnkybtc/status/2051400718997922186',
    language: 'zh',
    reply: 'Ghost Fill 本质就是交易系统里最麻烦的状态一致性问题。链上结算和链下撮合只要不同步，用户体感就会直接变成“不可信”。',
  },
  {
    handle: 'ShawnThread',
    url: 'https://x.com/ShawnThread/status/2051328844809044347',
    language: 'zh',
    reply: '这个例子有意思，AI 在这里更像套利前的快速研究助手：先帮你查链、合约、流动性，再由人判断能不能执行。',
  },
  {
    handle: 'Goldchau_eth',
    url: 'https://x.com/Goldchau_eth/status/2051208459312664773',
    language: 'zh',
    reply: '这类监控站最后得靠数据质量区分。只做“妖币雷达”很容易同质化，能解释为什么报警、哪些信号可靠才有价值。',
  },
  {
    handle: 'WallStreet0Name',
    url: 'https://x.com/WallStreet0Name/status/2051296723390357945',
    language: 'zh',
    reply: 'AI 视频真正厉害的地方是把内容测试成本打低了。起号不是只靠滤镜，而是能不能持续找到一组观众会反复转发的情绪。',
  },
  {
    handle: 'williamlab',
    url: 'https://x.com/williamlab/status/2051292634568868071',
    language: 'zh',
    reply: '以后视频可信度可能要默认打折了。判断真假会从“看起来像不像”变成“来源链路、原始素材、发布动机能不能对上”。',
  },
  {
    handle: 'manateelazycat',
    url: 'https://x.com/manateelazycat/status/2051157481355895037',
    language: 'zh',
    reply: '移动编程这个场景很有意思。agent 真成熟以后，工作台不一定是电脑，而是任何能把上下文交给它的入口。',
  },
  {
    handle: 'xincctnnq',
    url: 'https://x.com/xincctnnq/status/2051195023480500502',
    language: 'zh',
    reply: '反向模拟交易这个想法很适合拿 AI 做研究助手。重点不是让模型直接下判断，而是让它把假设、盘口变化和失败案例都记录下来。',
  },
  {
    handle: 'blmario669',
    url: 'https://x.com/blmario669/status/2051203849818649074',
    language: 'zh',
    reply: '这个其实也提醒一个问题：AI 账号越来越像生产资料，便宜账号背后到底是续费、共享还是风控漏洞，最后都会反噬工作流稳定性。',
  },
];

function parseArgs(argv) {
  const args = {
    endpoint: DEFAULT_ENDPOINT,
    start: 1,
    limit: DEFAULT_TARGETS.length,
    dryRun: false,
    continueOnError: false,
    allowFocus: false,
    allowNewTab: false,
    backgroundWorker: false,
    allowUnreviewed: false,
    reviewOnly: false,
    targetsFile: '',
    out: resolve(PROJECT_ROOT, `05-选题研究/X-互动回复记录-${TODAY}.jsonl`),
    summary: resolve(PROJECT_ROOT, `05-选题研究/X-互动回复记录-${TODAY}.md`),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--endpoint') args.endpoint = argv[++i];
    else if (arg === '--start') args.start = Number(argv[++i]);
    else if (arg === '--limit') args.limit = Number(argv[++i]);
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--continue-on-error') args.continueOnError = true;
    else if (arg === '--allow-focus') args.allowFocus = true;
    else if (arg === '--allow-new-tab') args.allowNewTab = true;
    else if (arg === '--background-worker') args.backgroundWorker = true;
    else if (arg === '--allow-unreviewed') args.allowUnreviewed = true;
    else if (arg === '--review-only') args.reviewOnly = true;
    else if (arg === '--targets') args.targetsFile = argv[++i];
    else if (arg === '--out') args.out = resolve(argv[++i]);
    else if (arg === '--summary') args.summary = resolve(argv[++i]);
    else if (arg === '--help') {
      console.log('Usage: reply_engagement_queue.mjs [--endpoint URL] [--start N] [--limit N] [--dry-run] [--review-only] [--background-worker] [--allow-focus] [--allow-new-tab] [--allow-unreviewed] [--continue-on-error] [--targets JSON]');
      process.exit(0);
    }
  }
  return args;
}

function loadTargets(filePath) {
  if (!filePath) return DEFAULT_TARGETS;
  const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error(`Targets file must be a JSON array: ${filePath}`);
  }
  return parsed;
}

function normalizeEndpoint(endpoint) {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint.replace(/\/+$/, '');
  }
  return `http://${endpoint.replace(/\/+$/, '')}`;
}

function detectReplyLanguage(text) {
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return cjk >= 8 || cjk >= latin * 0.35 ? 'zh' : 'en';
}

function countOccurrences(text, pattern) {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function reviewTarget(target, { allowUnreviewed = false } = {}) {
  const reply = String(target.reply || '').trim();
  const language = target.language || detectReplyLanguage(reply);
  const reasons = [];

  if (!target.url || !/^https:\/\/x\.com\/[^/]+\/status\/\d+/.test(target.url)) {
    reasons.push('source_url_not_status_url');
  }
  if (!reply) reasons.push('empty_reply');
  if (reply.length > 170) reasons.push('too_long');
  if (reply.length < 12) reasons.push('too_short');
  if (/\n/.test(reply)) reasons.push('multi_line');
  if (/https?:\/\//i.test(reply)) reasons.push('contains_link');
  if (countOccurrences(reply, /[!?！？]/g) > 2) reasons.push('too_many_exclamations_or_questions');
  if (countOccurrences(reply, /AI|agent|workflow|数据|系统|本质|真正|关键|问题|判断|信任层|基础设施/gi) >= 4) {
    reasons.push('too_concept_dense');
  }
  if (/这个(其实|说法|场景|判断|结论|例子)|本质|真正|关键|更像是|最后拼的是/.test(reply)) {
    reasons.push('template_like_phrase');
  }
  if (language === 'en' && /[\u4e00-\u9fff]/.test(reply)) reasons.push('language_mismatch');
  if (language === 'zh' && (reply.match(/[A-Za-z]{4,}/g) || []).length > 3) reasons.push('too_much_english_in_zh_reply');
  if (/(暴利|割|垃圾|骗局|骗子|傻|SB|政治|战争|色情|空投|抽奖)/i.test(reply)) {
    reasons.push('risk_or_inflammatory_word');
  }

  const explicitReview = target.review?.status === 'approved' || target.reviewed === true;
  if (!allowUnreviewed && !explicitReview) {
    reasons.push('not_marked_review_approved');
  }

  return {
    approved: reasons.length === 0,
    reasons,
    explicitReview,
  };
}

function reviewTargets(targets, options = {}) {
  return targets.map((target, index) => ({
    index: index + 1,
    handle: target.handle,
    url: target.url,
    reply: target.reply,
    review: reviewTarget(target, options),
  }));
}

async function activateTarget(endpoint, targetId) {
  await fetch(`${endpoint}/json/activate/${targetId}`).catch(() => null);
}

async function createBackgroundPageTarget(endpoint, url = 'about:blank') {
  const version = await (await fetch(`${endpoint}/json/version`)).json();
  if (!version.webSocketDebuggerUrl) {
    throw new Error('Browser WebSocket debugger URL is unavailable');
  }
  const browser = new CDPTargetClient({ webSocketDebuggerUrl: version.webSocketDebuggerUrl });
  try {
    await browser.connect();
    const result = await browser.send('Target.createTarget', {
      url,
      background: true,
    }, 5000);
    if (!result?.targetId) {
      throw new Error('Target.createTarget did not return targetId');
    }
    return waitForTargetById(endpoint, result.targetId, 5000);
  } finally {
    await browser.close().catch(() => {});
  }
}

async function describeTarget(target) {
  const client = new CDPTargetClient(target);
  try {
    await client.connect();
    return {
      target,
      page: await client.describePage({ bodyLimit: 120 }).catch(() => ({})),
    };
  } finally {
    await client.close().catch(() => {});
    if (client.ownedTargetId) {
      await closePageTarget(endpoint, client.ownedTargetId).catch(() => {});
      await delay(1000);
    }
  }
}

async function selectXTarget(endpoint, { allowNewTab = false, backgroundWorker = false } = {}) {
  if (backgroundWorker) {
    return createBackgroundPageTarget(endpoint, 'about:blank');
  }

  const targets = await listPageTargets(endpoint);
  const xTargets = targets.filter((item) => /https:\/\/(x|twitter)\.com\//.test(item.url || ''));
  if (!xTargets.length) {
    if (!allowNewTab) {
      throw new Error('No existing X tab found. Refusing to open a new tab without --allow-new-tab.');
    }
    const created = await createPageTarget(endpoint, 'https://x.com/home');
    return waitForTargetById(endpoint, created.id, 5000);
  }

  const described = [];
  for (const target of xTargets) {
    described.push(await describeTarget(target));
  }
  described.sort((a, b) => {
    const aFocused = a.page?.hasFocus ? 1 : 0;
    const bFocused = b.page?.hasFocus ? 1 : 0;
    if (aFocused !== bFocused) return aFocused - bFocused;
    const aVisible = a.page?.visibilityState === 'visible' ? 1 : 0;
    const bVisible = b.page?.visibilityState === 'visible' ? 1 : 0;
    if (aVisible !== bVisible) return aVisible - bVisible;
    const aHome = /\/home$/.test(a.page?.url || a.target.url || '') ? 0 : 1;
    const bHome = /\/home$/.test(b.page?.url || b.target.url || '') ? 0 : 1;
    return aHome - bHome;
  });
  return described[0].target;
}

async function getReusableXClient(endpoint, options = {}) {
  const target = await selectXTarget(endpoint, options);
  if (options.allowFocus) {
    await activateTarget(endpoint, target.id);
  }
  const client = new CDPTargetClient(target);
  await client.connect();
  await client.send('Runtime.enable', {}, 3000).catch(() => {});
  await client.send('Page.enable', {}, 3000).catch(() => {});
  await client.send('Input.setIgnoreInputEvents', { ignore: false }, 3000).catch(() => {});
  if (options.backgroundWorker) {
    client.ownedTargetId = target.id;
  }
  return client;
}

async function waitFor(client, expression, { timeoutMs = 15000, intervalMs = 300, label = 'condition' } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = await client.evaluate(expression).catch(() => null);
    if (value) return value;
    await delay(intervalMs);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function pageSnapshot(client, bodyLimit = 800) {
  return client.evaluate(`(() => ({
    url: location.href,
    title: document.title,
    readyState: document.readyState,
    body: document.body ? document.body.innerText.replace(/\\s+/g, ' ').trim().slice(0, ${bodyLimit}) : ''
  }))()`);
}

async function navigateAndWaitForTweet(client, url, handle) {
  await client.navigate(url, { waitForReadyState: 'interactive', timeoutMs: 20000 });
  await waitFor(client, `(() => {
    const body = document.body ? document.body.innerText : '';
    return document.querySelectorAll('article[data-testid="tweet"]').length > 0
      && body.toLowerCase().includes('${handle.toLowerCase().replaceAll("'", "\\'")}')
      && !body.includes('Something went wrong');
  })()`, { timeoutMs: 25000, label: `tweet for @${handle}` });
  await delay(1500);
}

function normalizeStatusUrl(url) {
  const match = String(url || '').match(/^https:\/\/(?:x|twitter)\.com\/([^/?#]+)\/status\/(\d+)/);
  return match ? `https://x.com/${match[1]}/status/${match[2]}` : '';
}

async function findReplyOnCurrentPage(client, reply) {
  const needle = reply.slice(0, Math.min(48, reply.length)).replaceAll('\\', '\\\\').replaceAll("'", "\\'");
  return client.evaluate(`(() => {
    const needle = '${needle}';
    const normalize = (href) => {
      const match = String(href || '').match(/^https:\\/\\/(?:x|twitter)\\.com\\/([^/?#]+)\\/status\\/(\\d+)/);
      return match ? 'https://x.com/' + match[1] + '/status/' + match[2] : '';
    };
    const bodyText = document.body ? document.body.innerText : '';
    const articles = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
    const matched = articles.find((article) => article.innerText && article.innerText.includes(needle));
    if (!matched && !bodyText.includes(needle)) {
      return { exists: false, url: '', text: '', confidence: 'none' };
    }
    const root = matched || document;
    const links = Array.from(root.querySelectorAll('a[href*="/status/"]'))
      .map((a) => normalize(a.href))
      .filter(Boolean);
    const own = links.find((href) => href.includes('/0xcybersmile/status/')) || '';
    return {
      exists: true,
      url: own,
      text: (matched ? matched.innerText : bodyText).replace(/\\s+/g, ' ').trim().slice(0, 360),
      confidence: own ? 'own_status_url' : (matched ? 'article_text_match' : 'body_text_match')
    };
  })()`);
}

async function findExistingReply(client, reply, { sourceUrl = '' } = {}) {
  await client.navigate('https://x.com/0xcybersmile/with_replies', {
    waitForReadyState: 'interactive',
    timeoutMs: 20000,
  }).catch(() => {});
  await delay(2500);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const match = await findReplyOnCurrentPage(client, reply).catch(() => null);
    if (match?.exists && match.url) return { ...match, url: normalizeStatusUrl(match.url), method: 'with_replies' };
    await client.evaluate('window.scrollBy(0, Math.round(window.innerHeight * 0.85))').catch(() => {});
    await delay(900);
  }

  if (sourceUrl) {
    await client.navigate(sourceUrl, {
      waitForReadyState: 'interactive',
      timeoutMs: 20000,
    }).catch(() => {});
    await delay(2500);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const match = await findReplyOnCurrentPage(client, reply).catch(() => null);
      if (match?.exists && match.url) return { ...match, url: normalizeStatusUrl(match.url), method: 'source_conversation' };
      if (match?.exists) return { ...match, method: 'source_conversation' };
      await client.evaluate('window.scrollBy(0, Math.round(window.innerHeight * 0.9))').catch(() => {});
      await delay(900);
    }
  }

  const searchNeedle = reply.slice(0, Math.min(32, reply.length));
  const searchUrl = `https://x.com/search?q=${encodeURIComponent(`from:0xcybersmile "${searchNeedle}"`)}&src=typed_query&f=live`;
  await client.navigate(searchUrl, {
    waitForReadyState: 'interactive',
    timeoutMs: 20000,
  }).catch(() => {});
  await delay(2500);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const match = await findReplyOnCurrentPage(client, reply).catch(() => null);
    if (match?.exists && match.url) return { ...match, url: normalizeStatusUrl(match.url), method: 'live_search' };
    await client.evaluate('window.scrollBy(0, Math.round(window.innerHeight * 0.9))').catch(() => {});
    await delay(900);
  }

  return { exists: false, url: '', text: '', confidence: 'none', method: 'not_found' };
}

async function clickReply(client) {
  const inlineEditor = await client.evaluate(`(() => {
    const editors = Array.from(document.querySelectorAll('[contenteditable="true"][data-testid="tweetTextarea_0"]'));
    return editors.some((editor) => editor.offsetParent !== null && !editor.closest('[role="dialog"]'));
  })()`).catch(() => false);
  if (inlineEditor) return;

  const clicked = await client.evaluate(`(() => {
    const article = Array.from(document.querySelectorAll('article[data-testid="tweet"]'))[0];
    if (!article) return { ok: false, reason: 'no article' };
    const buttons = Array.from(article.querySelectorAll('button[data-testid="reply"]'));
    const button = buttons.find((item) => item.offsetParent !== null) || buttons[0];
    if (!button) return { ok: false, reason: 'no reply button' };
    button.scrollIntoView({ block: 'center', inline: 'center' });
    button.click();
    return { ok: true };
  })()`);
  if (!clicked?.ok) {
    throw new Error(`Could not click reply: ${clicked?.reason || 'unknown'}`);
  }
  await waitFor(client, `(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const root = dialog || document;
    const editors = Array.from(root.querySelectorAll('[contenteditable="true"][data-testid="tweetTextarea_0"]'));
    return editors.some((editor) => editor.offsetParent !== null);
  })()`, { timeoutMs: 10000, label: 'reply dialog editor' });
  await delay(800);
}

async function insertReplyText(client, reply) {
  const inserted = await client.evaluate(`(async () => {
    const text = ${JSON.stringify(reply)};
    const root = document.querySelector('[role="dialog"]') || document;
    const editors = Array.from(root.querySelectorAll('[contenteditable="true"][data-testid="tweetTextarea_0"]'));
    const visibleEditors = editors.filter((item) => item.offsetParent !== null);
    const editor = visibleEditors[visibleEditors.length - 1] || editors[editors.length - 1];
    if (!editor) return null;
    editor.scrollIntoView({ block: 'center', inline: 'center' });
    editor.focus();
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    const data = new DataTransfer();
    data.setData('text/plain', text);
    editor.dispatchEvent(new ClipboardEvent('paste', {
      clipboardData: data,
      bubbles: true,
      cancelable: true,
      composed: true,
    }));
    await new Promise((resolve) => setTimeout(resolve, 350));
    if (!(editor.innerText || editor.textContent || '').includes(text.slice(0, 24))) {
      editor.dispatchEvent(new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: text,
        bubbles: true,
        cancelable: true,
        composed: true,
      }));
      document.execCommand('insertText', false, text);
      editor.dispatchEvent(new InputEvent('input', {
        inputType: 'insertText',
        data: text,
        bubbles: true,
        cancelable: false,
        composed: true,
      }));
    }
    const buttons = Array.from(root.querySelectorAll('button[data-testid="tweetButton"], button[data-testid="tweetButtonInline"]'));
    const canSubmit = buttons.some((item) => item.offsetParent !== null && !item.disabled && item.getAttribute('aria-disabled') !== 'true');
    return {
      ok: Boolean((editor.innerText || editor.textContent || '').includes(text.slice(0, 24)) && canSubmit),
      canSubmit,
      text: (editor.innerText || editor.textContent || '').replace(/\\s+/g, ' ').slice(0, 220)
    };
  })()`);
  await delay(800);
  if (!inserted?.ok) {
    throw new Error(`Reply text was not inserted into dialog editor: ${inserted?.reason || inserted?.text || ''}`);
  }
}

async function submitReply(client) {
  const submitted = await client.evaluate(`(() => {
    const root = document.querySelector('[role="dialog"]') || document;
    const candidates = Array.from(root.querySelectorAll('button[data-testid="tweetButton"], button[data-testid="tweetButtonInline"]'));
    const enabled = candidates.filter((item) => {
      const visible = item.offsetParent !== null;
      const disabled = item.disabled || item.getAttribute('aria-disabled') === 'true';
      return visible && !disabled;
    });
    const button = enabled[enabled.length - 1];
    if (!button) {
      return {
        ok: false,
        reason: 'no enabled submit button',
        buttons: candidates.map((item) => ({
          text: item.innerText,
          disabled: item.disabled,
          ariaDisabled: item.getAttribute('aria-disabled'),
          visible: item.offsetParent !== null
        }))
      };
    }
    button.click();
    return { ok: true };
  })()`);
  if (!submitted?.ok) {
    throw new Error(`Could not submit reply: ${submitted?.reason || 'unknown'} ${JSON.stringify(submitted?.buttons || [])}`);
  }
  await delay(4500);
}

async function closeComposerIfOpen(client) {
  await client.evaluate(`(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return false;
    const close = dialog.querySelector('button[aria-label="Close"], button[aria-label="关闭"], button[data-testid="app-bar-close"]');
    if (close) {
      close.click();
      return true;
    }
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return true;
  })()`).catch(() => false);
  await delay(500);
  await client.evaluate(`(() => {
    const discard = Array.from(document.querySelectorAll('button')).find((button) => /放弃|Discard/.test(button.innerText || ''));
    if (discard) {
      discard.click();
      return true;
    }
    return false;
  })()`).catch(() => false);
  await delay(500);
}

function appendRecord(outPath, record) {
  mkdirSync(dirname(outPath), { recursive: true });
  appendFileSync(outPath, `${JSON.stringify(record, null, 0)}\n`, 'utf8');
}

function writeSummary(summaryPath, records) {
  const lines = [
    `# X 互动回复记录 ${TODAY}`,
    '',
    `> 账号：@0xcybersmile | 来源：当前 X timeline 高互动队列 | 主题：AI 优先，crypto 可选`,
    '',
    '| # | 状态 | 对象 | 来源帖 | 回复验证 | 回复摘要 |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  records.forEach((record, index) => {
    const reply = String(record.reply || '').replace(/\|/g, '/').replace(/\s+/g, ' ').slice(0, 80);
    const verify = record.verify_url ? `[with replies](${record.verify_url})` : '';
    lines.push(`| ${index + 1} | ${record.status} | @${record.handle} | [source](${record.source_url}) | ${verify} | ${reply} |`);
  });
  lines.push('');
  writeFileSync(summaryPath, `${lines.join('\n')}\n`, 'utf8');
}

function writeReviewSummary(summaryPath, reviews) {
  const lines = [
    `# X 回复审查记录 ${TODAY}`,
    '',
    '> 规则：不抢焦点；只发 `review.status=approved`；短、贴原帖、少抽象词、无链接、语言匹配。',
    '',
    '| # | 结论 | 对象 | 原因 | 回复摘要 |',
    '| --- | --- | --- | --- | --- |',
  ];
  reviews.forEach((item) => {
    const status = item.review.approved ? 'approved' : 'blocked';
    const reasons = item.review.reasons.join(', ') || 'ok';
    const reply = String(item.reply || '').replace(/\|/g, '/').replace(/\s+/g, ' ').slice(0, 90);
    lines.push(`| ${item.index} | ${status} | @${item.handle} | ${reasons} | ${reply} |`);
  });
  lines.push('');
  writeFileSync(summaryPath, `${lines.join('\n')}\n`, 'utf8');
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const endpoint = normalizeEndpoint(args.endpoint);
  const allTargets = loadTargets(args.targetsFile);
  const targets = allTargets.slice(Math.max(0, args.start - 1), Math.max(0, args.start - 1) + args.limit);
  const reviews = reviewTargets(targets, { allowUnreviewed: args.allowUnreviewed });
  const blocked = reviews.filter((item) => !item.review.approved);

  if (args.reviewOnly) {
    writeReviewSummary(args.summary, reviews);
    console.log(`Review complete. approved=${reviews.length - blocked.length} blocked=${blocked.length} summary=${args.summary}`);
    if (blocked.length) process.exitCode = 1;
    return;
  }

  if (blocked.length) {
    writeReviewSummary(args.summary, reviews);
    for (const item of blocked) {
      console.error(`[review-blocked] @${item.handle}: ${item.review.reasons.join(', ')}`);
    }
    throw new Error(`Refusing to publish ${blocked.length} unapproved or low-quality replies. Run --review-only for details.`);
  }

  const records = [];
  const client = await getReusableXClient(endpoint, {
    allowFocus: args.allowFocus,
    allowNewTab: args.allowNewTab,
    backgroundWorker: args.backgroundWorker,
  });

  try {
    for (const [index, target] of targets.entries()) {
      const baseRecord = {
        index: index + 1,
        handle: target.handle,
        language: target.language,
        source_url: target.url,
        reply: target.reply,
        dry_run: args.dryRun,
        at: new Date().toISOString(),
      };

      try {
        const existing = await findExistingReply(client, target.reply, { sourceUrl: target.url });
        if (existing?.exists) {
          const record = { ...baseRecord, status: 'already_exists', verify_url: existing.url, verify_text: existing.text };
          records.push(record);
          appendRecord(args.out, record);
          console.log(`[${index + 1}/${targets.length}] already exists @${target.handle}: ${existing.url}`);
          continue;
        }

        await navigateAndWaitForTweet(client, target.url, target.handle);
        const source = await pageSnapshot(client, 500);

        if (args.dryRun) {
          const record = { ...baseRecord, status: 'dry_run_ok', page_url: source.url, page_title: source.title };
          records.push(record);
          appendRecord(args.out, record);
          console.log(`[${index + 1}/${targets.length}] dry-run @${target.handle}`);
          continue;
        }

        await clickReply(client);
        await insertReplyText(client, target.reply);
        await submitReply(client);

        const verification = await findExistingReply(client, target.reply, { sourceUrl: target.url });
        const status = verification?.exists && verification.url ? 'posted_verified' : 'posted_pending_verification';
        const record = {
          ...baseRecord,
          status,
          page_url: source.url,
          page_title: source.title,
          verify_url: verification?.url || '',
          verify_text: verification?.text || '',
          verify_method: verification?.method || '',
          verify_confidence: verification?.confidence || '',
        };
        records.push(record);
        appendRecord(args.out, record);
        console.log(`[${index + 1}/${targets.length}] ${status} @${target.handle}: ${record.verify_url || 'no verify url'}`);

        if (!verification?.exists || !verification.url) {
          await delay(3500 + Math.floor(Math.random() * 3000));
          continue;
        }

        await delay(3500 + Math.floor(Math.random() * 3000));
      } catch (error) {
        await closeComposerIfOpen(client);
        const snapshot = await pageSnapshot(client, 600).catch(() => ({}));
        const record = {
          ...baseRecord,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          page_url: snapshot?.url || '',
          page_title: snapshot?.title || '',
          page_body: snapshot?.body || '',
        };
        records.push(record);
        appendRecord(args.out, record);
        console.error(`[${index + 1}/${targets.length}] failed @${target.handle}: ${record.error}`);
        if (!args.continueOnError) {
          break;
        }
      } finally {
        writeSummary(args.summary, records);
      }
    }
  } finally {
    await client.close().catch(() => {});
  }

  const posted = records.filter((record) => record.status === 'posted_verified' || record.status === 'already_exists').length;
  const pending = records.filter((record) => record.status === 'posted_pending_verification').length;
  const failed = records.filter((record) => record.status === 'failed').length;
  console.log(`Done. posted_or_existing=${posted} pending_verification=${pending} failed=${failed} out=${args.out} summary=${args.summary}`);
  if (failed) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
