#!/usr/bin/env node

const { loadConfig } = require('../lib/config');
const { launchContext, getPrimaryPage } = require('../lib/browser');
const { ZhipinStore } = require('../lib/store');
const { enforceRuntimeGuard, formatGuardError } = require('../lib/runtime_guard');
const { gotoAndWait, waitForBootstrapReady } = require('../lib/zhipin');
const { parseArgs } = require('../lib/utils');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { config } = loadConfig(args.config);
  const store = new ZhipinStore();
  const activeRestriction = store.getActiveRestriction();
  if (activeRestriction) {
    throw new Error(formatGuardError({
      status: 'restricted',
      reason: activeRestriction.reason,
      recoveryAt: activeRestriction.recoveryAt || null,
    }));
  }
  const context = await launchContext(config, {
    headed: true,
    slowMoMs: args['slow-mo-ms'] ? Number(args['slow-mo-ms']) : config.browser.slowMoMs,
    channel: args.channel || config.browser.channel,
  });

  try {
    const page = await getPrimaryPage(context);
    console.log('Opening BOSS直聘 chat page in headed mode. Complete login / slider / SMS manually.');
    console.log('The script will exit once it detects a usable chat shell.');
    await gotoAndWait(page, config.chat.url);
    const guard = await enforceRuntimeGuard({ page, store, mode: 'chat' });
    store.save();
    if (guard.blocked && guard.status === 'restricted') {
      throw new Error(formatGuardError(guard));
    }
    await waitForBootstrapReady(
      page,
      Number(args['timeout-ms'] || 600000),
      async (state) => {
        if (state.kind === 'auth_gate') {
          console.log(`Waiting for manual auth: ${state.reason}`);
        }
        if (state.kind === 'restricted') {
          console.log(`Restricted access detected: ${state.reason}${state.recoveryAt ? ` until ${state.recoveryAt}` : ''}`);
        }
        if (state.kind === 'loading') {
          console.log('Page is loading or transitioning...');
        }
        if (state.kind === 'chat_ready') {
          console.log('Chat shell detected.');
        }
      }
    );
    console.log('Login bootstrap succeeded. Persistent profile is ready for later headless runs.');
  } finally {
    await context.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
