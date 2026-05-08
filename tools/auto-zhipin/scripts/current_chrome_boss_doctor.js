#!/usr/bin/env node

const http = require('node:http');
const { execFile } = require('node:child_process');

const DEFAULT_PORTS = [9222, 9223, 9224];

function httpJson(url, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      let body = '';
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        try {
          resolve({ ok: true, statusCode: response.statusCode, json: JSON.parse(body) });
        } catch (error) {
          resolve({ ok: false, statusCode: response.statusCode, error: error.message });
        }
      });
    });
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error('timeout'));
    });
    request.on('error', (error) => {
      resolve({ ok: false, error: error.message });
    });
  });
}

function runOsascript(script, timeoutMs = 2000) {
  return new Promise((resolve) => {
    execFile('osascript', ['-e', script], { timeout: timeoutMs }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        stdout: String(stdout || '').trim(),
        stderr: String(stderr || '').trim(),
        error: error ? String(error.message || error) : '',
      });
    });
  });
}

async function checkCdpPorts(ports = DEFAULT_PORTS) {
  const results = [];
  for (const port of ports) {
    const version = await httpJson(`http://127.0.0.1:${port}/json/version`);
    const list = version.ok ? await httpJson(`http://127.0.0.1:${port}/json/list`) : null;
    results.push({
      port,
      available: Boolean(version.ok),
      browser: version.json?.Browser || '',
      pages: Array.isArray(list?.json) ? list.json.length : 0,
      bossPages: Array.isArray(list?.json)
        ? list.json
          .filter((entry) => String(entry.url || '').includes('zhipin.com'))
          .map((entry) => ({
            title: entry.title || '',
            url: entry.url || '',
            type: entry.type || '',
          }))
        : [],
      error: version.ok ? '' : version.error || `HTTP ${version.statusCode || 'unknown'}`,
    });
  }
  return results;
}

async function checkFrontChromeTab() {
  return runOsascript(`
tell application "Google Chrome"
  if (count of windows) is 0 then return "NO_WINDOWS"
  set t to active tab of front window
  return (title of t) & linefeed & (URL of t)
end tell
`);
}

async function checkAppleScriptJavascript() {
  const result = await runOsascript(`
tell application "Google Chrome"
  if (count of windows) is 0 then return "NO_WINDOWS"
  execute active tab of front window javascript "JSON.stringify({href: location.href, title: document.title})"
end tell
`);
  const combined = `${result.stdout}\n${result.stderr}\n${result.error}`;
  const disabled = /允许 Apple 事件中的 JavaScript|JavaScript from Apple Events|not allowed|不能执行 JavaScript/i.test(combined);
  return {
    ...result,
    disabled,
    remediation: disabled
      ? 'Chrome: View > Developer > Allow JavaScript from Apple Events, then rerun this doctor. Do this only if you want AppleScript JS fallback enabled.'
      : '',
  };
}

async function main() {
  const ports = (process.argv.slice(2).find((arg) => arg.startsWith('--ports=')) || '')
    .replace(/^--ports=/, '')
    .split(',')
    .map((value) => Number(value.trim()))
    .filter(Boolean);
  const cdpPorts = await checkCdpPorts(ports.length ? ports : DEFAULT_PORTS);
  const frontChromeTab = await checkFrontChromeTab();
  const appleScriptJavascript = await checkAppleScriptJavascript();
  const cdpAvailable = cdpPorts.some((entry) => entry.available);

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    okToUseCdpScripts: cdpAvailable,
    cdpPorts,
    frontChromeTab,
    appleScriptJavascript,
    diagnosis: cdpAvailable
      ? 'CDP is available; use the existing-page CDP scripts and keep --focus false.'
      : 'CDP is not available on checked ports. Existing CDP scripts cannot attach to the logged-in Chrome page.',
  }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
}

module.exports = {
  checkAppleScriptJavascript,
  checkCdpPorts,
  checkFrontChromeTab,
  httpJson,
};
