#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SCRIPT_DIR = join(ROOT, "tools");
const LEGACY_PY = join(SCRIPT_DIR, "redbookctl.py");
const BROWSER_SESSION = join(SCRIPT_DIR, "browser-core", "interactive", "session.mjs");
const X_BROWSER_SCRIPT = join(ROOT, ".agents", "skills", "baoyu-post-to-x", "scripts", "x-browser.ts");

type ParseResult = {
  ok: true;
  options: Record<string, string | boolean>;
} | {
  ok: false;
  message: string;
};

function runPassthrough(command: string, args: string[]): number {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) {
    console.error(`[redbookctl] failed to run ${command}: ${result.error.message}`);
    return 127;
  }
  if (result.signal) {
    console.error(`[redbookctl] ${command} stopped by signal ${result.signal}`);
    return 1;
  }
  return result.status ?? 1;
}

function runLegacy(args: string[]): number {
  return runPassthrough("python3", [LEGACY_PY, ...args]);
}

function printTopLevelHelp(): void {
  console.log(`Redbook workflow control surface.

Canonical runtime: TypeScript / Bun.

Migrated TS commands:
  browser       Inspect existing Chrome/CDP tabs without opening new pages.
  x-login      Verify or recover the X publishing browser profile.

Legacy delegated commands:
  status, daily, pick, draft, publish, workflow-health, publish-health,
  publish-record, xhs-health, challenge, emerge, draft-seed, close-run

Examples:
  tools/redbookctl status
  tools/redbookctl browser --json
  tools/redbookctl x-login
  tools/redbookctl x-login --headed --login-wait-ms 600000
`);
}

function printBrowserHelp(): void {
  console.log(`Usage: tools/redbookctl browser [--endpoint URL] [--json]

Inspect existing Chrome/CDP tabs without opening new pages.

Options:
  --endpoint URL   Chrome DevTools endpoint. Default: http://127.0.0.1:9222
  --json           Print machine-readable JSON.
  -h, --help       Show this help.
`);
}

function printXLoginHelp(): void {
  console.log(`Usage: tools/redbookctl x-login [options]

Verify or recover the X publishing browser profile without typing or publishing.

Options:
  --profile PATH             Override the configured X browser profile directory.
  --expected-handle HANDLE   Override the configured expected X handle.
  --cdp-endpoint URL         Reuse an existing Chrome CDP endpoint.
  --new-browser              Force launching the configured/profile browser.
  --headed                   Open a visible browser for manual recovery.
  --timeout-ms MS            Composer wait timeout. Default: 45000.
  --login-wait-ms MS         Headed manual login recovery wait.
  -h, --help                 Show this help.
`);
}

function parseOptions(args: string[], schema: Record<string, "boolean" | "string">): ParseResult {
  const options: Record<string, string | boolean> = {};
  for (let index = 0; index < args.length; index += 1) {
    const raw = args[index];
    if (raw === "-h" || raw === "--help") {
      options.help = true;
      continue;
    }
    if (!raw.startsWith("--")) {
      return { ok: false, message: `unexpected positional argument: ${raw}` };
    }

    const equalIndex = raw.indexOf("=");
    const key = equalIndex === -1 ? raw : raw.slice(0, equalIndex);
    const kind = schema[key];
    if (!kind) {
      return { ok: false, message: `unknown option: ${key}` };
    }

    if (kind === "boolean") {
      if (equalIndex !== -1) {
        return { ok: false, message: `boolean option does not take a value: ${key}` };
      }
      options[key] = true;
      continue;
    }

    const value = equalIndex === -1 ? args[index + 1] : raw.slice(equalIndex + 1);
    if (!value || (equalIndex === -1 && value.startsWith("--"))) {
      return { ok: false, message: `missing value for ${key}` };
    }
    options[key] = value;
    if (equalIndex === -1) {
      index += 1;
    }
  }
  return { ok: true, options };
}

function stringOption(options: Record<string, string | boolean>, key: string, fallback?: string): string | undefined {
  const value = options[key];
  return typeof value === "string" ? value : fallback;
}

function commandBrowser(args: string[]): number {
  const parsed = parseOptions(args, {
    "--endpoint": "string",
    "--json": "boolean",
  });
  if (!parsed.ok) {
    console.error(`redbookctl browser: ${parsed.message}`);
    printBrowserHelp();
    return 2;
  }
  if (parsed.options.help) {
    printBrowserHelp();
    return 0;
  }

  const command = [
    BROWSER_SESSION,
    "--endpoint",
    stringOption(parsed.options, "--endpoint", "http://127.0.0.1:9222")!,
  ];
  if (parsed.options["--json"]) {
    command.push("--json");
  }
  return runPassthrough("node", command);
}

function commandXLogin(args: string[]): number {
  const parsed = parseOptions(args, {
    "--profile": "string",
    "--expected-handle": "string",
    "--cdp-endpoint": "string",
    "--new-browser": "boolean",
    "--headed": "boolean",
    "--timeout-ms": "string",
    "--login-wait-ms": "string",
  });
  if (!parsed.ok) {
    console.error(`redbookctl x-login: ${parsed.message}`);
    printXLoginHelp();
    return 2;
  }
  if (parsed.options.help) {
    printXLoginHelp();
    return 0;
  }

  const cdpEndpoint = stringOption(parsed.options, "--cdp-endpoint");
  const command = [X_BROWSER_SCRIPT, "--check-login"];
  const profile = stringOption(parsed.options, "--profile");
  const expectedHandle = stringOption(parsed.options, "--expected-handle");
  const timeoutMs = stringOption(parsed.options, "--timeout-ms", "45000")!;
  const loginWaitMs = stringOption(parsed.options, "--login-wait-ms");

  if (profile) {
    command.push("--profile", profile);
  }
  if (expectedHandle) {
    command.push("--expected-handle", expectedHandle);
  }
  if (cdpEndpoint) {
    command.push("--cdp-endpoint", cdpEndpoint);
  }
  if (parsed.options["--new-browser"] || !cdpEndpoint) {
    command.push("--new-browser");
  }
  command.push(parsed.options["--headed"] ? "--headed" : "--headless");
  command.push("--timeout-ms", timeoutMs);
  if (loginWaitMs) {
    command.push("--login-wait-ms", loginWaitMs);
  }

  return runPassthrough("bun", command);
}

function main(rawArgs: string[]): number {
  if (rawArgs[0] === "-h" || rawArgs[0] === "--help") {
    printTopLevelHelp();
    return 0;
  }
  if (rawArgs.length === 0 || rawArgs[0].startsWith("-")) {
    return runLegacy(rawArgs);
  }

  const command = rawArgs[0];
  const rest = rawArgs.slice(1);
  if (command === "browser") {
    return commandBrowser(rest);
  }
  if (command === "x-login") {
    return commandXLogin(rest);
  }
  if (command === "legacy") {
    return runLegacy(rest);
  }

  return runLegacy(rawArgs);
}

process.exitCode = main(process.argv.slice(2));
