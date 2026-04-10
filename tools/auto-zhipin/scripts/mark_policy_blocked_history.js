#!/usr/bin/env node

const { ZhipinStore } = require('../lib/store');
const { loadConfig } = require('../lib/config');
const { parseArgs, normalizeWhitespace, nowIso } = require('../lib/utils');

function getKeywords(config) {
  const filters = Array.isArray(config?.filters?.excludeCompanyKeywords) ? config.filters.excludeCompanyKeywords : [];
  const apply = Array.isArray(config?.apply?.excludeCompanyKeywords) ? config.apply.excludeCompanyKeywords : [];
  return Array.from(new Set([...filters, ...apply].map((item) => normalizeWhitespace(item)).filter(Boolean)));
}

function matchKeyword(target, keywords) {
  const haystack = normalizeWhitespace([
    target.company || '',
    target.title || '',
    target.summary || '',
    target.companySize || '',
    target.stage || '',
  ].join(' ')).toLowerCase();
  return keywords.find((keyword) => haystack.includes(keyword.toLowerCase())) || null;
}

function markRecord(record, keyword) {
  return {
    ...record,
    policyBlockedAt: record.policyBlockedAt || nowIso(),
    policyBlockedCategory: 'user_preference_company',
    policyBlockedReason: `company_keyword:${keyword}`,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = Boolean(args['dry-run']);
  const { config } = loadConfig(args.config);
  const store = new ZhipinStore();
  const keywords = getKeywords(config);

  let jobsMarked = 0;
  let applicationsMarked = 0;
  let matchedSkipped = 0;

  for (const [jobId, job] of Object.entries(store.ledger.jobs || {})) {
    const keyword = matchKeyword(job, keywords);
    if (!keyword) {
      continue;
    }
    store.ledger.jobs[jobId] = markRecord(job, keyword);
    jobsMarked += 1;
  }

  for (const [applicationId, application] of Object.entries(store.ledger.applications || {})) {
    const keyword = matchKeyword(application, keywords);
    if (!keyword) {
      continue;
    }
    const next = markRecord(application, keyword);
    if (next.status === 'matched') {
      next.status = 'skipped';
      next.skipReason = next.skipReason || 'policy_blocked_company';
      matchedSkipped += 1;
    }
    store.ledger.applications[applicationId] = next;
    applicationsMarked += 1;
  }

  store.touch();
  if (!dryRun) {
    store.save({ reason: 'mark_policy_blocked_history', jobsMarked, applicationsMarked, matchedSkipped });
  }

  console.log(JSON.stringify({
    dryRun,
    keywords,
    jobsMarked,
    applicationsMarked,
    matchedSkipped,
  }, null, 2));
}

main();
