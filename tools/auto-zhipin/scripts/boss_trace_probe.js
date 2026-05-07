#!/usr/bin/env node

const fs = require('node:fs');
const { spawn } = require('node:child_process');
const path = require('node:path');

const { readChatTriage } = require('../lib/chat_triage');
const { loadConfig } = require('../lib/config');
const { DATA_DIR } = require('../lib/paths');
const { checkPreApplyCandidate } = require('../lib/opencli_apply_queue');
const { ZhipinStore } = require('../lib/store');
const { nowIso, parseArgs } = require('../lib/utils');
const {
  buildCandidateFromMeta,
  createCdpSession,
  extractMeta,
  pickReusableTarget,
  validateTargetUrl,
} = require('./cdp_apply_job');

const DEFAULT_CDP_ENDPOINT = 'http://127.0.0.1:9224';
const DEFAULT_OUTPUT = path.join(DATA_DIR, 'boss-trace-probe-latest.json');
const DEFAULT_HISTORY = path.join(DATA_DIR, 'boss-trace-probe-history.jsonl');
const TRACE_ROOT = path.resolve(__dirname, '..', '..', '..', '.o11y');
const TRACE_SCRIPT_DIR = '/Users/proerror/.agents/skills/browser-trace/scripts';

function parseBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }
  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(text)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(text)) return false;
  return fallback;
}

function readOption(options, camelKey, dashedKey) {
  if (options[camelKey] !== undefined) {
    return options[camelKey];
  }
  return options[dashedKey];
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

function appendJsonLine(filePath, payload) {
  ensureDir(filePath);
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`);
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

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readErrors(runId) {
  const summary = readJson(path.join(TRACE_ROOT, runId, 'cdp', 'summary.json'), null);
  const failedPath = path.join(TRACE_ROOT, runId, 'cdp', 'network', 'failed.jsonl');
  const failed = fs.existsSync(failedPath)
    ? fs.readFileSync(failedPath, 'utf8').split(/\n+/).filter(Boolean).slice(0, 12).map((line) => {
      try {
        const event = JSON.parse(line);
        return {
          requestId: event.params?.requestId || '',
          errorText: event.params?.errorText || '',
          type: event.params?.type || '',
        };
      } catch {
        return { raw: line };
      }
    })
    : [];
  return { summary, failed };
}

function findTraceNavigationIssues(traceSummary, expectedUrl = '') {
  const expectedId = String(expectedUrl || '').match(/\/job_detail\/([^/.?#]+)\.html/i)?.[1] || '';
  if (!expectedId || !traceSummary) {
    return [];
  }

  return (traceSummary.pages || [])
    .map((page) => {
      const url = String(page.url || '');
      const actualId = url.match(/\/job_detail\/([^/.?#]+)\.html/i)?.[1] || '';
      if (!actualId || actualId === expectedId) {
        return null;
      }
      return {
        reason: 'trace_unstable_navigation',
        pageId: page.pageId,
        url,
      };
    })
    .filter(Boolean);
}

function cleanupTrace(runId) {
  fs.rmSync(path.join(TRACE_ROOT, runId), { recursive: true, force: true });
}

async function currentJobUrl(cdpEndpoint) {
  const target = await pickReusableTarget(cdpEndpoint, '');
  return target.url || '';
}

async function probeOnce(options) {
  const cdpEndpoint = options.cdpEndpoint || DEFAULT_CDP_ENDPOINT;
  const targetUrl = options.url || await currentJobUrl(cdpEndpoint);
  if (!targetUrl || !targetUrl.includes('/job_detail/')) {
    throw new Error(`No current BOSS job_detail URL found: ${targetUrl || 'empty'}`);
  }

  const runId = options.runId || `boss-trace-probe-${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}`;
  await runNodeScript('start-capture.mjs', [String(new URL(cdpEndpoint).port || 9224), runId, String(options.sampleIntervalSeconds || 1)]);

  let result;
  try {
    const { config } = loadConfig(options.config);
    const store = new ZhipinStore();
    const triage = readChatTriage();
    const target = await pickReusableTarget(cdpEndpoint, targetUrl);
    const session = await createCdpSession(target.webSocketDebuggerUrl);
    try {
      await session.send('Page.enable');
      if (parseBoolean(options.focus, false)) {
        await session.send('Page.bringToFront');
      }
      await session.send('Page.navigate', { url: targetUrl });
      await sleep(Number(options.waitMs || 2500));
      const meta = await extractMeta(session) || {};
      const candidate = buildCandidateFromMeta(meta, targetUrl);
      const targetCheck = validateTargetUrl(targetUrl, meta.url || '');
      const gate = targetCheck.ok
        ? checkPreApplyCandidate({
          store,
          config,
          application: candidate,
          triage,
        })
        : {
          allow: false,
          reasons: [targetCheck.reason],
          candidate,
          existingApplication: null,
          blockedEntry: null,
        };
      result = {
        timestamp: nowIso(),
        runId,
        cdpEndpoint,
        requestedUrl: targetUrl,
        actualUrl: meta.url || '',
        title: meta.title || '',
        actionText: meta.actionText || '',
        targetCheck,
        gate: {
          allow: gate.allow,
          reasons: gate.reasons,
          candidate: gate.candidate,
          existingApplication: gate.existingApplication ? {
            jobId: gate.existingApplication.jobId,
            status: gate.existingApplication.status,
            identityKey: gate.existingApplication.identityKey,
          } : null,
          blockedEntry: gate.blockedEntry,
        },
        okToLiveApply: Boolean(meta.jobName) && targetCheck.ok && gate.allow,
      };
    } finally {
      session.close();
    }
  } finally {
    await sleep(Number(options.postWaitMs || 1200));
    await runNodeScript('stop-capture.mjs', [runId]).catch(() => {});
    await runNodeScript('bisect-cdp.mjs', [runId]).catch(() => {});
  }

  const trace = readErrors(runId);
  const traceIssues = findTraceNavigationIssues(trace.summary, result.requestedUrl);
  result.trace = {
    runId,
    totalEvents: trace.summary?.totalEvents || 0,
    pages: (trace.summary?.pages || []).map((page) => ({
      pageId: page.pageId,
      url: page.url,
      eventCount: page.eventCount,
      networkFailed: page.network?.failed || 0,
    })),
    failed: trace.failed,
    issues: traceIssues,
  };
  if (traceIssues.length) {
    result.okToLiveApply = false;
    result.gate.reasons = Array.from(new Set([
      ...(result.gate.reasons || []),
      ...traceIssues.map((issue) => issue.reason),
    ]));
  }

  if (parseBoolean(readOption(options, 'keepTrace', 'keep-trace'), false) !== true) {
    cleanupTrace(runId);
    result.trace.cleaned = true;
  }

  writeJson(options.output || DEFAULT_OUTPUT, result);
  appendJsonLine(options.history || DEFAULT_HISTORY, result);
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const poll = parseBoolean(args.poll, false);
  const maxLoops = Math.max(1, Number(args['max-loops'] || (poll ? 999999 : 1)));
  const intervalMs = Math.max(1000, Number(args['interval-ms'] || 30000));
  const results = [];

  for (let loop = 1; loop <= maxLoops; loop += 1) {
    const result = await probeOnce({
      ...args,
      cdpEndpoint: args['cdp-endpoint'] || DEFAULT_CDP_ENDPOINT,
      runId: args['run-id'] ? `${args['run-id']}-${loop}` : undefined,
    });
    results.push(result);
    console.log(JSON.stringify({
      loop,
      timestamp: result.timestamp,
      requestedUrl: result.requestedUrl,
      actualUrl: result.actualUrl,
      title: result.gate?.candidate?.title || result.title,
      company: result.gate?.candidate?.company || '',
      okToLiveApply: result.okToLiveApply,
      reasons: result.gate?.reasons || [],
      traceEvents: result.trace?.totalEvents || 0,
    }, null, 2));

    if (!poll || loop >= maxLoops) {
      break;
    }
    await sleep(intervalMs);
  }

  if (poll) {
    console.log(JSON.stringify({
      completedLoops: results.length,
      latestOutput: args.output || DEFAULT_OUTPUT,
      history: args.history || DEFAULT_HISTORY,
    }, null, 2));
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
}

module.exports = {
  findTraceNavigationIssues,
  probeOnce,
  readOption,
};
