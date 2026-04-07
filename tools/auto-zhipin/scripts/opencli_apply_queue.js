#!/usr/bin/env node

const childProcess = require('node:child_process');
const path = require('node:path');

const { loadConfig } = require('../lib/config');
const {
  getRemainingSuccessTarget,
  isSuccessfulApplyResult,
  pickOpencliApplyCandidates,
} = require('../lib/opencli_apply_queue');
const { ZhipinStore } = require('../lib/store');
const { nowIso, parseArgs } = require('../lib/utils');

const OPENCLI_BIN_PATH = path.resolve(__dirname, '../../opencli/bin/redbook-opencli.js');

function parseJsonOutput(stdout) {
  const text = String(stdout || '').trim();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    const newlineArray = text.lastIndexOf('\n[');
    if (newlineArray >= 0) {
      try {
        return JSON.parse(text.slice(newlineArray + 1));
      } catch (nestedError) {
        return null;
      }
    }
    const newlineObject = text.lastIndexOf('\n{');
    if (newlineObject >= 0) {
      try {
        return JSON.parse(text.slice(newlineObject + 1));
      } catch (nestedError) {
        return null;
      }
    }
    return null;
  }
}

function unwrapApplyResult(payload) {
  if (Array.isArray(payload)) {
    return payload[0] || null;
  }
  if (Array.isArray(payload?.items)) {
    return payload.items[0] || null;
  }
  return payload || null;
}

function runOpencliApply(candidate, options = {}) {
  const args = [OPENCLI_BIN_PATH, 'boss', 'apply', '--url', candidate.url, '-f', 'json'];
  if (options.dryRun) {
    args.push('--dry_run', 'true');
  }

  const stdout = childProcess.execFileSync(process.execPath, args, {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: Math.max(1000, Number(options.timeoutMs || 120 * 1000)),
  });
  const parsed = parseJsonOutput(stdout);
  const result = unwrapApplyResult(parsed);
  if (!result) {
    throw new Error(`opencli apply returned no JSON result for ${candidate.url}`);
  }
  return result;
}

function summarizeFailure(result = {}) {
  return String(result.reason || result.mode || result.status || 'apply_failed');
}

function buildAttemptRecord(candidate, result, success) {
  return {
    jobId: candidate.jobId,
    title: candidate.title,
    company: candidate.company,
    salary: candidate.salaryText || candidate.salary || '',
    location: candidate.location || '',
    url: candidate.url,
    identityKey: candidate.identityKey,
    success,
    finalStatus: success ? 'applied' : 'skipped',
    result,
    attemptedAt: nowIso(),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { config } = loadConfig(args.config);
  const store = new ZhipinStore();
  const requestedSuccesses = Number(args['target-successes'] || args.limit || 0) || undefined;
  const targetSuccesses = getRemainingSuccessTarget({
    store,
    config,
    requestedSuccesses,
  });

  const dryRun = args['dry-run'] ? true : Boolean(config.apply?.dryRun);
  const candidateLimit = Math.max(
    targetSuccesses,
    Number(args.limit || config.apply?.maxAppliesPerRun || config.supervisor?.maxAppliesPerTick || 5)
  );
  const candidates = pickOpencliApplyCandidates(store, config, {
    ...args,
    limit: candidateLimit,
  });

  const runId = store.startRun('opencli_apply_queue', {
    dryRun,
    targetSuccesses,
    candidateLimit,
    candidates: candidates.length,
  });
  store.save({ operation: 'opencli_apply_queue', phase: 'start', runId });

  try {
    if (!candidates.length || targetSuccesses <= 0) {
      const summary = {
        runId,
        targetSuccesses,
        attempted: 0,
        applied: 0,
        skipped: 0,
        exhaustedCandidates: true,
        results: [],
        summary: store.summary(),
      };
      store.finishRun(runId, 'completed', summary);
      store.save({ operation: 'opencli_apply_queue', phase: 'finish', runId, status: 'completed' });
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    const results = [];
    let attempted = 0;
    let applied = 0;

    for (const candidate of candidates) {
      if (applied >= targetSuccesses) {
        break;
      }

      attempted += 1;
      const result = runOpencliApply(candidate, {
        dryRun,
        timeoutMs: args['timeout-ms'] || config.browser?.navigationTimeoutMs || 120 * 1000,
      });
      const success = !dryRun && isSuccessfulApplyResult(result);
      const failureReason = summarizeFailure(result);

      store.upsertApplication({
        jobId: candidate.jobId,
        url: candidate.url,
        title: candidate.title,
        company: candidate.company,
        salary: candidate.salaryText || candidate.salary || '',
        location: candidate.location || '',
        companySize: candidate.companySize || '',
        summary: candidate.summary || '',
        identityKey: candidate.identityKey,
        status: success ? 'applied' : (dryRun ? 'matched' : 'skipped'),
        appliedAt: success ? nowIso() : undefined,
        skippedAt: !success && !dryRun ? nowIso() : undefined,
        reasons: success ? [] : [failureReason],
        applyResult: result,
        source: 'opencli_apply_queue',
      });

      if (success) {
        applied += 1;
      }

      results.push(buildAttemptRecord(candidate, result, success));
      store.save({
        operation: 'opencli_apply_queue',
        phase: 'candidate',
        runId,
        jobId: candidate.jobId,
        status: success ? 'applied' : (dryRun ? 'matched' : 'skipped'),
      });
    }

    const summary = {
      runId,
      targetSuccesses,
      attempted,
      applied,
      skipped: results.filter((item) => item.finalStatus === 'skipped').length,
      exhaustedCandidates: applied < targetSuccesses,
      dryRun,
      results,
      summary: store.summary(),
    };
    store.finishRun(runId, 'completed', summary);
    store.save({ operation: 'opencli_apply_queue', phase: 'finish', runId, status: 'completed' });
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    store.finishRun(runId, 'failed', { error: error.message || String(error) });
    store.save({ operation: 'opencli_apply_queue', phase: 'finish', runId, status: 'failed' });
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
  parseJsonOutput,
  runOpencliApply,
  unwrapApplyResult,
};
