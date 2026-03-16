const { normalizeWhitespace } = require('./utils');

function pickProfileFocus(config, job = {}) {
  const profile = config.profile || {};
  const focusKeywords = Array.isArray(profile.focusKeywords) ? profile.focusKeywords : [];
  const jobText = normalizeWhitespace(`${job.title || ''} ${job.summary || ''}`).toLowerCase();
  const matched = focusKeywords.filter((keyword) => jobText.includes(String(keyword).toLowerCase()));

  if (matched.length) {
    return matched.slice(0, 2).join(' / ');
  }
  if (focusKeywords.length) {
    return focusKeywords.slice(0, 2).join(' / ');
  }
  return normalizeWhitespace(profile.summary || 'AI Agent / RAG / 企业智能化');
}

function classifyReplyIntent(text) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) {
    return 'default';
  }
  if (/不合适|暂不匹配|已招满|感谢关注|暂时不考虑/i.test(normalized)) {
    return 'explicit_rejection';
  }
  if (/简历|cv|履历/i.test(normalized)) {
    return 'cv_request';
  }
  if (/面试|时间|方便沟通|电话|约一下/i.test(normalized)) {
    return 'interview';
  }
  if (/薪资|薪酬|包|待遇|预算/i.test(normalized)) {
    return 'salary';
  }
  return 'default';
}

function buildRejectionFollowup(context = {}, config = {}) {
  const focus = pickProfileFocus(config, context.job);
  const target = normalizeWhitespace(context.job?.title || '这个方向');
  return `收到，我这边主要在做${focus}相关落地，如果后续有更贴近${target}的机会，也欢迎再联系。`;
}

function shouldCreateDraft(intent, config = {}) {
  if (intent === 'cv_request') {
    return !config.chat?.autoSendResumeButton;
  }
  if (intent === 'explicit_rejection') {
    return !config.chat?.autoRejectionFollowup;
  }
  return true;
}

function buildDraftReply(message, config, context = {}) {
  const intent = classifyReplyIntent(message.text);
  const templates = config.chat.replyTemplates || {};
  let text = '';

  if (intent === 'explicit_rejection') {
    text = buildRejectionFollowup(context, config);
  } else {
    text = templates[intent] || (intent === 'cv_request' ? templates.resume : '') || templates.default || '';
  }
  return {
    intent,
    text,
  };
}

module.exports = {
  buildRejectionFollowup,
  classifyReplyIntent,
  buildDraftReply,
  shouldCreateDraft,
};
