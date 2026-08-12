// tests/feishu_notify.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { pushFeishuMessage, isFeishuConfigured, FEISHU_CMD } = require('../lib/feishu_notify.js');

test('isFeishuConfigured detects lark-cli availability', () => {
  // 在测试环境不真正调用 lark-cli，只验证函数存在且返回 boolean
  assert.equal(typeof isFeishuConfigured(), 'boolean');
});

test('FEISHU_CMD defaults to lark-cli', () => {
  assert.equal(FEISHU_CMD, 'lark-cli');
});

test('pushFeishuMessage builds command args without executing', async () => {
  // 注入 fake runner 验证参数构造
  const calls = [];
  const result = await pushFeishuMessage({ title: '面试邀约', body: 'xxx', runner: (args) => { calls.push(args); return Promise.resolve(''); } });
  assert.ok(calls.length === 1);
  assert.ok(calls[0].some((a) => a === 'im' || a.includes('message')));
});
