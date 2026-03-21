#!/usr/bin/env node

const childProcess = require('node:child_process');
const path = require('node:path');

const { loadConfig } = require('../lib/config');
const { activateFrontWindowTab } = require('../lib/chrome_current');
const { ensureManagedTabs } = require('../lib/managed_tabs');
const { SUPERVISOR_DASHBOARD_PATH, SUPERVISOR_SNAPSHOT_PATH } = require('../lib/paths');
const { ZhipinStore } = require('../lib/store');
const { buildSupervisorSnapshot, persistSupervisorArtifacts, runSupervisorTick } = require('../lib/supervisor');
const { parseArgs } = require('../lib/utils');

function parseWorkerOutput(stdout) {
  const text = String(stdout || '').trim();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    const lastObjectStart = text.lastIndexOf('\n{');
    if (lastObjectStart >= 0) {
      try {
        return JSON.parse(text.slice(lastObjectStart + 1));
      } catch (nestedError) {
        return null;
      }
    }
    return null;
  }
}

function runWorkerScript(scriptName, args = [], options = {}) {
  const timeoutMs = Math.max(1000, Number(options.timeoutMs || 60 * 1000));
  const cwd = path.resolve(__dirname, '..');
  const scriptPath = path.join(__dirname, scriptName);
  const stdout = childProcess.execFileSync(process.execPath, [scriptPath, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: timeoutMs,
  });
  return {
    stdout,
    parsed: parseWorkerOutput(stdout),
  };
}

function makeWorkerArgs(baseArgs, args) {
  const workerArgs = [...baseArgs];
  if (args.config) {
    workerArgs.push('--config', args.config);
  }
  return workerArgs;
}

function resolveJobsTargets(config, args = {}) {
  if (args.url) {
    return [String(args.url)];
  }

  return Array.isArray(config.jobs?.searchUrls)
    ? config.jobs.searchUrls.filter(Boolean)
    : [];
}

function normalizeTargetIndex(index, count) {
  if (!count) {
    return 0;
  }

  const numeric = Number(index);
  if (!Number.isInteger(numeric)) {
    return 0;
  }

  return ((numeric % count) + count) % count;
}

function resolveJobsTarget({ config, args = {}, checkpoint = {} }) {
  const targetUrls = resolveJobsTargets(config, args);
  if (!targetUrls.length) {
    return {
      targetUrls,
      targetUrl: '',
      targetIndex: 0,
      nextTargetIndex: 0,
      cycleSize: 0,
      pinned: Boolean(args.url),
    };
  }

  const requestedIndex = args['jobs-target-index'];
  const currentIndex = normalizeTargetIndex(
    requestedIndex !== undefined ? requestedIndex : checkpoint.jobsNextTargetIndex,
    targetUrls.length
  );

  return {
    targetUrls,
    targetUrl: targetUrls[currentIndex],
    targetIndex: currentIndex,
    nextTargetIndex: normalizeTargetIndex(currentIndex + 1, targetUrls.length),
    cycleSize: targetUrls.length,
    pinned: Boolean(args.url) || requestedIndex !== undefined,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { config } = loadConfig(args.config);
  const store = new ZhipinStore();
  const runId = store.startRun('chrome_supervisor', {
    tickBudgetMs: Number(config.supervisor?.tickBudgetMs || 0),
    configPath: args.config || null,
  });
  store.save({ operation: 'chrome_supervisor', phase: 'start', runId });

  try {
    const tickResult = runSupervisorTick({
      store,
      config,
      ensureManagedTabs: () => ensureManagedTabs({
        config,
        store,
        waitMs: Number(args['wait-ms'] || 1500),
      }),
      activateTab: (tab) => activateFrontWindowTab(tab.tabIndex),
      runJobsPhase: ({ checkpoint = {}, budgetMs }) => {
        const phaseBudgetMs = Math.max(1000, Number(budgetMs || config.supervisor?.tickBudgetMs || 10 * 60 * 1000));
        const phaseStartedAt = Date.now();
        const jobsTarget = resolveJobsTarget({ config, args, checkpoint });
        if (!jobsTarget.targetUrl) {
          return {
            status: 'skipped',
            target: jobsTarget,
            collect: { status: 'skipped', reason: 'no_jobs_target' },
            apply: { status: 'skipped', reason: 'no_jobs_target' },
            checkpoint: {
              jobsNextTargetIndex: 0,
              jobsLastTargetIndex: null,
              jobsLastTargetUrl: '',
              jobsTargetCount: 0,
            },
          };
        }

        const collectBudgetMs = phaseBudgetMs;
        const collect = runWorkerScript(
          'chrome_collect_queue.js',
          makeWorkerArgs(['--url', jobsTarget.targetUrl], args),
          { timeoutMs: collectBudgetMs }
        );
        const collectParsed = collect.parsed || { stdout: collect.stdout.trim() };
        return {
          status: 'ok',
          target: jobsTarget,
          collect: collectParsed,
          apply: { status: 'skipped', reason: 'chrome_apply_removed_use_opencli_boss_apply' },
          checkpoint: {
            jobsNextTargetIndex: jobsTarget.pinned ? jobsTarget.targetIndex : jobsTarget.nextTargetIndex,
            jobsLastTargetIndex: jobsTarget.targetIndex,
            jobsLastTargetUrl: jobsTarget.targetUrl,
            jobsTargetCount: jobsTarget.cycleSize,
            jobsLastCollectRunId: collect.parsed?.collectRunId || '',
          },
        };
      },
      runChatPhase: ({ budgetMs }) => {
        const workerArgs = ['--once'];
        if (config.chat?.autoReplyEnabled && config.chat?.autoReplySend) {
          workerArgs.push('--send-drafts');
        }
        if (config.chat?.autoSendResumeButton || config.chat?.autoRejectionFollowup) {
          workerArgs.push('--run-actions');
        }
        const monitor = runWorkerScript(
          'chrome_monitor_queue.js',
          makeWorkerArgs(workerArgs, args),
          { timeoutMs: Math.max(1000, Number(budgetMs || config.supervisor?.tickBudgetMs || 10 * 60 * 1000)) }
        );
        return {
          status: 'ok',
          monitor: monitor.parsed || { stdout: monitor.stdout.trim() },
        };
      },
    });

    const snapshot = buildSupervisorSnapshot({ store, tickResult });
    const artifacts = persistSupervisorArtifacts(snapshot, {
      snapshotPath: SUPERVISOR_SNAPSHOT_PATH,
      dashboardPath: SUPERVISOR_DASHBOARD_PATH,
    });
    store.finishRun(runId, 'completed', {
      tickResult,
      artifacts,
    });
    store.save({ operation: 'chrome_supervisor', phase: 'finish', runId, status: 'completed' });
    console.log(JSON.stringify({
      runId,
      tickResult,
      artifacts,
      summary: store.summary(),
    }, null, 2));
  } catch (error) {
    store.finishRun(runId, 'failed', {
      error: error.message || String(error),
    });
    store.save({ operation: 'chrome_supervisor', phase: 'finish', runId, status: 'failed' });
    throw error;
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.stack || error.message || String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  main,
  makeWorkerArgs,
  parseWorkerOutput,
  resolveJobsTarget,
  resolveJobsTargets,
  runWorkerScript,
};
