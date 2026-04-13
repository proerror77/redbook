#!/usr/bin/env node

import { describePageTargets, navigateTargetById } from './chrome-cdp.mjs';

function printHelp() {
  console.log(`Usage: node tools/browser-core/interactive/navigate.mjs --url <target-url> [options]

Options:
  --endpoint, --cdp-endpoint <url>  Chrome CDP endpoint (default: http://127.0.0.1:9222)
  --pick-target-id <id>             Explicit target id to reuse
  --pick-about-blank                Reuse the first about:blank page target
  --url-keyword <text>              Prefer a page whose URL contains this text
  --title-keyword <text>            Prefer a page whose title contains this text
  --help                            Show this help

Examples:
  node tools/browser-core/interactive/navigate.mjs --pick-about-blank --url https://www.zhipin.com/web/geek/chat?ka=header-message
  node tools/browser-core/interactive/navigate.mjs --url-keyword creator.xiaohongshu.com --url https://creator.xiaohongshu.com/new/home
`);
}

function parseArgs(argv) {
  const args = {
    endpoint: 'http://127.0.0.1:9222',
    targetUrl: '',
    pickTargetId: '',
    pickAboutBlank: false,
    urlKeyword: '',
    titleKeyword: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    switch (token) {
      case '--endpoint':
      case '--cdp-endpoint':
        args.endpoint = argv[index + 1];
        index += 1;
        break;
      case '--url':
        args.targetUrl = argv[index + 1];
        index += 1;
        break;
      case '--pick-target-id':
        args.pickTargetId = argv[index + 1] || '';
        index += 1;
        break;
      case '--pick-about-blank':
        args.pickAboutBlank = true;
        break;
      case '--url-keyword':
        args.urlKeyword = argv[index + 1] || '';
        index += 1;
        break;
      case '--title-keyword':
        args.titleKeyword = argv[index + 1] || '';
        index += 1;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      default:
        break;
    }
  }

  if (!args.targetUrl) {
    throw new Error('Missing required --url');
  }

  return args;
}

async function resolveTargetId(args) {
  if (args.pickTargetId) {
    return args.pickTargetId;
  }
  const report = await describePageTargets(args.endpoint, {
    urlKeyword: args.urlKeyword,
    titleKeyword: args.titleKeyword,
    bodyLimit: 200,
  });
  if (args.pickAboutBlank) {
    const aboutBlank = report.targets.find((target) => target.url === 'about:blank' || target.targetUrl === 'about:blank');
    if (!aboutBlank) {
      throw new Error('No about:blank page target available');
    }
    return aboutBlank.targetId;
  }
  if (!report.selected?.targetId) {
    throw new Error('Could not resolve a target to reuse');
  }
  return report.selected.targetId;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targetId = await resolveTargetId(args);
  const result = await navigateTargetById(args.endpoint, targetId, args.targetUrl, {
    waitForReadyState: 'complete',
    timeoutMs: 20000,
    bodyLimit: 600,
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
