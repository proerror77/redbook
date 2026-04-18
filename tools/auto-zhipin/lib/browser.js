const fs = require('node:fs');
const { PROFILE_DIR } = require('./paths');

const STEALTH_INIT_SCRIPT = `
(() => {
  try {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
      configurable: true,
    });
  } catch {}

  try {
    window.chrome = window.chrome || { runtime: {} };
  } catch {}

  try {
    Object.defineProperty(navigator, 'languages', {
      get: () => ['zh-CN', 'zh', 'en-US', 'en'],
      configurable: true,
    });
  } catch {}

  try {
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
      configurable: true,
    });
  } catch {}
})();
`;

let chromium = null;
try {
  ({ chromium } = require('playwright'));
} catch (error) {
  chromium = null;
}

function ensureProfileDir() {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
}

async function launchContext(config, options = {}) {
  if (!chromium) {
    throw new Error(
      'Legacy Playwright backend is no longer installed. Use chrome_collect_queue.js, '
      + 'chrome_monitor_queue.js, or opencli boss apply with an already logged-in Google Chrome tab.'
    );
  }
  ensureProfileDir();
  const headed = Boolean(options.headed);
  const channel = options.channel || config.browser.channel || 'chrome';
  const slowMo = Number(options.slowMoMs ?? config.browser.slowMoMs ?? 0);
  const baseOptions = {
    headless: !headed,
    slowMo,
    viewport: { width: 1440, height: 980 },
    locale: 'zh-CN',
    ignoreDefaultArgs: ['--enable-automation'],
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
  await context.addInitScript(STEALTH_INIT_SCRIPT);
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
