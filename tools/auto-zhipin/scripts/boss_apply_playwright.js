#!/usr/bin/env node

const { loadConfig } = require('../lib/config');
const { launchContext, getPrimaryPage } = require('../lib/browser');
const { readChatTriage } = require('../lib/chat_triage');
const { checkPreApplyCandidate } = require('../lib/opencli_apply_queue');
const { ZhipinStore } = require('../lib/store');
const { applyToJob } = require('../lib/zhipin');
const { makeApplicationIdentity, nowIso, parseArgs } = require('../lib/utils');

function printHelp() {
  console.log([
    'Usage:',
    '  node tools/auto-zhipin/scripts/boss_apply_playwright.js --url <job-url> [options]',
    '',
    'Options:',
    '  --url <job-url>          Job detail URL',
    '  --greeting <text>        Greeting to send after clicking apply',
    '  --dry-run <true|false>   Read-only preflight; do not click apply or send',
    '  --headed <true|false>    Force headed Playwright session',
    '  --channel <channel>      Browser channel, default from config.browser.channel',
    '',
    'Examples:',
    '  npm run boss:apply -- --url https://www.zhipin.com/job_detail/xxx.html --dry-run true',
    '  npm run boss:apply -- --url https://www.zhipin.com/job_detail/xxx.html',
  ].join('\n'));
}

function parseBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(text)) {
    return true;
  }
  if (['0', 'false', 'no', 'n', 'off'].includes(text)) {
    return false;
  }
  return fallback;
}

function extractJobDetailId(url) {
  const match = String(url || '').match(/\/job_detail\/([^/.?#]+)\.html/i);
  return match ? match[1] : '';
}

function validateTargetUrl(expectedUrl, result = {}) {
  const expectedId = extractJobDetailId(expectedUrl);
  const actualUrl = result.url
    || result.normalized?.url
    || result.evidence?.afterMeta?.url
    || result.evidence?.initialMeta?.url
    || '';
  const actualId = extractJobDetailId(actualUrl);

  if (!expectedId) {
    return {
      ok: false,
      reason: 'target_url_not_a_job_detail',
      expectedUrl,
      actualUrl,
    };
  }
  if (!actualId) {
    return {
      ok: false,
      reason: 'target_url_not_verified',
      expectedUrl,
      actualUrl,
    };
  }
  if (expectedId !== actualId) {
    return {
      ok: false,
      reason: 'target_url_mismatch',
      expectedUrl,
      actualUrl,
    };
  }
  return {
    ok: true,
    expectedUrl,
    actualUrl,
  };
}

function buildApplicationFromMeta(args, result = {}) {
  const meta = result.evidence?.afterMeta || result.evidence?.initialMeta || {};
  const application = {
    jobId: args.url,
    url: result.url || meta.url || args.url,
    title: meta.title || '',
    company: meta.company || '',
    salary: meta.salaryText || '',
    salaryText: meta.salaryText || '',
    location: '',
    companySize: meta.companySize || '',
    stage: meta.stage || '',
    summary: '',
    applyState: result.mode === 'already_continuing' ? 'already_continuing' : '',
  };
  application.identityKey = makeApplicationIdentity(application);
  return application;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printHelp();
    return;
  }
  if (!args.url) {
    printHelp();
    throw new Error('--url is required');
  }

  const { config } = loadConfig(args.config);
  const store = new ZhipinStore();
  const triage = readChatTriage();
  const activeRestriction = store.getActiveRestriction();
  if (activeRestriction) {
    throw new Error(`site restricted: ${activeRestriction.reason}; retry after ${activeRestriction.recoveryAt || 'unknown'}`);
  }

  const dryRun = parseBoolean(args['dry-run'], config.apply?.dryRun !== false);
  const runId = store.startRun('boss_apply_playwright', {
    url: args.url,
    dryRun,
  });
  const context = await launchContext(config, {
    headed: parseBoolean(args.headed, !config.browser.headless),
    channel: args.channel || config.browser.channel,
  });

  try {
    const page = await getPrimaryPage(context);
    const preflight = await applyToJob(page, { url: args.url }, {
      greeting: args.greeting || config.apply?.greeting || '',
      dryRun: true,
      buttonTextCandidates: config.apply?.buttonTextCandidates || [],
    });
    const preflightTargetCheck = validateTargetUrl(args.url, preflight);
    const preflightApplication = buildApplicationFromMeta(args, preflight);
    const gate = preflightTargetCheck.ok
      ? checkPreApplyCandidate({
        store,
        config,
        application: preflightApplication,
        triage,
      })
      : {
        allow: false,
        reasons: [preflightTargetCheck.reason],
        candidate: preflightApplication,
        existingApplication: null,
        blockedEntry: null,
      };

    const result = dryRun || !gate.allow
      ? preflight
      : await applyToJob(page, { url: args.url }, {
        greeting: args.greeting || config.apply?.greeting || '',
        dryRun: false,
        buttonTextCandidates: config.apply?.buttonTextCandidates || [],
      });
    const targetCheck = validateTargetUrl(args.url, result);
    const ok = Boolean(result.ok && targetCheck.ok && gate.allow);
    const reason = targetCheck.ok
      ? (!gate.allow ? (gate.reasons[0] || 'pre_apply_blocked') : result.reason)
      : targetCheck.reason;

    const application = {
      ...buildApplicationFromMeta(args, result),
      status: ok ? (dryRun ? 'dry_run' : 'applied') : (!gate.allow ? 'skipped' : 'failed'),
      reasons: [reason].filter(Boolean),
      source: 'boss_apply_playwright',
      reviewedAt: nowIso(),
      applyRunId: runId,
      targetCheck,
      preflightTargetCheck,
      preApplyGate: gate,
    };
    store.upsertJob({
      id: application.jobId,
      url: application.url,
      title: application.title,
      company: application.company,
      salaryText: application.salary,
      location: application.location,
      companySize: application.companySize,
      stage: application.stage,
      identityKey: application.identityKey,
      collectedAt: nowIso(),
    });
    store.upsertApplication(application);
    store.finishRun(runId, ok ? 'completed' : 'failed', {
      ...result,
      targetCheck,
      preflightTargetCheck,
      preApplyGate: gate,
    });
    store.save({
      operation: 'boss_apply_playwright',
      phase: ok ? 'finish' : 'failed',
      runId,
      url: args.url,
    });

    console.log(JSON.stringify({
      backend: 'playwright_profile',
      runId,
      dryRun,
      preflightTargetCheck,
      preApplyGate: gate,
      targetCheck,
      ...result,
      ok,
      reason,
    }, null, 2));
  } catch (error) {
    store.finishRun(runId, 'failed', { error: error.message || String(error) });
    store.save({
      operation: 'boss_apply_playwright',
      phase: 'failed',
      runId,
      url: args.url,
    });
    throw error;
  } finally {
    await context.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  buildApplicationFromMeta,
  extractJobDetailId,
  main,
  validateTargetUrl,
};
