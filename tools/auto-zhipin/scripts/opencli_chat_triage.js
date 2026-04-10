#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  deriveMatchHints,
  isBigCompanyText,
  isExplicitRejectionText,
  isOffsiteEmailText,
} = require('../lib/chat_triage');
const { OPENCLI_CHAT_TRIAGE_OVERRIDES_PATH, OPENCLI_CHAT_TRIAGE_PATH } = require('../lib/paths');
const { normalizeWhitespace, parseArgs } = require('../lib/utils');

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const OPENCLI_BIN = path.join(ROOT_DIR, 'tools', 'opencli', 'bin', 'redbook-opencli.js');

function runJson(args, timeout = 180000) {
  const raw = execFileSync('node', [OPENCLI_BIN, ...args], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout,
  });
  return JSON.parse(raw);
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
  const category = isExplicitRejectionText(preview)
    ? 'explicit_rejection'
    : isOffsiteEmailText(preview)
      ? 'offsite_email'
      : isBigCompanyText(`${title} ${preview}`)
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
    matchHints: deriveMatchHints(title, preview),
  };
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

function matchesBlocked(blockedEntries, candidate) {
  const haystack = normalizeWhitespace(`${candidate.title || ''} ${(candidate.matchHints || []).join(' ')}`).toLowerCase();
  return blockedEntries.some((entry) => {
    const hints = [...(entry.matchHints || []), entry.company || '', entry.title || '']
      .map((item) => normalizeWhitespace(item).toLowerCase())
      .filter(Boolean);
    return hints.some((hint) => haystack.includes(hint));
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = Math.max(1, Number(args.limit || 30));
  const output = args.output || OPENCLI_CHAT_TRIAGE_PATH;
  const rows = runJson(['boss', 'chatlist', '--limit', String(limit), '-f', 'json']);
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
    source: 'opencli_chat_list',
    limit,
    blockedEntries,
    followupCandidates,
  };
  fs.writeFileSync(output, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({
    output,
    blockedEntries: blockedEntries.length,
    followupCandidates: followupCandidates.length,
  }, null, 2));
}

main();
