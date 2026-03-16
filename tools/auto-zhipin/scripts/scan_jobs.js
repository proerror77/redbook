#!/usr/bin/env node

const { loadConfig } = require('../lib/config');
const { launchContext, getPrimaryPage } = require('../lib/browser');
const { ZhipinStore } = require('../lib/store');
const { evaluateJob } = require('../lib/filters');
const { enforceRuntimeGuard, formatGuardError } = require('../lib/runtime_guard');
const { gotoAndWait, JOB_READY_SELECTORS, extractJobsFromPage, applyToJob } = require('../lib/zhipin');
const { parseArgs } = require('../lib/utils');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { config } = loadConfig(args.config);
  const store = new ZhipinStore();
  const activeRestriction = store.getActiveRestriction();
  if (activeRestriction) {
    throw new Error(formatGuardError({
      status: 'restricted',
      reason: activeRestriction.reason,
      recoveryAt: activeRestriction.recoveryAt || null,
    }));
  }
  const applyRequested = Boolean(args.apply || args['dry-run']);
  const applyOptions = {
    ...config.apply,
    dryRun: args['dry-run'] ? true : config.apply.dryRun,
  };
  const shouldApply = applyRequested && config.apply.enabled;
  const runId = store.startRun('scan_jobs', {
    apply: shouldApply,
    dryRun: applyOptions.dryRun,
  });
  store.save();

  const context = await launchContext(config, {
    headed: Boolean(args.headed || !config.browser.headless),
    channel: args.channel || config.browser.channel,
  });

  try {
    const page = await getPrimaryPage(context);
    let inspected = 0;
    let applied = 0;

    if (applyRequested && !config.apply.enabled) {
      console.warn('Apply was requested, but config.apply.enabled is false. Running scan only.');
    }

    for (const url of config.jobs.searchUrls) {
      await gotoAndWait(page, url);
      const guard = await enforceRuntimeGuard({
        page,
        store,
        mode: 'page',
        readySelectors: JOB_READY_SELECTORS,
      });
      store.save();
      if (guard.blocked) {
        throw new Error(formatGuardError(guard));
      }
      if (guard.probeOnly) {
        console.log('[scan] restriction cooldown elapsed; health probe passed. Rerun to resume automation.');
        store.finishRun(runId, 'ok', {
          inspected,
          applied,
          probeOnly: true,
          summary: store.summary(),
        });
        store.save();
        return;
      }

      const jobs = await extractJobsFromPage(page);
      for (const job of jobs) {
        inspected += 1;
        const jobId = store.upsertJob(job);
        const existingByJobId = store.ledger.applications[jobId];
        if (existingByJobId && existingByJobId.status === 'applied') {
          continue;
        }

        const decision = evaluateJob(job, config.filters);
        const duplicateApplied = decision.allow
          ? store.findApplicationByIdentity(job, ['applied'])
          : null;
        const reasons = decision.reasons.slice();
        let status = decision.allow ? 'matched' : 'skipped';

        if (duplicateApplied && duplicateApplied.jobId !== jobId) {
          status = 'skipped';
          reasons.push('duplicate_applied_identity');
        }

        store.upsertApplication({
          jobId,
          url: job.url,
          title: job.title,
          company: job.company,
          status,
          reasons,
          duplicateOf: duplicateApplied?.jobId || null,
          dryRun: applyOptions.dryRun,
        });

        if (!decision.allow || (duplicateApplied && duplicateApplied.jobId !== jobId)) {
          continue;
        }

        if (!shouldApply) {
          continue;
        }

        if (applied >= Number(applyOptions.maxAppliesPerRun || 5)) {
          continue;
        }

        const result = await applyToJob(page, job, applyOptions);
        if (result.blocker?.status === 'restricted' || result.blocker?.status === 'auth_gate') {
          store.setSiteHealth({
            status: result.blocker.status,
            reason: result.blocker.reason,
            recoveryAt: result.blocker.recoveryAt || null,
            sourceUrl: job.url,
          });
        }
        store.upsertApplication({
          jobId,
          url: job.url,
          title: job.title,
          company: job.company,
          status: result.ok ? (result.dryRun ? 'matched' : 'applied') : 'failed',
          reasons,
          dryRun: Boolean(result.dryRun),
          applyResult: result,
        });

        if (result.ok && !result.dryRun) {
          applied += 1;
        }

        store.save();

        if (inspected >= Number(config.jobs.maxJobsPerRun || 30)) {
          break;
        }
      }

      if (inspected >= Number(config.jobs.maxJobsPerRun || 30)) {
        break;
      }
    }

    store.finishRun(runId, 'ok', {
      inspected,
      applied,
      summary: store.summary(),
    });
    store.save();
    console.log(`[scan] inspected=${inspected} applied=${applied} summary=${JSON.stringify(store.summary())}`);
  } catch (error) {
    store.finishRun(runId, 'failed', { error: error.message });
    store.save();
    throw error;
  } finally {
    await context.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
