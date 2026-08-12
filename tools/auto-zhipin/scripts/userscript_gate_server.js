#!/usr/bin/env node
// Local-only HTTP gate for the BOSS userscript (tools/auto-zhipin/userscript).
//
// Why this exists: the userscript runs inside the real logged-in BOSS tab
// with zero CDP/Playwright/extension control surface, so BOSS never sees an
// automation fingerprint. But that also means the userscript itself must not
// re-implement blacklist/dedupe rules in page JS (that would drift from
// lib/filters.js and lib/opencli_apply_queue.js). Instead the userscript
// POSTs each scraped job card here, this process runs the exact same
// checkPreApplyCandidate() gate used by every other entry point, and returns
// an allow/block decision plus the reasons. The userscript only ever renders
// that decision and clicks after a real hotkey press from the human.
//
// This process never touches a browser. It has no CDP client, no Playwright,
// no extension handle -- it is a pure Node HTTP server reading/writing the
// same ledger.json as the rest of tools/auto-zhipin.

const http = require('node:http');

const { loadConfig } = require('../lib/config');
const { readChatTriage } = require('../lib/chat_triage');
const { checkPreApplyCandidate } = require('../lib/opencli_apply_queue');
const { ZhipinStore } = require('../lib/store');
const { makeApplicationIdentity, nowIso, parseArgs } = require('../lib/utils');
const { pushFeishuMessage } = require('../lib/feishu_notify');

const DEFAULT_PORT = 8899;
const DEFAULT_HOST = '127.0.0.1';
const MAX_BODY_BYTES = 512 * 1024;

function printHelp() {
  console.log([
    'Usage:',
    '  node tools/auto-zhipin/scripts/userscript_gate_server.js [options]',
    '',
    'Options:',
    '  --port <number>   Listen port (default 8899)',
    '  --config <path>   Path to config.local.json override',
    '',
    'Endpoints:',
    '  POST /gate    body: { job }         -> { allow, reasons, candidate }',
    '  POST /applied body: { job, result } -> records an applied/failed row in ledger.json',
    '  POST /paused  body: { reason, job } -> risk stop: notifies Feishu + records a pause event',
    '  GET  /health  ->                       { ok, todaySuccessfulApplies }',
  ].join('\n'));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('request body too large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(new Error(`invalid JSON body: ${error.message}`));
      }
    });
    request.on('error', reject);
  });
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  response.end(body);
}

function normalizeJobInput(job = {}) {
  return {
    jobId: job.url || job.jobId || '',
    url: job.url || job.jobId || '',
    title: job.title || '',
    company: job.company || '',
    salaryText: job.salaryText || job.salary || '',
    location: job.location || '',
    experienceText: job.experienceText || '',
    degreeText: job.degreeText || '',
    companySize: job.companySize || '',
    stage: job.stage || '',
    recruiterName: job.recruiterName || '',
    recruiterTitle: job.recruiterTitle || '',
    summary: job.summary || '',
    applyState: job.applyState || '',
  };
}

function buildServer({ store, config, getTriage, pushNotify = pushFeishuMessage }) {
  return http.createServer(async (request, response) => {
    try {
      if (request.method === 'GET' && request.url === '/health') {
        sendJson(response, 200, {
          ok: true,
          todaySuccessfulApplies: store.getTodaySuccessfulApplies(),
        });
        return;
      }

      if (request.method === 'POST' && request.url === '/gate') {
        const body = await readJsonBody(request);
        const job = normalizeJobInput(body.job || {});
        if (!job.url) {
          sendJson(response, 400, { error: 'job.url is required' });
          return;
        }
        const triage = getTriage();
        const gate = checkPreApplyCandidate({ store, config, application: job, triage });
        sendJson(response, 200, {
          allow: gate.allow,
          reasons: gate.reasons,
          candidate: gate.candidate,
          existingApplication: gate.existingApplication,
          blockedEntry: gate.blockedEntry,
        });
        return;
      }

      if (request.method === 'POST' && request.url === '/applied') {
        const body = await readJsonBody(request);
        const job = normalizeJobInput(body.job || {});
        if (!job.url) {
          sendJson(response, 400, { error: 'job.url is required' });
          return;
        }
        const success = Boolean(body.result?.success);
        const identityKey = makeApplicationIdentity(job);
        store.upsertJob({
          id: job.url,
          url: job.url,
          title: job.title,
          company: job.company,
          salaryText: job.salaryText,
          location: job.location,
          companySize: job.companySize,
          stage: job.stage,
          identityKey,
          collectedAt: nowIso(),
        });
        store.upsertApplication({
          jobId: job.url,
          url: job.url,
          title: job.title,
          company: job.company,
          salary: job.salaryText,
          salaryText: job.salaryText,
          location: job.location,
          companySize: job.companySize,
          summary: job.summary,
          identityKey,
          status: success ? 'applied' : 'failed',
          appliedAt: success ? nowIso() : undefined,
          reasons: success ? [] : [body.result?.reason || 'userscript_click_not_verified'],
          source: 'userscript_hotkey_apply',
          reviewedAt: nowIso(),
        });
        store.save({ operation: 'userscript_gate_server', phase: 'applied', url: job.url });
        sendJson(response, 200, {
          ok: true,
          todaySuccessfulApplies: store.getTodaySuccessfulApplies(),
        });
        return;
      }

      if (request.method === 'POST' && request.url === '/paused') {
        const body = await readJsonBody(request);
        const reason = String(body.reason || '');
        const job = normalizeJobInput(body.job || {});
        if (!reason) {
          sendJson(response, 400, { error: 'reason is required' });
          return;
        }
        store.event('pause_notify', {
          reason,
          jobId: job.url,
          url: job.url,
          company: job.company,
          title: job.title,
        });
        const ok = await pushNotify({
          title: `🚨 BOSS 停止投递：${reason}`,
          body: [
            `风控检测触发，已暂停自动投递`,
            job.company ? `公司：${job.company}` : '',
            job.title ? `岗位：${job.title}` : '',
            `原因：${reason}`,
          ].filter(Boolean).join('\n'),
        }).then(() => true).catch((error) => {
          console.error('paused: feishu push failed:', error && error.message ? error.message : String(error));
          return false;
        });
        sendJson(response, 200, { ok });
        return;
      }

      sendJson(response, 404, { error: 'not found' });
    } catch (error) {
      sendJson(response, 500, { error: error.message || String(error) });
    }
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printHelp();
    return;
  }

  const port = Number(args.port || DEFAULT_PORT);
  const { config } = loadConfig(args.config);
  const store = new ZhipinStore();

  // Chat triage is read fresh per request (not cached at startup) so a
  // background `npm run chat:triage-cdp` refresh is picked up without
  // restarting this server.
  const getTriage = () => readChatTriage();

  const server = buildServer({ store, config, getTriage });
  server.listen(port, DEFAULT_HOST, () => {
    console.log(`userscript gate server listening on http://${DEFAULT_HOST}:${port}`);
    console.log('local-only: do not expose this port beyond localhost');
  });

  process.on('SIGINT', () => {
    server.close(() => process.exit(0));
  });
}

if (require.main === module) {
  main();
}

module.exports = { buildServer, normalizeJobInput };
