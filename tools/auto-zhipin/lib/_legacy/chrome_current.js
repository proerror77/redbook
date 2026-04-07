const childProcess = require('node:child_process');

const RUN_SHELL_TIMEOUT_MS = 30000;
const MANAGED_TAB_ROLE_KEY = '__codex_zhipin_managed_role';

function encodeSource(source) {
  return Buffer.from(String(source || ''), 'utf8').toString('base64');
}

function makeUtf8EvalExpression(encoded) {
  return `eval(new TextDecoder('utf-8').decode(Uint8Array.from(atob('${encoded}'), c => c.charCodeAt(0))))`;
}

function frontWindowTabRef(tabIndex) {
  if (tabIndex === undefined || tabIndex === null) {
    return 'active tab of front window';
  }
  return `tab ${Number(tabIndex)} of front window`;
}

function runShell(command, options = {}) {
  const timeoutMs = Math.max(1000, Number(options.timeoutMs || RUN_SHELL_TIMEOUT_MS));
  try {
    return childProcess.execFileSync('zsh', ['-lc', command], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs,
    }).trim();
  } catch (error) {
    const message = String(error.stderr || error.message || '');
    if (error.code === 'ETIMEDOUT' || message.includes('ETIMEDOUT')) {
      const wrapped = new Error(
        `Chrome AppleScript command timed out after ${timeoutMs}ms`
        + (options.label ? ` while running ${options.label}` : '')
      );
      wrapped.code = error.code || 'ETIMEDOUT';
      wrapped.cause = error;
      throw wrapped;
    }
    if (message.includes('Apple Script') || message.includes('execution error: “Google Chrome”')) {
      throw new Error(
        'Google Chrome AppleScript 已禁用「允許 AppleScript 執行 JavaScript」。請在 Chrome 開啟「檢視 > 開發者 > 允許 Apple 事件中的 JavaScript」，'
        + '並確保有前台 Chrome 分頁在前。'
      );
    }
    throw error;
  }
}

function makeAppleScript(commandBody) {
  return `osascript <<'APPLESCRIPT'
${commandBody}
APPLESCRIPT`;
}

function evalCurrentTab(source) {
  const encoded = encodeSource(source);
  return runShell(makeAppleScript(`tell application "Google Chrome"
  activate
  set tabRef to active tab of front window
  return execute tabRef javascript "${makeUtf8EvalExpression(encoded)}"
end tell`), { label: 'evalCurrentTab' });
}

function evalFrontWindowTab(tabIndex, source) {
  const encoded = encodeSource(source);
  return runShell(makeAppleScript(`tell application "Google Chrome"
  activate
  set tabRef to ${frontWindowTabRef(tabIndex)}
  return execute tabRef javascript "${makeUtf8EvalExpression(encoded)}"
end tell`), { label: `evalFrontWindowTab:${tabIndex}` });
}

function sleepSync(ms) {
  if (!ms || Number(ms) <= 0) {
    return;
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Number(ms));
}

function evalCurrentTabMainWorld(source, options = {}) {
  const resultAttribute = options.resultAttribute
    || `data-codex-main-world-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const timeoutMs = Math.max(100, Number(options.timeoutMs || 5000));
  const pollMs = Math.max(20, Number(options.pollMs || 100));
  const attrLiteral = JSON.stringify(resultAttribute);
  const payloadScript = [
    '(async function() {',
    `  var attr = ${attrLiteral};`,
    '  try {',
    `    var result = await (${String(source || 'undefined')});`,
    '    document.documentElement.setAttribute(attr, JSON.stringify({ ok: true, result: result }));',
    '  } catch (error) {',
    '    document.documentElement.setAttribute(attr, JSON.stringify({',
    '      ok: false,',
    '      error: String(error),',
    '      stack: error && error.stack ? String(error.stack) : null',
    '    }));',
    '  }',
    '})();',
  ].join('');

  evalCurrentTab(`(() => {
    const script = document.createElement('script');
    script.textContent = ${JSON.stringify(payloadScript)};
    document.documentElement.appendChild(script);
    script.remove();
    return 'injected';
  })()`);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const raw = evalCurrentTab(`(() => {
      const attr = ${attrLiteral};
      const value = document.documentElement.getAttribute(attr);
      if (!value) {
        return '';
      }
      document.documentElement.removeAttribute(attr);
      return value;
    })()`);

    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.ok) {
        const error = new Error(parsed.error || 'main world evaluation failed');
        error.stack = parsed.stack || error.stack;
        throw error;
      }
      return parsed.result;
    }

    sleepSync(pollMs);
  }

  throw new Error(`timed out waiting for main world result: ${resultAttribute}`);
}

function navigateCurrentTab(url, waitMs = 4000) {
  const encodedUrl = JSON.stringify(String(url || ''));
  runShell(`${makeAppleScript(`tell application "Google Chrome"
  activate
  set URL of active tab of front window to ${encodedUrl}
end tell`)}
sleep ${Math.max(0, Number(waitMs || 0)) / 1000}`, { label: 'navigateCurrentTab' });
}

function activateFrontWindowTab(tabIndex, waitMs = 250) {
  const delaySeconds = Math.max(0, Number(waitMs || 0)) / 1000;
  return Number(runShell(makeAppleScript(`tell application "Google Chrome"
  activate
  tell front window
    set active tab index to ${Number(tabIndex)}
    delay ${delaySeconds}
    return active tab index
  end tell
end tell`), { label: `activateFrontWindowTab:${tabIndex}` }) || 0);
}

function navigateFrontWindowTab(tabIndex, url, waitMs = 4000) {
  const encodedUrl = JSON.stringify(String(url || ''));
  runShell(`${makeAppleScript(`tell application "Google Chrome"
  activate
  tell front window
    set active tab index to ${Number(tabIndex)}
    set URL of ${frontWindowTabRef(tabIndex)} to ${encodedUrl}
  end tell
end tell`)}
sleep ${Math.max(0, Number(waitMs || 0)) / 1000}`, { label: `navigateFrontWindowTab:${tabIndex}` });
}

function createFrontWindowTab(url, waitMs = 4000) {
  const encodedUrl = JSON.stringify(String(url || ''));
  const raw = runShell(`${makeAppleScript(`tell application "Google Chrome"
  activate
  if (count of windows) is 0 then
    make new window
  end if
  tell front window
    make new tab at end of tabs with properties {URL:${encodedUrl}}
    set active tab index to (count of tabs)
    return active tab index
  end tell
end tell`)}
sleep ${Math.max(0, Number(waitMs || 0)) / 1000}`, { label: 'createFrontWindowTab' });
  return Number(raw || 0);
}

function listFrontWindowTabs() {
  const encodedRoleReader = encodeSource(`(() => {
    try {
      return sessionStorage.getItem(${JSON.stringify(MANAGED_TAB_ROLE_KEY)}) || '';
    } catch (error) {
      return '';
    }
  })()`);
  const raw = runShell(makeAppleScript(`set rowSep to character id 30
set fieldSep to character id 31
tell application "Google Chrome"
  activate
  if (count of windows) is 0 then
    return ""
  end if
  set activeIndex to active tab index of front window
  set output to ""
  set tabCount to number of tabs in front window
  repeat with idx from 1 to tabCount
    set t to tab idx of front window
    set tabUrl to URL of t as text
    set tabRole to ""
    if tabUrl contains "zhipin.com" then
      try
        set tabRole to execute t javascript "${makeUtf8EvalExpression(encodedRoleReader)}"
      end try
    end if
    set output to output & (idx as text) & fieldSep & tabUrl & fieldSep & (title of t as text) & fieldSep & ((idx = activeIndex) as text) & fieldSep & (tabRole as text) & rowSep
  end repeat
  return output
end tell`), { label: 'listFrontWindowTabs', timeoutMs: 60000 });

  return String(raw || '')
    .split(String.fromCharCode(30))
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [tabIndex, url, title, active, role] = line.split(String.fromCharCode(31));
      return {
        tabIndex: Number(tabIndex),
        url: url || '',
        title: title || '',
        active: String(active || '').toLowerCase() === 'true',
        role: role || '',
      };
    });
}

function getCurrentTabState(bodyLimit = 1800) {
  const source = `(() => JSON.stringify({
    url: location.href,
    title: document.title,
    bodyText: document.body ? document.body.innerText.slice(0, ${Number(bodyLimit) || 1800}) : ''
  }))()`;
  return JSON.parse(evalCurrentTab(source) || '{}');
}

function clickCurrentTabButton(source) {
  return evalCurrentTab(source);
}

function createCurrentTabAdapter() {
  return {
    async evaluate(source) {
      return evalCurrentTab(source);
    },
    async waitMs(ms) {
      sleepSync(ms);
    },
  };
}

module.exports = {
  MANAGED_TAB_ROLE_KEY,
  activateFrontWindowTab,
  createCurrentTabAdapter,
  createFrontWindowTab,
  evalFrontWindowTab,
  evalCurrentTab,
  evalCurrentTabMainWorld,
  navigateCurrentTab,
  navigateFrontWindowTab,
  getCurrentTabState,
  clickCurrentTabButton,
  listFrontWindowTabs,
};
