#!/usr/bin/env node

import { describePageTargets } from './chrome-cdp.mjs';

function parseArgs(argv) {
  const args = {
    endpoint: 'http://127.0.0.1:9222',
    urlKeyword: '',
    titleKeyword: '',
    bodyLimit: 400,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    switch (token) {
      case '--cdp-endpoint':
      case '--endpoint':
        args.endpoint = argv[index + 1];
        index += 1;
        break;
      case '--url-keyword':
        args.urlKeyword = argv[index + 1] || '';
        index += 1;
        break;
      case '--title-keyword':
        args.titleKeyword = argv[index + 1] || '';
        index += 1;
        break;
      case '--body-limit':
        args.bodyLimit = Number(argv[index + 1] || args.bodyLimit);
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

  return args;
}

function printHelp() {
  console.log(`Usage: node tools/browser-core/interactive/smoke.mjs [options]

Options:
  --endpoint, --cdp-endpoint <url>  Chrome CDP endpoint (default: http://127.0.0.1:9222)
  --url-keyword <text>              Prefer tabs whose URL contains this text
  --title-keyword <text>            Prefer tabs whose title contains this text
  --body-limit <n>                  Body preview max chars (default: 400)
  --help                            Show this help

Examples:
  node tools/browser-core/interactive/smoke.mjs --url-keyword creator.xiaohongshu.com
  node tools/browser-core/interactive/smoke.mjs --title-keyword 小红书
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = await describePageTargets(args.endpoint, args);
  console.log(JSON.stringify(report, null, 2));

  if (!report.selected) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
