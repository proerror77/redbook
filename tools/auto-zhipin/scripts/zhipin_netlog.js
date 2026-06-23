#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const DEFAULT_URL = 'https://www.zhipin.com/shanghai/?ka=header-home';
const DEFAULT_OUT_DIR = path.resolve(__dirname, '../../../tmp/zhipin-reverse/netlog');
const DEFAULT_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      args._.push(arg);
      continue;
    }
    const [rawKey, inlineValue] = arg.slice(2).split(/=(.*)/s, 2);
    if (inlineValue !== undefined) {
      args[rawKey] = inlineValue;
    } else if (argv[index + 1] && !argv[index + 1].startsWith('--')) {
      args[rawKey] = argv[index + 1];
      index += 1;
    } else {
      args[rawKey] = true;
    }
  }
  return args;
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chromeBinary() {
  return process.env.CHROME_BIN || DEFAULT_CHROME;
}

function invertConstants(constants, name) {
  const table = constants?.[name] || {};
  const out = new Map();
  for (const [key, value] of Object.entries(table)) {
    out.set(value, key);
  }
  return out;
}

function walkStrings(value, visit, depth = 0) {
  if (depth > 6 || value == null) return;
  if (typeof value === 'string') {
    visit(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walkStrings(item, visit, depth + 1);
    return;
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value)) walkStrings(item, visit, depth + 1);
  }
}

function hostFromString(value) {
  try {
    if (/^https?:\/\//i.test(value)) return new URL(value).host;
  } catch (_) {
    return '';
  }
  const match = value.match(/\b([a-z0-9-]+(?:\.[a-z0-9-]+)+)\b/i);
  return match && !/^2F/i.test(match[1]) ? match[1] : '';
}

function isBossHost(host) {
  return /(^|\.)zhipin\.com$|(^|\.)bosszhipin\.com$|^apm-fe\.zhipin\.com$/i.test(host);
}

function addCount(map, key, count = 1) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + count);
}

function isProxyHint(value) {
  return /127\.0\.0\.1:7897|socks5:\/\/|^PROXY\s+/i.test(value)
    || /^Proxy-Connection:/i.test(value);
}

function sortedCountObject(map, limit = 80) {
  return Object.fromEntries([...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit));
}

function analyzeNetLog(netlogPath) {
  const raw = fs.readFileSync(netlogPath, 'utf8');
  const netlog = JSON.parse(raw);
  const eventTypes = invertConstants(netlog.constants, 'logEventTypes');
  const hosts = new Map();
  const bossHosts = new Map();
  const bossEventTypes = new Map();
  const urls = new Map();
  const proxyHints = new Set();
  const dnsHints = new Set();
  const redirectHints = [];
  const responseHints = [];

  for (const event of netlog.events || []) {
    const typeName = eventTypes.get(event.type) || String(event.type);
    const params = event.params || {};
    let eventMentionsBoss = false;

    walkStrings(params, (value) => {
      const host = hostFromString(value);
      if (host) {
        addCount(hosts, host);
        if (isBossHost(host)) {
          addCount(bossHosts, host);
          eventMentionsBoss = true;
        }
      }
      if (/^https?:\/\//i.test(value)) addCount(urls, value);
      if (isProxyHint(value)) proxyHints.add(value.slice(0, 240));
      if (/198\.18\.0\./.test(value)) dnsHints.add(value.slice(0, 240));
    });

    if (eventMentionsBoss) addCount(bossEventTypes, typeName);
    if (/REDIRECT/i.test(typeName) && params.location) {
      redirectHints.push({ type: typeName, location: params.location, status_code: params.status_code || null });
    }
    if (/READ_RESPONSE_HEADERS|RESPONSE_HEADERS/i.test(typeName)) {
      const headers = params.headers || params.response_headers || '';
      const headerText = Array.isArray(headers) ? headers.join('\n') : String(headers || '');
      if (/zhipin|boss|HTTP\//i.test(headerText)) {
        responseHints.push({ type: typeName, headers: headerText.slice(0, 1200) });
      }
    }
  }

  return {
    netlog: path.resolve(netlogPath),
    event_count: (netlog.events || []).length,
    boss_hosts: sortedCountObject(bossHosts),
    all_hosts_top: sortedCountObject(hosts),
    boss_event_types: sortedCountObject(bossEventTypes),
    boss_urls: Object.keys(sortedCountObject(new Map([...urls].filter(([url]) => isBossHost(hostFromString(url)))), 120)),
    redirect_hints: redirectHints.slice(0, 40),
    response_hints: responseHints.slice(0, 20),
    proxy_hints: [...proxyHints].slice(0, 40),
    fake_ip_dns_hints: [...dnsHints].slice(0, 40),
  };
}

async function capture(args) {
  const url = String(args.url || DEFAULT_URL);
  const durationMs = Number(args.ms || args.duration || 20000);
  const outDir = path.resolve(String(args.out || DEFAULT_OUT_DIR));
  const profile = path.resolve(String(args.profile || path.join(os.tmpdir(), `zhipin-netlog-profile-${process.pid}`)));
  ensureDir(outDir);
  ensureDir(profile);
  const netlogPath = path.join(outDir, `zhipin-${nowStamp()}.netlog.json`);
  const chrome = chromeBinary();
  if (!fs.existsSync(chrome)) throw new Error(`Chrome binary not found: ${chrome}`);

  const chromeArgs = [
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    `--log-net-log=${netlogPath}`,
    '--net-log-capture-mode=Everything',
  ];
  if (args['remote-debugging-port']) {
    chromeArgs.push(`--remote-debugging-port=${args['remote-debugging-port']}`);
  }
  chromeArgs.push(url);

  const child = spawn(chrome, chromeArgs, { stdio: 'ignore' });
  await sleep(durationMs);
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    sleep(3000).then(() => child.kill('SIGKILL')),
  ]);

  if (!fs.existsSync(netlogPath)) throw new Error(`NetLog was not written: ${netlogPath}`);
  const summary = analyzeNetLog(netlogPath);
  const summaryPath = netlogPath.replace(/\.netlog\.json$/, '.summary.json');
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  return { netlogPath, summaryPath, summary };
}

function selfTest() {
  const tmp = path.join(os.tmpdir(), `zhipin-netlog-selftest-${process.pid}.json`);
  fs.writeFileSync(tmp, JSON.stringify({
    constants: { logEventTypes: { URL_REQUEST_START_JOB: 1, HTTP_TRANSACTION_READ_RESPONSE_HEADERS: 2 } },
    events: [
      { type: 1, params: { url: 'https://www.zhipin.com/shanghai/?ka=header-home' } },
      { type: 2, params: { headers: 'HTTP/2 200\nserver-info: boss-alb\n' } },
      { type: 1, params: { proxy: '127.0.0.1:7897', address: '198.18.0.90' } },
    ],
  }));
  const summary = analyzeNetLog(tmp);
  fs.unlinkSync(tmp);
  if (summary.boss_hosts['www.zhipin.com'] !== 1) throw new Error('self-test host extraction failed');
  if (!summary.proxy_hints.length) throw new Error('self-test proxy extraction failed');
  console.log('self-test ok');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || 'capture';
  if (args['self-test'] || command === 'self-test') {
    selfTest();
    return;
  }
  if (command === 'analyze') {
    const input = args.file || args._[1];
    if (!input) throw new Error('Usage: zhipin_netlog.js analyze --file <netlog.json>');
    console.log(JSON.stringify(analyzeNetLog(input), null, 2));
    return;
  }
  if (command !== 'capture') throw new Error(`Unknown command: ${command}`);
  const result = await capture(args);
  console.log(JSON.stringify({
    netlog: result.netlogPath,
    summary: result.summaryPath,
    boss_hosts: result.summary.boss_hosts,
    proxy_hints: result.summary.proxy_hints,
    fake_ip_dns_hints: result.summary.fake_ip_dns_hints,
  }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
}

module.exports = {
  analyzeNetLog,
  parseArgs,
};
