#!/usr/bin/env node

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');

const { DATA_DIR } = require('../lib/paths');
const { ZhipinStore } = require('../lib/store');
const { nowIso, parseArgs } = require('../lib/utils');
const {
  findTraceBlockingIssues,
  findTraceNavigationIssues,
  probeOnce,
} = require('./boss_trace_probe');

const DEFAULT_CDP_ENDPOINT = 'http://127.0.0.1:9224';
const TRACE_ROOT = path.resolve(__dirname, '..', '..', '..', '.o11y');
const TRACE_SCRIPT_DIR = '/Users/proerror/.agents/skills/browser-trace/scripts';
const DEFAULT_OUTPUT = path.join(DATA_DIR, 'boss-trace-apply-batch-latest.json');

function parseBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(text)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(text)) return false;
  return fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath, payload) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (response) => {
      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

function runNodeScript(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(TRACE_SCRIPT_DIR, scriptName), ...args], {
      env: {
        ...process.env,
        O11Y_ROOT: TRACE_ROOT,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        const error = new Error(`${scriptName} exited ${code}: ${stderr || stdout}`);
        error.code = code;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function runApply(args = []) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(__dirname, 'cdp_apply_job.js'), ...args], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => {
      let parsed = null;
      try {
        parsed = JSON.parse(stdout);
      } catch {
        parsed = null;
      }
      resolve({ code, stdout, stderr, parsed });
    });
  });
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readTraceSummary(runId) {
  return readJson(path.join(TRACE_ROOT, runId, 'cdp', 'summary.json'), null);
}

function cleanupTrace(runId) {
  fs.rmSync(path.join(TRACE_ROOT, runId), { recursive: true, force: true });
}

function normalizeUrl(value = '') {
  return String(value || '').split('#')[0];
}

function loadCandidates(input = '') {
  const files = String(input || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const candidates = [];
  for (const file of files) {
    const payload = readJson(path.resolve(file), {});
    const entries = Array.isArray(payload.matched)
      ? payload.matched
      : Array.isArray(payload.candidates)
        ? payload.candidates
        : Array.isArray(payload.urls)
          ? payload.urls.map((url) => ({ url }))
          : [];
    for (const entry of entries) {
      if (!entry?.url) continue;
      candidates.push({
        ...entry,
        sourceFile: file,
        url: normalizeUrl(entry.url),
      });
    }
  }
  const seen = new Set();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.url)) return false;
    seen.add(candidate.url);
    return true;
  });
}

function classifyUrl(url = '') {
  const text = String(url || '');
  if (/\/web\/passport\/zp\/error/i.test(text)) return 'abnormal_account_page';
  if (/\/web\/user(?:[/?#]|$)/i.test(text)) return 'login_page';
  if (/403(?:\.html)?/i.test(text) || /[?&]code=(?:32|38)(?:[&#]|$)/i.test(text)) return 'restricted_page';
  if (/security|verify|captcha|_security_check/i.test(text)) return 'security_page';
  return '';
}

async function readHealth(cdpEndpoint) {
  const pages = await getJson(new URL('/json/list', cdpEndpoint).toString());
  const zhipinPages = Array.isArray(pages)
    ? pages.filter((entry) => String(entry.url || '').includes('zhipin.com') && entry.type === 'page')
    : [];
  const blocking = zhipinPages
    .map((page) => ({ title: page.title || '', url: page.url || '', reason: classifyUrl(page.url || '') }))
    .find((page) => page.reason);
  return {
    ok: zhipinPages.length > 0 && !blocking,
    blocking: blocking || null,
    pages: zhipinPages.map((page) => ({ title: page.title || '', url: page.url || '' })),
  };
}

function isTraceHardStop(issue) {
  return /^trace_(login|abnormal|restricted|security)/.test(issue.reason || '');
}

function isCandidateBlockOnly(reasons = []) {
  return reasons.length > 0 && reasons.every((reason) => !/^trace_|target_url_|auth|restricted|security|login/i.test(reason));
}

async function tracedLiveApply({ cdpEndpoint, url, config, clickMode, keepTrace, runId }) {
  const port = String(new URL(cdpEndpoint).port || 9224);
  await runNodeScript('start-capture.mjs', [port, runId, '1']);
  let applyResult;
  try {
    const args = [
      '--cdp-endpoint', cdpEndpoint,
      '--url', url,
      '--dry-run', 'false',
      '--focus', 'false',
      '--click-mode', clickMode,
    ];
    if (config) args.push('--config', config);
    applyResult = await runApply(args);
  } finally {
    await sleep(1200);
    await runNodeScript('stop-capture.mjs', [runId]).catch(() => {});
    await runNodeScript('bisect-cdp.mjs', [runId]).catch(() => {});
  }

  const summary = readTraceSummary(runId);
  const traceIssues = [
    ...findTraceNavigationIssues(summary, url),
    ...findTraceBlockingIssues(summary),
  ];
  if (!keepTrace) cleanupTrace(runId);
  return {
    applyResult,
    trace: {
      runId,
      cleaned: !keepTrace,
      totalEvents: summary?.totalEvents || 0,
      pages: (summary?.pages || []).map((page) => ({
        pageId: page.pageId,
        url: page.url,
        eventCount: page.eventCount,
        networkFailed: page.network?.failed || 0,
      })),
      issues: traceIssues,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cdpEndpoint = args['cdp-endpoint'] || DEFAULT_CDP_ENDPOINT;
  const candidates = args.url
    ? [{ url: normalizeUrl(args.url), sourceFile: 'cli' }]
    : loadCandidates(args.candidates);
  if (!candidates.length) {
    throw new Error('--url or --candidates <json[,json]> is required');
  }

  const live = parseBoolean(args.live, false);
  if (live && process.env.BOSS_ENABLE_LIVE_APPLY !== '1') {
    throw new Error('live trace apply requires BOSS_ENABLE_LIVE_APPLY=1 and --live true');
  }

  const store = new ZhipinStore();
  const targetSuccesses = Math.max(1, Number(args['target-successes'] || 1));
  const maxProbes = Math.max(targetSuccesses, Number(args['max-probes'] || targetSuccesses * 6));
  const delayMs = Math.max(15000, Number(args['delay-ms'] || 60000));
  const clickMode = String(args['click-mode'] || 'dom');
  const keepTrace = parseBoolean(args['keep-trace'], false);
  const startedCount = store.getTodaySuccessfulApplies(new Date());
  const output = {
    generatedAt: nowIso(),
    cdpEndpoint,
    live,
    targetSuccesses,
    maxProbes,
    delayMs,
    startedCount,
    applied: [],
    eligibleDryRun: [],
    skipped: [],
    failed: [],
    hardStop: null,
  };

  for (const candidate of candidates.slice(0, maxProbes)) {
    const beforeHealth = await readHealth(cdpEndpoint);
    if (!beforeHealth.ok) {
      output.hardStop = { reason: 'pre_health_blocked', health: beforeHealth };
      break;
    }

    let probe;
    try {
      probe = await probeOnce({
        cdpEndpoint,
        url: candidate.url,
        config: args.config,
        focus: false,
        keepTrace,
        waitMs: args['probe-wait-ms'] || 2500,
        postWaitMs: args['probe-post-wait-ms'] || 1200,
      });
    } catch (error) {
      output.failed.push({ url: candidate.url, phase: 'probe', error: error.message || String(error) });
      output.hardStop = { reason: 'probe_failed', url: candidate.url };
      break;
    }

    if (!probe.okToLiveApply) {
      const reasons = probe.gate?.reasons || [];
      const record = {
        url: candidate.url,
        title: candidate.title || probe.gate?.candidate?.title || '',
        company: candidate.company || probe.gate?.candidate?.company || '',
        reasons,
        traceIssues: probe.trace?.issues || [],
      };
      output.skipped.push(record);
      if (!isCandidateBlockOnly(reasons) || (probe.trace?.issues || []).some(isTraceHardStop)) {
        output.hardStop = { reason: 'probe_not_safe_for_live_apply', record };
        break;
      }
      continue;
    }

    if (!live) {
      output.eligibleDryRun.push({
        url: candidate.url,
        title: probe.gate?.candidate?.title || candidate.title || '',
        company: probe.gate?.candidate?.company || candidate.company || '',
        traceEvents: probe.trace?.totalEvents || 0,
      });
      continue;
    }

    const beforeCount = store.getTodaySuccessfulApplies(new Date());
    const runId = `boss-trace-live-apply-${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}`;
    const liveResult = await tracedLiveApply({
      cdpEndpoint,
      url: candidate.url,
      config: args.config,
      clickMode,
      keepTrace,
      runId,
    });
    const afterCount = store.getTodaySuccessfulApplies(new Date());
    const traceIssues = liveResult.trace?.issues || [];
    const success = liveResult.applyResult?.parsed?.success === true
      && afterCount === beforeCount + 1
      && !traceIssues.length;

    const record = {
      url: candidate.url,
      beforeCount,
      afterCount,
      success,
      applyExitCode: liveResult.applyResult?.code,
      applySuccess: liveResult.applyResult?.parsed?.success === true,
      company: liveResult.applyResult?.parsed?.before?.company || probe.gate?.candidate?.company || '',
      title: liveResult.applyResult?.parsed?.before?.jobName || probe.gate?.candidate?.title || '',
      trace: liveResult.trace,
    };
    if (success) {
      output.applied.push(record);
    } else {
      output.failed.push(record);
      output.hardStop = {
        reason: traceIssues.length ? 'live_trace_issue' : 'live_apply_not_verified',
        record,
      };
      break;
    }

    if (traceIssues.some(isTraceHardStop)) {
      output.hardStop = { reason: 'live_trace_hard_stop', record };
      break;
    }
    if (output.applied.length >= targetSuccesses) {
      break;
    }
    await sleep(delayMs);
  }

  output.finishedAt = nowIso();
  output.finalCount = store.getTodaySuccessfulApplies(new Date());
  output.remainingTarget = Math.max(0, targetSuccesses - output.applied.length);
  writeJson(args.output || DEFAULT_OUTPUT, output);
  console.log(JSON.stringify({
    live,
    startedCount: output.startedCount,
    finalCount: output.finalCount,
    applied: output.applied.length,
    eligibleDryRun: output.eligibleDryRun.length,
    skipped: output.skipped.length,
    failed: output.failed.length,
    hardStop: output.hardStop,
    output: args.output || DEFAULT_OUTPUT,
  }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
}

module.exports = {
  classifyUrl,
  isCandidateBlockOnly,
  loadCandidates,
};
