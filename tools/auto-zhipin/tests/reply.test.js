const test = require('node:test');
const assert = require('node:assert/strict');

const { buildDraftReply, classifyReplyIntent } = require('../lib/reply');

const config = {
  profile: {
    summary: '资深 AI Agent / RAG / 企业智能化落地工程师',
    focusKeywords: ['AI Agent', 'RAG', '企业智能化'],
  },
  chat: {
    replyTemplates: {
      default: 'default-reply',
      resume: 'resume-reply',
      cv_request: 'resume-button-reply',
      interview: 'interview-reply',
      salary: 'salary-reply',
    },
  },
};

test('classifyReplyIntent detects resume intent', () => {
  assert.equal(classifyReplyIntent('方便发我一版简历吗？'), 'cv_request');
});

test('classifyReplyIntent detects interview intent', () => {
  assert.equal(classifyReplyIntent('这周方便约个面试时间吗'), 'interview');
});

test('classifyReplyIntent detects explicit rejection intent', () => {
  assert.equal(classifyReplyIntent('这个岗位暂不匹配，感谢关注'), 'explicit_rejection');
});

test('buildDraftReply selects the configured template', () => {
  const draft = buildDraftReply({ text: '这个岗位薪资范围大概多少？' }, config);
  assert.deepEqual(draft, {
    intent: 'salary',
    text: 'salary-reply',
  });
});

test('buildDraftReply builds a short rejection follow-up from profile and job context', () => {
  const draft = buildDraftReply(
    { text: '这个岗位已招满，暂不匹配。' },
    config,
    {
      job: {
        title: 'AI应用架构师',
        summary: '负责企业知识库、RAG、智能体工作流落地',
      },
    }
  );

  assert.equal(draft.intent, 'explicit_rejection');
  assert.match(draft.text, /AI Agent|RAG|企业智能化/);
  assert.match(draft.text, /后续|如果后面/);
});
