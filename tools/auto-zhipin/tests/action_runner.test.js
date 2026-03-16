const test = require('node:test');
const assert = require('node:assert/strict');

const { buildActionsForIntent, pickRunnableActions, processPendingActions } = require('../lib/action_runner');

const config = {
  profile: {
    summary: '资深 AI Agent / RAG / 企业智能化落地工程师',
    focusKeywords: ['AI Agent', 'RAG', '企业智能化'],
  },
  chat: {
    autoSendResumeButton: true,
    autoRejectionFollowup: true,
    maxAutoActionsPerRun: 2,
  },
};

test('buildActionsForIntent creates a send_resume_button action for CV requests', () => {
  const actions = buildActionsForIntent({
    intent: 'cv_request',
    message: { id: 'message-1', conversationId: 'conversation-1', text: '麻烦发一下简历' },
    conversation: { id: 'conversation-1', title: '某公司' },
    config,
  });

  assert.equal(actions.length, 1);
  assert.equal(actions[0].type, 'send_resume_button');
});

test('buildActionsForIntent creates one rejection follow-up action for explicit rejections', () => {
  const actions = buildActionsForIntent({
    intent: 'explicit_rejection',
    message: { id: 'message-2', conversationId: 'conversation-1', text: '这个岗位暂不匹配' },
    conversation: { id: 'conversation-1', title: '某公司' },
    job: { title: 'AI应用架构师', summary: '负责企业知识库与智能体工作流' },
    config,
  });

  assert.equal(actions.length, 1);
  assert.equal(actions[0].type, 'send_text_reply');
  assert.match(actions[0].payload.text, /AI Agent|RAG|企业智能化/);
});

test('pickRunnableActions caps automatic actions per run', () => {
  const actions = pickRunnableActions(
    [
      { id: 'a1', status: 'pending', createdAt: '2026-03-11T00:00:01.000Z' },
      { id: 'a2', status: 'pending', createdAt: '2026-03-11T00:00:02.000Z' },
      { id: 'a3', status: 'completed', createdAt: '2026-03-11T00:00:03.000Z' },
      { id: 'a4', status: 'pending', createdAt: '2026-03-11T00:00:04.000Z' },
    ],
    config
  );

  assert.deepEqual(actions.map((item) => item.id), ['a1', 'a2']);
});

test('processPendingActions can drive a generic executor and complete a resume action', async () => {
  const statusChanges = [];
  const store = {
    getPendingActions() {
      return [{
        id: 'action-1',
        conversationId: 'conversation-1',
        conversationTitle: '王女士',
        type: 'send_resume_button',
        status: 'pending',
        createdAt: '2026-03-12T00:00:00.000Z',
      }];
    },
    markActionStatus(actionId, status, result = {}) {
      statusChanges.push({ actionId, status, result });
    },
  };

  const executor = {
    async listConversations() {
      return [{ id: 'conversation-1', title: '王女士 AI Agent 工程师' }];
    },
    async openConversation(conversation) {
      return conversation;
    },
    async sendResume() {
      return { ok: true, via: 'e9' };
    },
  };

  const summary = await processPendingActions({
    store,
    config,
    executor,
  });

  assert.deepEqual(summary, {
    attempted: 1,
    completed: 1,
    failed: 0,
    skipped: 0,
  });
  assert.deepEqual(statusChanges.map((item) => item.status), ['in_progress', 'completed']);
  assert.equal(statusChanges[1].result.via, 'e9');
});

test('processPendingActions skips duplicate reply text when executor already sees it on page', async () => {
  const statusChanges = [];
  const store = {
    getPendingActions() {
      return [{
        id: 'action-2',
        conversationId: 'conversation-2',
        conversationTitle: '李先生',
        type: 'send_text_reply',
        status: 'pending',
        createdAt: '2026-03-12T00:00:00.000Z',
        payload: {
          text: '如果后续有更偏智能体应用的岗位，也欢迎再联系。',
        },
      }];
    },
    markActionStatus(actionId, status, result = {}) {
      statusChanges.push({ actionId, status, result });
    },
  };

  const executor = {
    async listConversations() {
      return [{ id: 'conversation-2', title: '李先生 / 不合适' }];
    },
    async openConversation(conversation) {
      return conversation;
    },
    async containsText(text) {
      return text.includes('智能体应用');
    },
    async sendReply() {
      throw new Error('sendReply should not be called when text already exists');
    },
  };

  const summary = await processPendingActions({
    store,
    config,
    executor,
  });

  assert.deepEqual(summary, {
    attempted: 1,
    completed: 1,
    failed: 0,
    skipped: 0,
  });
  assert.equal(statusChanges[1].result.via, 'already_present');
});
