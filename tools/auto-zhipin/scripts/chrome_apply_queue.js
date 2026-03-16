#!/usr/bin/env node

const { loadConfig } = require('../lib/config');
const { evalCurrentTab, getCurrentTabState, navigateCurrentTab } = require('../lib/chrome_current');
const { evaluateJob } = require('../lib/filters');
const { classifySiteHealth } = require('../lib/site_health');
const { ZhipinStore } = require('../lib/store');
const { classifyApplyOutcome, dismissSentMessageModalScript } = require('../lib/apply_flow');
const { extractJobRelevantBodyText } = require('../lib/detail_text');
const { nowIso, parseArgs } = require('../lib/utils');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickCandidates(store, limit, args = {}) {
  if (args.url) {
    const existingApplication = Object.values(store.ledger.applications || {}).find((application) => application.url === args.url);
    if (existingApplication) {
      return [existingApplication];
    }

    const existingJob = Object.values(store.ledger.jobs || {}).find((job) => job.url === args.url);
    if (existingJob) {
      return [{
        jobId: existingJob.id || existingJob.url,
        url: existingJob.url,
        title: existingJob.title,
        company: existingJob.company,
        salary: existingJob.salaryText || existingJob.salary,
        location: existingJob.location,
        status: 'matched',
      }];
    }

    return [{
      jobId: args.url,
      url: args.url,
      title: args.title || '',
      company: args.company || '',
      salary: args.salary || '',
      location: args.location || '',
      status: 'matched',
    }];
  }

  return Object.values(store.ledger.applications || {})
    .filter((application) => application.status === 'matched' && application.url)
    .sort((left, right) => String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')))
    .slice(0, limit);
}

function clickApplyScript() {
  return `(() => {
    const btn = document.querySelector('a.btn.btn-startchat')
      || Array.from(document.querySelectorAll('a,button')).find((el) => (el.innerText || '').trim() === '立即沟通');
    if (!btn) return JSON.stringify({ ok: false, reason: 'apply_button_not_found' });
    const rect = btn.getBoundingClientRect();
    btn.scrollIntoView({ block: 'center' });
    ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach((type) => {
      btn.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        view: window,
      }));
    });
    return JSON.stringify({ ok: true, text: (btn.innerText || '').trim() });
  })()`;
}

function extractDetailMetaScript() {
  return `(() => {
    function textOf(node) {
      return (node?.innerText || node?.textContent || '').replace(/\\s+/g, ' ').trim();
    }
    return JSON.stringify({
      title: textOf(document.querySelector('.job-name, h1, [class*=job-name]')),
      salaryText: textOf(document.querySelector('.salary, .job-salary, [class*=salary]')),
      bodyText: document.body ? document.body.innerText.slice(0, 6000) : ''
    });
  })()`;
}

function extractCompanySize(bodyText) {
  return String(bodyText || '').match(/(10000人以上|\d{1,5}-\d{1,5}人)/)?.[1] || '';
}

function extractFundingStage(bodyText) {
  return String(bodyText || '').match(/(不需要融资|未融资|天使轮|A轮|B轮|C轮|D轮及以上|已上市)/)?.[1] || '';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { config } = loadConfig(args.config);
  const store = new ZhipinStore();
  const limit = Number(args.limit || config.apply.maxAppliesPerRun || 5);
  const waitMs = Number(args.waitMs || 4500);
  const candidates = pickCandidates(store, limit, args);

  if (!candidates.length) {
    console.log('No matched jobs available for chrome_apply_queue.');
    return;
  }

  const attempted = [];
  for (const candidate of candidates) {
    navigateCurrentTab(candidate.url, waitMs);
    const state = getCurrentTabState(2200);
    const siteHealth = classifySiteHealth({
      url: state.url,
      title: state.title,
      bodyText: state.bodyText,
      looksReady: /职位描述|立即沟通|继续沟通/.test(state.bodyText || ''),
    });

    if (siteHealth.status === 'auth_gate' || siteHealth.status === 'restricted') {
      store.setSiteHealth({
        ...siteHealth,
        sourceUrl: state.url,
        title: state.title,
        backend: 'chrome_current',
      });
      store.save();
      throw new Error(`chrome apply blocked: ${siteHealth.reason}${siteHealth.recoveryAt ? ` until ${siteHealth.recoveryAt}` : ''}`);
    }

    const detailMeta = JSON.parse(evalCurrentTab(extractDetailMetaScript()) || '{}');
    const detailBody = String(detailMeta.bodyText || state.bodyText || '');
    const detailSummary = extractJobRelevantBodyText(detailBody);
    const gatedJob = {
      ...candidate,
      title: detailMeta.title || candidate.title,
      salaryText: detailMeta.salaryText || candidate.salary,
      companySize: extractCompanySize(detailBody),
      stage: extractFundingStage(detailBody),
      summary: detailSummary,
    };
    const detailDecision = evaluateJob(gatedJob, config.filters);
    if (!detailDecision.allow) {
      store.upsertApplication({
        jobId: candidate.jobId,
        url: candidate.url,
        title: gatedJob.title,
        company: candidate.company,
        salary: gatedJob.salaryText,
        location: candidate.location,
        status: 'skipped',
        reasons: detailDecision.reasons,
        source: 'chrome_apply_queue',
        manualRecord: true,
        reviewedAt: nowIso(),
        applyResult: {
          ok: false,
          mode: 'detail_gate',
          companySize: gatedJob.companySize,
          stage: gatedJob.stage,
          reasons: detailDecision.reasons,
        },
      });
      store.save();
      attempted.push({ candidate: gatedJob.title, company: candidate.company, ok: false, mode: 'detail_gate', reasons: detailDecision.reasons });
      await sleep(waitMs);
      continue;
    }

    const body = detailBody;
    let applied = false;
    let mode = 'probe';

    if (body.includes('继续沟通')) {
      applied = true;
      mode = 'already_continuing';
    } else {
      const clickResult = JSON.parse(evalCurrentTab(clickApplyScript()) || '{}');
      if (!clickResult.ok) {
        store.upsertApplication({
          jobId: candidate.jobId,
          status: 'failed',
          applyResult: clickResult,
          reviewedAt: nowIso(),
          source: 'chrome_apply_queue',
        });
        store.save();
        attempted.push({ candidate: candidate.title, company: candidate.company, ok: false, reason: clickResult.reason });
        continue;
      }

      await sleep(Math.min(waitMs, 2000));
      const modalResult = JSON.parse(evalCurrentTab(dismissSentMessageModalScript()) || '{}');
      await sleep(waitMs);
      const after = getCurrentTabState(2200);
      const outcome = classifyApplyOutcome({
        afterBodyText: String(after.bodyText || ''),
        afterUrl: after.url,
        modalResult,
      });
      applied = outcome.applied;
      mode = outcome.mode;
    }

    store.upsertApplication({
      jobId: candidate.jobId,
      url: candidate.url,
      title: gatedJob.title,
      company: candidate.company,
      salary: gatedJob.salaryText,
      location: candidate.location,
      status: applied ? 'applied' : 'failed',
      source: 'chrome_apply_queue',
      manualRecord: true,
      appliedAt: applied ? nowIso() : undefined,
      reviewedAt: nowIso(),
      applyResult: {
        ok: applied,
        mode,
      },
    });
    store.save();
    attempted.push({ candidate: candidate.title, company: candidate.company, ok: applied, mode });
    await sleep(waitMs);
  }

  console.log(JSON.stringify({
    attempted: attempted.length,
    results: attempted,
    summary: store.summary(),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
