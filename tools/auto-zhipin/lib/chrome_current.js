const { execFileSync } = require('node:child_process');

function runShell(command) {
  return execFileSync('zsh', ['-lc', command], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function makeAppleScript(commandBody) {
  return `osascript <<'APPLESCRIPT'
${commandBody}
APPLESCRIPT`;
}

function evalCurrentTab(source) {
  const encoded = Buffer.from(String(source || ''), 'utf8').toString('base64');
  return runShell(makeAppleScript(`tell application "Google Chrome"
  set tabRef to active tab of front window
  return execute tabRef javascript "eval(atob('${encoded}'))"
end tell`));
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
sleep ${Math.max(0, Number(waitMs || 0)) / 1000}`);
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

module.exports = {
  evalCurrentTab,
  evalCurrentTabMainWorld,
  navigateCurrentTab,
  getCurrentTabState,
  clickCurrentTabButton,
};
