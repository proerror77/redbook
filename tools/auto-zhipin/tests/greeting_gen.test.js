const test = require('node:test');
const assert = require('node:assert/strict');

const { generateGreeting } = require('../lib/greeting_gen');

const job = {
  title: 'AI智能体开发工程师',
  company: '某科技公司',
  summary: '负责企业知识库、RAG、工作流和 Agent 落地',
};

const config = {
  profile: {
    summary: '做企业 AI Agent / RAG / 工作流落地',
    focusKeywords: ['AI Agent', 'RAG', '工作流'],
  },
  apply: {
    greeting: '你好，我认真看过岗位描述，对这个方向有兴趣，方便继续沟通吗？',
  },
};

test('generateGreeting returns a static fallback when ANTHROPIC_API_KEY is missing', async () => {
  const fetchCalls = [];
  const result = await generateGreeting({
    job,
    config,
    apiKey: '',
    fetchImpl: async (...args) => {
      fetchCalls.push(args);
      throw new Error('fetch should not be called without api key');
    },
  });

  assert.equal(result.source, 'fallback');
  assert.equal(fetchCalls.length, 0);
  assert.match(result.text, /AI智能体开发工程师|这个方向/);
});

test('generateGreeting returns Claude output when the API call succeeds', async () => {
  const result = await generateGreeting({
    job,
    config,
    apiKey: 'test-key',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        content: [
          { type: 'text', text: '你好，我看过这个岗位，和我最近做的 Agent 工作流落地很匹配，方便继续聊聊吗？' },
        ],
      }),
    }),
  });

  assert.equal(result.source, 'claude');
  assert.match(result.text, /Agent 工作流落地/);
});

test('generateGreeting falls back when Claude returns an error response', async () => {
  const result = await generateGreeting({
    job,
    config,
    apiKey: 'test-key',
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      text: async () => 'invalid x-api-key',
    }),
  });

  assert.equal(result.source, 'fallback');
  assert.match(result.error, /401|invalid x-api-key/i);
  assert.match(result.text, /AI智能体开发工程师|这个方向/);
});
