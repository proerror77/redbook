#!/usr/bin/env node

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');

const { readChatTriage } = require('../lib/chat_triage');
const { loadConfig } = require('../lib/config');
const { DATA_DIR } = require('../lib/paths');
const { checkPreApplyCandidate } = require('../lib/opencli_apply_queue');
const { ZhipinStore } = require('../lib/store');
const { nowIso, parseArgs } = require('../lib/utils');
const { classifyUrl } = require('./boss_trace_apply_batch');
const {
  buildCandidateFromMeta,
  clickApply,
  clickPostApplyReminder,
  createCdpSession,
  extractMeta,
  getHeadhunterBlockReasons,
  isChatNavigationSuccess,
  pickReusableTarget,
  validateTargetUrl,
} = require('./cdp_apply_job');
const {
  findTraceBlockingIssues,
  findTraceNavigationIssues,
} = require('./boss_trace_probe');

const DEFAULT_CDP_ENDPOINT = 'http://127.0.0.1:9224';
const DEFAULT_OUTPUT = path.join(DATA_DIR, 'boss-trace-apply-recommendations-latest.json');
const TRACE_ROOT = path.resolve(__dirname, '..', '..', '..', '.o11y');
const TRACE_SCRIPT_DIR = '/Users/proerror/.agents/skills/browser-trace/scripts';

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

function normalizeUrl(value = '') {
  return String(value || '').split('#')[0];
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

function isTraceHardStop(issue) {
  return /^trace_(login|abnormal|restricted|security)/.test(issue.reason || '');
}

function looksRelevantRecommendation(text = '') {
  const value = String(text || '').toLowerCase();
  if (!/ai|agent|智能体|大模型|llm|rag|aigc|架构|技术负责人|技术总监|研发总监|cto|解决方案|平台|中台|效率|管理|咨询|转型/.test(value)) {
    return false;
  }
  if (/猎头|代招|某大型|某知名|某公司|智驾|自动驾驶|车型|驾舱|汽车|车载|芯片|主播|销售|运营|投放|实习|hr/.test(value)) {
    return false;
  }
  if (/(^|[^0-9])1[0-9]\s*-\s*[0-9]+\s*k/i.test(value)) {
    return false;
  }
  return true;
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

async function collectRecommendationLinks(session, { limit = 80 } = {}) {
  const result = await session.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      function clean(value) { return String(value || '').replace(/\\s+/g, ' ').trim(); }
      const current = location.href.split('#')[0];
      return Array.from(document.querySelectorAll('a[href*="/job_detail/"]'))
        .map((node) => ({ text: clean(node.innerText || node.textContent || ''), url: String(node.href || '').split('#')[0] }))
        .filter((item) => item.url && item.url !== current)
        .slice(0, ${Number(limit)});
    })()`,
  });
  const links = Array.isArray(result.result?.result?.value) ? result.result.result.value : [];
  const seen = new Set();
  return links
    .map((link) => ({ ...link, url: normalizeUrl(link.url) }))
    .filter((link) => {
      if (!link.url || seen.has(link.url)) return false;
      seen.add(link.url);
      return looksRelevantRecommendation(link.text || '');
    });
}

async function readCurrentUrl(session) {
  const result = await session.send('Runtime.evaluate', {
    returnByValue: true,
    expression: 'location.href',
  });
  return String(result.result?.result?.value || '');
}

async function clickRecommendationLink(session, url) {
  return session.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      function clean(value) { return String(value || '').replace(/\\s+/g, ' ').trim(); }
      const expected = ${JSON.stringify(normalizeUrl(url))};
      const nodes = Array.from(document.querySelectorAll('a[href*="/job_detail/"]'));
      const node = nodes.find((item) => String(item.href || '').split('#')[0] === expected);
      if (!node) return { ok: false, reason: 'recommendation_anchor_not_found', expected };
      node.setAttribute('target', '_self');
      node.scrollIntoView({ block: 'center' });
      const beforeUrl = location.href;
      const text = clean(node.innerText || node.textContent || '');
      node.click();
      return { ok: true, expected, beforeUrl, text };
    })()`,
  }).then((result) => result.result?.result?.value || { ok: false, reason: 'recommendation_click_no_result' });
}

async function waitForExpectedDetail(session, expectedUrl, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  let latest = null;
  while (Date.now() < deadline) {
    latest = await extractMeta(session) || {};
    const targetCheck = validateTargetUrl(expectedUrl, latest.url || '');
    if (targetCheck.ok && latest.jobName) {
      return { ok: true, meta: latest, targetCheck };
    }
    await sleep(400);
  }
  const targetCheck = validateTargetUrl(expectedUrl, latest?.url || '');
  return { ok: false, meta: latest || {}, targetCheck };
}

function gateMeta({ store, config, triage, meta, url }) {
  const candidate = buildCandidateFromMeta(meta, url);
  const gate = checkPreApplyCandidate({
    store,
    config,
    application: candidate,
    triage,
  });
  const headhunterReasons = getHeadhunterBlockReasons(gate.candidate, meta);
  if (headhunterReasons.length) {
    gate.allow = false;
    gate.reasons = Array.from(new Set([...(gate.reasons || []), ...headhunterReasons]));
  }
  return gate;
}

async function runCandidate({ session, cdpEndpoint, store, config, triage, link, live, clickMode, keepTrace, waitMs }) {
  const runId = `boss-trace-rec-apply-${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}`;
  const port = String(new URL(cdpEndpoint).port || 9224);
  await runNodeScript('start-capture.mjs', [port, runId, '1']);

  let clickResult;
  let detail;
  let gate;
  let applyResult = null;
  try {
    clickResult = await clickRecommendationLink(session, link.url);
    if (!clickResult.ok) {
      return { phase: 'click_recommendation', link, clickResult, trace: { runId }, hardStop: false };
    }

    detail = await waitForExpectedDetail(session, link.url, waitMs);
    if (!detail.ok) {
      return {
        phase: 'detail_stability',
        link,
        clickResult,
        targetCheck: detail.targetCheck,
        meta: detail.meta,
        trace: { runId },
        hardStop: false,
      };
    }

    gate = gateMeta({ store, config, triage, meta: detail.meta, url: link.url });
    if (!gate.allow || !live) {
      return {
        phase: live ? 'pre_apply_blocked' : 'dry_run_eligible',
        link,
        clickResult,
        targetCheck: detail.targetCheck,
        meta: detail.meta,
        gate,
        trace: { runId },
        hardStop: false,
      };
    }

    const beforeCount = store.getTodaySuccessfulApplies(new Date());
    const before = detail.meta;
    const beforeCandidate = gate.candidate;
    const liveClick = await clickApply(session, { clickMode });
    await sleep(1800);
    const reminderResult = await clickPostApplyReminder(session, { clickMode });
    await sleep(2500);
    const after = await extractMeta(session) || {};
    const success = String(after.actionText || after.body || '').includes('继续沟通')
      || String(after.body || '').includes('已向BOSS发送消息')
      || isChatNavigationSuccess(link.url, after.url || '');
    const finalCandidate = buildCandidateFromMeta({
      ...before,
      ...after,
      url: before.url || link.url,
      company: after.company || before.company,
      jobName: after.jobName || before.jobName,
      salaryText: after.salaryText || before.salaryText,
      infoTags: after.infoTags?.length ? after.infoTags : before.infoTags,
      companyTags: after.companyTags?.length ? after.companyTags : before.companyTags,
    }, link.url);
    store.upsertJob({
      ...finalCandidate,
      collectedAt: nowIso(),
    });
    store.upsertApplication({
      jobId: finalCandidate.jobId,
      url: finalCandidate.url,
      title: finalCandidate.title,
      company: finalCandidate.company,
      salary: finalCandidate.salaryText,
      salaryText: finalCandidate.salaryText,
      location: finalCandidate.location,
      companySize: finalCandidate.companySize,
      summary: finalCandidate.summary,
      status: success ? 'applied' : 'failed',
      appliedAt: success ? nowIso() : undefined,
      reasons: success ? [] : [liveClick.reason || 'apply_not_verified'],
      applyResult: { clickResult: liveClick, reminderResult, before, after, gate },
      source: 'boss_trace_apply_recommendations',
      identityKey: finalCandidate.identityKey,
    });
    store.save({ operation: 'boss_trace_apply_recommendations', phase: success ? 'finish' : 'failed', url: after.url || link.url });
    applyResult = {
      beforeCount,
      afterCount: store.getTodaySuccessfulApplies(new Date()),
      success,
      clickResult: liveClick,
      reminderResult,
      before,
      after,
      candidate: beforeCandidate,
    };
    return {
      phase: 'live_apply',
      link,
      targetCheck: detail.targetCheck,
      meta: detail.meta,
      gate,
      applyResult,
      trace: { runId },
      hardStop: false,
    };
  } finally {
    await sleep(800);
    await runNodeScript('stop-capture.mjs', [runId]).catch(() => {});
    await runNodeScript('bisect-cdp.mjs', [runId]).catch(() => {});
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cdpEndpoint = args['cdp-endpoint'] || DEFAULT_CDP_ENDPOINT;
  const live = parseBoolean(args.live, false);
  if (live && process.env.BOSS_ENABLE_LIVE_APPLY !== '1') {
    throw new Error('live recommendations apply requires BOSS_ENABLE_LIVE_APPLY=1 and --live true');
  }

  const targetSuccesses = Math.max(1, Number(args['target-successes'] || 1));
  const maxCandidates = Math.max(targetSuccesses, Number(args['max-candidates'] || targetSuccesses * 10));
  const waitMs = Math.max(2000, Number(args['wait-ms'] || 8000));
  const delayMs = Math.max(15000, Number(args['delay-ms'] || 60000));
  const clickMode = String(args['click-mode'] || 'dom');
  const keepTrace = parseBoolean(args['keep-trace'], false);
  const { config } = loadConfig(args.config);
  const store = new ZhipinStore();
  const triage = readChatTriage();
  const output = {
    generatedAt: nowIso(),
    cdpEndpoint,
    live,
    targetSuccesses,
    maxCandidates,
    startedCount: store.getTodaySuccessfulApplies(new Date()),
    links: [],
    eligibleDryRun: [],
    applied: [],
    skipped: [],
    failed: [],
    hardStop: null,
  };

  const health = await readHealth(cdpEndpoint);
  if (!health.ok) {
    output.hardStop = { reason: 'pre_health_blocked', health };
    writeJson(args.output || DEFAULT_OUTPUT, output);
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  const target = await pickReusableTarget(cdpEndpoint, '');
  const session = await createCdpSession(target.webSocketDebuggerUrl);
  try {
    await session.send('Page.enable');
    await session.send('Runtime.enable');
    const seenUrls = new Set();

    while (output.links.length < maxCandidates && output.applied.length < targetSuccesses) {
      const beforeHealth = await readHealth(cdpEndpoint);
      if (!beforeHealth.ok) {
        output.hardStop = { reason: 'health_blocked', health: beforeHealth };
        break;
      }
      const currentUrl = await readCurrentUrl(session);
      if (!currentUrl.includes('/job_detail/')) {
        output.hardStop = { reason: 'current_page_not_job_detail', currentUrl };
        break;
      }
      const links = await collectRecommendationLinks(session, { limit: Number(args['link-limit'] || 100) });
      const link = links.find((candidate) => !seenUrls.has(candidate.url));
      if (!link) {
        break;
      }
      seenUrls.add(link.url);
      output.links.push(link);

      const result = await runCandidate({
        session,
        cdpEndpoint,
        store,
        config,
        triage,
        link,
        live,
        clickMode,
        keepTrace,
        waitMs,
      });
      const summary = readTraceSummary(result.trace?.runId || '');
      const traceIssues = [
        ...findTraceNavigationIssues(summary, link.url),
        ...findTraceBlockingIssues(summary),
      ];
      if (!keepTrace && result.trace?.runId) cleanupTrace(result.trace.runId);
      result.trace = {
        issues: traceIssues,
        totalEvents: summary?.totalEvents || 0,
        pages: (summary?.pages || []).map((page) => ({ pageId: page.pageId, url: page.url, eventCount: page.eventCount })),
      };

      if (traceIssues.some(isTraceHardStop)) {
        output.hardStop = { reason: 'trace_hard_stop', record: result };
        break;
      }

      if (result.phase === 'dry_run_eligible' && result.gate?.allow) {
        output.eligibleDryRun.push({
          url: link.url,
          title: result.gate.candidate?.title || '',
          company: result.gate.candidate?.company || '',
          traceEvents: result.trace.totalEvents,
        });
      } else if (result.phase === 'live_apply' && result.applyResult?.success && result.applyResult?.afterCount === result.applyResult?.beforeCount + 1 && !traceIssues.length) {
        output.applied.push({
          url: link.url,
          title: result.applyResult.candidate?.title || '',
          company: result.applyResult.candidate?.company || '',
          beforeCount: result.applyResult.beforeCount,
          afterCount: result.applyResult.afterCount,
          traceEvents: result.trace.totalEvents,
        });
      } else if (result.phase === 'live_apply') {
        output.failed.push(result);
        output.hardStop = { reason: traceIssues.length ? 'live_trace_issue' : 'live_apply_not_verified', record: result };
        break;
      } else {
        output.skipped.push({
          url: link.url,
          text: link.text,
          phase: result.phase,
          reasons: result.gate?.reasons || [result.targetCheck?.reason || result.clickResult?.reason || 'not_eligible'],
          actualUrl: result.meta?.url || '',
          traceIssues,
        });
      }

      if (output.applied.length >= targetSuccesses) {
        break;
      }
      if (live) {
        await sleep(delayMs);
      }
    }
  } finally {
    session.close();
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
  collectRecommendationLinks,
  looksRelevantRecommendation,
};
