const { evaluateJob, parseSalaryRange } = require('./filters');
const { matchJobAgainstChatTriage } = require('./chat_triage');
const { makeApplicationIdentity, normalizeWhitespace } = require('./utils');

const SUCCESS_APPLY_MODES = new Set([
  'sent_message_modal_stay',
  'chat_navigation',
  'detail_success_signal',
]);

const PRIORITY_KEYWORDS = [
  { keyword: 'ai agent', score: 140 },
  { keyword: '智能体', score: 135 },
  { keyword: 'agent', score: 120 },
  { keyword: '应用架构', score: 110 },
  { keyword: '架构师', score: 90 },
  { keyword: '解决方案', score: 85 },
  { keyword: 'ai应用', score: 80 },
  { keyword: '应用开发', score: 70 },
  { keyword: '工作流', score: 65 },
  { keyword: 'workflow', score: 65 },
  { keyword: '自动化', score: 55 },
  { keyword: 'rag', score: 50 },
  { keyword: 'llm', score: 45 },
  { keyword: '联合创始人', score: 35 },
  { keyword: '合伙人', score: 25 },
  { keyword: '兼职', score: 15 },
];

const NEGATIVE_KEYWORDS = [
  '产品经理',
  '销售',
  '运营',
  '顾问',
  '汽车',
  '智驾',
  '自动驾驶',
  '芯片',
  '编译器',
];

function getApplyExcludeCompanyKeywords(config = {}) {
  return [
    ...(config.filters?.excludeCompanyKeywords || []),
    ...(config.apply?.excludeCompanyKeywords || []),
  ].filter(Boolean);
}

function containsText(haystack, needle) {
  return String(haystack || '').toLowerCase().includes(String(needle || '').toLowerCase());
}

function getApplyMinMonthlySalaryK(config = {}) {
  const applyMin = Number(config.apply?.minMonthlySalaryK || 0);
  if (applyMin > 0) {
    return applyMin;
  }
  return Number(config.filters?.minMonthlySalaryK || 0);
}

function getApplyResultUrl(result = {}) {
  return String(
    result.normalized?.url
    || result.url
    || result.evidence?.afterMeta?.url
    || result.evidence?.initialMeta?.url
    || ''
  );
}

function isSuccessfulApplyResult(result = {}) {
  const mode = String(result.mode || result.normalized?.mode || '').trim();
  const status = String(result.status || result.normalized?.status || '').trim();
  const reason = String(result.reason || '').trim();
  const url = getApplyResultUrl(result);

  if (result.dryRun === true || result.evidence?.dryRun === true || result.normalized?.dryRun === true) {
    return false;
  }
  if (url.startsWith('about:blank')) {
    return false;
  }
  if (mode === 'already_continuing') {
    return false;
  }
  if (reason === 'apply_not_verified' || reason === 'job_card_not_found') {
    return false;
  }
  if (mode && SUCCESS_APPLY_MODES.has(mode)) {
    return true;
  }
  return status === 'success';
}

function buildApplyFilters(config = {}) {
  return {
    ...(config.filters || {}),
    minMonthlySalaryK: getApplyMinMonthlySalaryK(config),
  };
}

function normalizeApplication(application = {}) {
  return {
    ...application,
    salaryText: application.salaryText || application.salary || '',
    summary: application.summary || application.description || '',
  };
}

function isTerminalApplication(store, application = {}) {
  const existing = store.findApplicationByIdentity(application, ['applied', 'skipped']);
  return Boolean(existing && existing.jobId !== application.jobId);
}

function scoreCompanySize(companySize = '') {
  const text = String(companySize || '');
  if (text.includes('0-20')) {
    return 30;
  }
  if (text.includes('20-99')) {
    return 20;
  }
  if (text.includes('100-499')) {
    return 10;
  }
  if (text.includes('1000-9999')) {
    return -60;
  }
  if (text.includes('10000人以上')) {
    return -100;
  }
  return 0;
}

function scoreSalary(salaryText = '') {
  const parsed = parseSalaryRange(salaryText);
  if (!parsed) {
    return 0;
  }
  return Number(parsed.maxMonthlyK || 0) * 2 + Number(parsed.minMonthlyK || 0);
}

function scoreKeywords(application = {}) {
  const haystack = normalizeWhitespace([
    application.title,
    application.company,
    application.summary,
    application.salaryText,
  ].filter(Boolean).join(' | ')).toLowerCase();

  let score = 0;
  for (const item of PRIORITY_KEYWORDS) {
    if (containsText(haystack, item.keyword)) {
      score += item.score;
    }
  }
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (containsText(haystack, keyword)) {
      score -= 200;
    }
  }
  return score;
}

function compareCandidates(left, right) {
  if (right.score !== left.score) {
    return right.score - left.score;
  }
  const leftUpdatedAt = Date.parse(left.updatedAt || 0) || 0;
  const rightUpdatedAt = Date.parse(right.updatedAt || 0) || 0;
  if (rightUpdatedAt !== leftUpdatedAt) {
    return rightUpdatedAt - leftUpdatedAt;
  }
  return String(left.jobId || '').localeCompare(String(right.jobId || ''));
}

function scoreCandidate(application = {}) {
  return scoreKeywords(application)
    + scoreSalary(application.salaryText)
    + scoreCompanySize(application.companySize);
}

function shouldAllowAutoApplyCandidate(application = {}, config = {}) {
  const reasons = [];
  const company = normalizeWhitespace(application.company || '');
  const haystack = normalizeWhitespace([
    application.company,
    application.title,
    application.summary,
    application.stage,
    application.companySize,
  ].filter(Boolean).join(' | ')).toLowerCase();

  if (config.apply?.requireCompany !== false && !company) {
    reasons.push('missing_company_for_apply');
  }

  if (application.policyBlockedAt || application.policyBlockedReason || application.policyBlockedCategory) {
    reasons.push(application.policyBlockedReason || 'policy_blocked');
  }

  const excludeCompanyKeywords = getApplyExcludeCompanyKeywords(config);
  if (excludeCompanyKeywords.length > 0) {
    for (const keyword of excludeCompanyKeywords) {
      if (containsText(haystack, keyword)) {
        reasons.push(`company_blacklisted:${keyword}`);
        break;
      }
    }
  }

  return {
    allow: reasons.length === 0,
    reasons,
  };
}

function buildPreApplyCandidate(application = {}) {
  const normalized = normalizeApplication(application);
  normalized.identityKey = normalized.identityKey || makeApplicationIdentity(normalized);
  return normalized;
}

function findBlockingApplication(store, application = {}) {
  if (!store) {
    return null;
  }

  const id = application.jobId || application.id || application.url || '';
  const byId = id ? store.ledger.applications?.[id] : null;
  if (byId && ['applied', 'skipped', 'deduped'].includes(byId.status)) {
    return byId;
  }

  return store.findApplicationByIdentity(application, ['applied', 'skipped', 'deduped']);
}

function checkPreApplyCandidate({ store, config = {}, application = {}, triage = null }) {
  const candidate = buildPreApplyCandidate(application);
  const reasons = [];

  if (!candidate.title) {
    reasons.push('missing_title_for_apply');
  }

  if (candidate.applyState === 'already_continuing') {
    reasons.push('already_continuing');
  }

  const existing = findBlockingApplication(store, candidate);
  if (existing) {
    reasons.push(existing.status === 'applied' ? 'duplicate_applied_identity' : `duplicate_${existing.status}_identity`);
  }

  const filters = buildApplyFilters(config);
  const filterDecision = evaluateJob(candidate, filters);
  if (!filterDecision.allow) {
    reasons.push(...filterDecision.reasons);
  }

  const applyDecision = shouldAllowAutoApplyCandidate(candidate, config);
  if (!applyDecision.allow) {
    reasons.push(...applyDecision.reasons);
  }

  const blockedEntry = triage ? matchJobAgainstChatTriage(candidate, triage) : null;
  if (blockedEntry) {
    reasons.push(`chat_triage_${blockedEntry.category || 'blocked'}`);
  }

  return {
    allow: reasons.length === 0,
    reasons,
    candidate,
    existingApplication: existing || null,
    blockedEntry: blockedEntry || null,
  };
}

function pickOpencliApplyCandidates(store, config = {}, args = {}) {
  if (args.url) {
    return [{
      jobId: args.url,
      url: args.url,
      title: args.title || args.url,
      company: args.company || 'manual-url',
      location: args.location || '',
      salaryText: args.salary || args.salaryText || '',
      summary: args.summary || '',
      companySize: args.companySize || '',
      identityKey: makeApplicationIdentity({
        company: args.company || 'manual-url',
        title: args.title || args.url,
      }),
      score: Number.MAX_SAFE_INTEGER,
    }];
  }

  const filters = buildApplyFilters(config);
  const limit = Math.max(
    1,
    Number(
      args.limit
      || args['target-successes']
      || config.apply?.maxAppliesPerRun
      || config.supervisor?.maxAppliesPerTick
      || 5
    )
  );

  const candidates = [];
  const seenIdentities = new Set();

  for (const application of Object.values(store.ledger.applications || {})) {
    if (application.status !== 'matched' || !application.url) {
      continue;
    }

    const normalized = normalizeApplication(application);
    normalized.identityKey = normalized.identityKey || makeApplicationIdentity(normalized);
    if (!normalized.identityKey || seenIdentities.has(normalized.identityKey)) {
      continue;
    }
    if (isTerminalApplication(store, normalized)) {
      continue;
    }

    const decision = evaluateJob(normalized, filters);
    if (!decision.allow) {
      continue;
    }

    const applyDecision = shouldAllowAutoApplyCandidate(normalized, config);
    if (!applyDecision.allow) {
      continue;
    }

    normalized.score = scoreCandidate(normalized);
    candidates.push(normalized);
    seenIdentities.add(normalized.identityKey);
  }

  return candidates.sort(compareCandidates).slice(0, limit);
}

function getRemainingSuccessTarget({ store, config = {}, requestedSuccesses, date = new Date() }) {
  const requested = Math.max(
    1,
    Number(
      requestedSuccesses
      || config.supervisor?.maxAppliesPerTick
      || config.apply?.maxAppliesPerRun
      || 5
    )
  );
  const dailyTarget = Math.max(0, Number(config.supervisor?.dailySuccessfulAppliesTarget || 0));
  if (!dailyTarget) {
    return requested;
  }
  const todaySuccessfulApplies = store.getTodaySuccessfulApplies(date);
  const remaining = Math.max(0, dailyTarget - todaySuccessfulApplies);
  return Math.min(requested, remaining);
}

module.exports = {
  SUCCESS_APPLY_MODES,
  getApplyMinMonthlySalaryK,
  getApplyResultUrl,
  getRemainingSuccessTarget,
  checkPreApplyCandidate,
  findBlockingApplication,
  isSuccessfulApplyResult,
  pickOpencliApplyCandidates,
  scoreCandidate,
  shouldAllowAutoApplyCandidate,
};
