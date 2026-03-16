const test = require('node:test');
const assert = require('node:assert/strict');

const { classifyChatPageState, detectResumeFlowState, isTransientNavigationError } = require('../lib/zhipin');

test('classifyChatPageState marks ready shells as chat_ready', () => {
  const result = classifyChatPageState({
    url: 'https://www.zhipin.com/web/geek/chat?ka=header-message',
    bodyText: '',
    looksReady: true,
  });

  assert.deepEqual(result, {
    kind: 'chat_ready',
    reason: null,
  });
});

test('classifyChatPageState treats login redirect as auth_gate', () => {
  const result = classifyChatPageState({
    url: 'https://www.zhipin.com/web/user/',
    bodyText: '',
    looksReady: false,
  });

  assert.deepEqual(result, {
    kind: 'auth_gate',
    reason: 'redirected:https://www.zhipin.com/web/user/',
  });
});

test('classifyChatPageState treats abnormal access text as auth_gate', () => {
  const result = classifyChatPageState({
    url: 'https://www.zhipin.com/web/geek/chat?ka=header-message',
    bodyText: '当前 IP 地址可能存在异常访问行为，完成验证后即可正常使用',
    looksReady: false,
  });

  assert.equal(result.kind, 'auth_gate');
  assert.equal(result.reason, 'body:异常访问行为');
});

test('classifyChatPageState treats restricted access as restricted and keeps recovery time', () => {
  const result = classifyChatPageState({
    url: 'https://www.zhipin.com/web/geek/chat?ka=header-message',
    bodyText: '访问受限 您的账户存在异常行为，已暂时被限制访问！ 将于 2026-03-12 15:31 恢复正常',
    looksReady: false,
  });

  assert.equal(result.kind, 'restricted');
  assert.equal(result.reason, 'body:访问受限');
  assert.equal(result.recoveryAt, '2026-03-12T07:31:00.000Z');
});

test('classifyChatPageState keeps neutral pages in loading state', () => {
  const result = classifyChatPageState({
    url: 'https://www.zhipin.com/web/geek/chat?ka=header-message',
    bodyText: '加载中，请稍候',
    looksReady: false,
  });

  assert.deepEqual(result, {
    kind: 'loading',
    reason: null,
  });
});

test('detectResumeFlowState detects inline resume actions and consent prompts', () => {
  const result = detectResumeFlowState('我想要一份您的附件简历，您是否同意 发简历 换电话 换微信');
  assert.deepEqual(result, {
    alreadySent: false,
    needsConsent: true,
    hasInlineActions: true,
  });
});

test('detectResumeFlowState detects delivered resume markers', () => {
  const result = detectResumeFlowState('附件简历已发送给对方，点击预览附件简历');
  assert.deepEqual(result, {
    alreadySent: true,
    needsConsent: false,
    hasInlineActions: false,
  });
});

test('isTransientNavigationError detects navigation context resets', () => {
  assert.equal(
    isTransientNavigationError(new Error('Execution context was destroyed, most likely because of a navigation')),
    true
  );
  assert.equal(isTransientNavigationError(new Error('Something else failed')), false);
});
