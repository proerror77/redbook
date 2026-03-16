#!/usr/bin/env node

const { loadConfig } = require('../lib/config');
const { ZhipinStore } = require('../lib/store');
const { classifySiteHealth } = require('../lib/site_health');
const { pinchTabApplyToJob, pinchTabHealth, captureWithPinchTab } = require('../lib/pinchtab');
const { parseArgs } = require('../lib/utils');

function formatPinchTabGuardError(siteHealth) {
  if (siteHealth.status === 'restricted' && siteHealth.recoveryAt) {
    return `site restricted: ${siteHealth.reason}; retry after ${siteHealth.recoveryAt}`;
  }
  return `site blocked: ${siteHealth.reason}`;
}

function pickApplyCandidates(store, config, args) {
  if (args.url) {
    return [{
      jobId: args.url,
      url: args.url,
      title: args.title || args.url,
      company: args.company || 'manual-url',
      status: 'matched',
    }];
  }

  const limit = Number(args.limit || config.apply.maxAppliesPerRun || 5);
  return Object.values(store.ledger.applications || {})
    .filter((application) => application.status === 'matched' && application.url)
    .sort((left, right) => String(left.updatedAt || '').localeCompare(String(right.updatedAt || '')))
    .slice(0, limit);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { config } = loadConfig(args.config);
  const store = new ZhipinStore();
  const activeRestriction = store.getActiveRestriction();
  if (activeRestriction) {
    throw new Error(formatPinchTabGuardError(activeRestriction));
  }

  const candidates = pickApplyCandidates(store, config, args);
  if (!candidates.length) {
    console.log('No matched jobs with URLs available for PinchTab apply.');
    return;
  }

  const applyOptions = {
    ...config.apply,
    dryRun: args['dry-run'] ? true : config.apply.dryRun,
  };
  const previousSiteHealth = store.getSiteHealth();
  const probeTarget = candidates[0].url;
  const runId = store.startRun('pinchtab_apply_queue', {
    candidates: candidates.length,
    dryRun: applyOptions.dryRun,
  });
  store.save();

  try {
    await pinchTabHealth(config);
    const capture = await captureWithPinchTab(config, {
      url: probeTarget,
      mode: 'page',
    });
    const siteHealth = classifySiteHealth({
      url: capture.url,
      title: capture.title,
      bodyText: capture.readableText,
      looksReady: capture.looksReady,
    });

    store.setSiteHealth({
      ...siteHealth,
      sourceUrl: capture.url,
      title: capture.title,
      backend: 'pinchtab',
    });
    store.save();

    if (siteHealth.status === 'auth_gate' || siteHealth.status === 'restricted') {
      throw new Error(formatPinchTabGuardError(siteHealth));
    }

    const recoveredFromRestriction = Boolean(
      previousSiteHealth
      && previousSiteHealth.status === 'restricted'
      && previousSiteHealth.recoveryAt
      && Date.now() >= Date.parse(previousSiteHealth.recoveryAt)
      && siteHealth.status === 'healthy'
    );
    if (recoveredFromRestriction) {
      console.log('[apply] restriction cooldown elapsed; pinchtab health probe passed. Rerun to resume automation.');
      store.finishRun(runId, 'ok', {
        probeOnly: true,
        backend: 'pinchtab',
      });
      store.save();
      return;
    }

    let attempted = 0;
    let applied = 0;
    for (const candidate of candidates) {
      attempted += 1;
      const jobId = candidate.jobId || store.upsertJob(candidate);
      const result = await pinchTabApplyToJob(config, candidate, applyOptions);
      store.upsertApplication({
        jobId,
        url: candidate.url,
        title: candidate.title,
        company: candidate.company,
        status: result.ok ? (result.dryRun ? 'matched' : 'applied') : 'failed',
        dryRun: Boolean(result.dryRun),
        applyResult: {
          ...result,
          backend: 'pinchtab',
        },
      });
      if (result.ok && !result.dryRun) {
        applied += 1;
      }
      store.save();
    }

    store.finishRun(runId, 'ok', {
      attempted,
      applied,
      backend: 'pinchtab',
      summary: store.summary(),
    });
    store.save();
    console.log(JSON.stringify({
      backend: 'pinchtab',
      attempted,
      applied,
      summary: store.summary(),
    }, null, 2));
  } catch (error) {
    store.finishRun(runId, 'failed', { error: error.message, backend: 'pinchtab' });
    store.save();
    throw error;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
