// lib/chat_classifier.js
'use strict';

const INTERVIEW_KEYWORDS = [
  '面试', '面谈', '约个时间', '方便面试', '电话面试', '视频面试',
  '线下面试', '面试官', '什么时候方便', '聊一下岗位', '您看什么时间',
  '约面', '一面', '二面', '初面', '复试', '面试安排',
];

const SPAM_KEYWORDS = [
  '刷单', '兼职', '日结', '急聘', '高薪', '免费', '加微信', '加我',
  'V信', 'VX', '投资理财', '稳赚',
];

function classifyMessage(text) {
  const normalized = String(text || '');
  const reasons = [];

  for (const keyword of INTERVIEW_KEYWORDS) {
    if (normalized.includes(keyword)) {
      reasons.push(`interview_${keyword}`);
      return { category: 'interview', reasons };
    }
  }

  for (const keyword of SPAM_KEYWORDS) {
    if (normalized.includes(keyword)) {
      reasons.push(`spam_${keyword}`);
      return { category: 'spam', reasons };
    }
  }

  return { category: 'unknown', reasons: [] };
}

module.exports = { classifyMessage, INTERVIEW_KEYWORDS, SPAM_KEYWORDS };
