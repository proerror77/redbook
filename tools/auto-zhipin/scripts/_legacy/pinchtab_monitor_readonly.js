#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const { loadConfig } = require('../lib/config');
const { ZhipinStore } = require('../lib/store');
const { classifySiteHealth } = require('../lib/site_health');
const { captureWithPinchTab, pinchTabHealth } = require('../lib/pinchtab');
const { DATA_DIR } = require('../lib/paths');
const { parseArgs, nowIso } = require('../lib/utils');

const CAPTURE_PATH = path.join(DATA_DIR, 'pinchtab_chat_readonly_latest.json');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { config } = loadConfig(args.config);
  const store = new ZhipinStore();
  const activeRestriction = store.getActiveRestriction();

  if (activeRestriction) {
    throw new Error(`stored restriction active until ${activeRestriction.recoveryAt || 'unknown'}: ${activeRestriction.reason}`);
  }

  const runId = store.startRun('pinchtab_monitor_readonly', {
    url: config.chat.url,
  });
  store.save();

  try {
    await pinchTabHealth(config);
    const capture = await captureWithPinchTab(config, {
      url: config.chat.url,
      mode: 'chat',
    });

    const siteHealth = classifySiteHealth({
      url: capture.url,
      title: capture.title,
      bodyText: capture.readableText,
      looksReady: capture.looksReady,
    });

    store.setSiteHealth({
      ...siteHealth,
      sourceUrl: capture.url,
      title: capture.title,
      backend: 'pinchtab',
    });
    store.finishRun(runId, 'ok', {
      backend: 'pinchtab',
      url: capture.url,
      siteHealth,
    });
    store.save();

    fs.writeFileSync(CAPTURE_PATH, JSON.stringify({
      capturedAt: nowIso(),
      backend: 'pinchtab',
      ...capture,
      siteHealth,
    }, null, 2));

    console.log(JSON.stringify({
      backend: 'pinchtab',
      url: capture.url,
      title: capture.title,
      siteHealth,
      artifact: CAPTURE_PATH,
    }, null, 2));
  } catch (error) {
    store.finishRun(runId, 'failed', { error: error.message, backend: 'pinchtab' });
    store.save();
    throw error;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
