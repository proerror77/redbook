#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

import {
  CDPTargetClient,
  closePageTarget,
  createPageTarget,
  waitForTargetById,
} from './chrome-cdp.mjs';

const DEFAULT_ENDPOINT = 'http://127.0.0.1:9222';
const DEFAULT_LOGIN_URL = 'https://www.zhipin.com/web/user/';
const DEFAULT_TIMEOUT_SECONDS = 300;
const DEFAULT_INTERVAL_MS = 1000;
const SESSION_EXPORT_PATH = '/Users/proerror/Documents/redbook/.omx/state/browser-core/boss-session-latest.json';
const LOGIN_SUCCESS_URL_MARKERS = [
  'https://www.zhipin.com/wapi/zppassport/qrcode/loginConfirm',
  'https://www.zhipin.com/wapi/zppassport/qrcode/dispatcher',
  'https://www.zhipin.com/wapi/zppassport/login/phoneV2',
];

function printHelp() {
  console.log(`Usage: node tools/browser-core/interactive/boss-login-helper.mjs [options]

Options:
  --endpoint, --cdp-endpoint <url>  Chrome CDP endpoint (default: http://127.0.0.1:9222)
  --url <url>                       Login entry URL (default: https://www.zhipin.com/web/user/)
  --timeout-seconds <n>             Max wait for login success (default: 300)
  --interval-ms <n>                 Poll interval in ms (default: 1000)
  --export-path <path>              Session export file path
  --keep-open                       Keep the temporary tab open after the helper exits
  --help                            Show this help

The helper is headless-first for the business chain, but the login escalation itself
assumes a real visible Chrome session is already running on the target CDP endpoint.
`);
}

function parseArgs(argv) {
  const args = {
    endpoint: DEFAULT_ENDPOINT,
    url: DEFAULT_LOGIN_URL,
    timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
    intervalMs: DEFAULT_INTERVAL_MS,
    exportPath: SESSION_EXPORT_PATH,
    keepOpen: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    switch (token) {
      case '--endpoint':
      case '--cdp-endpoint':
        args.endpoint = argv[index + 1] || args.endpoint;
        index += 1;
        break;
      case '--url':
        args.url = argv[index + 1] || args.url;
        index += 1;
        break;
      case '--timeout-seconds':
        args.timeoutSeconds = Number(argv[index + 1] || args.timeoutSeconds);
        index += 1;
        break;
      case '--interval-ms':
        args.intervalMs = Number(argv[index + 1] || args.intervalMs);
        index += 1;
        break;
      case '--export-path':
        args.exportPath = argv[index + 1] || args.exportPath;
        index += 1;
        break;
      case '--keep-open':
        args.keepOpen = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      default:
        break;
    }
  }

  return args;
}

const PAGE_STATE_SCRIPT = `(() => {
  const body = document.body ? document.body.innerText.replace(/\\s+/g, ' ').trim() : '';
  return {
    href: location.href,
    title: document.title || '',
    readyState: document.readyState || '',
    bodyPreview: body.slice(0, 300),
    loginExpired: body.includes('当前登录状态已失效') || body.includes('登录/注册'),
  };
})()`;

const STORAGE_EXPORT_SCRIPT = `(() => {
  const local = {};
  const session = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key) local[key] = localStorage.getItem(key);
  }
  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i);
    if (key) session[key] = sessionStorage.getItem(key);
  }
  return { localStorage: local, sessionStorage: session };
})()`;

function looksLoggedIn(pageState) {
  const href = String(pageState?.href || '');
  const title = String(pageState?.title || '');
  const body = String(pageState?.bodyPreview || '');
  if (pageState?.loginExpired) {
    return false;
  }
  if (href.includes('/web/user/')) {
    return false;
  }
  if (body.includes('登录/注册')) {
    return false;
  }
  return Boolean(href.startsWith('https://www.zhipin.com/') && title.includes('BOSS直聘'));
}

async function exportSession({ client, exportPath, pageState, loginSignals }) {
  const cookies = await client.getCookies([
    'https://www.zhipin.com/',
    'https://www.zhipin.com/web/user/',
    'https://www.zhipin.com/web/geek/chat?ka=header-message',
  ]);
  const storage = await client.evaluate(STORAGE_EXPORT_SCRIPT);
  const payload = {
    capturedAt: new Date().toISOString(),
    pageState,
    loginSignals,
    cookieCount: cookies.length,
    cookies,
    storage,
  };
  await fs.mkdir(path.dirname(exportPath), { recursive: true });
  await fs.writeFile(exportPath, JSON.stringify(payload, null, 2));
  return payload;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const created = await createPageTarget(args.endpoint, 'about:blank');
  const targetId = created.id;
  const target = await waitForTargetById(args.endpoint, targetId);
  const client = new CDPTargetClient(target);
  const loginSignals = [];

  try {
    await client.connect();
    await client.enableNetwork();

    const disposeResponseListener = client.on('Network.responseReceived', (params) => {
      const responseUrl = String(params?.response?.url || '');
      if (LOGIN_SUCCESS_URL_MARKERS.some((prefix) => responseUrl.startsWith(prefix))) {
        loginSignals.push({
          observedAt: new Date().toISOString(),
          url: responseUrl,
          status: params?.response?.status ?? null,
        });
      }
    });

    const navigation = await client.navigate(args.url, {
      waitForReadyState: 'complete',
      timeoutMs: 20000,
    });

    const startedAt = Date.now();
    const events = [];
    let resolved = false;

    while (Date.now() - startedAt < Math.max(1, args.timeoutSeconds) * 1000) {
      const pageState = await client.evaluate(PAGE_STATE_SCRIPT);
      const last = events[events.length - 1];
      const key = `${pageState?.href || ''}|${pageState?.title || ''}|${pageState?.readyState || ''}|${pageState?.loginExpired}`;
      const lastKey = last ? `${last.href}|${last.title}|${last.readyState}|${last.loginExpired}` : '';
      if (key !== lastKey) {
        events.push({
          observedAtMs: Date.now() - startedAt,
          ...pageState,
        });
      }

      if (looksLoggedIn(pageState) || loginSignals.length > 0) {
        const exported = await exportSession({
          client,
          exportPath: args.exportPath,
          pageState,
          loginSignals,
        });
        console.log(JSON.stringify({
          targetId,
          requestedUrl: args.url,
          navigation,
          status: 'logged_in',
          exportPath: args.exportPath,
          observedForMs: Date.now() - startedAt,
          events,
          loginSignals,
          pageState,
          cookieCount: exported.cookieCount,
        }, null, 2));
        resolved = true;
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, Math.max(200, args.intervalMs)));
    }

    if (!resolved) {
      const pageState = await client.evaluate(PAGE_STATE_SCRIPT);
      console.log(JSON.stringify({
        targetId,
        requestedUrl: args.url,
        navigation,
        status: 'timeout',
        exportPath: null,
        observedForMs: Date.now() - startedAt,
        events,
        loginSignals,
        pageState,
      }, null, 2));
    }

    disposeResponseListener();
  } finally {
    await client.close().catch(() => {});
    if (!args.keepOpen) {
      await closePageTarget(args.endpoint, targetId).catch(() => {});
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
