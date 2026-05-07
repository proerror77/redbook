#!/usr/bin/env node

const http = require('node:http');

const { loadConfig } = require('../lib/config');
const { readChatTriage } = require('../lib/chat_triage');
const { checkPreApplyCandidate } = require('../lib/opencli_apply_queue');
const { ZhipinStore } = require('../lib/store');
const { deriveCompanyFields, deriveJobDetailFields, makeApplicationIdentity, normalizeWhitespace, parseArgs, nowIso } = require('../lib/utils');

const DEFAULT_CDP_ENDPOINT = 'http://127.0.0.1:9224';

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

async function ensureJobTab(cdpEndpoint, targetUrl) {
  const pages = await getJson(new URL('/json/list', cdpEndpoint).toString());
  const existing = pages.find((entry) => String(entry.url || '').includes('/job_detail/'));
  if (existing) {
    return existing;
  }
  const created = await new Promise((resolve, reject) => {
    const request = http.request(new URL(`/json/new?${targetUrl}`, cdpEndpoint), { method: 'PUT' }, (response) => {
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
  return created;
}

async function navigateToJob(session, url, { focus = false } = {}) {
  await session.send('Page.enable');
  if (focus) {
    await session.send('Page.bringToFront');
  }
  await session.send('Page.navigate', { url });
  await new Promise((resolve) => setTimeout(resolve, 2500));
}

async function extractMeta(session) {
  return evaluate(session, `(() => {
    try {
      function clean(value) {
        return String(value || '').replace(/\\s+/g, ' ').trim();
      }
      function textOf(selectors) {
        for (const selector of selectors) {
          const node = document.querySelector(selector);
          const text = clean(node?.innerText || node?.textContent || '');
          if (text) return text;
        }
        return '';
      }
      function textsOf(selectors) {
        const values = [];
        for (const selector of selectors) {
          for (const node of Array.from(document.querySelectorAll(selector))) {
            const text = clean(node?.innerText || node?.textContent || '');
            if (text && !values.includes(text)) values.push(text);
          }
        }
        return values;
      }
      const fullBody = document.body ? String(document.body.innerText || '') : '';
      const bodyText = fullBody.slice(0, 3000) + '\\n' + fullBody.slice(-1000);
      const lines = fullBody.split(/\\n+/).map((item) => clean(item)).filter(Boolean);
      const companyInfoIndex = lines.findIndex((line) => line.includes('公司基本信息'));
      const companyFromBody = companyInfoIndex >= 0 ? (lines[companyInfoIndex + 1] || '') : '';
      const infoTags = textsOf(['.job-info .tag-list li', '.job-info .job-tags span', '.job-banner .job-primary .info-primary p span', '.job-primary .info-primary p span', '.job-primary .info-primary span']);
      if (!infoTags.length) {
        const salaryIndex = lines.findIndex((line) => /\\d+[-~]?\\d*\\s*[Kk]/.test(line));
        for (const line of lines.slice(salaryIndex + 1, salaryIndex + 5)) {
          if (/上海|北京|深圳|杭州|广州|年|本科|硕士|大专|不限/.test(line)) infoTags.push(line);
        }
      }
      const companyTags = textsOf(['.company-info .company-tag-list li', '.company-card .company-tag-list li', '.company-info span']);
      if (!companyTags.length && companyInfoIndex >= 0) {
        for (const line of lines.slice(companyInfoIndex + 2, companyInfoIndex + 10)) {
          if (/人|轮|上市|融资|未融资|不需要融资|天使|A轮|B轮|C轮|D轮/.test(line)) companyTags.push(line);
        }
      }
      const company = companyFromBody || textOf([
        '.company-info .company-name',
        '.company-card .company-name',
        '.company-name',
        '.company-info a',
        '[class*=company-name]',
        '.job-company'
      ]);
      return {
        url: location.href,
        title: document.title || '',
        jobName: textOf(['.job-name', 'h1', '[class*=job-name]']),
        salaryText: textOf(['.salary', '.job-salary', '[class*=salary]']),
        company,
        infoTags,
        companyTags,
        actionText: textOf(['.job-op .btn-startchat', '.job-op .btn-container .btn', '.btn-startchat-wrap .btn-startchat', 'a.btn.btn-startchat', 'a.op-btn.op-btn-chat']),
        body: bodyText,
      };
    } catch (error) {
      return {
        url: location.href,
        title: document.title || '',
        jobName: '',
        salaryText: '',
        company: '',
        infoTags: [],
        companyTags: [],
        actionText: '',
        body: bodyText,
        error: String(error && error.message || error || ''),
      };
    }
  })()`);
}

function normalizeClickMode(value) {
  const mode = String(value || 'mouse').trim().toLowerCase();
  if (['dom', 'element', 'element-click'].includes(mode)) {
    return 'dom';
  }
  return 'mouse';
}

async function dispatchMouseClick(session, target) {
  await session.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: target.x,
    y: target.y,
    button: 'none',
  });
  await session.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: target.x,
    y: target.y,
    button: 'left',
    clickCount: 1,
  });
  await session.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: target.x,
    y: target.y,
    button: 'left',
    clickCount: 1,
  });
}

async function clickApply(session, options = {}) {
  const clickMode = normalizeClickMode(options.clickMode);
  const target = await evaluate(session, `(() => {
    function normalize(value) {
      return String(value || '').replace(/\\s+/g, ' ').trim();
    }
    function isVisible(node) {
      if (!node) return false;
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }
    const selectors = [
      '.job-op .btn-startchat',
      '.job-op .btn-container .btn-startchat',
      '.btn-startchat-wrap .btn-startchat',
      'a.btn.btn-startchat',
      'a.op-btn.op-btn-chat',
      '[class*=\"op-btn-chat\"]'
    ];
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (!isVisible(node)) continue;
      node.scrollIntoView({block:'center'});
      const rect = node.getBoundingClientRect();
      return {
        ok:true,
        selector,
        text: normalize(node.innerText || node.textContent || ''),
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
    return {ok:false, reason:'apply_button_not_found'};
  })()`);
  if (!target?.ok) {
    return target || { ok: false, reason: 'apply_button_not_found' };
  }
  if (clickMode === 'dom') {
    const domResult = await evaluate(session, `(() => {
      function normalize(value) {
        return String(value || '').replace(/\\s+/g, ' ').trim();
      }
      function isVisible(node) {
        if (!node) return false;
        const style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }
      const selector = ${JSON.stringify(target.selector)};
      const node = document.querySelector(selector);
      if (!isVisible(node)) return { ok: false, reason: 'apply_button_not_visible_for_dom_click', selector };
      node.scrollIntoView({ block: 'center' });
      const beforeUrl = location.href;
      const text = normalize(node.innerText || node.textContent || '');
      node.click();
      return { ok: true, selector, text, beforeUrl, afterUrl: location.href };
    })()`);
    return {
      ...target,
      ...domResult,
      clickMode,
      eventTrusted: false,
    };
  }
  await dispatchMouseClick(session, target);
  return { ...target, clickMode };
}

async function clickPostApplyReminder(session, options = {}) {
  const clickMode = normalizeClickMode(options.clickMode);
  const target = await evaluate(session, `(() => {
    function normalize(value) {
      return String(value || '').replace(/\\s+/g, ' ').trim();
    }
    function isVisible(node) {
      if (!node) return false;
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }
    const dialog = Array.from(document.querySelectorAll('.dialog-wrap, .dialog-container, [class*="dialog"]'))
      .find((node) => isVisible(node) && /温馨提示|沟通机会|今天已与/.test(normalize(node.innerText || node.textContent || '')));
    if (!dialog) {
      return { ok: false, reason: 'post_apply_reminder_not_found' };
    }
    const button = Array.from(dialog.querySelectorAll('.btn-sure, a, button, [role="button"], [class*="btn"], .dialog-footer'))
      .find((node) => isVisible(node) && /^(好|确定|知道了)$/.test(normalize(node.innerText || node.textContent || '')));
    if (!button) {
      return { ok: false, reason: 'post_apply_reminder_button_not_found' };
    }
    button.scrollIntoView({ block: 'center' });
    const rect = button.getBoundingClientRect();
    return {
      ok: true,
      selector: String(button.className || button.tagName || ''),
      text: normalize(button.innerText || button.textContent || ''),
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  })()`);
  if (!target?.ok) {
    return target || { ok: false, reason: 'post_apply_reminder_not_found' };
  }
  if (clickMode === 'dom') {
    const domResult = await evaluate(session, `(() => {
      function normalize(value) {
        return String(value || '').replace(/\\s+/g, ' ').trim();
      }
      function isVisible(node) {
        if (!node) return false;
        const style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }
      const dialog = Array.from(document.querySelectorAll('.dialog-wrap, .dialog-container, [class*="dialog"]'))
        .find((node) => isVisible(node) && /温馨提示|沟通机会|今天已与/.test(normalize(node.innerText || node.textContent || '')));
      if (!dialog) return { ok: false, reason: 'post_apply_reminder_not_found' };
      const button = Array.from(dialog.querySelectorAll('.btn-sure, a, button, [role="button"], [class*="btn"], .dialog-footer'))
        .find((node) => isVisible(node) && /^(好|确定|知道了)$/.test(normalize(node.innerText || node.textContent || '')));
      if (!button) return { ok: false, reason: 'post_apply_reminder_button_not_found' };
      const text = normalize(button.innerText || button.textContent || '');
      button.click();
      return { ok: true, text };
    })()`);
    return {
      ...target,
      ...domResult,
      clickMode,
      eventTrusted: false,
    };
  }
  await dispatchMouseClick(session, target);
  return { ...target, clickMode };
}

function parseBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(text)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(text)) return false;
  return fallback;
}

function extractJobDetailId(url) {
  const match = String(url || '').match(/\/job_detail\/([^/.?#]+)\.html/i);
  return match ? match[1] : '';
}

function validateTargetUrl(expectedUrl, actualUrl) {
  const expectedId = extractJobDetailId(expectedUrl);
  const actualId = extractJobDetailId(actualUrl);
  if (!expectedId) {
    return { ok: false, reason: 'target_url_not_a_job_detail', expectedUrl, actualUrl };
  }
  if (!actualId) {
    return { ok: false, reason: 'target_url_not_verified', expectedUrl, actualUrl };
  }
  if (expectedId !== actualId) {
    return { ok: false, reason: 'target_url_mismatch', expectedUrl, actualUrl };
  }
  return { ok: true, expectedUrl, actualUrl };
}

function getHeadhunterBlockReasons(candidate = {}, meta = {}) {
  const agencyHaystack = normalizeWhitespace([
    candidate.company,
    candidate.location,
    candidate.summary,
    candidate.recruiterTitle,
    meta.title,
    meta.body,
  ].filter(Boolean).join(' | '));
  const anonymousHaystack = normalizeWhitespace([
    candidate.company,
    candidate.location,
    candidate.summary,
    candidate.recruiterTitle,
    meta.title,
  ].filter(Boolean).join(' | '));
  const reasons = [];
  if (/猎头|代招|代招公司|代理招聘|委托招聘/.test(agencyHaystack)) {
    reasons.push('headhunter_or_agency_recruiter');
  }
  if (/^某/.test(normalizeWhitespace(candidate.company || '')) || /某(?:大型|知名|中型|小型|头部|互联网|人工智能|电子商务|金融|上市)?[^，。|\n]{0,24}公司/.test(anonymousHaystack)) {
    reasons.push('anonymous_headhunter_company');
  }
  return Array.from(new Set(reasons));
}

function isChatNavigationSuccess(expectedUrl = '', actualUrl = '') {
  const expectedId = extractJobDetailId(expectedUrl);
  if (!expectedId) {
    return false;
  }
  const url = String(actualUrl || '');
  return url.includes('/web/geek/chat') && url.includes(`jobId=${expectedId}`);
}

function extractCompanyProfileText(bodyText = '') {
  const lines = String(bodyText || '')
    .split(/\n+/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);
  const start = lines.findIndex((line) => line.includes('公司介绍'));
  if (start < 0) {
    return '';
  }
  const stopMarkers = ['工商信息', '工作地址', '更多职位', '看过该职位的人还看了', '精选职位', 'BOSS 安全提示'];
  const section = [];
  for (const line of lines.slice(start + 1)) {
    if (stopMarkers.some((marker) => line.includes(marker))) {
      break;
    }
    section.push(line);
  }
  return section.join(' ').slice(0, 1200);
}

function buildCandidateFromMeta(meta = {}, fallbackUrl = '') {
  const companyTags = Array.isArray(meta.companyTags) ? meta.companyTags : [];
  const infoTags = Array.isArray(meta.infoTags) ? meta.infoTags : [];
  const bodyText = meta.body || '';
  const detailFields = deriveJobDetailFields(infoTags, bodyText);
  const companyFields = deriveCompanyFields(companyTags, bodyText);
  const companyProfileText = extractCompanyProfileText(bodyText);
  const candidate = {
    jobId: meta.url || fallbackUrl,
    id: meta.url || fallbackUrl,
    url: meta.url || fallbackUrl,
    title: meta.jobName || '',
    company: meta.company || '',
    salary: meta.salaryText || '',
    salaryText: meta.salaryText || '',
    location: detailFields.location,
    experienceText: detailFields.experienceText,
    degreeText: detailFields.degreeText,
    companySize: companyFields.companySize,
    stage: companyFields.stage,
    summary: companyProfileText,
    applyState: String(meta.actionText || meta.body || '').includes('继续沟通') ? 'already_continuing' : '',
  };
  candidate.identityKey = makeApplicationIdentity(candidate);
  return candidate;
}

function upsertSkippedApplication(store, candidate, reasons, applyResult = {}) {
  store.upsertJob({
    id: candidate.jobId,
    url: candidate.url,
    title: candidate.title,
    company: candidate.company,
    salaryText: candidate.salaryText,
    location: candidate.location,
    experienceText: candidate.experienceText,
    degreeText: candidate.degreeText,
    companySize: candidate.companySize,
    stage: candidate.stage,
    summary: candidate.summary || '',
    identityKey: candidate.identityKey,
    collectedAt: nowIso(),
  });
  store.upsertApplication({
    jobId: candidate.jobId,
    url: candidate.url,
    title: candidate.title,
    company: candidate.company,
    salary: candidate.salaryText,
    salaryText: candidate.salaryText,
    location: candidate.location,
    companySize: candidate.companySize,
    summary: candidate.summary || '',
    status: 'skipped',
    reasons,
    applyResult,
    source: 'cdp_apply_job',
    identityKey: candidate.identityKey,
    reviewedAt: nowIso(),
  });
}

async function pickReusableTarget(cdpEndpoint, targetUrl, { allowNewTab = false } = {}) {
  const pages = await getJson(new URL('/json/list', cdpEndpoint).toString());
  const preferred = pages.find((entry) => String(entry.url || '').includes('/job_detail/'));
  if (preferred) {
    return preferred;
  }
  const jobsPage = pages.find((entry) => String(entry.url || '').includes('/web/geek/jobs'));
  if (jobsPage) {
    return jobsPage;
  }
  const chatPage = pages.find((entry) => String(entry.url || '').includes('/web/geek/chat'));
  if (chatPage) {
    return chatPage;
  }
  if (!allowNewTab) {
    throw new Error('No existing reusable BOSS page found. Existing-page-only mode refuses new tabs.');
  }
  return ensureJobTab(cdpEndpoint, targetUrl);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url) {
    throw new Error('--url is required');
  }
  const cdpEndpoint = args['cdp-endpoint'] || DEFAULT_CDP_ENDPOINT;
  const dryRun = parseBoolean(args['dry-run'], true);
  const focus = parseBoolean(args.focus, false);
  const clickMode = normalizeClickMode(args['click-mode']);
  const allowNewTab = parseBoolean(args['allow-new-tab'], false);
  const { config } = loadConfig(args.config);
  const store = new ZhipinStore();
  const triage = readChatTriage();
  const target = await pickReusableTarget(cdpEndpoint, args.url, { allowNewTab });
  const session = await createCdpSession(target.webSocketDebuggerUrl);
  try {
    await session.send('Page.enable');
    if (focus) {
      await session.send('Page.bringToFront');
    }
    await session.send('Page.navigate', { url: args.url });
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const before = await extractMeta(session) || {};
    const beforeCandidate = buildCandidateFromMeta(before, args.url);
    const targetCheck = validateTargetUrl(args.url, before.url || '');
    const headhunterReasons = getHeadhunterBlockReasons(beforeCandidate, before);
    const gate = targetCheck.ok
      ? checkPreApplyCandidate({
        store,
        config,
        application: beforeCandidate,
        triage,
      })
      : {
        allow: false,
        reasons: [targetCheck.reason],
        candidate: beforeCandidate,
        existingApplication: null,
        blockedEntry: null,
      };
    if (headhunterReasons.length) {
      gate.allow = false;
      gate.reasons = Array.from(new Set([...(gate.reasons || []), ...headhunterReasons]));
    }
    if (dryRun) {
      console.log(JSON.stringify({
        timestamp: nowIso(),
        dryRun: true,
        ok: Boolean(before.jobName) && gate.allow,
        targetCheck,
        gate,
        result: before,
      }, null, 2));
      return;
    }
    if (!gate.allow) {
      upsertSkippedApplication(store, beforeCandidate, gate.reasons, { before, gate });
      store.save({ operation: 'cdp_apply_job', phase: 'pre_apply_blocked', url: beforeCandidate.url });
      console.log(JSON.stringify({
        timestamp: nowIso(),
        dryRun: false,
        success: false,
        skipped: true,
        reason: gate.reasons[0] || 'pre_apply_blocked',
        targetCheck,
        gate,
        before,
      }, null, 2));
      return;
    }
    const clickResult = await clickApply(session, { clickMode });
    await new Promise((resolve) => setTimeout(resolve, 1800));
    const reminderResult = await clickPostApplyReminder(session, { clickMode });
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const after = await extractMeta(session);
    const success = String(after.actionText || after.body || '').includes('继续沟通')
      || String(after.body || '').includes('已向BOSS发送消息')
      || isChatNavigationSuccess(args.url, after.url || '');
    const finalCandidate = buildCandidateFromMeta({
      ...before,
      ...after,
      url: before.url || args.url,
      company: after.company || before.company,
      jobName: after.jobName || before.jobName,
      salaryText: after.salaryText || before.salaryText,
      infoTags: after.infoTags?.length ? after.infoTags : before.infoTags,
      companyTags: after.companyTags?.length ? after.companyTags : before.companyTags,
    }, args.url);
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
      reasons: success ? [] : [clickResult.reason || 'apply_not_verified'],
      applyResult: { clickResult, reminderResult, before, after, gate },
      source: 'cdp_apply_job',
      identityKey: finalCandidate.identityKey,
    });
    store.save({ operation: 'cdp_apply_job', phase: success ? 'finish' : 'failed', url: after.url || args.url });
    console.log(JSON.stringify({
      timestamp: nowIso(),
      dryRun: false,
      success,
      clickResult,
      reminderResult,
      before,
      after,
    }, null, 2));
  } finally {
    session.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
}

module.exports = {
  buildCandidateFromMeta,
  createCdpSession,
  extractCompanyProfileText,
  extractMeta,
  extractJobDetailId,
  getHeadhunterBlockReasons,
  isChatNavigationSuccess,
  main,
  normalizeClickMode,
  pickReusableTarget,
  validateTargetUrl,
};
