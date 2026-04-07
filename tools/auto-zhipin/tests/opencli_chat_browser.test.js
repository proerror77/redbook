const test = require('node:test');
const assert = require('node:assert/strict');

const { requireBossCoreModule } = require('../lib/opencli_core');

test('shared chat-browser module is available from opencli boss core', () => {
  const chatBrowser = requireBossCoreModule('chat-browser');
  assert.equal(typeof chatBrowser.collectChatSnapshot, 'function');
  assert.equal(typeof chatBrowser.openConversation, 'function');
  assert.equal(typeof chatBrowser.sendActiveReply, 'function');
  assert.equal(typeof chatBrowser.sendResumeFromActiveConversation, 'function');
});

test('chat-core conversation selectors target conversation items instead of the whole chat-user container', () => {
  const chatCore = requireBossCoreModule('chat-core');
  assert.equal(chatCore.CONVERSATION_ITEM_SELECTORS.includes('.user-list-content li'), true);
  assert.equal(chatCore.CONVERSATION_ITEM_SELECTORS.includes('.user-list li'), true);
  assert.equal(chatCore.CONVERSATION_ITEM_SELECTORS.includes('.chat-user'), false);
  assert.equal(chatCore.CONVERSATION_ITEM_SELECTORS.includes('[class*=chat-user]'), false);
});

test('chat-core message selectors target top-level message items instead of nested content fragments', () => {
  const chatCore = requireBossCoreModule('chat-core');
  assert.equal(chatCore.MESSAGE_ITEM_SELECTORS.includes('.chat-record li.message-item'), true);
  assert.equal(chatCore.MESSAGE_ITEM_SELECTORS.includes('.chat-record [class*=message]'), false);
  assert.equal(chatCore.MESSAGE_ITEM_SELECTORS.includes('[class*=chat-record] [class*=message]'), false);
});

test('shared hooks and result-model modules are available from opencli boss core', () => {
  const hooks = requireBossCoreModule('hooks');
  const resultModel = requireBossCoreModule('result-model');
  assert.equal(typeof hooks.runActionHooks, 'function');
  assert.equal(typeof resultModel.buildActionResult, 'function');
});

test('buildOpenConversationScript targets the actual friend-content card inside list items', () => {
  const { buildOpenConversationScript } = requireBossCoreModule('chat-browser');
  const script = buildOpenConversationScript({
    id: 'conversation-1',
    title: '朱丰昊',
    domIndex: 0,
    selector: '.user-list-content li',
  });
  assert.match(script, /friend-content/);
});

test('collectChatSnapshot parses serialized snapshot payloads', async () => {
  const { collectChatSnapshot } = requireBossCoreModule('chat-browser');
  const adapter = {
    async evaluate() {
      return JSON.stringify({
        conversations: [{ id: 'c1', title: 'Boss A' }],
        activeConversation: { id: 'c1', title: 'Boss A' },
        messages: [{ id: 'm1', text: '你好' }],
      });
    },
  };

  const snapshot = await collectChatSnapshot(adapter, 3);
  assert.equal(snapshot.conversations.length, 1);
  assert.equal(snapshot.activeConversation.id, 'c1');
  assert.equal(snapshot.messages[0].id, 'm1');
});

test('extractConversations and extractMessages reuse the snapshot payload', async () => {
  const {
    extractConversations,
    extractMessages,
    extractActiveConversation,
  } = requireBossCoreModule('chat-browser');
  const adapter = {
    async evaluate() {
      return JSON.stringify({
        conversations: [{ id: 'c1', title: 'Boss A' }],
        activeConversation: { id: 'c1', title: 'Boss A' },
        messages: [{ id: 'm1', text: '你好', conversationId: 'c1' }],
      });
    },
  };

  const conversations = await extractConversations(adapter, 5);
  const activeConversation = await extractActiveConversation(adapter, null, 5);
  const messages = await extractMessages(adapter, 'c1', 5);

  assert.equal(conversations[0].id, 'c1');
  assert.equal(activeConversation.id, 'c1');
  assert.equal(messages[0].conversationId, 'c1');
});

test('openConversation waits after a successful click result', async () => {
  const { openConversation } = requireBossCoreModule('chat-browser');
  const waits = [];
  const adapter = {
    async evaluate() {
      return JSON.stringify({ ok: true, title: 'Boss A' });
    },
    async waitMs(ms) {
      waits.push(ms);
    },
  };

  const result = await openConversation(adapter, { id: 'c1', title: 'Boss A' });
  assert.equal(result.ok, true);
  assert.deepEqual(waits, [1000]);
});

test('sendActiveReply waits after a successful send result', async () => {
  const { sendActiveReply } = requireBossCoreModule('chat-browser');
  const waits = [];
  const adapter = {
    async evaluate() {
      return JSON.stringify({ ok: true, via: '发送' });
    },
    async waitMs(ms) {
      waits.push(ms);
    },
  };

  const result = await sendActiveReply(adapter, '你好');
  assert.equal(result.ok, true);
  assert.equal(result.via, '发送');
  assert.equal(result.action, 'send_message');
  assert.equal(result.status, 'success');
  assert.deepEqual(waits, [800]);
});

test('sendActiveReply returns standardized result fields and fires lifecycle hooks', async () => {
  const { sendActiveReply } = requireBossCoreModule('chat-browser');
  const events = [];
  const adapter = {
    async evaluate() {
      return JSON.stringify({ ok: true, via: '发送' });
    },
    async waitMs() {},
  };

  const result = await sendActiveReply(adapter, '你好', {
    hooks: {
      async beforeAction(action, context) {
        events.push(['before', action, context.text]);
      },
      async afterAction(action, actionResult) {
        events.push(['after', action, actionResult.status]);
      },
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.action, 'send_message');
  assert.equal(result.status, 'success');
  assert.equal(result.reason, null);
  assert.deepEqual(result.normalized, { text: '你好', dryRun: false });
  assert.deepEqual(events, [
    ['before', 'send_message', '你好'],
    ['after', 'send_message', 'success'],
  ]);
});

test('sendActiveReply supports dry-run without waiting for a send action', async () => {
  const { sendActiveReply } = requireBossCoreModule('chat-browser');
  const waits = [];
  const adapter = {
    async evaluate() {
      return JSON.stringify({ ok: true, via: 'dry_run', dryRun: true, echoedValue: '测试 dry run' });
    },
    async waitMs(ms) {
      waits.push(ms);
    },
  };

  const result = await sendActiveReply(adapter, '测试 dry run', { dryRun: true });
  assert.equal(result.ok, true);
  assert.equal(result.via, 'dry_run');
  assert.equal(result.dryRun, true);
  assert.equal(result.echoedValue, '测试 dry run');
  assert.equal(result.action, 'send_message');
  assert.equal(result.status, 'success');
  assert.deepEqual(waits, []);
});

test('buildSendActiveReplyScript clears the editor and aborts when echoed text mismatches', () => {
  const { buildSendActiveReplyScript } = requireBossCoreModule('chat-browser');
  const script = buildSendActiveReplyScript('企业 AI 应用');
  assert.match(script, /reply_text_mismatch/);
  assert.match(script, /clearInput/);
  assert.match(script, /echoedValue/);
});

test('sendResumeFromActiveConversation waits after a successful send result', async () => {
  const { sendResumeFromActiveConversation } = requireBossCoreModule('chat-browser');
  const waits = [];
  const adapter = {
    async evaluate() {
      return JSON.stringify({ ok: true, via: '发送简历' });
    },
    async waitMs(ms) {
      waits.push(ms);
    },
  };

  const result = await sendResumeFromActiveConversation(adapter);
  assert.equal(result.ok, true);
  assert.equal(result.via, '发送简历');
  assert.equal(result.action, 'send_resume');
  assert.equal(result.status, 'success');
  assert.deepEqual(waits, [1000]);
});

test('sendResumeFromActiveConversation supports dry-run without waiting for a real send', async () => {
  const { sendResumeFromActiveConversation } = requireBossCoreModule('chat-browser');
  const waits = [];
  const adapter = {
    async evaluate() {
      return JSON.stringify({ ok: true, via: 'dry_run', dryRun: true, initial: '发送简历' });
    },
    async waitMs(ms) {
      waits.push(ms);
    },
  };

  const result = await sendResumeFromActiveConversation(adapter, { dryRun: true });
  assert.equal(result.ok, true);
  assert.equal(result.via, 'dry_run');
  assert.equal(result.dryRun, true);
  assert.equal(result.initial, '发送简历');
  assert.equal(result.action, 'send_resume');
  assert.equal(result.status, 'success');
  assert.deepEqual(result.normalized, { delivery: 'dry_run', dryRun: true });
  assert.deepEqual(waits, []);
});

test('sendResumeFromActiveConversation preserves the dry-run flag even when resume was already sent', async () => {
  const { sendResumeFromActiveConversation } = requireBossCoreModule('chat-browser');
  const adapter = {
    async evaluate() {
      return JSON.stringify({ ok: true, via: 'already_sent' });
    },
    async waitMs() {
      throw new Error('should not wait during dry-run');
    },
  };

  const result = await sendResumeFromActiveConversation(adapter, { dryRun: true });
  assert.equal(result.ok, true);
  assert.equal(result.via, 'already_sent');
  assert.equal(result.dryRun, true);
  assert.deepEqual(result.normalized, { delivery: 'already_sent', dryRun: true });
});
