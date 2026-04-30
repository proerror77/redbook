#!/usr/bin/env node

const fs = require('node:fs');
const http = require('node:http');

const { readChatTriage, matchJobAgainstChatTriage } = require('../lib/chat_triage');
const { loadConfig } = require('../lib/config');
const { evaluateJob } = require('../lib/filters');
const { DATA_DIR } = require('../lib/paths');
const { requireBossCoreModule } = require('../lib/opencli_core');
const { ZhipinStore } = require('../lib/store');
const { makeApplicationIdentity, normalizeWhitespace, nowIso, parseArgs, sleep } = require('../lib/utils');

const DEFAULT_CDP_ENDPOINT = 'http://127.0.0.1:9224';
const DEFAULT_JOBS_URL = 'https://www.zhipin.com/web/geek/jobs?ka=header-jobs';
const DEFAULT_OUTPUT = `${DATA_DIR}/cdp-collect-current-jobs-latest.json`;
const DEFAULT_TAB_TEXT = '联合创始人';
const DEFAULT_AI_KEYWORDS = [
  'AI',
  'Agent',
  '智能体',
  '大模型',
  'AIGC',
  'RAG',
  '工作流',
  '自动化',
  '效率优化',
  '技术负责人',
  'AI负责人',
  '联合创始人',
  'CTO',
];
const { buildExtractJobsFromPageScript } = requireBossCoreModule('job-browser');

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

function putJson(url) {
  return new Promise((resolve, reject) => {
    const request = http.request(url, { method: 'PUT' }, (response) => {
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
    });
    request.on('error', reject);
    request.end();
  });
}

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }
  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(text)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(text)) return false;
  return fallback;
}

function buildHaystack(job) {
  return normalizeWhitespace([
    job.title,
    job.company,
    job.summary,
    job.salaryText,
    job.location,
  ].filter(Boolean).join(' | ')).toLowerCase();
}

function matchesKeywords(job, keywords) {
  const haystack = buildHaystack(job);
  return keywords.some((keyword) => haystack.includes(String(keyword).toLowerCase()));
}

async function ensureJobsPage(cdpEndpoint) {
  const pages = await getJson(new URL('/json/list', cdpEndpoint).toString());
  const existing = pages.find((page) => String(page.url || '').includes('/web/geek/jobs'));
  if (existing) {
    return;
  }
  const reusable = pages.find((page) => page.type === 'page' && String(page.url || '').includes('zhipin.com'));
  if (reusable) {
    const session = await createCdpSession(reusable.webSocketDebuggerUrl);
    try {
      await session.send('Page.enable');
      await session.send('Page.navigate', { url: DEFAULT_JOBS_URL });
      await sleep(2500);
      return;
    } finally {
      session.close();
    }
  }
  await putJson(new URL(`/json/new?${DEFAULT_JOBS_URL}`, cdpEndpoint).toString());
}

async function getJobsTarget(cdpEndpoint) {
  const pages = await getJson(new URL('/json/list', cdpEndpoint).toString());
  const matches = pages.filter((entry) => String(entry.url || '').includes('/web/geek/jobs'));
  if (!matches.length) {
    throw new Error('No BOSS jobs page found');
  }
  return matches[0];
}

async function createCdpSession(webSocketDebuggerUrl) {
  const ws = new WebSocket(webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  };
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  return {
    async send(method, params = {}) {
      return new Promise((resolve) => {
        const messageId = ++id;
        pending.set(messageId, resolve);
        ws.send(JSON.stringify({ id: messageId, method, params }));
      });
    },
    close() {
      ws.close();
    },
  };
}

async function evaluate(session, expression) {
  const result = await session.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result.result?.result?.value;
}

async function clickTabByText(session, text) {
  return evaluate(session, `(() => {
    function normalize(value) {
      return String(value || '').replace(/\s+/g, ' ').trim();
    }
    function isVisible(node) {
      if (!node) {
        return false;
      }
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
        return false;
      }
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }
    const nodes = Array.from(document.querySelectorAll('.expect-list .expect-item'));
    const hit = nodes.find((node) => {
      const text = normalize(node.innerText || node.textContent || '');
      return text === ${JSON.stringify(text)} && isVisible(node);
    });
    if (!hit) {
      return { ok: false, reason: 'tab_not_found', targetText: ${JSON.stringify(text)} };
    }
    hit.scrollIntoView({ block: 'center' });
    const rect = hit.getBoundingClientRect();
    ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach((type) => {
      hit.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        view: window,
      }));
    });
    if (typeof hit.click === 'function') {
      hit.click();
    }
    return {
      ok: true,
      text: normalize(hit.innerText || hit.textContent || ''),
      className: String(hit.className || ''),
    };
  })()`);
}

async function capturePageState(session) {
  return evaluate(session, `(() => ({
    url: location.href,
    title: document.title || '',
    body: document.body ? document.body.innerText.slice(0, 1000) : ''
  }))()`);
}

async function sampleTopJobTitles(session, limit = 8) {
  return evaluate(session, `(() => Array.from(document.querySelectorAll('.job-name'))
    .slice(0, ${Number(limit) || 8})
    .map((node) => String(node.innerText || node.textContent || '').replace(/\\s+/g, ' ').trim()))()`);
}

async function extractJobs(session) {
  const raw = await evaluate(session, buildExtractJobsFromPageScript());
  return Array.isArray(raw) ? raw : JSON.parse(String(raw || '[]'));
}

async function scrollJobList(session) {
  return evaluate(session, `(() => {
    const candidates = [
      '.job-list-container',
      '.job-list',
      '.job-list-box',
      '.search-job-result',
      '[class*=job-list]',
      '[class*=search-job-result]',
    ];
    const scroller = candidates
      .map((selector) => document.querySelector(selector))
      .find((node) => node && node.scrollHeight > node.clientHeight);
    const target = scroller || document.scrollingElement || document.documentElement;
    const before = target.scrollTop || window.scrollY || 0;
    if (scroller) {
      scroller.scrollBy({ top: Math.max(420, scroller.clientHeight * 0.8), behavior: 'auto' });
    } else {
      window.scrollBy({ top: Math.max(560, window.innerHeight * 0.8), behavior: 'auto' });
    }
    const after = target.scrollTop || window.scrollY || 0;
    return { ok: after !== before, before, after, usedWindow: !scroller };
  })()`);
}

function buildResultItem(job, status, reasons = []) {
  return {
    status,
    company: job.company || '',
    title: job.title || '',
    salaryText: job.salaryText || '',
    location: job.location || '',
    url: job.url || '',
    identityKey: job.identityKey || '',
    reasons,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cdpEndpoint = args['cdp-endpoint'] || DEFAULT_CDP_ENDPOINT;
  const output = args.output || DEFAULT_OUTPUT;
  const tabText = args.tab || DEFAULT_TAB_TEXT;
  const aiKeywords = parseCsv(args.keywords);
  const keywords = aiKeywords.length ? aiKeywords : DEFAULT_AI_KEYWORDS;
  const focus = parseBoolean(args.focus, false);
  const scrollSteps = Math.max(0, Number(args['scroll-steps'] || 0));

  await ensureJobsPage(cdpEndpoint);
  const target = await getJobsTarget(cdpEndpoint);
  const session = await createCdpSession(target.webSocketDebuggerUrl);
  try {
    await session.send('Page.enable');
    if (focus) {
      await session.send('Page.bringToFront');
    }
    await sleep(1200);

    const beforeTitles = await sampleTopJobTitles(session);
    const tabResult = await clickTabByText(session, tabText);
    await sleep(1800);
    const afterTitles = await sampleTopJobTitles(session);
    const jobsByUrl = new Map();
    const scrollResults = [];
    for (let step = 0; step <= scrollSteps; step += 1) {
      for (const job of await extractJobs(session)) {
        const key = job.url || `${job.company || ''}::${job.title || ''}`;
        if (key && !jobsByUrl.has(key)) {
          jobsByUrl.set(key, job);
        }
      }
      if (step < scrollSteps) {
        scrollResults.push(await scrollJobList(session));
        await sleep(1200);
      }
    }
    const jobs = Array.from(jobsByUrl.values());
    const pageState = await capturePageState(session);

    const { config } = loadConfig(args.config);
    const store = new ZhipinStore();
    const triage = readChatTriage();
    const matched = [];
    const skipped = [];

    for (const rawJob of jobs) {
      const job = {
        ...rawJob,
        identityKey: rawJob.identityKey || makeApplicationIdentity(rawJob),
      };

      const reasons = [];
      if (!matchesKeywords(job, keywords)) {
        reasons.push('missing_ai_keyword');
      }

      const filterDecision = evaluateJob(job, config.filters || {});
      if (!filterDecision.allow) {
        reasons.push(...filterDecision.reasons);
      }

      const existingByIdentity = store.findApplicationByIdentity(job, ['applied', 'skipped']);
      if (existingByIdentity) {
        reasons.push(existingByIdentity.status === 'applied' ? 'duplicate_applied_identity' : 'duplicate_skipped_identity');
      }

      const blockedEntry = matchJobAgainstChatTriage(job, triage);
      if (blockedEntry) {
        reasons.push(`chat_triage_${blockedEntry.category || 'blocked'}`);
      }

      if (reasons.length) {
        skipped.push(buildResultItem(job, 'skipped', reasons));
        continue;
      }

      matched.push(buildResultItem(job, 'matched'));
    }

    const result = {
      generatedAt: nowIso(),
      cdpEndpoint,
      sourceUrl: pageState.url || target.url || '',
      pageTitle: pageState.title || target.title || '',
      tabText,
      tabResult: {
        ...tabResult,
        beforeTitles,
        afterTitles,
        changed: JSON.stringify(beforeTitles) !== JSON.stringify(afterTitles),
      },
      scrollSteps,
      scrollResults,
      keywords,
      totalJobs: jobs.length,
      matchedCount: matched.length,
      skippedCount: skipped.length,
      matched,
      skipped,
    };
    fs.writeFileSync(output, JSON.stringify(result, null, 2));
    console.log(JSON.stringify({
      output,
      sourceUrl: result.sourceUrl,
      tabResult,
      totalJobs: jobs.length,
      matchedCount: matched.length,
      skippedCount: skipped.length,
    }, null, 2));
  } finally {
    session.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
