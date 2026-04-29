#!/usr/bin/env node

const http = require('node:http');

const { chromium } = require('../node_modules/playwright');

const { loadConfig } = require('../lib/config');
const { requireBossCoreModule } = require('../lib/opencli_core');
const { isSuccessfulApplyResult } = require('../lib/opencli_apply_queue');
const { enforceRuntimeGuard, formatGuardError } = require('../lib/runtime_guard');
const { ZhipinStore } = require('../lib/store');
const { makeApplicationIdentity, normalizeWhitespace, nowIso, parseArgs, sleep } = require('../lib/utils');
const { JOB_READY_SELECTORS } = require('../lib/zhipin');

const jobBrowserCore = requireBossCoreModule('job-browser');

const DEFAULT_CDP_ENDPOINT = 'http://localhost:9222';
const VERIFY_WAIT_MS = 30 * 60 * 1000;
const VERIFY_POLL_MS = 3000;
const BOSS_URL_KEYWORD = 'zhipin.com';

function printHelp() {
  console.log([
    'Usage:',
    '  node tools/auto-zhipin/scripts/opencli_apply_current_tab.js [options]',
    '',
    'Options:',
    '  --cdp-endpoint <url>      Chrome CDP endpoint, default http://localhost:9222',
    '  --config <path>           Config file path',
    '  --greeting <text>         Override greeting message',
    '  --dry-run <true|false>    Click apply only, do not continue send flow',
    '  --probe <true|false>      Inspect current BOSS page only, do not click anything',
    '  --title <keyword>         Prefer tabs whose title contains this keyword',
    '  --url <keyword>           Prefer tabs whose URL contains this keyword',
    '  --wait-verify <true|false>  Wait for manual verification if verify page appears',
    '',
    'Examples:',
    '  npm run boss:apply-current',
    '  npm run boss:apply-current -- --dry-run true',
    '  npm run boss:apply-current -- --title Agent高级专家',
  ].join('\n'));
}

function parseBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(text)) {
    return true;
  }
  if (['0', 'false', 'no', 'n', 'off'].includes(text)) {
    return false;
  }
  return fallback;
}

function createAdapter(page) {
  return {
    evaluate(script) {
      return page.evaluate(script);
    },
    waitMs(ms) {
      return sleep(ms);
    },
  };
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (response) => {
      let body = '';
      response.on('data', (chunk) => {
        body += chunk;
      });
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

async function hasVerifyTarget(cdpEndpoint) {
  const targets = await getJson(new URL('/json/list', cdpEndpoint).toString());
  return Array.isArray(targets)
    ? targets.some((item) => String(item.url || '').includes('verify.html'))
    : false;
}

async function waitForManualVerification(cdpEndpoint) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < VERIFY_WAIT_MS) {
    if (!await hasVerifyTarget(cdpEndpoint)) {
      return true;
    }
    await sleep(VERIFY_POLL_MS);
  }

  return false;
}

async function describePage(page, index) {
  const url = page.url();
  let meta = {};

  try {
    meta = await page.evaluate(() => ({
      title: document.title || '',
      hasFocus: typeof document.hasFocus === 'function' ? document.hasFocus() : false,
      visibilityState: document.visibilityState || '',
    }));
  } catch (error) {
    meta = {
      title: '',
      hasFocus: false,
      visibilityState: '',
    };
  }

  return {
    index,
    page,
    url,
    title: meta.title || '',
    hasFocus: Boolean(meta.hasFocus),
    visibilityState: meta.visibilityState || '',
    isBoss: String(url || '').includes(BOSS_URL_KEYWORD),
    isVerify: String(url || '').includes('verify.html'),
  };
}

function scoreCandidatePage(entry, args = {}) {
  if (!entry.isBoss || entry.isVerify) {
    return Number.NEGATIVE_INFINITY;
  }

  let score = 0;
  if (entry.hasFocus) {
    score += 500;
  }
  if (entry.visibilityState === 'visible') {
    score += 200;
  }
  if (String(entry.url || '').includes('/job_detail/')) {
    score += 80;
  }
  if (String(entry.url || '').includes('/web/geek/jobs')) {
    score += 60;
  }

  const titleKeyword = normalizeWhitespace(args.title || '');
  const urlKeyword = normalizeWhitespace(args.url || '');
  if (titleKeyword && String(entry.title || '').includes(titleKeyword)) {
    score += 300;
  }
  if (urlKeyword && String(entry.url || '').includes(urlKeyword)) {
    score += 250;
  }

  score += entry.index;
  return score;
}

async function selectBossPage(browser, args = {}) {
  const pages = browser.contexts().flatMap((context) => context.pages());
  if (!pages.length) {
    throw new Error('No Chrome pages available via CDP.');
  }

  const described = [];
  for (let index = 0; index < pages.length; index += 1) {
    described.push(await describePage(pages[index], index));
  }

  const activeVerifyPage = described.find((entry) => (
    entry.isBoss
    && entry.isVerify
    && (entry.hasFocus || entry.visibilityState === 'visible')
  ));
  if (activeVerifyPage) {
    return { ...activeVerifyPage, score: Number.POSITIVE_INFINITY };
  }

  const candidates = described
    .map((entry) => ({ ...entry, score: scoreCandidatePage(entry, args) }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((left, right) => right.score - left.score);

  if (!candidates.length) {
    const snapshot = described.map((entry) => ({
      index: entry.index,
      url: entry.url,
      title: entry.title,
      hasFocus: entry.hasFocus,
      visibilityState: entry.visibilityState,
    }));
    throw new Error(`No active BOSS page found in current Chrome session: ${JSON.stringify(snapshot)}`);
  }

  return candidates[0];
}

async function extractCurrentJobMeta(page) {
  return page.evaluate(() => {
    function pickText(selectors) {
      for (const selector of selectors) {
        const node = document.querySelector(selector);
        const text = (node?.innerText || node?.textContent || '').replace(/\s+/g, ' ').trim();
        if (text) {
          return text;
        }
      }
      return '';
    }

    function pickTexts(selectors) {
      for (const selector of selectors) {
        const nodes = Array.from(document.querySelectorAll(selector));
        const values = nodes
          .map((node) => (node?.innerText || node?.textContent || '').replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        if (values.length) {
          return values;
        }
      }
      return [];
    }

    const bodyText = document.body ? document.body.innerText.slice(0, 8000) : '';
    const title = pickText([
      '.job-name',
      'h1',
      '[class*=job-name]',
      '.job-title',
    ]);
    const salaryText = pickText([
      '.salary',
      '.job-salary',
      '[class*=salary]',
    ]);
    const company = pickText([
      '.company-name',
      '.company-info a',
      '[class*=company-name]',
      '.job-company',
    ]);
    const infoTags = pickTexts([
      '.job-info .tag-list li',
      '.job-info .job-tags span',
      '.job-banner .job-primary .info-primary p span',
      '.job-primary .info-primary p span',
      '.job-primary .info-primary span',
    ]);
    const companyTags = pickTexts([
      '.company-info .company-tag-list li',
      '.company-card .company-tag-list li',
      '.company-info span',
    ]);
    const actionText = pickText([
      '.job-op .btn-startchat',
      '.job-op .btn-container .btn',
      '.btn-startchat-wrap .btn-startchat',
      'a.btn.btn-startchat',
      'a.op-btn.op-btn-chat',
    ]);

    return {
      url: location.href,
      pageTitle: document.title || '',
      title,
      salaryText,
      company,
      infoTags,
      companyTags,
      actionText,
      bodyText,
      securityCheck: location.href.includes('_security_check=1') || bodyText.includes('BOSS 安全提示'),
    };
  });
}

function deriveJobRecord(meta = {}) {
  const infoTags = Array.isArray(meta.infoTags) ? meta.infoTags : [];
  const companyTags = Array.isArray(meta.companyTags) ? meta.companyTags : [];
  return {
    jobId: meta.url || `current-tab:${nowIso()}`,
    url: meta.url || '',
    title: meta.title || meta.pageTitle || '',
    company: meta.company || '',
    salaryText: meta.salaryText || '',
    salary: meta.salaryText || '',
    location: infoTags[0] || '',
    experienceText: infoTags[1] || '',
    degreeText: infoTags[2] || '',
    companySize: companyTags.find((item) => /人/.test(item)) || '',
    stage: companyTags.find((item) => /(轮|上市|融资)/.test(item)) || '',
    summary: normalizeWhitespace(
      [infoTags.join(' | '), companyTags.join(' | '), meta.pageTitle || '']
        .filter(Boolean)
        .join(' | ')
    ),
    identityKey: makeApplicationIdentity({
      company: meta.company || '',
      title: meta.title || meta.pageTitle || '',
    }),
  };
}

function logStep(message, extra = {}) {
  console.log(JSON.stringify({ timestamp: nowIso(), message, ...extra }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printHelp();
    return;
  }

  const cdpEndpoint = args['cdp-endpoint'] || DEFAULT_CDP_ENDPOINT;
  const waitVerify = parseBoolean(args['wait-verify'], true);
  const probeOnly = parseBoolean(args.probe, false);
  const { config } = loadConfig(args.config);
  const greeting = String(args.greeting || config.apply?.greeting || '').trim();
  const dryRun = parseBoolean(args['dry-run'], config.apply?.dryRun !== false);
  const buttonTextCandidates = Array.isArray(config.apply?.buttonTextCandidates)
    ? config.apply.buttonTextCandidates
    : undefined;

  const store = new ZhipinStore();
  const runId = store.startRun('opencli_apply_current_tab', {
    cdpEndpoint,
    dryRun,
    probeOnly,
    greeting,
    title: args.title || '',
    urlKeyword: args.url || '',
  });
  store.save({ operation: 'opencli_apply_current_tab', phase: 'start', runId });

  let browser;
  try {
    browser = await chromium.connectOverCDP(cdpEndpoint);
    let selectedPage = await selectBossPage(browser, args);

    logStep('selected_current_boss_page', {
      url: selectedPage.url,
      title: selectedPage.title,
      hasFocus: selectedPage.hasFocus,
      visibilityState: selectedPage.visibilityState,
      score: selectedPage.score,
    });

    if (selectedPage.isVerify && waitVerify) {
      logStep('verification_pause_required', {
        url: selectedPage.url,
        message: '检测到验证页，脚本暂停等待你手动完成验证。',
      });
      const resumed = await waitForManualVerification(cdpEndpoint);
      if (!resumed) {
        throw new Error('manual_verification_timeout');
      }
      selectedPage = await selectBossPage(browser, args);
    }

    await selectedPage.page.bringToFront().catch(() => {});
    await sleep(800);

    const adapter = createAdapter(selectedPage.page);
    const guard = await enforceRuntimeGuard({
      page: selectedPage.page,
      store,
      mode: 'page',
      readySelectors: JOB_READY_SELECTORS,
    });
    if (guard.blocked) {
      throw new Error(formatGuardError(guard));
    }
    if (guard.probeOnly && !probeOnly) {
      throw new Error('site recovered from restriction; rerun probe first before applying');
    }

    const beforeMeta = await extractCurrentJobMeta(selectedPage.page);
    if (beforeMeta.securityCheck && !probeOnly) {
      throw new Error('boss security check detected; resolve manually and rerun probe before applying');
    }
    const jobRecord = deriveJobRecord(beforeMeta);

    store.upsertApplication({
      ...jobRecord,
      status: 'matched',
      source: 'opencli_apply_current_tab',
    });
    store.save({ operation: 'opencli_apply_current_tab', phase: 'matched', runId, url: jobRecord.url });

    if (beforeMeta.securityCheck && waitVerify) {
      logStep('security_check_context_detected', {
        url: beforeMeta.url,
        title: beforeMeta.title,
      });
    }

    if (probeOnly) {
      store.finishRun(runId, 'completed', {
        url: jobRecord.url,
        title: jobRecord.title,
        company: jobRecord.company,
        dryRun,
        probeOnly: true,
      });
      store.save({
        operation: 'opencli_apply_current_tab',
        phase: 'finish',
        runId,
        status: 'completed',
      });
      console.log(JSON.stringify({
        runId,
        dryRun,
        probeOnly: true,
        selectedPage: {
          url: selectedPage.url,
          title: selectedPage.title,
          hasFocus: selectedPage.hasFocus,
          visibilityState: selectedPage.visibilityState,
        },
        job: {
          url: jobRecord.url,
          title: jobRecord.title,
          company: jobRecord.company,
          salaryText: jobRecord.salaryText,
          location: jobRecord.location,
          experienceText: jobRecord.experienceText,
          degreeText: jobRecord.degreeText,
          actionText: beforeMeta.actionText,
          securityCheck: beforeMeta.securityCheck,
        },
      }, null, 2));
      return;
    }

    const applyResult = await jobBrowserCore.applyOnActiveJobDetail(adapter, {
      greeting,
      dryRun,
      buttonTextCandidates,
    });
    const success = !dryRun && isSuccessfulApplyResult(applyResult || {});
    const finalStatus = success ? 'applied' : (dryRun ? 'dry_run' : 'skipped');

    store.upsertApplication({
      ...jobRecord,
      status: finalStatus,
      appliedAt: success ? nowIso() : undefined,
      skippedAt: !success && !dryRun ? nowIso() : undefined,
      reasons: success ? [] : [String(applyResult?.reason || applyResult?.mode || applyResult?.status || 'apply_failed')],
      applyResult,
      source: 'opencli_apply_current_tab',
    });
    store.finishRun(runId, success || dryRun ? 'completed' : 'failed', {
      url: jobRecord.url,
      title: jobRecord.title,
      company: jobRecord.company,
      dryRun,
      result: applyResult,
    });
    store.save({
      operation: 'opencli_apply_current_tab',
      phase: 'finish',
      runId,
      status: success || dryRun ? 'completed' : 'failed',
    });

    console.log(JSON.stringify({
      runId,
      dryRun,
      selectedPage: {
        url: selectedPage.url,
        title: selectedPage.title,
        hasFocus: selectedPage.hasFocus,
        visibilityState: selectedPage.visibilityState,
      },
      job: {
        url: jobRecord.url,
        title: jobRecord.title,
        company: jobRecord.company,
        salaryText: jobRecord.salaryText,
        location: jobRecord.location,
        experienceText: jobRecord.experienceText,
        degreeText: jobRecord.degreeText,
        actionText: beforeMeta.actionText,
        securityCheck: beforeMeta.securityCheck,
      },
      result: applyResult,
      success,
      finalStatus,
    }, null, 2));
  } catch (error) {
    store.finishRun(runId, 'failed', { error: error.message || String(error) });
    store.save({ operation: 'opencli_apply_current_tab', phase: 'finish', runId, status: 'failed' });
    throw error;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

module.exports = {
  describePage,
  deriveJobRecord,
  extractCurrentJobMeta,
  parseBoolean,
  scoreCandidatePage,
  selectBossPage,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
}
