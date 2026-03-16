#!/usr/bin/env node

const { loadConfig } = require('../lib/config');
const { evalCurrentTab, getCurrentTabState, navigateCurrentTab } = require('../lib/chrome_current');
const { evaluateJob } = require('../lib/filters');
const { classifySiteHealth } = require('../lib/site_health');
const { ZhipinStore } = require('../lib/store');
const { makeApplicationIdentity, nowIso, parseArgs } = require('../lib/utils');

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildFilters(config, args) {
  const extraInclude = parseCsv(args.include);
  const extraExclude = parseCsv(args.exclude);
  return {
    ...config.filters,
    includeKeywords: [...(config.filters.includeKeywords || []), ...extraInclude],
    excludeKeywords: [...(config.filters.excludeKeywords || []), ...extraExclude],
  };
}

function locationMatches(requiredLocation, location) {
  if (!requiredLocation) {
    return true;
  }
  return String(location || '').includes(String(requiredLocation));
}

function extractJobsScript(limit) {
  return `(() => {
    function textOf(node) {
      return (node?.innerText || node?.textContent || '').replace(/\\s+/g, ' ').trim();
    }
    function firstText(root, selectors) {
      for (const selector of selectors) {
        const node = root?.querySelector(selector);
        const text = textOf(node);
        if (text) {
          return text;
        }
      }
      return '';
    }
    function looksLikeLocation(text) {
      return /上海|北京|深圳|广州|杭州|苏州|成都|西安|厦门|武汉|南京|济南|青岛|天津|重庆|长沙|郑州|合肥/.test(text || '');
    }
    function looksLikeDegree(text) {
      return /博士|硕士|本科|大专|学历不限|不限/.test(text || '');
    }
    function looksLikeExperience(text) {
      return /经验不限|\\d+-\\d+年|\\d+年/.test(text || '');
    }
    function looksLikeSalary(text) {
      return /K|k|元\\/天/.test(text || '');
    }
    const anchors = Array.from(document.querySelectorAll('a[href*="/job_detail/"], a[href*="job_detail"]'));
    const seen = new Set();
    const jobs = [];
    for (const anchor of anchors) {
      const href = new URL(anchor.getAttribute('href'), location.origin).toString();
      if (seen.has(href)) continue;
      seen.add(href);
      const card = anchor.closest('.job-card-wrapper, .job-card-box, li, [class*=job-card], [class*=search-job-result], [class*=card]');
      const summary = textOf(card || anchor);
      const lines = (card?.innerText || anchor?.innerText || '')
        .split(/\\n+/)
        .map((line) => line.replace(/\\s+/g, ' ').trim())
        .filter(Boolean);
      const salaryText = firstText(card, ['.job-salary', '.salary', '[class*=salary]']) || lines.find(looksLikeSalary) || '';
      const titleText = firstText(card, ['a.job-name', '.job-name', '[class*=job-name]']) || textOf(anchor) || lines[0] || '';
      const fallbackLocation = lines.find(looksLikeLocation) || '';
      const fallbackDegree = lines.find(looksLikeDegree) || '';
      const fallbackExperience = lines.find(looksLikeExperience) || '';
      const fallbackCompany = lines.find((line) => {
        if (!line || line === titleText || line === salaryText) return false;
        if (looksLikeSalary(line) || looksLikeExperience(line) || looksLikeDegree(line) || looksLikeLocation(line)) return false;
        if (line.includes('立即沟通') || line.includes('收藏') || line.includes('举报')) return false;
        return true;
      }) || '';
      jobs.push({
        id: href,
        url: href,
        title: titleText.replace(salaryText, '').trim() || lines[0] || '',
        salaryText,
        company: firstText(card, ['.boss-name', '.company-name', '[class*=company-name]', '.boss-info', '[class*=brand]']) || fallbackCompany,
        location: firstText(card, ['.company-location', '.job-area', '[class*=company-location]', '[class*=location]', '[class*=area]']) || fallbackLocation,
        experienceText: firstText(card, ['.job-limit', '[class*=experience]', '[class*=year]']) || fallbackExperience,
        degreeText: summary.match(/博士|硕士|本科|大专|学历不限|不限/)?.[0] || fallbackDegree,
        recruiterName: firstText(card, ['.boss-name', '[class*=recruiter-name]', '[class*=boss-name]']),
        recruiterTitle: firstText(card, ['.boss-title', '[class*=recruiter-title]', '[class*=boss-title]']),
        stage: firstText(card, ['[class*=stage]', '[class*=finance]']),
        companySize: firstText(card, ['[class*=scale]', '[class*=size]']),
        summary,
      });
      if (jobs.length >= ${Number(limit) || 30}) break;
    }
    return JSON.stringify(jobs);
  })()`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { config } = loadConfig(args.config);
  const filters = buildFilters(config, args);
  const store = new ZhipinStore();
  const requiredLocation = args['require-location'] || '';

  if (args.url) {
    navigateCurrentTab(args.url, Number(args.waitMs || 4000));
  }

  const pageState = getCurrentTabState(Number(args.bodyLimit || 2400));
  const siteHealth = classifySiteHealth({
    url: pageState.url,
    title: pageState.title,
    bodyText: pageState.bodyText,
    looksReady: /job_detail|\/web\/geek\/jobs/.test(pageState.url || '') || /立即沟通|继续沟通|职位描述/.test(pageState.bodyText || ''),
  });

  if (siteHealth.status === 'auth_gate' || siteHealth.status === 'restricted') {
    store.setSiteHealth({
      ...siteHealth,
      sourceUrl: pageState.url,
      title: pageState.title,
      backend: 'chrome_current',
    });
    store.save();
    throw new Error(`chrome collect blocked: ${siteHealth.reason}${siteHealth.recoveryAt ? ` until ${siteHealth.recoveryAt}` : ''}`);
  }

  const jobs = JSON.parse(evalCurrentTab(extractJobsScript(args.limit || config.jobs.maxJobsPerRun || 30)) || '[]');
  if (!jobs.length) {
    throw new Error(`no jobs found on current page: ${pageState.url}`);
  }

  const matched = [];
  const skipped = [];
  for (const job of jobs) {
    const jobId = store.upsertJob(job);
    const existingTerminalById = store.ledger.applications[jobId];
    const existingTerminalByIdentity = store.findApplicationByIdentity(job, ['applied', 'skipped']);
    const existingTerminal = ['applied', 'skipped'].includes(existingTerminalById?.status)
      ? existingTerminalById
      : existingTerminalByIdentity;
    const decision = evaluateJob(job, filters);
    const reasons = decision.reasons.slice();
    let status = decision.allow ? 'matched' : 'skipped';

    if (!locationMatches(requiredLocation, job.location)) {
      status = 'skipped';
      reasons.push('location_required_mismatch');
    }

    if (existingTerminal?.status === 'applied' || existingTerminal?.status === 'skipped') {
      reasons.push(existingTerminal.status === 'applied' ? 'duplicate_applied_identity' : 'duplicate_skipped_identity');
      skipped.push({
        jobId,
        title: job.title,
        company: job.company,
        salary: job.salaryText,
        location: job.location,
        url: job.url,
        reasons,
      });

      if (existingTerminalById && !['applied', 'skipped'].includes(existingTerminalById.status)) {
        store.upsertApplication({
          jobId,
          url: job.url,
          title: job.title,
          company: job.company,
          salary: job.salaryText,
          location: job.location,
          status: 'deduped',
          reasons,
          duplicateOf: existingTerminal.jobId || null,
          source: 'chrome_collect_queue',
          manualRecord: true,
          identityKey: makeApplicationIdentity(job),
          reviewedAt: nowIso(),
        });
      }

      continue;
    }

    store.upsertApplication({
      jobId,
      url: job.url,
      title: job.title,
      company: job.company,
      salary: job.salaryText,
      location: job.location,
      status,
      reasons,
      duplicateOf: existingTerminal?.jobId || null,
      source: 'chrome_collect_queue',
      manualRecord: true,
      identityKey: makeApplicationIdentity(job),
      reviewedAt: nowIso(),
    });

    const item = {
      jobId,
      title: job.title,
      company: job.company,
      salary: job.salaryText,
      location: job.location,
      url: job.url,
      reasons,
    };
    if (status === 'matched') {
      matched.push(item);
    } else {
      skipped.push(item);
    }
  }

  store.save();
  console.log(JSON.stringify({
    pageUrl: pageState.url,
    inspected: jobs.length,
    matched: matched.length,
    skipped: skipped.length,
    matchedJobs: matched,
    summary: store.summary(),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
