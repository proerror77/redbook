const test = require('node:test');
const assert = require('node:assert/strict');

const { pickResumeButtonLabel, messageListContainsText } = require('../lib/zhipin');

test('pickResumeButtonLabel returns the first built-in resume send label', () => {
  assert.equal(
    pickResumeButtonLabel(['继续沟通', '发送简历', '其他按钮']),
    '发送简历'
  );
});

test('messageListContainsText matches normalized chat text', () => {
  assert.equal(
    messageListContainsText(
      [
        { text: '你好，我这边也在做 企业 AI Agent 落地。' },
        { text: '第二条消息' },
      ],
      '企业 AI Agent 落地'
    ),
    true
  );
});
