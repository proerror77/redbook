#!/usr/bin/env node
/*
 * Verify X engagement replies without publishing anything.
 *
 * This is intentionally separate from the publisher so delayed X indexing does
 * not turn a submitted reply into a retry loop. It checks with_replies first,
 * then the source conversation, and writes a verified/pending audit log.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import {
  CDPTargetClient,
  listPageTargets,
} from '../../browser-core/interactive/chrome-cdp.mjs';

const DEFAULT_ENDPOINT = process.env.AUTO_X_AGENT_BROWSER_CDP_ENDPOINT
  || (process.env.AUTO_X_AGENT_BROWSER_CDP_PORT
    ? `http://127.0.0.1:${process.env.AUTO_X_AGENT_BROWSER_CDP_PORT}`
    : 'http://127.0.0.1:9224');

const PROJECT_ROOT = resolve(new URL('../../../', import.meta.url).pathname);
const TODAY = new Date().toISOString().slice(0, 10);

function parseArgs(argv) {
  const args = {
    endpoint: DEFAULT_ENDPOINT,
    targetsFile: '',
    recordsFile: '',
    out: resolve(PROJECT_ROOT, `05-选题研究/X-互动回复验证-${TODAY}.jsonl`),
    summary: resolve(PROJECT_ROOT, `05-选题研究/X-互动回复验证-${TODAY}.md`),
    limit: 0,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--endpoint') args.endpoint = argv[++i];
    else if (arg === '--targets') args.targetsFile = argv[++i];
    else if (arg === '--records') args.recordsFile = argv[++i];
    else if (arg === '--out') args.out = resolve(argv[++i]);
    else if (arg === '--summary') args.summary = resolve(argv[++i]);
    else if (arg === '--limit') args.limit = Number(argv[++i]);
    else if (arg === '--help') {
      console.log('Usage: verify_engagement_replies.mjs [--endpoint URL] (--targets JSON | --records JSONL) [--out JSONL] [--summary MD] [--limit N]');
      process.exit(0);
    }
  }
  return args;
}

function normalizeEndpoint(endpoint) {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint.replace(/\/+$/, '');
  }
  return `http://${endpoint.replace(/\/+$/, '')}`;
}

function normalizeStatusUrl(url) {
  const match = String(url || '').match(/^https:\/\/(?:x|twitter)\.com\/([^/?#]+)\/status\/(\d+)/);
  return match ? `https://x.com/${match[1]}/status/${match[2]}` : '';
}

function readJsonl(filePath) {
  return readFileSync(filePath, 'utf8')
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function loadTargets(args) {
  let rows = [];
  if (args.targetsFile) {
    rows = JSON.parse(readFileSync(args.targetsFile, 'utf8')).map((item, index) => ({
      index: index + 1,
      handle: item.handle,
      source_url: item.url || item.source_url,
      reply: item.reply,
      language: item.language || '',
    }));
  } else if (args.recordsFile) {
    rows = readJsonl(args.recordsFile).map((item) => ({
      index: item.index,
      handle: item.handle,
      source_url: item.source_url || item.url,
      reply: item.reply,
      language: item.language || '',
      existing_status: item.status || '',
      existing_verify_url: item.verify_url || '',
    }));
  } else {
    throw new Error('Pass --targets JSON or --records JSONL');
  }

  const byKey = new Map();
  for (const row of rows) {
    if (!row.source_url || !row.reply) continue;
    const key = `${row.source_url}\n${row.reply}`;
    if (!byKey.has(key)) byKey.set(key, row);
  }
  const deduped = Array.from(byKey.values());
  return args.limit > 0 ? deduped.slice(0, args.limit) : deduped;
}

async function describeTarget(target) {
  const client = new CDPTargetClient(target);
  try {
    await client.connect();
    return {
      target,
      page: await client.describePage({ bodyLimit: 120 }).catch(() => ({})),
    };
  } finally {
    await client.close().catch(() => {});
  }
}

async function selectXTarget(endpoint) {
  const targets = await listPageTargets(endpoint);
  const xTargets = targets.filter((item) => /https:\/\/(x|twitter)\.com\//.test(item.url || ''));
  if (!xTargets.length) throw new Error('No existing X tab found for verification');

  const described = [];
  for (const target of xTargets) {
    described.push(await describeTarget(target));
  }
  described.sort((a, b) => {
    const aHome = /\/home$/.test(a.page?.url || a.target.url || '') ? 0 : 1;
    const bHome = /\/home$/.test(b.page?.url || b.target.url || '') ? 0 : 1;
    if (aHome !== bHome) return aHome - bHome;
    const aVisible = a.page?.visibilityState === 'visible' ? 0 : 1;
    const bVisible = b.page?.visibilityState === 'visible' ? 0 : 1;
    return aVisible - bVisible;
  });
  return described[0].target;
}

async function findReplyOnCurrentPage(client, reply) {
  const needle = reply.slice(0, Math.min(48, reply.length)).replaceAll('\\', '\\\\').replaceAll("'", "\\'");
  return client.evaluate(`(() => {
    const needle = '${needle}';
    const normalize = (href) => {
      const match = String(href || '').match(/^https:\\/\\/(?:x|twitter)\\.com\\/([^/?#]+)\\/status\\/(\\d+)/);
      return match ? 'https://x.com/' + match[1] + '/status/' + match[2] : '';
    };
    const bodyText = document.body ? document.body.innerText : '';
    const articles = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
    const matched = articles.find((article) => article.innerText && article.innerText.includes(needle));
    if (!matched && !bodyText.includes(needle)) {
      return { exists: false, url: '', text: '', confidence: 'none' };
    }
    const root = matched || document;
    const links = Array.from(root.querySelectorAll('a[href*="/status/"]'))
      .map((a) => normalize(a.href))
      .filter(Boolean);
    const own = links.find((href) => href.includes('/0xcybersmile/status/')) || '';
    return {
      exists: true,
      url: own,
      text: (matched ? matched.innerText : bodyText).replace(/\\s+/g, ' ').trim().slice(0, 360),
      confidence: own ? 'own_status_url' : (matched ? 'article_text_match' : 'body_text_match')
    };
  })()`);
}

async function verifyReply(client, target) {
  await client.navigate('https://x.com/0xcybersmile/with_replies', {
    waitForReadyState: 'interactive',
    timeoutMs: 20000,
  }).catch(() => {});
  await delay(2500);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const match = await findReplyOnCurrentPage(client, target.reply).catch(() => null);
    if (match?.exists && match.url) {
      return { ...match, url: normalizeStatusUrl(match.url), method: 'with_replies' };
    }
    await client.evaluate('window.scrollBy(0, Math.round(window.innerHeight * 0.85))').catch(() => {});
    await delay(900);
  }

  await client.navigate(target.source_url, {
    waitForReadyState: 'interactive',
    timeoutMs: 20000,
  }).catch(() => {});
  await delay(2500);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const match = await findReplyOnCurrentPage(client, target.reply).catch(() => null);
    if (match?.exists && match.url) {
      return { ...match, url: normalizeStatusUrl(match.url), method: 'source_conversation' };
    }
    if (match?.exists) {
      return { ...match, method: 'source_conversation' };
    }
    await client.evaluate('window.scrollBy(0, Math.round(window.innerHeight * 0.9))').catch(() => {});
    await delay(900);
  }

  const searchNeedle = target.reply.slice(0, Math.min(32, target.reply.length));
  const searchUrl = `https://x.com/search?q=${encodeURIComponent(`from:0xcybersmile "${searchNeedle}"`)}&src=typed_query&f=live`;
  await client.navigate(searchUrl, {
    waitForReadyState: 'interactive',
    timeoutMs: 20000,
  }).catch(() => {});
  await delay(2500);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const match = await findReplyOnCurrentPage(client, target.reply).catch(() => null);
    if (match?.exists && match.url) {
      return { ...match, url: normalizeStatusUrl(match.url), method: 'live_search' };
    }
    await client.evaluate('window.scrollBy(0, Math.round(window.innerHeight * 0.9))').catch(() => {});
    await delay(900);
  }

  return { exists: false, url: '', text: '', confidence: 'none', method: 'not_found' };
}

function writeJsonl(outPath, records) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${records.map((item) => JSON.stringify(item)).join('\n')}\n`, 'utf8');
}

function writeSummary(summaryPath, records) {
  const verified = records.filter((item) => item.status === 'verified').length;
  const pending = records.filter((item) => item.status === 'pending_verification').length;
  const lines = [
    `# X 互动回复验证 ${TODAY}`,
    '',
    `> verified=${verified} pending=${pending}`,
    '',
    '| # | 状态 | 对象 | 来源帖 | 回复验证 | 方法 | 回复摘要 |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  records.forEach((record, index) => {
    const reply = String(record.reply || '').replace(/\|/g, '/').replace(/\s+/g, ' ').slice(0, 80);
    const verify = record.verify_url ? `[reply](${record.verify_url})` : '';
    lines.push(`| ${index + 1} | ${record.status} | @${record.handle} | [source](${record.source_url}) | ${verify} | ${record.verify_method || ''} | ${reply} |`);
  });
  lines.push('');
  writeFileSync(summaryPath, `${lines.join('\n')}\n`, 'utf8');
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const endpoint = normalizeEndpoint(args.endpoint);
  const targets = loadTargets(args);
  const target = await selectXTarget(endpoint);
  const client = new CDPTargetClient(target);
  await client.connect();
  await client.send('Runtime.enable', {}, 3000).catch(() => {});
  await client.send('Page.enable', {}, 3000).catch(() => {});

  const records = [];
  try {
    for (const [index, item] of targets.entries()) {
      const verification = await verifyReply(client, item);
      const status = verification.exists && verification.url ? 'verified' : 'pending_verification';
      const record = {
        index: item.index || index + 1,
        handle: item.handle,
        language: item.language,
        source_url: item.source_url,
        reply: item.reply,
        status,
        verify_url: verification.url || '',
        verify_text: verification.text || '',
        verify_method: verification.method || '',
        verify_confidence: verification.confidence || '',
        at: new Date().toISOString(),
      };
      records.push(record);
      writeJsonl(args.out, records);
      writeSummary(args.summary, records);
      console.log(`[${index + 1}/${targets.length}] ${status} @${item.handle}: ${record.verify_url || record.verify_confidence || 'not found'}`);
    }
  } finally {
    await client.close().catch(() => {});
  }

  const verified = records.filter((item) => item.status === 'verified').length;
  const pending = records.filter((item) => item.status === 'pending_verification').length;
  console.log(`Done. verified=${verified} pending=${pending} out=${args.out} summary=${args.summary}`);
  if (pending) process.exitCode = 2;
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
