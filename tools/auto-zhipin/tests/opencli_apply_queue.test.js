const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { ZhipinStore } = require('../lib/store');
const {
  getApplyMinMonthlySalaryK,
  getRemainingSuccessTarget,
  isSuccessfulApplyResult,
  pickOpencliApplyCandidates,
  shouldAllowAutoApplyCandidate,
} = require('../lib/opencli_apply_queue');

function makeStore() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zhipin-opencli-apply-'));
  return new ZhipinStore({
    dataDir: tempDir,
    ledgerPath: path.join(tempDir, 'ledger.json'),
    eventsPath: path.join(tempDir, 'events.jsonl'),
  });
}

function makeConfig(overrides = {}) {
  return {
    filters: {
      includeKeywords: ['AI', 'Agent', '智能体', '架构'],
      excludeKeywords: ['汽车', '智驾', '芯片'],
      minMonthlySalaryK: 20,
      maxExperienceYears: 8,
      allowedDegrees: [],
      excludeCompanyKeywords: ['字节', '腾讯', '蚂蚁', '吉利', '研究院', '集团', '国企'],
      excludeCompanySizes: ['1000-9999人', '10000人以上'],
      excludeFundingStages: [],
      excludeLocations: [],
      excludeRecruiterTitles: [],
    },
    apply: {
      enabled: true,
      dryRun: false,
      maxAppliesPerRun: 20,
      minMonthlySalaryK: 40,
      requireCompany: true,
      excludeCompanyKeywords: ['字节', '腾讯', '蚂蚁', '吉利', '研究院', '集团', '国企'],
    },
    supervisor: {
      maxAppliesPerTick: 50,
      dailySuccessfulAppliesTarget: 50,
    },
    ...overrides,
  };
}

test('isSuccessfulApplyResult only counts verified apply outcomes', () => {
  assert.equal(isSuccessfulApplyResult({
    action: 'apply',
    status: 'success',
    mode: 'sent_message_modal_stay',
    url: 'https://www.zhipin.com/job_detail/ok.html',
  }), true);

  assert.equal(isSuccessfulApplyResult({
    action: 'apply',
    status: 'success',
    mode: 'already_continuing',
    url: 'https://www.zhipin.com/job_detail/ok.html',
  }), true);

  assert.equal(isSuccessfulApplyResult({
    action: 'apply',
    status: 'success',
    mode: 'chat_navigation',
    url: 'https://www.zhipin.com/web/geek/chat?id=1',
  }), true);

  assert.equal(isSuccessfulApplyResult({
    action: 'apply',
    status: 'success',
    mode: 'clicked_apply',
    url: 'https://www.zhipin.com/job_detail/ok.html',
    dryRun: true,
  }), false);

  assert.equal(isSuccessfulApplyResult({
    action: 'apply',
    status: 'success',
    mode: 'clicked_apply',
    url: 'https://www.zhipin.com/job_detail/ok.html',
    evidence: { dryRun: true },
  }), false);

  assert.equal(isSuccessfulApplyResult({
    action: 'apply',
    status: 'success',
    mode: 'sent_message_modal_stay',
    url: 'about:blank',
  }), false);

  assert.equal(isSuccessfulApplyResult({
    action: 'apply',
    status: 'ambiguous',
    reason: 'apply_not_verified',
    mode: 'apply_not_verified',
    url: 'https://www.zhipin.com/job_detail/ambiguous.html',
  }), false);

  assert.equal(isSuccessfulApplyResult({
    action: 'apply',
    status: 'not_found',
    reason: 'job_card_not_found',
    mode: 'job_card_not_found',
    url: 'https://www.zhipin.com/job_detail/missing.html',
  }), false);
});

test('getApplyMinMonthlySalaryK prefers apply override over filters', () => {
  assert.equal(getApplyMinMonthlySalaryK(makeConfig()), 40);
  assert.equal(getApplyMinMonthlySalaryK(makeConfig({
    apply: { minMonthlySalaryK: 0 },
    filters: { minMonthlySalaryK: 35 },
  })), 35);
});

test('pickOpencliApplyCandidates keeps 40K+ AI application roles and dedupes identities', () => {
  const store = makeStore();
  const config = makeConfig();

  store.upsertApplication({
    jobId: 'job-low',
    url: 'https://www.zhipin.com/job_detail/job-low.html',
    title: 'AI应用工程师',
    company: '低薪公司',
    salary: '20-30K',
    location: '上海',
    status: 'matched',
    identityKey: '低薪公司::ai应用工程师',
    updatedAt: '2026-03-23T01:00:00.000Z',
  });

  store.upsertApplication({
    jobId: 'job-bigco',
    url: 'https://www.zhipin.com/job_detail/job-bigco.html',
    title: 'AI应用架构师',
    company: '大公司',
    salary: '50-70K',
    location: '上海',
    companySize: '10000人以上',
    status: 'matched',
    identityKey: '大公司::ai应用架构师',
    updatedAt: '2026-03-23T01:01:00.000Z',
  });

  store.upsertApplication({
    jobId: 'job-good-1',
    url: 'https://www.zhipin.com/job_detail/job-good-1.html',
    title: 'AI Agent 应用架构师',
    company: '小团队A',
    salary: '45-65K',
    location: '上海',
    companySize: '20-99人',
    status: 'matched',
    identityKey: '小团队a::aiagent应用架构师',
    updatedAt: '2026-03-23T01:02:00.000Z',
  });

  store.upsertApplication({
    jobId: 'job-good-dup',
    url: 'https://www.zhipin.com/job_detail/job-good-dup.html',
    title: 'AI Agent 应用架构师',
    company: '小团队A',
    salary: '45-65K',
    location: '上海',
    companySize: '20-99人',
    status: 'matched',
    identityKey: '小团队a::aiagent应用架构师',
    updatedAt: '2026-03-23T01:03:00.000Z',
  });

  store.upsertApplication({
    jobId: 'job-good-2',
    url: 'https://www.zhipin.com/job_detail/job-good-2.html',
    title: '企业AI解决方案架构师',
    company: '小团队B',
    salary: '40-55K',
    location: '上海',
    companySize: '0-20人',
    status: 'matched',
    identityKey: '小团队b::企业ai解决方案架构师',
    updatedAt: '2026-03-23T01:04:00.000Z',
  });

  store.upsertApplication({
    jobId: 'job-applied',
    url: 'https://www.zhipin.com/job_detail/job-applied.html',
    title: 'AI 应用架构师',
    company: '已投公司',
    salary: '50-60K',
    location: '上海',
    companySize: '20-99人',
    status: 'applied',
    appliedAt: '2026-03-22T08:00:00.000Z',
    identityKey: '已投公司::ai应用架构师',
  });

  store.upsertApplication({
    jobId: 'job-applied-dup',
    url: 'https://www.zhipin.com/job_detail/job-applied-dup.html',
    title: 'AI 应用架构师',
    company: '已投公司',
    salary: '50-60K',
    location: '上海',
    companySize: '20-99人',
    status: 'matched',
    identityKey: '已投公司::ai应用架构师',
    updatedAt: '2026-03-23T01:05:00.000Z',
  });

  const candidates = pickOpencliApplyCandidates(store, config, { limit: 10 });

  assert.deepEqual(
    candidates.map((item) => item.jobId),
    ['job-good-1', 'job-good-2']
  );
});

test('shouldAllowAutoApplyCandidate blocks missing-company and blacklisted employers', () => {
  const config = makeConfig();

  assert.deepEqual(
    shouldAllowAutoApplyCandidate({
      title: 'AI 应用架构师',
      company: '',
      summary: '企业 AI 应用',
      salaryText: '45-60K',
    }, config),
    { allow: false, reasons: ['missing_company_for_apply'] }
  );

  assert.deepEqual(
    shouldAllowAutoApplyCandidate({
      title: 'AI 应用架构师',
      company: '腾讯研究院',
      summary: '企业 AI 应用',
      salaryText: '45-60K',
    }, config),
    { allow: false, reasons: ['company_blacklisted:腾讯'] }
  );

  assert.deepEqual(
    shouldAllowAutoApplyCandidate({
      title: 'AI 应用架构师',
      company: '小团队',
      summary: '企业 AI 应用',
      salaryText: '45-60K',
      policyBlockedAt: '2026-03-23T08:00:00.000Z',
      policyBlockedReason: 'company_keyword:腾讯',
    }, config),
    { allow: false, reasons: ['company_keyword:腾讯'] }
  );
});

test('pickOpencliApplyCandidates excludes jobs without company metadata or from blacklisted employers', () => {
  const store = makeStore();
  const config = makeConfig();

  store.upsertApplication({
    jobId: 'missing-company',
    url: 'https://www.zhipin.com/job_detail/missing-company.html',
    title: 'AI 应用架构师',
    company: '',
    salary: '45-60K',
    location: '上海',
    status: 'matched',
    identityKey: '::ai应用架构师',
    updatedAt: '2026-03-23T03:00:00.000Z',
  });

  store.upsertApplication({
    jobId: 'big-company',
    url: 'https://www.zhipin.com/job_detail/big-company.html',
    title: 'AI 应用架构师',
    company: '腾讯研究院',
    salary: '45-60K',
    location: '上海',
    status: 'matched',
    identityKey: '腾讯研究院::ai应用架构师',
    updatedAt: '2026-03-23T03:01:00.000Z',
  });

  store.upsertApplication({
    jobId: 'small-company',
    url: 'https://www.zhipin.com/job_detail/small-company.html',
    title: 'AI 应用架构师',
    company: '小团队C',
    salary: '45-60K',
    location: '上海',
    companySize: '20-99人',
    status: 'matched',
    identityKey: '小团队c::ai应用架构师',
    updatedAt: '2026-03-23T03:02:00.000Z',
  });

  const candidates = pickOpencliApplyCandidates(store, config, { limit: 10 });
  assert.deepEqual(candidates.map((item) => item.jobId), ['small-company']);
});

test('pickOpencliApplyCandidates ranks AI agent/application architecture above weaker matches', () => {
  const store = makeStore();
  const config = makeConfig();

  store.upsertApplication({
    jobId: 'workflow',
    url: 'https://www.zhipin.com/job_detail/workflow.html',
    title: 'AI 工作流工程师',
    company: '流程团队',
    salary: '40-50K',
    location: '上海',
    companySize: '20-99人',
    status: 'matched',
    identityKey: '流程团队::ai工作流工程师',
    updatedAt: '2026-03-23T02:00:00.000Z',
  });

  store.upsertApplication({
    jobId: 'agent-arch',
    url: 'https://www.zhipin.com/job_detail/agent-arch.html',
    title: 'AI Agent 应用架构师',
    company: '架构团队',
    salary: '45-60K',
    location: '上海',
    companySize: '20-99人',
    status: 'matched',
    identityKey: '架构团队::aiagent应用架构师',
    updatedAt: '2026-03-23T02:01:00.000Z',
  });

  const candidates = pickOpencliApplyCandidates(store, config, { limit: 2 });
  assert.deepEqual(candidates.map((item) => item.jobId), ['agent-arch', 'workflow']);
});

test('getRemainingSuccessTarget caps requested successes by daily remaining target', () => {
  const store = makeStore();
  const config = makeConfig();

  for (let index = 0; index < 12; index += 1) {
    store.upsertApplication({
      jobId: `applied-${index}`,
      title: `AI 应用架构师 ${index}`,
      company: `公司 ${index}`,
      salary: '45-55K',
      location: '上海',
      status: 'applied',
      appliedAt: '2026-03-23T01:00:00.000Z',
      identityKey: `公司${index}::ai应用架构师${index}`,
    });
  }

  assert.equal(getRemainingSuccessTarget({
    store,
    config,
    requestedSuccesses: 60,
    date: '2026-03-23T08:00:00.000Z',
  }), 38);

  assert.equal(getRemainingSuccessTarget({
    store,
    config,
    requestedSuccesses: 10,
    date: '2026-03-23T08:00:00.000Z',
  }), 10);
});
