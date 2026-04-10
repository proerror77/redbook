const test = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');

function loadChromeCurrent() {
  const modulePath = require.resolve('../lib/chrome_current');
  delete require.cache[modulePath];
  return require('../lib/chrome_current');
}

test('evalCurrentTab passes a 30s timeout to execFileSync', (t) => {
  const calls = [];
  t.mock.method(childProcess, 'execFileSync', (...args) => {
    calls.push(args);
    return 'ok';
  });

  const { evalCurrentTab } = loadChromeCurrent();
  const result = evalCurrentTab('1 + 1');

  assert.equal(result, 'ok');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][2].timeout, 30000);
});

test('evalCurrentTab rewrites exec timeout errors with command context', (t) => {
  t.mock.method(childProcess, 'execFileSync', () => {
    const error = new Error('spawn ETIMEDOUT');
    error.code = 'ETIMEDOUT';
    error.signal = 'SIGTERM';
    throw error;
  });

  const { evalCurrentTab } = loadChromeCurrent();

  assert.throws(
    () => evalCurrentTab('1 + 1'),
    /timed out after 30000ms/i
  );
});

test('evalFrontWindowTab targets the requested tab in the front window', (t) => {
  const calls = [];
  t.mock.method(childProcess, 'execFileSync', (...args) => {
    calls.push(args);
    return 'ok';
  });

  const { evalFrontWindowTab } = loadChromeCurrent();
  const result = evalFrontWindowTab(2, '1 + 1');

  assert.equal(result, 'ok');
  assert.match(calls[0][1][1], /tab 2 of front window/);
});

test('evalCurrentTab decodes injected source as utf-8 before eval', (t) => {
  const calls = [];
  t.mock.method(childProcess, 'execFileSync', (...args) => {
    calls.push(args);
    return 'ok';
  });

  const { evalCurrentTab } = loadChromeCurrent();
  evalCurrentTab('(() => "企业 AI 应用")()');

  assert.match(calls[0][1][1], /TextDecoder\('utf-8'\)/);
  assert.doesNotMatch(calls[0][1][1], /eval\(atob\('/);
});

test('listFrontWindowTabs uses the same utf-8 decode path for managed role reads', (t) => {
  const calls = [];
  t.mock.method(childProcess, 'execFileSync', (...args) => {
    calls.push(args);
    return '';
  });

  const { listFrontWindowTabs } = loadChromeCurrent();
  listFrontWindowTabs();

  assert.match(calls[0][1][1], /TextDecoder\('utf-8'\)/);
  assert.doesNotMatch(calls[0][1][1], /eval\(atob\('/);
});

test('activateFrontWindowTab waits briefly for Chrome to settle the active tab switch', (t) => {
  const calls = [];
  t.mock.method(childProcess, 'execFileSync', (...args) => {
    calls.push(args);
    return '12';
  });

  const { activateFrontWindowTab } = loadChromeCurrent();
  const result = activateFrontWindowTab(12);

  assert.equal(result, 12);
  assert.match(calls[0][1][1], /set active tab index to 12/);
  assert.match(calls[0][1][1], /delay 0\.25/);
});

test('listFrontWindowTabs parses AppleScript tab rows', (t) => {
  t.mock.method(childProcess, 'execFileSync', () => {
    return `1${String.fromCharCode(31)}https://www.zhipin.com/web/geek/jobs${String.fromCharCode(31)}Jobs${String.fromCharCode(31)}true${String.fromCharCode(31)}jobs${String.fromCharCode(30)}2${String.fromCharCode(31)}https://www.zhipin.com/web/geek/chat?ka=header-message${String.fromCharCode(31)}Chat${String.fromCharCode(31)}false${String.fromCharCode(31)}chat${String.fromCharCode(30)}`;
  });

  const { listFrontWindowTabs } = loadChromeCurrent();
  const tabs = listFrontWindowTabs();

  assert.equal(tabs.length, 2);
  assert.deepEqual(tabs[0], {
    tabIndex: 1,
    url: 'https://www.zhipin.com/web/geek/jobs',
    title: 'Jobs',
    active: true,
    role: 'jobs',
  });
});
