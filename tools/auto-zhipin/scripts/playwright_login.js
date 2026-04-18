#!/usr/bin/env node

const path = require('node:path');
const { spawn } = require('node:child_process');

const { loadConfig } = require('../lib/config');
const { PROFILE_DIR } = require('../lib/paths');
const { launchContext, getPrimaryPage } = require('../lib/browser');
const { parseArgs } = require('../lib/utils');

function printHelp() {
  console.log([
    'Usage:',
    '  node tools/auto-zhipin/scripts/playwright_login.js [options]',
    '',
    'Options:',
    '  --url <url>              Page to open after launch',
    '  --channel <channel>      Browser channel, default from config.browser.channel or chrome',
    '  --detached <true|false>  Launch browser in background and return immediately',
    '  --headed <true|false>    Force headed browser (default true for login)',
    '',
    'Examples:',
    '  npm run boss:login',
    '  npm run boss:login -- --url https://www.zhipin.com/web/user/?ka=header-login',
  ].join('\n'));
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

function resolveLoginUrl(config, args) {
  if (args.url) {
    return String(args.url);
  }

  return 'https://www.zhipin.com/web/user/?ka=header-login';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printHelp();
    return;
  }

  const { config } = loadConfig(args.config);
  const url = resolveLoginUrl(config, args);
  const channel = String(args.channel || config.browser?.channel || 'chrome');
  const detached = parseBoolean(args.detached, false);
  const internalRun = parseBoolean(args['internal-run'], false);
  const headed = parseBoolean(args.headed, true);

  if (detached) {
    const childArgs = [
      __filename,
      '--internal-run',
      'true',
      '--channel',
      channel,
      '--headed',
      String(headed),
      '--url',
      url,
    ];
    const child = spawn(process.execPath, childArgs, {
      cwd: path.resolve(__dirname, '..'),
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    console.log(JSON.stringify({
      ok: true,
      detached: true,
      profileDir: PROFILE_DIR,
      channel,
      url,
    }, null, 2));
    return;
  }

  const context = await launchContext(config, {
    headed,
    channel,
  });
  const page = await getPrimaryPage(context);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  console.log(JSON.stringify({
    ok: true,
    detached: internalRun,
    profileDir: PROFILE_DIR,
    channel,
    url,
  }, null, 2));

  await new Promise((resolve, reject) => {
    const browser = context.browser();
    if (!browser) {
      reject(new Error('Unable to access Playwright browser instance.'));
      return;
    }
    browser.on('disconnected', resolve);
  });
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
