// tests/risk_detector.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { detectRiskPopup, shouldThrottle, RISK_KEYWORDS } = require('../lib/risk_detector.js');

test('detectRiskPopup flags security/captcha keywords', () => {
  assert.equal(detectRiskPopup('请完成安全验证').risk, true);
  assert.equal(detectRiskPopup('操作太频繁，请稍后再试').risk, true);
  assert.equal(detectRiskPopup('验证码').risk, true);
});

test('detectRiskPopup ignores normal text', () => {
  assert.equal(detectRiskPopup('AI 产品负责人，月薪 70K').risk, false);
  assert.equal(detectRiskPopup('').risk, false);
});

test('shouldThrottle blocks when daily cap reached', () => {
  assert.equal(shouldThrottle({ appliedToday: 120, maxPerDay: 120, lastAppliedAt: Date.now() - 1000, intervalSeconds: 45 }), true);
  assert.equal(shouldThrottle({ appliedToday: 100, maxPerDay: 120, lastAppliedAt: Date.now() - 50000, intervalSeconds: 45 }), false);
});

test('shouldThrottle enforces interval between applies', () => {
  const recent = shouldThrottle({ appliedToday: 5, maxPerDay: 120, lastAppliedAt: Date.now() - 1000, intervalSeconds: 45 });
  const waited = shouldThrottle({ appliedToday: 5, maxPerDay: 120, lastAppliedAt: Date.now() - 50000, intervalSeconds: 45 });
  assert.equal(recent, true);
  assert.equal(waited, false);
});
