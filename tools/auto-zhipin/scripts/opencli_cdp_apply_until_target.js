#!/usr/bin/env node

const childProcess = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const { loadConfig } = require('../lib/config');
const { evaluateJob } = require('../lib/filters');
const { shouldAllowAutoApplyCandidate, isSuccessfulApplyResult } = require('../lib/opencli_apply_queue');
const { ZhipinStore } = require('../lib/store');
const { nowIso, parseArgs, makeApplicationIdentity, normalizeWhitespace } = require('../lib/utils');

const OPENCLI_BIN_PATH = path.resolve(__dirname, '../../opencli/bin/redbook-opencli.js');
const RESULT_PATH = path.resolve(__dirname, '../data/opencli-apply-cdp-latest.json');
const DEFAULT_GREETING = '你好，看过您的职位，觉得比较适合自己，希望有机会能和你相互进一步了解。谢谢';
const EXTRA_TERMS = [
  'Coze',
  'Dify',
  'n8n',
  'MCP',
  'AI Agent开发',
  'AI Agent架构师',
  '智能体工程师',
  'AI应用工程师',
  'AI应用架构师',
  'AI coding',
  'AI自动化',
  '企业AI落地',
  '联合创始人',
  '技术合伙人',
  'CTO',
  '技术总监',
  'AI产品',
  'AI项目经理',
  'Claude开发',
  'GPT开发',
  'LangChain',
  'CrewAI',
  'AutoGen',
  '提示词工程师',
  'Prompt Engineer',
  'AI中台',
  'AIGC平台',
  '数字化转型',
  'AI解决方案',
  'SaaS架构师',
];
const DETAIL_EXCLUDE_KEYWORDS = [
  '课程',
  '教学',
  '授课',
  '讲师',
  '教研',
  '培训',
  '售前',
  '售后',
  '顾问',
  '销售',
  'BD',
];
const FOCUS_KEYWORDS = [
  'agent',
  '智能体',
  'coze',
  'dify',
  '工作流',
  'workflow',
  'mcp',
  '应用工程师',
  '应用架构',
  'ai coding',
  '自动化',
  '落地',
];
const GENERIC_BIG_COMPANY_PATTERNS = ['某大型', '某知名', '上市公司', '实验室', '研究院'];
const OUTSIDE_BASE_PATTERN = /(?:base|驻|常驻|工作地|办公地)[^,\n，。]*(苏州|杭州|北京|深圳|广州|南京|成都|武汉|西安|合肥|厦门)/i;

function shouldRetryError(error) {
  const text = String(error && (error.stack || error.message || error) || '');
  return text.includes('Inspected target navigated or closed');
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

async function hasVerifyPage() {
  const targets = await getJson('http://localhost:9222/json/list');
  return Array.isArray(targets)
    ? targets.some((item) => String(item.url || '').includes('verify.html'))
    : false;
}

async function waitForManualVerification(args, options = {}) {
  const pollMs = Math.max(1000, Number(options.pollMs || 3000));
  const maxWaitMs = Number(options.maxWaitMs || 30 * 60 * 1000);
  const startedAt = Date.now();
  let notified = false;

  while (true) {
    let verifyPresent = false;
    try {
      verifyPresent = await hasVerifyPage();
    } catch (error) {
      logProgress('verification_poll_failed', {
        args: args.join(' '),
        reason: error.message || String(error),
      });
    }

    if (!verifyPresent) {
      logProgress('verification_resolved', {
        args: args.join(' '),
        waitedMs: Date.now() - startedAt,
      });
      return true;
    }

    if (!notified) {
      logProgress('verification_pause_required', {
        args: args.join(' '),
        message: '检测到 BOSS 安全验证，脚本已暂停。请在 Chrome 手动完成验证，完成后会自动继续。',
      });
      notified = true;
    }

    if (maxWaitMs > 0 && Date.now() - startedAt >= maxWaitMs) {
      logProgress('verification_wait_timeout', {
        args: args.join(' '),
        waitedMs: Date.now() - startedAt,
      });
      return false;
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

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

async function execOpencliJson(args, options = {}) {
  const maxAttempts = Math.max(1, Number(options.maxAttempts || 2));
  const verificationWaitMs = Math.max(0, Number(options.verificationWaitMs || 30 * 60 * 1000));
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const stdout = childProcess.execFileSync(process.execPath, [OPENCLI_BIN_PATH, ...args], {
        cwd: path.resolve(__dirname, '..'),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: Math.max(1000, Number(options.timeoutMs || 120 * 1000)),
        env: process.env,
      });
      const parsed = parseJsonOutput(stdout);
      if (parsed == null) {
        throw new Error(`opencli returned no JSON for args: ${args.join(' ')}`);
      }
      return parsed;
    } catch (error) {
      lastError = error;
      if (!shouldRetryError(error) || attempt >= maxAttempts) {
        throw error;
      }

      let waitedForVerification = false;
      try {
        if (await hasVerifyPage()) {
          waitedForVerification = true;
          const resumed = await waitForManualVerification(args, { maxWaitMs: verificationWaitMs });
          if (!resumed) {
            throw new Error('manual_verification_timeout');
          }
        }
      } catch (verificationError) {
        logProgress('verification_pause_failed', {
          args: args.join(' '),
          attempt,
          reason: verificationError.message || String(verificationError),
        });
        throw verificationError;
      }

      if (!waitedForVerification) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      logProgress(waitedForVerification ? 'retry_after_manual_verification' : 'retry_after_target_closed', {
        args: args.join(' '),
        attempt,
      });
    }
  }

  throw lastError || new Error(`opencli command failed: ${args.join(' ')}`);
}

function unwrapFirst(payload) {
  if (Array.isArray(payload)) {
    return payload[0] || null;
  }
  if (Array.isArray(payload?.items)) {
    return payload.items[0] || null;
  }
  return payload || null;
}

function collectSearchTerms(config = {}) {
  const decoded = (config.jobs?.searchUrls || [])
    .map((rawUrl) => {
      try {
        const url = new URL(rawUrl);
        return url.searchParams.get('query') || '';
      } catch (error) {
        return '';
      }
    })
    .filter(Boolean);

  return [...new Set([...decoded, ...EXTRA_TERMS])];
}

function buildSearchCandidate(item = {}) {
  const location = item.area ? normalizeWhitespace(String(item.area).split('·')[0]) : '上海';
  return {
    jobId: item.url,
    url: item.url,
    title: item.name || '',
    company: item.company || '',
    salaryText: item.salary || '',
    salary: item.salary || '',
    location,
    experienceText: item.experience || '',
    degreeText: item.degree || '',
    recruiterName: item.boss || '',
    recruiterTitle: '',
    companySize: '',
    stage: '',
    summary: normalizeWhitespace([item.skills, item.area].filter(Boolean).join(' | ')),
    securityId: item.security_id || '',
    identityKey: makeApplicationIdentity({
      company: item.company || '',
      title: item.name || '',
    }),
  };
}

function buildDetailCandidate(searchCandidate = {}, detail = {}) {
  return {
    jobId: searchCandidate.url,
    url: searchCandidate.url,
    title: detail.name || searchCandidate.title || '',
    company: detail.company || searchCandidate.company || '',
    salaryText: detail.salary || searchCandidate.salaryText || '',
    salary: detail.salary || searchCandidate.salaryText || '',
    location: normalizeWhitespace([detail.city, detail.district].filter(Boolean).join('·')) || searchCandidate.location || '上海',
    experienceText: detail.experience || searchCandidate.experienceText || '',
    degreeText: detail.degree || searchCandidate.degreeText || '',
    recruiterName: detail.boss_name || searchCandidate.recruiterName || '',
    recruiterTitle: detail.boss_title || '',
    companySize: detail.scale || '',
    stage: detail.stage || '',
    summary: normalizeWhitespace([
      detail.description,
      detail.skills,
      detail.industry,
      detail.address,
    ].filter(Boolean).join(' | ')),
    identityKey: makeApplicationIdentity({
      company: detail.company || searchCandidate.company || '',
      title: detail.name || searchCandidate.title || '',
    }),
  };
}

function shouldSkipDetailCandidate(candidate = {}) {
  const haystack = normalizeWhitespace([
    candidate.title,
    candidate.company,
    candidate.summary,
    candidate.companySize,
    candidate.stage,
    candidate.recruiterTitle,
  ].filter(Boolean).join(' | ')).toLowerCase();

  if (GENERIC_BIG_COMPANY_PATTERNS.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
    return 'generic_big_company';
  }
  if (DETAIL_EXCLUDE_KEYWORDS.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
    return 'detail_excluded_keyword';
  }
  if (!FOCUS_KEYWORDS.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
    return 'missing_focus_keyword';
  }
  if (!String(candidate.location || '').startsWith('上海')) {
    return 'outside_shanghai';
  }
  if (String(candidate.salaryText || '').includes('元/')) {
    return 'non_monthly_salary_format';
  }
  if (OUTSIDE_BASE_PATTERN.test(`${candidate.title || ''} | ${candidate.summary || ''}`)) {
    return 'outside_base_excluded';
  }
  if (!candidate.companySize) {
    return 'missing_company_size';
  }
  return '';
}

function appendSuccessToLatest(entry) {
  const payload = fs.existsSync(RESULT_PATH)
    ? JSON.parse(fs.readFileSync(RESULT_PATH, 'utf8'))
    : { generatedAt: null, mode: 'opencli_cdp_manual_apply', targets: [], results: [] };
  const results = Array.isArray(payload.results) ? payload.results : [];
  if (results.some((item) => item.url === entry.url)) {
    payload.generatedAt = nowIso();
    fs.writeFileSync(RESULT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  payload.targets = Array.isArray(payload.targets) ? payload.targets : [];
  payload.results = results;
  payload.targets.push({
    company: entry.company,
    title: entry.title,
    salaryText: entry.salaryText,
    location: entry.location,
    companySize: entry.companySize,
    url: entry.url,
    greeting: entry.greeting,
  });
  payload.results.push(entry);
  payload.generatedAt = nowIso();
  payload.mode = 'opencli_cdp_manual_apply';
  fs.writeFileSync(RESULT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
}

function upsertMatched(store, candidate) {
  store.upsertApplication({
    jobId: candidate.jobId,
    url: candidate.url,
    title: candidate.title,
    company: candidate.company,
    salary: candidate.salaryText,
    salaryText: candidate.salaryText,
    location: candidate.location,
    companySize: candidate.companySize || '',
    stage: candidate.stage || '',
    recruiterName: candidate.recruiterName || '',
    recruiterTitle: candidate.recruiterTitle || '',
    summary: candidate.summary || '',
    identityKey: candidate.identityKey,
    status: 'matched',
    source: 'opencli_cdp_apply_until_target',
  });
}

function upsertFinalApplication(store, candidate, result, success) {
  const timestamp = nowIso();
  store.upsertApplication({
    jobId: candidate.jobId,
    url: candidate.url,
    title: candidate.title,
    company: candidate.company,
    salary: candidate.salaryText,
    salaryText: candidate.salaryText,
    location: candidate.location,
    companySize: candidate.companySize || '',
    stage: candidate.stage || '',
    recruiterName: candidate.recruiterName || '',
    recruiterTitle: candidate.recruiterTitle || '',
    summary: candidate.summary || '',
    identityKey: candidate.identityKey,
    status: success ? 'applied' : 'skipped',
    appliedAt: success ? timestamp : undefined,
    skippedAt: success ? undefined : timestamp,
    reasons: success ? [] : [String(result.reason || result.mode || result.status || 'apply_failed')],
    applyResult: result,
    source: 'opencli_cdp_apply_until_target',
  });
}

function findTerminalApplication(store, candidate) {
  return store.findApplicationByIdentity(candidate, ['applied', 'skipped']);
}

function logProgress(message, extra = {}) {
  console.log(JSON.stringify({ timestamp: nowIso(), message, ...extra }));
}

// Gaussian jitter: base ± 40%, clamped to [minMs, maxMs]
function jitterDelay(baseMs, spread = 0.4) {
  const u1 = Math.random();
  const u2 = Math.random();
  const gauss = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
  const jittered = baseMs + gauss * baseMs * spread;
  return Math.max(baseMs * (1 - spread), Math.min(baseMs * (1 + spread), jittered));
}

async function throttleBeforeApply(successes, hourlyLimit = 999) {
  // Hourly rate limit (set to 999 to effectively disable)
  const now = Date.now();
  const windowStart = now - 60 * 60 * 1000;
  const recentCount = successes.filter((s) => s.appliedAt && new Date(s.appliedAt).getTime() > windowStart).length;
  if (recentCount >= hourlyLimit) {
    const sleepMs = 60 * 60 * 1000 - (now - windowStart) + jitterDelay(30 * 1000);
    logProgress('hourly_limit_reached', { recentCount, hourlyLimit, sleepMs: Math.round(sleepMs) });
    await new Promise((resolve) => setTimeout(resolve, sleepMs));
  }
  // Per-apply jitter: 12s base ±40% → 7-17s (balanced delay)
  const delayMs = Math.round(jitterDelay(12000));
  logProgress('apply_throttle', { delayMs });
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function throttleShort() {
  // Between search→detail: 3-8s random (increased from 1-3s)
  const delayMs = Math.round(3000 + Math.random() * 5000);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targetSuccesses = Math.max(1, Number(args['target-successes'] || 50));
  const searchLimit = Math.max(5, Number(args['search-limit'] || 18));
  const timeoutMs = Math.max(30 * 1000, Number(args['timeout-ms'] || 120 * 1000));

  const { config } = loadConfig(args.config);
  config.apply = {
    ...(config.apply || {}),
    enabled: true,
    dryRun: false,
    minMonthlySalaryK: Math.max(20, Number(args['min-salary-k'] || 20)),
  };

  const filters = {
    ...(config.filters || {}),
    minMonthlySalaryK: config.apply.minMonthlySalaryK,
  };

  const store = new ZhipinStore();
  const startAppliedCount = store.getTodaySuccessfulApplies(new Date());
  const terms = collectSearchTerms(config);
  const seenUrls = new Set();
  const successes = [];
  const skips = [];

  const runId = store.startRun('opencli_cdp_apply_until_target', {
    targetSuccesses,
    searchLimit,
    terms,
  });
  store.save({ operation: 'opencli_cdp_apply_until_target', phase: 'start', runId });

  try {
    for (const term of terms) {
      if (successes.length >= targetSuccesses) {
        break;
      }

      logProgress('search_start', { term, successCount: successes.length, targetSuccesses });
      let searchItems = [];
      try {
        const searchPayload = await execOpencliJson(['boss', 'search', term, '--city', '上海', '--limit', String(searchLimit), '-f', 'json'], { timeoutMs, maxAttempts: 3 });
        searchItems = Array.isArray(searchPayload) ? searchPayload : [];
        logProgress('search_done', { term, found: searchItems.length });
      } catch (error) {
        skips.push({ url: '', reason: `search_failed:${term}:${error.message}` });
        logProgress('search_failed', { term, reason: error.message || String(error) });
        continue;
      }

      for (const item of searchItems) {
        if (successes.length >= targetSuccesses) {
          break;
        }

        const searchCandidate = buildSearchCandidate(item);
        if (!searchCandidate.url || !searchCandidate.securityId || seenUrls.has(searchCandidate.url)) {
          continue;
        }
        seenUrls.add(searchCandidate.url);

        if (findTerminalApplication(store, searchCandidate)) {
          continue;
        }

        const basicDecision = evaluateJob(searchCandidate, filters);
        if (!basicDecision.allow) {
          skips.push({ url: searchCandidate.url, reason: basicDecision.reasons[0] || 'search_filter_reject' });
          continue;
        }

        await throttleShort();

        let detailPayload;
        try {
          detailPayload = await execOpencliJson(['boss', 'detail', searchCandidate.securityId, '-f', 'json'], { timeoutMs });
        } catch (error) {
          skips.push({ url: searchCandidate.url, reason: `detail_failed:${error.message}` });
          continue;
        }

        const detail = unwrapFirst(detailPayload);
        if (!detail) {
          skips.push({ url: searchCandidate.url, reason: 'detail_empty' });
          continue;
        }

        const detailCandidate = buildDetailCandidate(searchCandidate, detail);
        if (findTerminalApplication(store, detailCandidate)) {
          continue;
        }

        const detailSkipReason = shouldSkipDetailCandidate(detailCandidate);
        if (detailSkipReason) {
          skips.push({ url: detailCandidate.url, reason: detailSkipReason });
          continue;
        }

        const detailDecision = evaluateJob(detailCandidate, filters);
        if (!detailDecision.allow) {
          skips.push({ url: detailCandidate.url, reason: detailDecision.reasons[0] || 'detail_filter_reject' });
          continue;
        }

        const applyDecision = shouldAllowAutoApplyCandidate(detailCandidate, config);
        if (!applyDecision.allow) {
          skips.push({ url: detailCandidate.url, reason: applyDecision.reasons[0] || 'apply_filter_reject' });
          continue;
        }

        upsertMatched(store, detailCandidate);
        store.save({ operation: 'opencli_cdp_apply_until_target', phase: 'matched', runId, url: detailCandidate.url });

        logProgress('apply_start', {
          company: detailCandidate.company,
          title: detailCandidate.title,
          url: detailCandidate.url,
          successCount: successes.length,
        });

        await throttleBeforeApply(successes);

        let applyResult;
        try {
          const applyPayload = await execOpencliJson(['boss', 'apply', '--url', detailCandidate.url, '-f', 'json'], { timeoutMs });
          applyResult = unwrapFirst(applyPayload);
        } catch (error) {
          applyResult = {
            ok: false,
            action: 'apply',
            status: 'failed',
            reason: `apply_exec_failed:${error.message}`,
            mode: 'exec_failed',
            url: detailCandidate.url,
          };
        }

        const success = isSuccessfulApplyResult(applyResult || {});
        upsertFinalApplication(store, detailCandidate, applyResult || {}, success);
        store.save({
          operation: 'opencli_cdp_apply_until_target',
          phase: 'apply',
          runId,
          url: detailCandidate.url,
          status: success ? 'applied' : 'skipped',
        });

        if (!success) {
          skips.push({ url: detailCandidate.url, reason: String(applyResult?.reason || applyResult?.mode || applyResult?.status || 'apply_failed') });
          logProgress('apply_skip', {
            company: detailCandidate.company,
            title: detailCandidate.title,
            reason: skips[skips.length - 1].reason,
            successCount: successes.length,
          });
          continue;
        }

        const successEntry = {
          company: detailCandidate.company,
          title: detailCandidate.title,
          salaryText: detailCandidate.salaryText,
          location: detailCandidate.location,
          companySize: detailCandidate.companySize,
          url: detailCandidate.url,
          greeting: config.apply.greeting || DEFAULT_GREETING,
          appliedAt: store.ledger.applications[detailCandidate.url]?.appliedAt || nowIso(),
          result: {
            ok: applyResult.ok,
            action: applyResult.action,
            status: applyResult.status,
            reason: applyResult.reason || '',
            mode: applyResult.mode,
            url: applyResult.url || detailCandidate.url,
            button: applyResult.button || '',
            via: applyResult.via || '',
            evidence: {
              initialMeta: {
                url: applyResult.evidence?.initialMeta?.url || detailCandidate.url,
                title: applyResult.evidence?.initialMeta?.title || detailCandidate.title,
                salaryText: applyResult.evidence?.initialMeta?.salaryText || detailCandidate.salaryText,
              },
              afterMeta: {
                url: applyResult.evidence?.afterMeta?.url || detailCandidate.url,
                title: applyResult.evidence?.afterMeta?.title || detailCandidate.title,
                salaryText: applyResult.evidence?.afterMeta?.salaryText || detailCandidate.salaryText,
              },
            },
          },
        };

        appendSuccessToLatest(successEntry);
        successes.push(successEntry);
        logProgress('apply_success', {
          company: detailCandidate.company,
          title: detailCandidate.title,
          successCount: successes.length,
          targetSuccesses,
        });
      }
    }

    const summary = {
      runId,
      targetSuccesses,
      newSuccessfulApplies: successes.length,
      startAppliedToday: startAppliedCount,
      endAppliedToday: store.getTodaySuccessfulApplies(new Date()),
      exhaustedTerms: successes.length < targetSuccesses,
      successes,
      skipped: skips.length,
      summary: store.summary(),
    };
    store.finishRun(runId, 'completed', summary);
    store.save({ operation: 'opencli_cdp_apply_until_target', phase: 'finish', runId, status: 'completed' });
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    store.finishRun(runId, 'failed', { error: error.message || String(error) });
    store.save({ operation: 'opencli_cdp_apply_until_target', phase: 'finish', runId, status: 'failed' });
    throw error;
  }
}

if (require.main === module) {
  try {
    main().catch((error) => {
      console.error(error.stack || error.message || String(error));
      process.exitCode = 1;
    });
  } catch (error) {
    console.error(error.stack || error.message || String(error));
    process.exitCode = 1;
  }
}
