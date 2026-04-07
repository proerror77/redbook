#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runInstalledOpencli,
  spawnProcess,
  withBrowserLock,
} from '../lib/runtime.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptsDir = path.resolve(__dirname, '../scripts');

async function runNodeScript(scriptName, args) {
  const scriptPath = path.join(scriptsDir, scriptName);
  const result = await spawnProcess(process.execPath, [scriptPath, ...args], {
    capture: false,
  });
  return result.code;
}

async function main() {
  const args = process.argv.slice(2);
  const [subcommand, ...rest] = args;

  if (subcommand === 'install') {
    process.exit(await runNodeScript('install.js', rest));
  }

  if (subcommand === 'verify') {
    process.exit(await runNodeScript('verify.js', rest));
  }

  const commandArgs = args.length > 0 ? args : ['--help'];
  const result = await withBrowserLock(
    () => runInstalledOpencli(commandArgs, { capture: false }),
    { label: commandArgs.join(' ') }
  );
  process.exit(result.code);
}

main().catch((error) => {
  console.error(`[redbook-opencli] ${error.message}`);
  process.exit(1);
});
