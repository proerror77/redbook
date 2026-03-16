const test = require('node:test');
const assert = require('node:assert/strict');

const {
  bodyShowsApplySuccess,
  classifyApplyOutcome,
} = require('../lib/apply_flow');

test('bodyShowsApplySuccess treats sent-message modal as a successful apply', () => {
  const bodyText = [
    '已向BOSS发送消息',
    '你好，看过您的职位，觉得比较适合自己，希望有机会能和你相互进一步了解。谢谢',
    '留在此页',
    '继续沟通',
  ].join('\n');

  assert.equal(bodyShowsApplySuccess(bodyText), true);
});

test('classifyApplyOutcome prefers stay-on-page modal success', () => {
  const result = classifyApplyOutcome({
    afterBodyText: '已向BOSS发送消息\n留在此页\n继续沟通',
    afterUrl: 'https://www.zhipin.com/job_detail/example.html',
    modalResult: { found: true, clicked: true, text: '留在此页' },
  });

  assert.deepEqual(result, {
    applied: true,
    mode: 'sent_message_modal_stay',
  });
});

test('classifyApplyOutcome treats chat navigation as successful apply', () => {
  const result = classifyApplyOutcome({
    afterBodyText: 'BOSS直聘',
    afterUrl: 'https://www.zhipin.com/web/geek/chat?id=abc&jobId=123',
    modalResult: { found: false, clicked: false },
  });

  assert.deepEqual(result, {
    applied: true,
    mode: 'chat_navigation',
  });
});
