#!/usr/bin/env node

import {
  CDPTargetClient,
  closePageTarget,
  createPageTarget,
  waitForTargetById,
} from './chrome-cdp.mjs';

const DEFAULT_ENDPOINT = 'http://127.0.0.1:9222';
const DEFAULT_BOSS_URL = 'https://www.zhipin.com/web/geek/chat?ka=header-message';

function printHelp() {
  console.log(`Usage: node tools/browser-core/interactive/boss-probe.mjs [options]

Options:
  --endpoint, --cdp-endpoint <url>  Chrome CDP endpoint (default: http://127.0.0.1:9222)
  --url <url>                       Target BOSS URL (default: chat page)
  --keep-open                       Keep the temporary tab open after probe
  --help                            Show this help
`);
}

function parseArgs(argv) {
  const args = {
    endpoint: DEFAULT_ENDPOINT,
    url: DEFAULT_BOSS_URL,
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

const BOSS_PROBE_SCRIPT = `(() => {
  function textOf(node) {
    return (node?.innerText || node?.textContent || '').replace(/\\s+/g, ' ').trim();
  }
  function textsOf(selector) {
    return Array.from(document.querySelectorAll(selector))
      .map((node) => textOf(node))
      .filter(Boolean);
  }
  const bodyText = document.body ? document.body.innerText.replace(/\\s+/g, ' ').trim() : '';
  const title = textOf(document.querySelector('.job-name, h1, [class*=job-name], .job-title'));
  const salaryText = textOf(document.querySelector('.salary, .job-salary, [class*=salary]'));
  const company = textOf(document.querySelector('.company-name, .company-info a, [class*=company-name], .job-company'));
  const infoTags = textsOf('.job-info .tag-list li, .job-info .job-tags span, .job-banner .job-primary .info-primary p span, .job-primary .info-primary p span, .job-primary .info-primary span');
  const companyTags = textsOf('.company-info .company-tag-list li, .company-card .company-tag-list li, .company-info span');
  const actionText = textOf(document.querySelector('.job-op .btn-startchat, .job-op .btn-container .btn, .btn-startchat-wrap .btn-startchat, a.btn.btn-startchat, a.op-btn.op-btn-chat'));
  return {
    url: location.href,
    pageTitle: document.title || '',
    title,
    salaryText,
    company,
    infoTags,
    companyTags,
    actionText,
    bodyPreview: bodyText.slice(0, 1200),
    loginExpired: bodyText.includes('当前登录状态已失效') || bodyText.includes('登录/注册'),
    securityCheck: location.href.includes('_security_check=1') || bodyText.includes('BOSS 安全提示'),
    readyState: document.readyState || '',
  };
})()`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const created = await createPageTarget(args.endpoint, 'about:blank');
  const targetId = created.id;
  const target = await waitForTargetById(args.endpoint, targetId);
  const client = new CDPTargetClient(target);

  try {
    await client.connect();
    const navigation = await client.navigate(args.url, {
      waitForReadyState: 'complete',
      timeoutMs: 20000,
    });
    const probe = await client.evaluate(BOSS_PROBE_SCRIPT);
    console.log(JSON.stringify({
      targetId,
      requestedUrl: args.url,
      navigation,
      probe,
    }, null, 2));
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
