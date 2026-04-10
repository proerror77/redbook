#!/usr/bin/env node

const childProcess = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const { chromium } = require('../node_modules/playwright');

const { loadConfig } = require('../lib/config');
const { evaluateJob } = require('../lib/filters');
const { requireBossCoreModule } = require('../lib/opencli_core');
const { shouldAllowAutoApplyCandidate, isSuccessfulApplyResult } = require('../lib/opencli_apply_queue');
const { ZhipinStore } = require('../lib/store');
const { makeApplicationIdentity, normalizeWhitespace, nowIso, parseArgs, sleep } = require('../lib/utils');

const jobBrowserCore = requireBossCoreModule('job-browser');

const OPENCLI_BIN_PATH = path.resolve(__dirname, '../../opencli/bin/redbook-opencli.js');
const RESULT_PATH = path.resolve(__dirname, '../data/opencli-browse-apply-latest.json');
const DEFAULT_CDP_ENDPOINT = 'http://localhost:9222';
const DEFAULT_GREETING = '你好，看过您的职位，觉得比较适合自己，希望有机会能和你相互进一步了解。谢谢';
const JOB_READY_SELECTORS = [
  'a[href*="/job_detail/"]',
  'a[href*="job_detail"]',
  '.job-card-wrapper',
  '.job-card-box',
  '[class*=job-card]',
  '[class*=search-job-result]',
  '[class*=job-list]',
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
  const text = String((error && (error.stack || error.message || error)) || '');
  return text.includes('Inspected target navigated or closed');
}

function logProgress(message, extra = {}) {
  console.log(JSON.stringify({ timestamp: nowIso(), message, ...extra }));
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

async function hasVerifyPage(cdpEndpoint) {
  const targets = await getJson(new URL('/json/list', cdpEndpoint).toString());
  return Array.isArray(targets)
    ? targets.some((item) => String(item.url || '').includes('verify.html'))
    : false;
}

async function waitForManualVerification(labelParts, options = {}) {
  const cdpEndpoint = options.cdpEndpoint || DEFAULT_CDP_ENDPOINT;
  const pollMs = Math.max(1000, Number(options.pollMs || 3000));
  const maxWaitMs = Number(options.maxWaitMs || 30 * 60 * 1000);
  const startedAt = Date.now();
  let notified = false;

  while (true) {
    let verifyPresent = false;
    try {
      verifyPresent = await hasVerifyPage(cdpEndpoint);
    } catch (error) {
      logProgress('verification_poll_failed', {
        label: labelParts.join(' '),
        reason: error.message || String(error),
      });
    }

    if (!verifyPresent) {
      logProgress('verification_resolved', {
        label: labelParts.join(' '),
        waitedMs: Date.now() - startedAt,
      });
      return true;
    }

    if (!notified) {
      logProgress('verification_pause_required', {
        label: labelParts.join(' '),
        message: '检测到 BOSS 安全验证，脚本已暂停。请在 Chrome 手动完成验证，完成后会自动继续。',
      });
      notified = true;
    }

    if (maxWaitMs > 0 && Date.now() - startedAt >= maxWaitMs) {
      logProgress('verification_wait_timeout', {
        label: labelParts.join(' '),
        waitedMs: Date.now() - startedAt,
      });
      return false;
    }

    await sleep(pollMs);
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
        if (await hasVerifyPage(options.cdpEndpoint || DEFAULT_CDP_ENDPOINT)) {
          waitedForVerification = true;
          const resumed = await waitForManualVerification(args, {
            cdpEndpoint: options.cdpEndpoint || DEFAULT_CDP_ENDPOINT,
            maxWaitMs: verificationWaitMs,
          });
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
        await sleep(1500);
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

function parseSecurityIdFromUrl(url) {
  const text = String(url || '');
  const match = text.match(/\/job_detail\/([^/?#]+?)(?:\.html)?(?:[?#].*)?$/i);
  return match ? match[1] : '';
}

function normalizeJobUrl(rawUrl) {
  if (!rawUrl) {
    return '';
  }
  try {
    return new URL(rawUrl, 'https://www.zhipin.com').toString();
  } catch (error) {
    return String(rawUrl || '');
  }
}

function buildSearchCandidate(item = {}, searchUrl = '') {
  const url = normalizeJobUrl(item.url || item.jobUrl || item.href || '');
  const location = normalizeWhitespace(
    item.location
      || item.city
      || item.area
      || [item.city, item.district].filter(Boolean).join('·')
  ) || '上海';
  const salaryText = normalizeWhitespace(item.salaryText || item.salary || '');
  const title = item.title || item.name || '';
  const company = item.company || item.brandName || item.companyName || item.brand || item.recruiterName || item.boss || '';
  const summary = normalizeWhitespace([
    item.summary,
    item.description,
    item.skills,
    item.tags,
    item.labels,
  ]
    .flat()
    .filter(Boolean)
    .join(' | '));

  return {
    jobId: url,
    url,
    title,
    company,
    salaryText,
    salary: salaryText,
    location,
    experienceText: item.experienceText || item.experience || '',
    degreeText: item.degreeText || item.degree || '',
    recruiterName: item.bossName || item.hrName || '',
    recruiterTitle: item.recruiterTitle || item.bossTitle || '',
    companySize: item.companySize || item.scale || '',
    stage: item.stage || '',
    summary,
    securityId: item.securityId || item.security_id || parseSecurityIdFromUrl(url),
    sourceSearchUrl: searchUrl,
    identityKey: makeApplicationIdentity({
      company,
      title,
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
    location: normalizeWhitespace([detail.city, detail.district].filter(Boolean).join('·'))
      || searchCandidate.location
      || '上海',
    experienceText: detail.experience || searchCandidate.experienceText || '',
    degreeText: detail.degree || searchCandidate.degreeText || '',
    recruiterName: detail.boss_name || searchCandidate.recruiterName || '',
    recruiterTitle: detail.boss_title || '',
    companySize: detail.scale || searchCandidate.companySize || '',
    stage: detail.stage || searchCandidate.stage || '',
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
    : { generatedAt: null, mode: 'opencli_browse_apply', targets: [], results: [] };
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
  payload.mode = 'opencli_browse_apply';
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
    source: 'opencli_browse_apply',
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
    source: 'opencli_browse_apply',
  });
}

function findTerminalApplication(store, candidate) {
  return store.findApplicationByIdentity(candidate, ['applied', 'skipped']);
}

function jitterDelay(baseMs, spread = 0.4) {
  const u1 = Math.random();
  const u2 = Math.random();
  const gauss = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
  const jittered = baseMs + gauss * baseMs * spread;
  return Math.max(baseMs * (1 - spread), Math.min(baseMs * (1 + spread), jittered));
}

async function throttleBeforeApply(successes, hourlyLimit = 999) {
  const now = Date.now();
  const windowStart = now - 60 * 60 * 1000;
  const recentCount = successes.filter((s) => s.appliedAt && new Date(s.appliedAt).getTime() > windowStart).length;
  if (recentCount >= hourlyLimit) {
    const sleepMs = 60 * 60 * 1000 - (now - windowStart) + jitterDelay(30 * 1000);
    logProgress('hourly_limit_reached', { recentCount, hourlyLimit, sleepMs: Math.round(sleepMs) });
    await sleep(sleepMs);
  }
  const delayMs = Math.round(jitterDelay(12000));
  logProgress('apply_throttle', { delayMs });
  await sleep(delayMs);
}

async function throttleShort() {
  const delayMs = Math.round(3000 + Math.random() * 5000);
  await sleep(delayMs);
}

function createPlaywrightAdapter(page) {
  return {
    async evaluate(source) {
      return page.evaluate((script) => eval(script), source);
    },
    async waitMs(ms) {
      await sleep(ms);
    },
  };
}

function parseJsonResult(raw, fallback = {}) {
  if (raw && typeof raw === 'object') {
    return raw;
  }
  try {
    return JSON.parse(String(raw || ''));
  } catch (error) {
    return fallback;
  }
}

function buildInspectJobFeedScript() {
  return `(() => JSON.stringify({
    anchorCount: document.querySelectorAll('a[href*="/job_detail/"], a[href*="job_detail"]').length,
    scrollTop: window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0,
    scrollHeight: Math.max(
      document.documentElement ? document.documentElement.scrollHeight : 0,
      document.body ? document.body.scrollHeight : 0
    ),
    viewportHeight: window.innerHeight || (document.documentElement ? document.documentElement.clientHeight : 0) || 0
  }))()`;
}

async function inspectJobFeed(adapter) {
  return parseJsonResult(await adapter.evaluate(buildInspectJobFeedScript()), {
    anchorCount: 0,
    scrollTop: 0,
    scrollHeight: 0,
    viewportHeight: 0,
  });
}

function buildScrollJobFeedScript() {
  return `(() => {
    const root = document.scrollingElement || document.documentElement || document.body;
    const viewportHeight = window.innerHeight || (document.documentElement ? document.documentElement.clientHeight : 0) || 0;
    const nextTop = Math.max(0, (root ? root.scrollHeight : 0) - viewportHeight * 0.35);
    window.scrollTo({ top: nextTop, behavior: 'auto' });
    return JSON.stringify({
      scrollTop: window.scrollY || (root ? root.scrollTop : 0) || 0,
      scrollHeight: root ? root.scrollHeight : 0,
      viewportHeight
    });
  })()`;
}

async function autoLoadMoreJobs(adapter, options = {}) {
  const maxRounds = Math.max(0, Number(options.scrollRounds || 0));
  const initial = await inspectJobFeed(adapter);
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
    await adapter.evaluate(buildScrollJobFeedScript());
    await adapter.waitMs(Number(options.scrollWaitMs || 1200));

    const current = await inspectJobFeed(adapter);
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

async function waitForJobsPageReady(page, options = {}) {
  const timeoutMs = Math.max(5000, Number(options.timeoutMs || 30000));
  const pollMs = Math.max(500, Number(options.pollMs || 1000));
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const currentUrl = page.url();
    if (currentUrl.includes('verify.html')) {
      return { ready: false, verify: true, url: currentUrl };
    }

    const looksReady = await page.evaluate((selectors) => {
      return selectors.some((selector) => document.querySelector(selector));
    }, JOB_READY_SELECTORS).catch(() => false);

    if (looksReady) {
      return { ready: true, verify: false, url: currentUrl };
    }

    await sleep(pollMs);
  }

  return { ready: false, verify: false, url: page.url() };
}

async function fetchJobsFromPage(searchUrl, options = {}) {
  const browser = options.browser;
  const cdpEndpoint = options.cdpEndpoint || DEFAULT_CDP_ENDPOINT;
  if (!browser) {
    throw new Error('browser is required');
  }

  const contexts = browser.contexts();
  const context = contexts[0];
  if (!context) {
    throw new Error('No browser context available via CDP');
  }

  const page = options.page || await context.newPage();
  const adapter = createPlaywrightAdapter(page);
  const waitMs = Math.max(500, Number(options.pageWaitMs || 2500));
  const timeoutMs = Math.max(5000, Number(options.timeoutMs || 30000));

  logProgress('browse_search_url_start', { searchUrl });
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await sleep(waitMs);

  let readyState = await waitForJobsPageReady(page, { timeoutMs });
  if (readyState.verify || await hasVerifyPage(cdpEndpoint).catch(() => false)) {
    const resumed = await waitForManualVerification(['browse', searchUrl], {
      cdpEndpoint,
      maxWaitMs: Number(options.verificationWaitMs || 30 * 60 * 1000),
    });
    if (!resumed) {
      throw new Error('manual_verification_timeout');
    }
    if (!/\/web\/geek\/job/.test(page.url())) {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
      await sleep(waitMs);
    }
    readyState = await waitForJobsPageReady(page, { timeoutMs });
  }

  if (!readyState.ready) {
    throw new Error(`jobs_page_not_ready:${readyState.url}`);
  }

  const loadMoreResult = await autoLoadMoreJobs(adapter, {
    scrollRounds: Math.max(0, Number(options.scrollRounds || 0)),
    scrollWaitMs: Math.max(200, Number(options.scrollWaitMs || 1200)),
    scrollStableRounds: Math.max(1, Number(options.scrollStableRounds || 2)),
  });

  const rawJobs = await jobBrowserCore.extractJobsFromPage(adapter);
  const uniqueJobs = [];
  const seenUrls = new Set();
  for (const item of rawJobs) {
    const candidate = buildSearchCandidate(item, searchUrl);
    if (!candidate.url || !candidate.securityId || seenUrls.has(candidate.url)) {
      continue;
    }
    seenUrls.add(candidate.url);
    uniqueJobs.push(candidate);
    if (uniqueJobs.length >= Math.max(1, Number(options.searchLimit || rawJobs.length || 1))) {
      break;
    }
  }

  logProgress('browse_search_url_done', {
    searchUrl,
    extracted: uniqueJobs.length,
    rawJobs: Array.isArray(rawJobs) ? rawJobs.length : 0,
    loadMore: loadMoreResult,
  });

  return {
    jobs: uniqueJobs,
    meta: {
      searchUrl,
      pageUrl: page.url(),
      pageTitle: await page.title().catch(() => ''),
      loadMore: loadMoreResult,
      rawJobs: Array.isArray(rawJobs) ? rawJobs.length : 0,
    },
  };
}

async function connectBrowser(cdpEndpoint) {
  return chromium.connectOverCDP(cdpEndpoint);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targetSuccesses = Math.max(1, Number(args['target-successes'] || 50));
  const searchLimit = Math.max(1, Number(args['search-limit'] || 18));
  const timeoutMs = Math.max(30 * 1000, Number(args['timeout-ms'] || 120 * 1000));
  const cdpEndpoint = args['cdp-endpoint'] || DEFAULT_CDP_ENDPOINT;

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

  const searchUrls = (config.jobs?.searchUrls || []).filter(Boolean);
  const limitedSearchUrls = Number(args['max-search-urls'] || 0) > 0
    ? searchUrls.slice(0, Number(args['max-search-urls']))
    : searchUrls;
  const maxJobsPerRun = Math.max(
    1,
    Number(args['max-jobs'] || config.jobs?.maxJobsPerRun || targetSuccesses * searchLimit)
  );
  const scrollRounds = Math.max(
    0,
    Number(args['scroll-rounds'] || Math.max(6, Number(config.jobs?.maxPagesPerUrl || 1) * 6))
  );
  const scrollWaitMs = Math.max(200, Number(args['scroll-wait-ms'] || 1200));
  const scrollStableRounds = Math.max(1, Number(args['scroll-stable-rounds'] || 2));
  const pageWaitMs = Math.max(500, Number(args['page-wait-ms'] || 2500));

  const store = new ZhipinStore();
  const startAppliedCount = store.getTodaySuccessfulApplies(new Date());
  const seenUrls = new Set();
  const successes = [];
  const skips = [];
  const browseStats = [];
  let inspectedCandidates = 0;
  let browser;

  const runId = store.startRun('opencli_browse_apply', {
    targetSuccesses,
    searchLimit,
    maxJobsPerRun,
    searchUrls: limitedSearchUrls,
    cdpEndpoint,
  });
  store.save({ operation: 'opencli_browse_apply', phase: 'start', runId });

  try {
    browser = await connectBrowser(cdpEndpoint);

    for (const searchUrl of limitedSearchUrls) {
      if (successes.length >= targetSuccesses || inspectedCandidates >= maxJobsPerRun) {
        break;
      }

      let pageJobs = [];
      try {
        const fetched = await fetchJobsFromPage(searchUrl, {
          browser,
          cdpEndpoint,
          timeoutMs,
          verificationWaitMs: timeoutMs,
          pageWaitMs,
          searchLimit,
          scrollRounds,
          scrollWaitMs,
          scrollStableRounds,
        });
        pageJobs = fetched.jobs;
        browseStats.push(fetched.meta);
      } catch (error) {
        skips.push({ url: '', reason: `browse_failed:${searchUrl}:${error.message}` });
        logProgress('browse_search_url_failed', {
          searchUrl,
          reason: error.message || String(error),
        });
        continue;
      }

      for (const searchCandidate of pageJobs) {
        if (successes.length >= targetSuccesses || inspectedCandidates >= maxJobsPerRun) {
          break;
        }
        inspectedCandidates += 1;

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
          detailPayload = await execOpencliJson(
            ['boss', 'detail', searchCandidate.securityId, '-f', 'json'],
            { timeoutMs, cdpEndpoint }
          );
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
        store.save({ operation: 'opencli_browse_apply', phase: 'matched', runId, url: detailCandidate.url });

        logProgress('apply_start', {
          company: detailCandidate.company,
          title: detailCandidate.title,
          url: detailCandidate.url,
          successCount: successes.length,
        });

        await throttleBeforeApply(successes);

        let applyResult;
        try {
          const applyPayload = await execOpencliJson(
            ['boss', 'apply', '--url', detailCandidate.url, '-f', 'json'],
            { timeoutMs, cdpEndpoint }
          );
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
          operation: 'opencli_browse_apply',
          phase: 'apply',
          runId,
          url: detailCandidate.url,
          status: success ? 'applied' : 'skipped',
        });

        if (!success) {
          skips.push({
            url: detailCandidate.url,
            reason: String(applyResult?.reason || applyResult?.mode || applyResult?.status || 'apply_failed'),
          });
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
      exhaustedSearchUrls: successes.length < targetSuccesses,
      inspectedCandidates,
      browseStats,
      successes,
      skipped: skips.length,
      summary: store.summary(),
    };
    store.finishRun(runId, 'completed', summary);
    store.save({ operation: 'opencli_browse_apply', phase: 'finish', runId, status: 'completed' });
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    store.finishRun(runId, 'failed', { error: error.message || String(error) });
    store.save({ operation: 'opencli_browse_apply', phase: 'finish', runId, status: 'failed' });
    throw error;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
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

module.exports = {
  autoLoadMoreJobs,
  buildSearchCandidate,
  buildDetailCandidate,
  connectBrowser,
  createPlaywrightAdapter,
  fetchJobsFromPage,
  parseSecurityIdFromUrl,
  shouldSkipDetailCandidate,
};
