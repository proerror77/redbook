#!/usr/bin/env node

const { loadConfig } = require('../lib/config');
const { launchContext, getPrimaryPage } = require('../lib/browser');
const { evaluateJob } = require('../lib/filters');
const { matchJobAgainstChatTriage, readChatTriage } = require('../lib/chat_triage');
const { ZhipinStore } = require('../lib/store');
const { JOB_READY_SELECTORS, gotoAndWait, inspectPageHealth, extractJobsFromPage } = require('../lib/zhipin');
const { makeApplicationIdentity, nowIso, parseArgs, sleep } = require('../lib/utils');

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNonNegativeInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.floor(parsed);
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

function buildCollectOptions(config, args = {}) {
  return {
    limit: parseNonNegativeInt(args.limit, Number(config.jobs?.maxJobsPerRun || 30)),
    waitMs: parseNonNegativeInt(args.waitMs, 4000),
    scrollRounds: parseNonNegativeInt(args.scrolls, parseNonNegativeInt(config.jobs?.scrollRounds, 6)),
    scrollWaitMs: parseNonNegativeInt(args.scrollWaitMs, parseNonNegativeInt(config.jobs?.scrollWaitMs, 1200)),
    scrollStableRounds: Math.max(
      1,
      parseNonNegativeInt(args.scrollStableRounds, parseNonNegativeInt(config.jobs?.scrollStableRounds, 2))
    ),
  };
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

function resolveTargetUrls(config, args) {
  if (args.url) {
    return [args.url];
  }
  const configured = Array.isArray(config.jobs?.searchUrls)
    ? config.jobs.searchUrls.filter(Boolean)
    : [];
  return configured.length ? configured : [null];
}

async function inspectJobFeed(page) {
  return page.evaluate(() => ({
    anchorCount: document.querySelectorAll('a[href*="/job_detail/"], a[href*="job_detail"]').length,
    scrollTop: window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0,
    scrollHeight: Math.max(
      document.documentElement ? document.documentElement.scrollHeight : 0,
      document.body ? document.body.scrollHeight : 0
    ),
    viewportHeight: window.innerHeight || (document.documentElement ? document.documentElement.clientHeight : 0) || 0,
  }));
}

async function autoLoadMoreJobs(page, options = {}) {
  const maxRounds = Math.max(0, Number(options.scrollRounds || 0));
  const initial = await inspectJobFeed(page);
  if (maxRounds <= 0) {
    return {
      initialAnchorCount: initial.anchorCount,
      finalAnchorCount: initial.anchorCount,
      roundsCompleted: 0,
      stoppedByPlateau: false,
    };
  }

  let previous = initial;
  let stableRounds = 0;
  let roundsCompleted = 0;

  for (let round = 1; round <= maxRounds; round += 1) {
    await page.evaluate(() => {
      const root = document.scrollingElement || document.documentElement || document.body;
      const viewportHeight = window.innerHeight || (document.documentElement ? document.documentElement.clientHeight : 0) || 0;
      const nextTop = Math.max(0, (root ? root.scrollHeight : 0) - viewportHeight * 0.35);
      window.scrollTo({ top: nextTop, behavior: 'auto' });
    });
    await sleep(Number(options.scrollWaitMs || 1200));

    const current = await inspectJobFeed(page);
    roundsCompleted = round;
    const noGrowth = Number(current.anchorCount || 0) <= Number(previous.anchorCount || 0)
      && Number(current.scrollHeight || 0) <= Number(previous.scrollHeight || 0);
    stableRounds = noGrowth ? stableRounds + 1 : 0;
    previous = current;

    if (stableRounds >= Number(options.scrollStableRounds || 2)) {
      return {
        initialAnchorCount: initial.anchorCount,
        finalAnchorCount: current.anchorCount,
        roundsCompleted,
        stoppedByPlateau: true,
      };
    }
  }

  return {
    initialAnchorCount: initial.anchorCount,
    finalAnchorCount: previous.anchorCount,
    roundsCompleted,
    stoppedByPlateau: false,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { config } = loadConfig(args.config);
  const filters = buildFilters(config, args);
  const collectOptions = buildCollectOptions(config, args);
  const store = new ZhipinStore();
  const chatTriage = readChatTriage();
  const runId = store.startRun('playwright_collect_queue', {
    targetUrls: resolveTargetUrls(config, args).filter(Boolean),
    limit: collectOptions.limit,
  });
  const requiredLocation = args['require-location'] || '';
  const targetUrls = resolveTargetUrls(config, args);
  const matched = [];
  const skipped = [];
  let inspected = 0;
  let collectIndex = 0;
  const loadMoreStats = [];
  const context = await launchContext(config, {
    headed: parseBoolean(args.headed, !config.browser.headless),
    channel: args.channel || config.browser.channel,
  });

  try {
    const page = await getPrimaryPage(context);

    for (const targetUrl of targetUrls) {
      if (targetUrl) {
        await gotoAndWait(page, targetUrl);
        await sleep(collectOptions.waitMs);
      }

      const pageHealth = await inspectPageHealth(page, JOB_READY_SELECTORS);
      if (pageHealth.status === 'auth_gate' || pageHealth.status === 'restricted') {
        store.setSiteHealth({
          ...pageHealth,
          sourceUrl: page.url(),
          title: await page.title().catch(() => ''),
          backend: 'playwright_profile',
        });
        store.save({
          operation: 'playwright_collect_queue',
          phase: 'blocked',
          pageUrl: page.url(),
          runId,
        });
        throw new Error(`playwright collect blocked: ${pageHealth.reason}${pageHealth.recoveryAt ? ` until ${pageHealth.recoveryAt}` : ''}`);
      }

      if (/\/web\/geek\/job/.test(page.url() || '')) {
        const loadMoreResult = await autoLoadMoreJobs(page, collectOptions);
        loadMoreStats.push({
          url: page.url(),
          beforeAnchorCount: loadMoreResult.initialAnchorCount,
          finalAnchorCount: loadMoreResult.finalAnchorCount,
          roundsCompleted: loadMoreResult.roundsCompleted,
          stoppedByPlateau: loadMoreResult.stoppedByPlateau,
        });
      }

      const jobs = await extractJobsFromPage(page);
      if (!jobs.length) {
        throw new Error(`no jobs found on page: ${page.url()}`);
      }

      inspected += jobs.length;
      for (const job of jobs) {
        collectIndex += 1;
        const collectMeta = {
          collectRunId: runId,
          collectPageUrl: page.url(),
          collectIndex,
          collectedAt: nowIso(),
        };
        const jobId = store.upsertJob({
          ...job,
          ...collectMeta,
        });
        const existingTerminalById = store.ledger.applications[jobId];
        const existingTerminalByIdentity = store.findApplicationByIdentity(job, ['applied', 'skipped']);
        const existingTerminal = ['applied', 'skipped'].includes(existingTerminalById?.status)
          ? existingTerminalById
          : existingTerminalByIdentity;
        const chatBlocked = matchJobAgainstChatTriage(job, chatTriage);
        const decision = evaluateJob(job, filters);
        const reasons = decision.reasons.slice();
        let status = decision.allow ? 'matched' : 'skipped';

        if (!locationMatches(requiredLocation, job.location)) {
          status = 'skipped';
          reasons.push('location_required_mismatch');
        }

        if (chatBlocked) {
          status = 'skipped';
          reasons.push(`chat_triage_${chatBlocked.category || 'blocked'}`);
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
              source: 'playwright_collect_queue',
              manualRecord: true,
              identityKey: makeApplicationIdentity(job),
              reviewedAt: nowIso(),
              ...collectMeta,
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
          source: 'playwright_collect_queue',
          manualRecord: true,
          identityKey: makeApplicationIdentity(job),
          reviewedAt: nowIso(),
          ...collectMeta,
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
    }

    store.finishRun(runId, 'completed', {
      inspected,
      matched: matched.length,
      skipped: skipped.length,
    });
    store.save({
      operation: 'playwright_collect_queue',
      phase: 'finish',
      inspected,
      targetUrls: targetUrls.filter(Boolean).length,
      runId,
    });
    console.log(JSON.stringify({
      backend: 'playwright_profile',
      targetUrls,
      inspected,
      matched: matched.length,
      skipped: skipped.length,
      matchedJobs: matched,
      loadMoreStats,
      collectRunId: runId,
      summary: store.summary(),
    }, null, 2));
  } catch (error) {
    store.finishRun(runId, 'failed', {
      error: error.message || String(error),
      inspected,
      matched: matched.length,
      skipped: skipped.length,
    });
    store.save({
      operation: 'playwright_collect_queue',
      phase: 'failed',
      inspected,
      runId,
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
