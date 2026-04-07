const test = require('node:test');
const assert = require('node:assert/strict');

const { buildReplyPlanPrompt, generateReplyPlan } = require('../lib/reply_llm');

const message = {
  text: '可以发我一版简历吗？如果方便的话也同步一下项目经历。',
};

const conversation = {
  id: 'conversation-1',
  title: '王女士 / AI Agent 工程师',
};

const job = {
  title: 'AI Agent应用开发',
  company: '某科技公司',
  summary: '负责企业知识库、RAG、Agent 工作流落地',
};

const config = {
  profile: {
    summary: '做企业 AI Agent / RAG / 工作流落地',
    focusKeywords: ['AI Agent', 'RAG', '工作流'],
  },
  chat: {
    replyProvider: 'anthropic',
    replyModel: 'claude-3-5-haiku-latest',
    replyTimeoutMs: 15000,
  },
};

test('generateReplyPlan disables automation when ANTHROPIC_API_KEY is missing', async () => {
  const fetchCalls = [];
  const result = await generateReplyPlan({
    message,
    conversation,
    job,
    config,
    apiKey: '',
    fetchImpl: async (...args) => {
      fetchCalls.push(args);
      throw new Error('fetch should not be called without api key');
    },
  });

  assert.equal(result.source, 'disabled');
  assert.equal(result.intent, 'no_action');
  assert.equal(result.replyText, '');
  assert.equal(fetchCalls.length, 0);
});

test('generateReplyPlan returns Claude structured output when the API call succeeds', async () => {
  const result = await generateReplyPlan({
    message,
    conversation,
    job,
    config,
    apiKey: 'test-key',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              intent: 'cv_request',
              shouldCreateDraft: true,
              shouldSendResumeButton: true,
              replyText: '可以，我先通过站内简历发你，也可以继续同步一下你们更完整的 JD。',
            }),
          },
        ],
      }),
    }),
  });

  assert.equal(result.source, 'claude');
  assert.equal(result.intent, 'cv_request');
  assert.equal(result.shouldCreateDraft, true);
  assert.equal(result.shouldSendResumeButton, true);
  assert.match(result.replyText, /站内简历|JD/);
});

test('generateReplyPlan disables automation when Claude returns an error response', async () => {
  const result = await generateReplyPlan({
    message,
    conversation,
    job,
    config,
    apiKey: 'test-key',
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      text: async () => 'invalid x-api-key',
    }),
  });

  assert.equal(result.source, 'disabled');
  assert.equal(result.intent, 'no_action');
  assert.match(result.error, /401|invalid x-api-key/i);
});

test('buildReplyPlanPrompt includes recent history context when available', () => {
  const prompt = buildReplyPlanPrompt({
    message,
    conversation: {
      ...conversation,
      historyContext: [
        '对方：可以发我一版简历吗？',
        '我：可以，我先走站内简历。',
        '对方：再同步一下项目经历。',
      ],
    },
    job,
    config,
  });

  assert.match(prompt, /最近会话历史/);
  assert.match(prompt, /对方：可以发我一版简历吗/);
  assert.match(prompt, /我：可以，我先走站内简历/);
});
