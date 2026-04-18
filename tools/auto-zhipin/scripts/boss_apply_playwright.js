#!/usr/bin/env node

const { loadConfig } = require('../lib/config');
const { launchContext, getPrimaryPage } = require('../lib/browser');
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
    '  --dry-run <true|false>   Click apply only, do not continue send flow',
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
  const activeRestriction = store.getActiveRestriction();
  if (activeRestriction) {
    throw new Error(`site restricted: ${activeRestriction.reason}; retry after ${activeRestriction.recoveryAt || 'unknown'}`);
  }

  const dryRun = parseBoolean(args['dry-run'], false);
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
    const result = await applyToJob(page, { url: args.url }, {
      greeting: args.greeting || config.apply?.greeting || '',
      dryRun,
      buttonTextCandidates: config.apply?.buttonTextCandidates || [],
    });

    const application = {
      jobId: args.url,
      url: result.url || args.url,
      title: '',
      company: '',
      salary: '',
      location: '',
      status: result.ok ? (dryRun ? 'dry_run' : 'applied') : 'failed',
      reasons: [result.reason].filter(Boolean),
      source: 'boss_apply_playwright',
      identityKey: makeApplicationIdentity({ url: result.url || args.url }),
      reviewedAt: nowIso(),
      applyRunId: runId,
    };
    store.upsertJob({
      id: application.jobId,
      url: application.url,
      title: application.title,
      company: application.company,
      salaryText: application.salary,
      location: application.location,
      identityKey: application.identityKey,
      collectedAt: nowIso(),
    });
    store.upsertApplication(application);
    store.finishRun(runId, result.ok ? 'completed' : 'failed', result);
    store.save({
      operation: 'boss_apply_playwright',
      phase: result.ok ? 'finish' : 'failed',
      runId,
      url: args.url,
    });

    console.log(JSON.stringify({
      backend: 'playwright_profile',
      runId,
      dryRun,
      ...result,
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

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
