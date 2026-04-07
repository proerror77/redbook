const fs = require('node:fs');
const { normalizeWhitespace } = require('./utils');
const { OPENCLI_CHAT_TRIAGE_PATH } = require('./paths');

const REJECTION_REGEX = /不合适|不太合适|匹配度有所差距|未通过|已招满|暂时不考虑|抱歉|感谢关注|不匹配/i;
const OFFSITE_EMAIL_REGEX = /邮箱|email|e-mail|发到邮箱|发邮箱|投递邮箱|站外投递|发送到邮箱|@[\w.-]+\.[A-Za-z]{2,}/i;
const BIG_COMPANY_REGEX = /美的|吉利|锐捷|长鑫|iherb|药明|oppo|vivo|国企|央企|事业单位/i;

function normalizeForMatch(value) {
  return normalizeWhitespace(value).toLowerCase();
}

function isExplicitRejectionText(text) {
  return REJECTION_REGEX.test(normalizeWhitespace(text));
}

function isOffsiteEmailText(text) {
  return OFFSITE_EMAIL_REGEX.test(normalizeWhitespace(text));
}

function isBigCompanyText(text) {
  return BIG_COMPANY_REGEX.test(normalizeWhitespace(text));
}

function uniq(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function cleanupHint(value) {
  return normalizeWhitespace(String(value || ''))
    .replace(/^[\u4e00-\u9fff]{1,4}(先生|女士)/, '')
    .replace(/^[\u4e00-\u9fff]{2,3}(?=[A-Za-z])/, '')
    .replace(/(高级|资深)$/, '')
    .trim();
}

function deriveMatchHints(title = '', preview = '') {
  const normalized = normalizeWhitespace(`${title} ${preview}`);
  const hints = [];
  const recruiterMatch = normalized.match(/([\u4e00-\u9fffA-Za-z0-9&.\-]{2,30}?)(招聘HR负责人|高级招聘经理|招聘经理|招聘专员|招聘专家|招聘者|招聘|HRBP|HRG|HR负责人|HR|hrbp|hrg|hr|人事|创始人助理|CEO|管理员)/);
  if (recruiterMatch) {
    hints.push(cleanupHint(recruiterMatch[1]));
  }

  for (const match of normalized.match(/[A-Za-z][A-Za-z0-9&.\-]{1,}/g) || []) {
    hints.push(cleanupHint(match));
  }

  for (const match of normalized.match(/[\u4e00-\u9fff]{2,12}(汽车|智驾|科技|智能|信息|软件|网络|算力|线程|机器人|咨询|航空|股份|技术)/g) || []) {
    hints.push(cleanupHint(match));
  }

  return uniq(hints).filter((item) => item.length >= 2 && !/^(招聘|hr|人事|先生|女士)$/i.test(item));
}

function readChatTriage(filePath = OPENCLI_CHAT_TRIAGE_PATH) {
  if (!fs.existsSync(filePath)) {
    return {
      generatedAt: null,
      blockedEntries: [],
      followupCandidates: [],
      source: 'missing',
    };
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function entryMatchesJob(entry, job = {}) {
  const haystack = normalizeForMatch(`${job.company || ''} ${job.title || ''}`);
  const hints = uniq([
    ...(Array.isArray(entry.matchHints) ? entry.matchHints : []),
    entry.company || '',
    entry.title || '',
  ]).map((item) => normalizeForMatch(item)).filter(Boolean);

  return hints.some((hint) => haystack.includes(hint));
}

function matchJobAgainstChatTriage(job, triage) {
  const blockedEntries = Array.isArray(triage?.blockedEntries) ? triage.blockedEntries : [];
  for (const entry of blockedEntries) {
    if (entryMatchesJob(entry, job)) {
      return entry;
    }
  }
  return null;
}

module.exports = {
  deriveMatchHints,
  entryMatchesJob,
  isExplicitRejectionText,
  isBigCompanyText,
  isOffsiteEmailText,
  matchJobAgainstChatTriage,
  readChatTriage,
};
