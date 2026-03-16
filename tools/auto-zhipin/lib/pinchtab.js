const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const { normalizeWhitespace, sleep } = require('./utils');

const execFileAsync = promisify(execFile);

const DEFAULT_SEND_BUTTON_TEXTS = ['发送', '立即沟通', '发出', '确认'];
const DEFAULT_APPLY_BUTTON_TEXTS = ['立即沟通', '立即投递', '投递简历', '立即申请', '聊一聊'];
const DEFAULT_RESUME_BUTTON_TEXTS = ['发送简历', '投递简历', '发简历', '发送附件', '发送在线简历'];
const DEFAULT_CONFIRM_BUTTON_TEXTS = ['发送', '确认投递', '继续沟通', '立即沟通', '发送简历'];

function parsePinchTabJsonOutput(output) {
  const text = String(output || '').trim();
  const start = text.search(/[\[{]/);
  if (start === -1) {
    throw new Error('pinchtab output did not contain JSON');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  let opener = null;
  let closer = null;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (!opener && (char === '{' || char === '[')) {
      opener = char;
      closer = char === '{' ? '}' : ']';
      depth = 1;
      continue;
    }

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === opener) {
      depth += 1;
      continue;
    }

    if (char === closer) {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(text.slice(start, index + 1));
      }
    }
  }

  throw new Error('pinchtab output contained unterminated JSON');
}

function parsePinchTabSnapshotText(output) {
  const text = String(output || '').trim();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const header = lines.shift() || '';
  const headerMatch = header.match(/^#\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(\d+)\s+nodes?$/);
  const nodes = [];

  for (const line of lines) {
    const match = line.match(/^(e\d+):([a-z_]+)(?:\s+"(.*)")?$/i);
    if (!match) {
      continue;
    }
    nodes.push({
      ref: match[1],
      role: match[2].toLowerCase(),
      name: match[3] || '',
    });
  }

  return {
    title: headerMatch?.[1] || '',
    url: headerMatch?.[2] || '',
    count: Number(headerMatch?.[3] || nodes.length),
    nodes,
  };
}

function inferPinchTabReadiness({ mode = 'page', snapshotText = '', readableText = '' }) {
  const combined = `${snapshotText}\n${readableText}`;
  const cues = {
    chat: ['发送', '消息', '简历', '沟通', '聊天'],
    jobs: ['职位描述', '立即沟通', '投递简历', '立即申请', '聊一聊'],
    page: ['立即沟通', '职位描述', '发送', '消息'],
  };

  return (cues[mode] || cues.page).some((pattern) => combined.includes(pattern));
}

function buildPinchTabCommandCandidates(config = {}) {
  const explicitBin = config.pinchtab?.bin;
  if (explicitBin) {
    return [[explicitBin]];
  }
  return [
    ['pinchtab'],
    ['npx', '--yes', 'pinchtab'],
  ];
}

function normalizePinchTabText(value) {
  return normalizeWhitespace(value).toLowerCase();
}

function findPinchTabNode(nodes = [], options = {}) {
  const texts = (options.texts || [])
    .map((text) => normalizePinchTabText(text))
    .filter(Boolean);
  const roles = (options.roles || []).map((role) => String(role || '').toLowerCase()).filter(Boolean);
  let best = null;

  for (const node of nodes) {
    const role = String(node.role || '').toLowerCase();
    const roleIndex = roles.length ? roles.indexOf(role) : 0;
    if (roles.length && roleIndex === -1) {
      continue;
    }

    const name = normalizePinchTabText(node.name);
    let score = roles.length ? (roles.length - roleIndex) * 1000 : 1000;

    if (!texts.length) {
      score += name ? 10 : 0;
    } else {
      let matched = false;
      for (let index = 0; index < texts.length; index += 1) {
        const text = texts[index];
        if (!text) {
          continue;
        }
        if (name === text) {
          score += 500 - index;
          matched = true;
          break;
        }
        if (name.includes(text)) {
          score += 350 - index;
          matched = true;
          break;
        }
        if (text.includes(name) && name) {
          score += 200 - index;
          matched = true;
          break;
        }
      }
      if (!matched) {
        continue;
      }
    }

    if (!best || score > best.score) {
      best = { ...node, score };
    }
  }

  return best;
}

function findPinchTabNodeRef(nodes = [], options = {}) {
  return findPinchTabNode(nodes, options)?.ref || null;
}

function pickPinchTabTab(tabs = [], options = {}) {
  const pageTabs = (tabs || []).filter((tab) => tab.type === 'page');
  if (!pageTabs.length) {
    return null;
  }

  if (options.tabId) {
    const exactTab = pageTabs.find((tab) => tab.id === options.tabId);
    if (exactTab) {
      return exactTab;
    }
  }

  if (options.url) {
    const exactUrl = pageTabs.find((tab) => tab.url === options.url);
    if (exactUrl) {
      return exactUrl;
    }

    const partialUrl = pageTabs.find((tab) => String(tab.url || '').includes(options.url));
    if (partialUrl) {
      return partialUrl;
    }
  }

  if (options.title) {
    const normalizedTitle = normalizePinchTabText(options.title);
    const titleMatch = pageTabs.find((tab) => normalizePinchTabText(tab.title).includes(normalizedTitle));
    if (titleMatch) {
      return titleMatch;
    }
  }

  return pageTabs[pageTabs.length - 1] || null;
}

function pinchTabBaseUrl(config = {}) {
  return String(config.pinchtab?.baseUrl || 'http://127.0.0.1:9867').replace(/\/+$/, '');
}

async function pinchTabFetchJson(config, pathname, options = {}) {
  const response = await fetch(new URL(pathname, `${pinchTabBaseUrl(config)}/`), {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const rawText = await response.text();
  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch (_error) {
    data = null;
  }

  if (!response.ok) {
    const detail = data?.error || data?.message || rawText || `${response.status} ${response.statusText}`;
    throw new Error(detail);
  }

  return data;
}

async function runPinchTab(config, args, options = {}) {
  const candidates = buildPinchTabCommandCandidates(config);
  const env = {
    ...process.env,
    PINCHTAB_URL: pinchTabBaseUrl(config),
  };
  const timeout = Number(options.timeoutMs || config.pinchtab?.timeoutMs || 15000);
  let lastError = null;

  for (const [bin, ...baseArgs] of candidates) {
    try {
      const { stdout } = await execFileAsync(bin, [...baseArgs, ...args], {
        cwd: options.cwd || process.cwd(),
        env,
        timeout,
        maxBuffer: 1024 * 1024 * 8,
      });
      return options.raw ? String(stdout || '') : parsePinchTabJsonOutput(stdout);
    } catch (error) {
      lastError = error;
      if (error?.code === 'ENOENT') {
        continue;
      }
      break;
    }
  }

  const stderr = String(lastError?.stderr || '').trim();
  const stdout = String(lastError?.stdout || '').trim();
  const detail = stderr || stdout || lastError?.message || 'unknown pinchtab failure';
  throw new Error(detail);
}

async function pinchTabHealth(config) {
  return runPinchTab(config, ['health']);
}

async function pinchTabNavigate(config, url) {
  return runPinchTab(config, ['nav', url]);
}

async function pinchTabExtractText(config) {
  return runPinchTab(config, ['text']);
}

async function pinchTabSnapshot(config, args = []) {
  return runPinchTab(config, ['snap', ...args], { raw: true });
}

async function listPinchTabTabs(config) {
  const result = await pinchTabFetchJson(config, '/tabs');
  return result?.tabs || [];
}

async function pinchTabGetText(config, tabId) {
  return pinchTabFetchJson(config, `/tabs/${tabId}/text`);
}

async function pinchTabSnapshotInteractive(config, tabId) {
  return pinchTabFetchJson(config, `/tabs/${tabId}/snapshot?filter=interactive`);
}

async function pinchTabAction(config, tabId, payload) {
  return pinchTabFetchJson(config, `/tabs/${tabId}/action`, {
    method: 'POST',
    body: payload,
  });
}

async function pinchTabResolveTabId(config, options = {}) {
  if (options.tabId) {
    return options.tabId;
  }
  const tabs = await listPinchTabTabs(config);
  const picked = pickPinchTabTab(tabs, options);
  if (!picked) {
    throw new Error('pinchtab tab not found');
  }
  return picked.id;
}

async function pinchTabContainsText(config, { tabId, text }) {
  const resolvedTabId = await pinchTabResolveTabId(config, { tabId });
  const pageText = await pinchTabGetText(config, resolvedTabId);
  return normalizePinchTabText(pageText?.text).includes(normalizePinchTabText(text));
}

async function pinchTabOpenConversation(config, { tabId, conversation }) {
  const resolvedTabId = await pinchTabResolveTabId(config, { tabId });
  const snapshot = await pinchTabSnapshotInteractive(config, resolvedTabId);
  const ref = findPinchTabNodeRef(snapshot.nodes, {
    texts: [conversation?.title, conversation?.preview],
    roles: ['button', 'link'],
  });
  if (!ref) {
    return { ok: false, reason: 'conversation_not_found' };
  }
  const result = await pinchTabAction(config, resolvedTabId, {
    kind: 'click',
    ref,
  });
  return {
    ok: Boolean(result?.success),
    ref,
    via: 'click',
    tabId: resolvedTabId,
  };
}

async function pinchTabSendActiveReply(config, { tabId, text }) {
  const resolvedTabId = await pinchTabResolveTabId(config, { tabId });
  const snapshot = await pinchTabSnapshotInteractive(config, resolvedTabId);
  const textboxRef = findPinchTabNodeRef(snapshot.nodes, {
    roles: ['textbox'],
  });
  if (!textboxRef) {
    return { ok: false, reason: 'input_not_found' };
  }

  await pinchTabAction(config, resolvedTabId, {
    kind: 'fill',
    ref: textboxRef,
    value: text,
  });

  const sendRef = findPinchTabNodeRef(snapshot.nodes, {
    texts: DEFAULT_SEND_BUTTON_TEXTS,
    roles: ['button', 'link'],
  });
  if (!sendRef) {
    const fallback = await pinchTabAction(config, resolvedTabId, {
      kind: 'press',
      ref: textboxRef,
      key: 'Enter',
    });
    return {
      ok: Boolean(fallback?.success),
      via: 'press_enter',
      tabId: resolvedTabId,
    };
  }

  const result = await pinchTabAction(config, resolvedTabId, {
    kind: 'click',
    ref: sendRef,
  });
  return {
    ok: Boolean(result?.success),
    via: sendRef,
    tabId: resolvedTabId,
  };
}

async function pinchTabSendResumeFromActiveConversation(config, { tabId }) {
  const resolvedTabId = await pinchTabResolveTabId(config, { tabId });
  const snapshot = await pinchTabSnapshotInteractive(config, resolvedTabId);
  const ref = findPinchTabNodeRef(snapshot.nodes, {
    texts: DEFAULT_RESUME_BUTTON_TEXTS,
    roles: ['button', 'link'],
  });
  if (!ref) {
    return { ok: false, reason: 'resume_button_not_found' };
  }

  const result = await pinchTabAction(config, resolvedTabId, {
    kind: 'click',
    ref,
  });
  return {
    ok: Boolean(result?.success),
    via: ref,
    tabId: resolvedTabId,
  };
}

async function pinchTabApplyOnActiveTab(config, { tabId, options = {} }) {
  const resolvedTabId = await pinchTabResolveTabId(config, { tabId });
  const initialSnapshot = await pinchTabSnapshotInteractive(config, resolvedTabId);
  const applyRef = findPinchTabNodeRef(initialSnapshot.nodes, {
    texts: options.buttonTextCandidates || DEFAULT_APPLY_BUTTON_TEXTS,
    roles: ['button', 'link'],
  });
  if (!applyRef) {
    return { ok: false, reason: 'apply_button_not_found' };
  }

  const applyResult = await pinchTabAction(config, resolvedTabId, {
    kind: 'click',
    ref: applyRef,
  });
  if (!applyResult?.success) {
    return { ok: false, reason: 'apply_click_failed', button: applyRef };
  }

  if (options.dryRun) {
    return {
      ok: true,
      dryRun: true,
      button: applyRef,
      tabId: resolvedTabId,
    };
  }

  await sleep(600);
  const followupSnapshot = await pinchTabSnapshotInteractive(config, resolvedTabId);
  const textboxRef = findPinchTabNodeRef(followupSnapshot.nodes, {
    roles: ['textbox'],
  });

  if (options.greeting) {
    if (!textboxRef) {
      return { ok: false, reason: 'greeting_input_not_found', button: applyRef };
    }
    await pinchTabAction(config, resolvedTabId, {
      kind: 'fill',
      ref: textboxRef,
      value: options.greeting,
    });
  }

  const confirmRef = findPinchTabNodeRef(followupSnapshot.nodes, {
    texts: DEFAULT_CONFIRM_BUTTON_TEXTS,
    roles: ['button', 'link'],
  });

  if (!confirmRef) {
    if (!textboxRef) {
      return { ok: false, reason: 'submission_unconfirmed', button: applyRef };
    }
    const fallback = await pinchTabAction(config, resolvedTabId, {
      kind: 'press',
      ref: textboxRef,
      key: 'Enter',
    });
    return {
      ok: Boolean(fallback?.success),
      dryRun: false,
      button: applyRef,
      confirm: 'press_enter',
      tabId: resolvedTabId,
    };
  }

  const confirmResult = await pinchTabAction(config, resolvedTabId, {
    kind: 'click',
    ref: confirmRef,
  });
  return {
    ok: Boolean(confirmResult?.success),
    dryRun: false,
    button: applyRef,
    confirm: confirmRef,
    tabId: resolvedTabId,
  };
}

async function pinchTabApplyToJob(config, job, options = {}) {
  const navigation = await pinchTabNavigate(config, job.url);
  const tabId = navigation?.tabId || await pinchTabResolveTabId(config, { url: job.url });
  return pinchTabApplyOnActiveTab(config, {
    tabId,
    options,
  });
}

function createPinchTabActionExecutor(config, options = {}) {
  const tabId = options.tabId || null;
  return {
    backend: 'pinchtab',
    async listConversations() {
      const resolvedTabId = await pinchTabResolveTabId(config, { tabId, url: options.url });
      const snapshot = await pinchTabSnapshotInteractive(config, resolvedTabId);
      return (snapshot.nodes || [])
        .filter((node) => ['button', 'link'].includes(node.role) && normalizeWhitespace(node.name))
        .map((node) => ({
          id: node.ref,
          title: node.name,
          preview: node.name,
          ref: node.ref,
        }));
    },
    async openConversation(conversation) {
      return pinchTabOpenConversation(config, { tabId, conversation });
    },
    async containsText(text) {
      return pinchTabContainsText(config, { tabId, text });
    },
    async sendReply(text) {
      return pinchTabSendActiveReply(config, { tabId, text });
    },
    async sendResume() {
      return pinchTabSendResumeFromActiveConversation(config, { tabId });
    },
  };
}

async function captureWithPinchTab(config, { url, mode = 'page' }) {
  const navigation = await pinchTabNavigate(config, url);
  const textResult = await pinchTabExtractText(config);
  let snapshot = '';
  try {
    snapshot = await pinchTabSnapshot(config, ['-i', '-c']);
  } catch (error) {
    snapshot = `snapshot_failed:${error.message}`;
  }

  return {
    mode,
    navigated: navigation,
    tabId: navigation?.tabId || null,
    title: textResult.title || navigation.title || '',
    url: textResult.url || navigation.url || url,
    readableText: textResult.text || '',
    snapshotText: snapshot,
    looksReady: inferPinchTabReadiness({
      mode,
      snapshotText: snapshot,
      readableText: textResult.text || '',
    }),
  };
}

module.exports = {
  buildPinchTabCommandCandidates,
  captureWithPinchTab,
  createPinchTabActionExecutor,
  findPinchTabNode,
  findPinchTabNodeRef,
  inferPinchTabReadiness,
  listPinchTabTabs,
  parsePinchTabJsonOutput,
  parsePinchTabSnapshotText,
  pickPinchTabTab,
  pinchTabAction,
  pinchTabApplyOnActiveTab,
  pinchTabApplyToJob,
  pinchTabContainsText,
  pinchTabExtractText,
  pinchTabFetchJson,
  pinchTabGetText,
  pinchTabHealth,
  pinchTabNavigate,
  pinchTabOpenConversation,
  pinchTabResolveTabId,
  pinchTabSendActiveReply,
  pinchTabSendResumeFromActiveConversation,
  pinchTabSnapshot,
  pinchTabSnapshotInteractive,
  runPinchTab,
};
