const test = require('node:test');
const assert = require('node:assert/strict');

const {
  classifySiteHealth,
  classifySiteHealthWithHooks,
  extractRestrictedRecoveryAt,
  isCircuitBreakerActive,
} = require('../lib/site_health');

test('extractRestrictedRecoveryAt parses recovery time from restricted page copy', () => {
  const recoveryAt = extractRestrictedRecoveryAt(`
    您的账户存在异常行为，已暂时被限制访问！
    将于 2026-03-12 15:31 恢复正常
  `);

  assert.equal(recoveryAt, '2026-03-12T07:31:00.000Z');
});

test('classifySiteHealth marks restricted pages and keeps recovery time', () => {
  const result = classifySiteHealth({
    url: 'https://www.zhipin.com/web/geek/jobs',
    title: '访问受限-BOSS直聘',
    bodyText: '访问受限 您的账户存在异常行为，已暂时被限制访问！ 将于 2026-03-12 15:31 恢复正常',
    looksReady: false,
  });

  assert.equal(result.status, 'restricted');
  assert.equal(result.reason, 'body:访问受限');
  assert.equal(result.recoveryAt, '2026-03-12T07:31:00.000Z');
});

test('classifySiteHealth distinguishes auth gate from restricted', () => {
  const result = classifySiteHealth({
    url: 'https://www.zhipin.com/web/user/safe/verify-slider',
    title: '安全验证 - BOSS直聘',
    bodyText: '点击按钮进行验证 当前 IP 地址可能存在异常访问行为',
    looksReady: false,
  });

  assert.equal(result.status, 'auth_gate');
  assert.match(result.reason, /redirected:|body:/);
});

test('classifySiteHealth reports healthy when expected shell is present', () => {
  const result = classifySiteHealth({
    url: 'https://www.zhipin.com/web/geek/chat?ka=header-message',
    title: 'BOSS直聘',
    bodyText: '',
    looksReady: true,
  });

  assert.deepEqual(result, {
    status: 'healthy',
    reason: null,
    recoveryAt: null,
  });
});

test('classifySiteHealthWithHooks emits onHealthChange with context', async () => {
  const events = [];
  const result = await classifySiteHealthWithHooks({
    url: 'https://www.zhipin.com/web/geek/chat?ka=header-message',
    title: 'BOSS直聘',
    bodyText: '',
    looksReady: true,
  }, {
    context: { source: 'site_health_test' },
    hooks: {
      async onHealthChange(health, context) {
        events.push({ health, context });
      },
    },
  });

  assert.equal(result.status, 'healthy');
  assert.equal(events.length, 1);
  assert.equal(events[0].health.status, 'healthy');
  assert.deepEqual(events[0].context, { source: 'site_health_test' });
});

test('isCircuitBreakerActive only blocks while restricted cooldown is active', () => {
  assert.equal(
    isCircuitBreakerActive({
      status: 'restricted',
      recoveryAt: '2099-03-12T07:31:00.000Z',
    }, Date.parse('2099-03-12T07:30:00.000Z')),
    true
  );

  assert.equal(
    isCircuitBreakerActive({
      status: 'restricted',
      recoveryAt: '2026-03-12T07:31:00.000Z',
    }, Date.parse('2026-03-12T07:32:00.000Z')),
    false
  );
});
