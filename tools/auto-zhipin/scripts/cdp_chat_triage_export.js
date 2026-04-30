#!/usr/bin/env node

const fs = require('node:fs');
const { chromium } = require('playwright');

const {
  deriveMatchHints,
  isBigCompanyText,
  isExplicitRejectionText,
  isOffsiteEmailText,
} = require('../lib/chat_triage');
const { OPENCLI_CHAT_TRIAGE_OVERRIDES_PATH, OPENCLI_CHAT_TRIAGE_PATH } = require('../lib/paths');
const {
  extractConversations,
  extractMessages,
  openConversation,
  waitForChatReady,
} = require('../lib/zhipin');
const { normalizeWhitespace, parseArgs } = require('../lib/utils');

const DEFAULT_CDP_ENDPOINT = 'http://127.0.0.1:9224';
const CHAT_URL_KEYWORD = '/web/geek/chat';
const DEFAULT_CHAT_URL = 'https://www.zhipin.com/web/geek/chat';

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    require('node:http').get(url, (response) => {
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

function parseBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
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

function putJson(url) {
  return new Promise((resolve, reject) => {
    const request = require('node:http').request(url, { method: 'PUT' }, (response) => {
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

async function ensureChatPage(cdpEndpoint) {
  const pages = await getJson(new URL('/json/list', cdpEndpoint).toString());
  if (Array.isArray(pages) && pages.some((page) => String(page.url || '').includes(CHAT_URL_KEYWORD))) {
    return false;
  }
  await putJson(new URL(`/json/new?${DEFAULT_CHAT_URL}`, cdpEndpoint).toString());
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return true;
}

function parseTimeText(timeText, now = new Date()) {
  const text = String(timeText || '').trim();
  if (!text) {
    return null;
  }
  if (/^\d{2}:\d{2}$/.test(text)) {
    const value = new Date(now);
    const [hour, minute] = text.split(':').map(Number);
    value.setHours(hour, minute, 0, 0);
    return value.toISOString();
  }
  if (text === '昨天') {
    return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  }
  const match = text.match(/^(\d{2})月(\d{2})日$/);
  if (!match) {
    return null;
  }
  return new Date(Number(now.getFullYear()), Number(match[1]) - 1, Number(match[2]), 12, 0, 0, 0).toISOString();
}

function buildEntry(row) {
  const preview = normalizeWhitespace(row.preview || '');
  const title = normalizeWhitespace(row.title || '');
  const messageText = normalizeWhitespace(
    (Array.isArray(row.messages) ? row.messages : [])
      .map((message) => message.text || '')
      .join(' ')
  );
  const evidenceText = normalizeWhitespace([title, preview, messageText].filter(Boolean).join(' '));
  const category = isExplicitRejectionText(evidenceText)
    ? 'explicit_rejection'
    : isOffsiteEmailText(evidenceText)
      ? 'offsite_email'
      : isBigCompanyText(evidenceText)
        ? 'big_company_ignore'
        : 'neutral';

  return {
    conversationId: row.id || '',
    title,
    preview,
    timeText: row.timeText || '',
    observedAt: parseTimeText(row.timeText || ''),
    unreadCount: Number(row.unreadCount || 0),
    category,
    matchHints: deriveMatchHints(title, `${preview} ${messageText}`),
    messages: (Array.isArray(row.messages) ? row.messages : []).map((message) => ({
      text: normalizeWhitespace(message.text || ''),
      timeText: message.timeText || '',
      direction: message.direction || '',
    })).filter((message) => message.text).slice(-8),
  };
}

function uniqEntries(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = [
      entry.company || '',
      entry.title || '',
      entry.category || '',
      (entry.matchHints || []).join('|'),
    ].join('::');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function isStaleCandidate(entry) {
  if (entry.category !== 'neutral') {
    return false;
  }
  if (!entry.observedAt) {
    return false;
  }
  return !/^\d{2}:\d{2}$/.test(entry.timeText || '');
}

function matchesBlocked(blockedEntries, candidate) {
  const haystack = normalizeWhitespace(`${candidate.title || ''} ${(candidate.matchHints || []).join(' ')}`).toLowerCase();
  return blockedEntries.some((entry) => {
    const hints = [...(entry.matchHints || []), entry.company || '', entry.title || '']
      .map((item) => normalizeWhitespace(item).toLowerCase())
      .filter(Boolean);
    return hints.some((hint) => haystack.includes(hint));
  });
}

function conversationKey(conversation) {
  return [
    normalizeWhitespace(conversation.id || ''),
    normalizeWhitespace(conversation.title || ''),
    normalizeWhitespace(conversation.preview || ''),
  ].join('::');
}

async function scrollConversationList(page) {
  return page.evaluate(() => {
    const selectors = [
      '.user-list-content',
      '.user-list',
      '[class*=user-list-content]',
      '[class*=user-list]',
    ];
    const candidates = selectors
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .filter((node) => {
        const style = window.getComputedStyle(node);
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && node.scrollHeight > node.clientHeight;
      });
    const target = candidates[0] || document.scrollingElement || document.documentElement;
    const before = target.scrollTop;
    target.scrollTop = Math.min(target.scrollHeight, before + Math.max(300, target.clientHeight || 600));
    return {
      moved: target.scrollTop !== before,
      before,
      after: target.scrollTop,
      scrollHeight: target.scrollHeight,
    };
  });
}

async function readMessagesForRow(page, row) {
  const opened = await openConversation(page, row).catch(() => false);
  await page.waitForTimeout(opened ? 600 : 200).catch(() => {});
  const messages = opened
    ? await extractMessages(page, row.id || 'active-thread').catch(() => [])
    : [];
  return {
    ...row,
    opened,
    messages: messages.slice(-12),
  };
}

async function collectConversationsWithScroll(page, limit, options = {}) {
  const seen = new Set();
  const rows = [];
  let stagnant = 0;
  for (let pass = 0; pass < 12 && rows.length < limit && stagnant < 3; pass += 1) {
    const conversations = await extractConversations(page);
    let added = 0;
    for (const conversation of conversations) {
      const key = conversationKey(conversation);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      rows.push(options.withMessages ? await readMessagesForRow(page, conversation) : conversation);
      added += 1;
      if (rows.length >= limit) {
        break;
      }
    }
    stagnant = added ? 0 : stagnant + 1;
    const scrollResult = await scrollConversationList(page).catch(() => ({ moved: false }));
    if (!scrollResult.moved) {
      stagnant += 1;
    }
    await page.waitForTimeout(700).catch(() => {});
  }
  return rows.slice(0, limit);
}

async function enrichRowsWithMessages(page, rows, limit) {
  const enriched = [];
  for (const row of rows.slice(0, limit)) {
    enriched.push(await readMessagesForRow(page, row));
  }
  return enriched;
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
  } catch (_error) {
    meta = { title: '', hasFocus: false, visibilityState: '' };
  }
  return {
    index,
    page,
    url,
    title: meta.title || '',
    hasFocus: Boolean(meta.hasFocus),
    visibilityState: meta.visibilityState || '',
  };
}

async function selectChatPage(browser) {
  const pages = browser.contexts().flatMap((context) => context.pages());
  const described = [];
  for (let index = 0; index < pages.length; index += 1) {
    described.push(await describePage(pages[index], index));
  }
  const matches = described
    .filter((entry) => String(entry.url || '').includes(CHAT_URL_KEYWORD))
    .sort((left, right) => {
      const score = (entry) => (entry.hasFocus ? 10 : 0) + (entry.visibilityState === 'visible' ? 5 : 0) + entry.index;
      return score(right) - score(left);
    });
  if (!matches.length) {
    throw new Error(`No BOSS chat page found under ${CHAT_URL_KEYWORD}`);
  }
  return matches[0].page;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cdpEndpoint = args['cdp-endpoint'] || DEFAULT_CDP_ENDPOINT;
  const limit = Math.max(1, Number(args.limit || 50));
  const output = args.output || OPENCLI_CHAT_TRIAGE_PATH;
  const focus = parseBoolean(args.focus, false);
  const openIfMissing = parseBoolean(args['open-if-missing'], false);

  if (openIfMissing) {
    await ensureChatPage(cdpEndpoint);
  }

  const browser = await chromium.connectOverCDP(cdpEndpoint);
  try {
    const page = await selectChatPage(browser);
    if (focus) {
      await page.bringToFront().catch(() => {});
    }
    await waitForChatReady(page, Number(args['timeout-ms'] || 30000));
    const rows = await collectConversationsWithScroll(page, limit, { withMessages: true });
    const entries = rows.map(buildEntry);
    const overrides = readJson(OPENCLI_CHAT_TRIAGE_OVERRIDES_PATH, {
      blockedEntries: [],
      followupCandidates: [],
    });
    const blockedEntries = uniqEntries([
      ...entries.filter((item) =>
        item.category === 'explicit_rejection' ||
        item.category === 'offsite_email' ||
        item.category === 'big_company_ignore'
      ),
      ...((Array.isArray(overrides.blockedEntries) ? overrides.blockedEntries : [])),
    ]);
    const followupCandidates = uniqEntries([
      ...entries.filter(isStaleCandidate),
      ...((Array.isArray(overrides.followupCandidates) ? overrides.followupCandidates : [])),
    ]).filter((item) => !matchesBlocked(blockedEntries, item));
    const result = {
      generatedAt: new Date().toISOString(),
      source: 'cdp_chat_page',
      cdpEndpoint,
      limit,
      blockedEntries,
      followupCandidates,
      conversations: rows.map((item) => ({
        id: item.id || '',
        title: normalizeWhitespace(item.title || ''),
        preview: normalizeWhitespace(item.preview || ''),
        timeText: item.timeText || '',
        unreadCount: Number(item.unreadCount || 0),
        opened: Boolean(item.opened),
        messages: (Array.isArray(item.messages) ? item.messages : []).map((message) => ({
          text: normalizeWhitespace(message.text || ''),
          timeText: message.timeText || '',
          direction: message.direction || '',
        })).filter((message) => message.text).slice(-8),
      })),
    };
    fs.writeFileSync(output, JSON.stringify(result, null, 2));
    console.log(JSON.stringify({
      output,
      source: result.source,
      blockedEntries: blockedEntries.length,
      followupCandidates: followupCandidates.length,
      conversations: rows.length,
    }, null, 2));
  } finally {
    await browser.close().catch(() => {});
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
}

module.exports = {
  buildEntry,
  collectConversationsWithScroll,
  enrichRowsWithMessages,
  ensureChatPage,
  parseTimeText,
};
