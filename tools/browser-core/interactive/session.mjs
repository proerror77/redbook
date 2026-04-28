#!/usr/bin/env node

import { describePageTargets } from './chrome-cdp.mjs';

const SITE_RULES = [
  {
    id: 'x',
    label: 'X / X Pro',
    urlHints: ['x.com', 'twitter.com', 'pro.x.com'],
    loginMarkers: ['home', 'compose', 'status', '@', '关注', 'Following'],
    loginWallMarkers: ['Log in', 'Sign in', '注册', '登录', 'This page doesn’t exist'],
  },
  {
    id: 'xhs',
    label: '小红书 / 创作者中心',
    urlHints: ['xiaohongshu.com', 'creator.xiaohongshu.com'],
    loginMarkers: ['创作服务平台', '发布笔记', '笔记管理', '数据'],
    loginWallMarkers: ['登录', '扫码', '验证码'],
  },
  {
    id: 'wechat',
    label: '微信公众号',
    urlHints: ['mp.weixin.qq.com'],
    loginMarkers: ['首页', '新的创作', '草稿箱', '发表记录'],
    loginWallMarkers: ['登录', '扫码', '二维码'],
  },
  {
    id: 'boss',
    label: 'BOSS 直聘',
    urlHints: ['zhipin.com'],
    loginMarkers: ['沟通', '职位', '简历', '聊天'],
    loginWallMarkers: ['登录', '扫码', '安全验证'],
  },
];

function printHelp() {
  console.log(`Usage: node tools/browser-core/interactive/session.mjs [options]

Inspect the existing Chrome CDP session without opening new pages.

Options:
  --endpoint, --cdp-endpoint <url>  Chrome CDP endpoint (default: http://127.0.0.1:9222)
  --json                            Print machine-readable JSON
  --help                            Show this help

Examples:
  node tools/browser-core/interactive/session.mjs
  node tools/browser-core/interactive/session.mjs --json
`);
}

function parseArgs(argv) {
  const args = {
    endpoint: 'http://127.0.0.1:9222',
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    switch (token) {
      case '--endpoint':
      case '--cdp-endpoint':
        args.endpoint = argv[index + 1] || args.endpoint;
        index += 1;
        break;
      case '--json':
        args.json = true;
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

function textIncludesAny(text, markers) {
  return markers.some((marker) => text.includes(marker));
}

function summarizeSite(rule, targets) {
  const matches = targets.filter((target) => {
    const url = String(target.url || target.targetUrl || '');
    return rule.urlHints.some((hint) => url.includes(hint));
  });

  const selected = matches
    .filter((target) => !target.error)
    .sort((left, right) => Number(Boolean(right.hasFocus)) - Number(Boolean(left.hasFocus)))[0] || null;

  const readableText = selected
    ? `${selected.url || selected.targetUrl || ''}\n${selected.title || selected.targetTitle || ''}\n${selected.bodyPreview || ''}`
    : '';
  const loginWall = selected ? textIncludesAny(readableText, rule.loginWallMarkers) : false;
  const looksLoggedIn = selected ? !loginWall && textIncludesAny(readableText, rule.loginMarkers) : false;

  return {
    id: rule.id,
    label: rule.label,
    tab_count: matches.length,
    selected: selected
      ? {
          target_id: selected.targetId,
          url: selected.url || selected.targetUrl || '',
          title: selected.title || selected.targetTitle || '',
          has_focus: Boolean(selected.hasFocus),
          visibility_state: selected.visibilityState || '',
          ready_state: selected.readyState || '',
        }
      : null,
    state: selected ? (looksLoggedIn ? 'reusable' : (loginWall ? 'needs_login_or_verification' : 'unknown')) : 'missing',
  };
}

function printHuman(report) {
  console.log(`Browser session: ${report.cdp.available ? 'available' : 'unavailable'} | ${report.cdp.endpoint}`);
  if (!report.cdp.available) {
    console.log(`- ${report.cdp.error || 'Chrome CDP endpoint is not reachable.'}`);
    console.log('- Do not open a fresh workflow browser by default; start/reuse Chrome with --remote-debugging-port=9222, then rerun this check.');
    return;
  }

  console.log(`- Tabs: ${report.tabs.total}`);
  for (const site of report.sites) {
    const suffix = site.selected ? ` | ${site.selected.title || site.selected.url}` : '';
    console.log(`- ${site.label}: ${site.state} (${site.tab_count} tabs)${suffix}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = {
    cdp: {
      endpoint: args.endpoint,
      available: false,
      error: '',
    },
    tabs: {
      total: 0,
    },
    sites: [],
  };

  try {
    const targets = await describePageTargets(args.endpoint, { bodyLimit: 500 });
    report.cdp.available = true;
    report.tabs.total = targets.targets.length;
    report.sites = SITE_RULES.map((rule) => summarizeSite(rule, targets.targets));
  } catch (error) {
    report.cdp.error = error instanceof Error ? error.message : String(error);
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHuman(report);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
