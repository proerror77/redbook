#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const { loadConfig } = require('../lib/config');
const { ZhipinStore } = require('../lib/store');
const { classifySiteHealth } = require('../lib/site_health');
const { captureWithPinchTab, pinchTabHealth } = require('../lib/pinchtab');
const { DATA_DIR } = require('../lib/paths');
const { parseArgs, nowIso } = require('../lib/utils');

const PROBE_PATH = path.join(DATA_DIR, 'pinchtab_probe_latest.json');

function inferMode(url, explicitMode) {
  if (explicitMode) {
    return explicitMode;
  }
  if (String(url).includes('/chat')) {
    return 'chat';
  }
  if (String(url).includes('/jobs')) {
    return 'jobs';
  }
  return 'page';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { config } = loadConfig(args.config);
  const store = new ZhipinStore();
  const targetUrl = args.url || config.chat.url;
  const mode = inferMode(targetUrl, args.mode);
  const activeRestriction = store.getActiveRestriction();

  if (activeRestriction) {
    throw new Error(`stored restriction active until ${activeRestriction.recoveryAt || 'unknown'}: ${activeRestriction.reason}`);
  }

  const runId = store.startRun('pinchtab_probe', { url: targetUrl, mode });
  store.save();

  try {
    await pinchTabHealth(config);
    const capture = await captureWithPinchTab(config, { url: targetUrl, mode });
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

    fs.writeFileSync(PROBE_PATH, JSON.stringify({
      capturedAt: nowIso(),
      backend: 'pinchtab',
      targetUrl,
      ...capture,
      siteHealth,
    }, null, 2));

    console.log(JSON.stringify({
      backend: 'pinchtab',
      targetUrl,
      mode,
      siteHealth,
      artifact: PROBE_PATH,
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
