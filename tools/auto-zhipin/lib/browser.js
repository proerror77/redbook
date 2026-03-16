const fs = require('node:fs');
const { chromium } = require('playwright');
const { PROFILE_DIR } = require('./paths');

function ensureProfileDir() {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
}

async function launchContext(config, options = {}) {
  ensureProfileDir();
  const headed = Boolean(options.headed);
  const channel = options.channel || config.browser.channel || 'chrome';
  const slowMo = Number(options.slowMoMs ?? config.browser.slowMoMs ?? 0);
  const baseOptions = {
    headless: !headed,
    slowMo,
    viewport: { width: 1440, height: 980 },
    locale: 'zh-CN',
    args: ['--disable-blink-features=AutomationControlled'],
  };
  let context;

  try {
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      ...baseOptions,
      channel,
    });
  } catch (error) {
    if (channel && channel !== 'chromium') {
      context = await chromium.launchPersistentContext(PROFILE_DIR, baseOptions);
    } else {
      throw error;
    }
  }

  context.setDefaultNavigationTimeout(Number(config.browser.navigationTimeoutMs || 30000));
  context.setDefaultTimeout(Number(config.browser.navigationTimeoutMs || 30000));
  return context;
}

async function getPrimaryPage(context) {
  const pages = context.pages();
  if (pages.length > 0) {
    return pages[0];
  }
  return context.newPage();
}

module.exports = {
  launchContext,
  getPrimaryPage,
};
