// tests/chat_classifier.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyMessage, INTERVIEW_KEYWORDS } = require('../lib/chat_classifier.js');

test('classifyMessage flags interview invitations', () => {
  assert.equal(classifyMessage('你好，看了你的简历很匹配，方便约个时间面试吗？').category, 'interview');
  assert.equal(classifyMessage('您看明天下午方便视频面试吗？').category, 'interview');
  assert.equal(classifyMessage('这个岗位电话面试，您什么时候方便？').category, 'interview');
});

test('classifyMessage detects spam/ads', () => {
  assert.equal(classifyMessage('【急聘】高薪兼职刷单，日结！').category, 'spam');
});

test('classifyMessage falls back to unknown for plain chat', () => {
  assert.equal(classifyMessage('你好，在吗？').category, 'unknown');
  assert.equal(classifyMessage('').category, 'unknown');
});

test('INTERVIEW_KEYWORDS is non-empty and exported', () => {
  assert.ok(INTERVIEW_KEYWORDS.length > 0);
});
