#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SCRIPT_DIR = join(ROOT, "tools");
const LEGACY_PY = join(SCRIPT_DIR, "redbookctl.py");
const BROWSER_SESSION = join(SCRIPT_DIR, "browser-core", "interactive", "session.mjs");
const X_BROWSER_SCRIPT = join(ROOT, ".agents", "skills", "baoyu-post-to-x", "scripts", "x-browser.ts");
const XHS_CDP_PUBLISH_SCRIPT = join(homedir(), ".codex", "skills", "xiaohongshu-skills", "scripts", "cdp_publish.py");

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
  daily         Run the canonical daily workflow.
  draft         Create a full content harness run.
  publish-record
                Append structured publish ledger records.
  x-login      Verify or recover the X publishing browser profile.
  xhs-health   Verify Xiaohongshu creator login/readback.
  challenge, emerge, draft-seed, close-run

Legacy delegated commands:
  status, pick, publish, workflow-health, publish-health

Examples:
  tools/redbookctl status
  tools/redbookctl daily --skip-x
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

function printDailyHelp(): void {
  console.log(`Usage: tools/redbookctl daily [daily.sh args]

Run the canonical daily workflow.

Common options passed through to tools/daily.sh:
  --skip-x                  Generate a report without live X capture.
  --with-following-audit    Include full following-list audit.
  -h, --help                Show this help.
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

function printXhsHealthHelp(): void {
  console.log(`Usage: tools/redbookctl xhs-health [options]

Verify Xiaohongshu creator login/readback without publishing.

Options:
  --host HOST              CDP host. Default: 127.0.0.1
  --port PORT              CDP port. Default: 9222
  --account NAME           XHS account name configured in RedBookSkills.
  --headed                 Use a visible browser for login/CAPTCHA recovery.
  --reuse-existing-tab     Prefer reusing an existing tab.
  --with-content-data      Also verify creator management/data readback.
  --page-num N             Creator data page number. Default: 1
  --page-size N            Creator data page size. Default: 5
  --note-type N            Creator data note type. Default: 0
  --csv-file PATH          Optional CSV output path for content-data readback.
  -h, --help               Show this help.
`);
}

function printDraftHelp(): void {
  console.log(`Usage: tools/redbookctl draft --topic TOPIC [options]

Create a full content harness run.

Options:
  --topic TOPIC       Topic title.
  --source SOURCE     Source label. Default: manual
  --summary TEXT      One-line goal summary. Default: empty
  --owner OWNER       Run owner. Default: Codex
  --priority LEVEL    Priority. Default: P1
  -h, --help          Show this help.
`);
}

function printContentLoopHelp(command: string): void {
  console.log(`Usage: tools/redbookctl ${command} --topic TOPIC [options]

Options:
  --topic TOPIC   Topic to inspect.
  --limit N       Number of corpus items to use. Default: 8
  --print         Print only.
  -h, --help      Show this help.
`);
}

function printCloseRunHelp(): void {
  console.log(`Usage: tools/redbookctl close-run --run-id RUN_ID [options]

Options:
  --run-id RUN_ID  Harness run id to close.
  --status STATUS  done | closed_stale | cancelled. Default: done
  --note TEXT      Close note. Default: empty
  -h, --help       Show this help.
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

function requiredStringOption(options: Record<string, string | boolean>, key: string): string | undefined {
  const value = stringOption(options, key);
  return value && value.trim() ? value : undefined;
}

function commandDaily(args: string[]): number {
  if (args.includes("-h") || args.includes("--help")) {
    printDailyHelp();
    return 0;
  }
  return runPassthrough("/bin/bash", [join(SCRIPT_DIR, "daily.sh"), ...args]);
}

function commandPublishRecord(args: string[]): number {
  const passthroughArgs = args[0] === "--" ? args.slice(1) : args;
  if (passthroughArgs.length === 0) {
    return runPassthrough("python3", [join(SCRIPT_DIR, "record_publish.py"), "--help"]);
  }
  return runPassthrough("python3", [join(SCRIPT_DIR, "record_publish.py"), ...passthroughArgs]);
}

function commandDraft(args: string[]): number {
  const parsed = parseOptions(args, {
    "--topic": "string",
    "--source": "string",
    "--summary": "string",
    "--owner": "string",
    "--priority": "string",
  });
  if (!parsed.ok) {
    console.error(`redbookctl draft: ${parsed.message}`);
    printDraftHelp();
    return 2;
  }
  if (parsed.options.help) {
    printDraftHelp();
    return 0;
  }

  const topic = requiredStringOption(parsed.options, "--topic");
  if (!topic) {
    console.log("创建完整内容 run:");
    console.log('  tools/redbookctl draft --topic "题目" --source "日报/链接/路径" --summary "一句话目标"');
    return 0;
  }

  return runPassthrough("python3", [
    "-m",
    "tools.redbook_harness.cli",
    "new-run",
    "--topic",
    topic,
    "--source",
    stringOption(parsed.options, "--source", "manual")!,
    "--owner",
    stringOption(parsed.options, "--owner", "Codex")!,
    "--priority",
    stringOption(parsed.options, "--priority", "P1")!,
    "--summary",
    stringOption(parsed.options, "--summary", "")!,
  ]);
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

function commandXhsHealth(args: string[]): number {
  const parsed = parseOptions(args, {
    "--host": "string",
    "--port": "string",
    "--account": "string",
    "--headed": "boolean",
    "--reuse-existing-tab": "boolean",
    "--with-content-data": "boolean",
    "--page-num": "string",
    "--page-size": "string",
    "--note-type": "string",
    "--csv-file": "string",
  });
  if (!parsed.ok) {
    console.error(`redbookctl xhs-health: ${parsed.message}`);
    printXhsHealthHelp();
    return 2;
  }
  if (parsed.options.help) {
    printXhsHealthHelp();
    return 0;
  }
  if (!existsSync(XHS_CDP_PUBLISH_SCRIPT)) {
    console.error(`XHS skill script not found: ${XHS_CDP_PUBLISH_SCRIPT}`);
    return 2;
  }

  const base = [
    XHS_CDP_PUBLISH_SCRIPT,
    "--host",
    stringOption(parsed.options, "--host", "127.0.0.1")!,
    "--port",
    stringOption(parsed.options, "--port", "9222")!,
  ];
  const account = stringOption(parsed.options, "--account");
  if (account) {
    base.push("--account", account);
  }
  if (parsed.options["--reuse-existing-tab"]) {
    base.push("--reuse-existing-tab");
  }
  base.push(parsed.options["--headed"] ? "--headed" : "--headless");

  console.log("[redbookctl] XHS creator login preflight...");
  const loginCode = runPassthrough("python3", [...base, "check-login"]);
  if (loginCode !== 0) {
    console.error("[redbookctl] XHS health failed: creator login check did not pass.");
    return loginCode;
  }

  if (parsed.options["--with-content-data"]) {
    console.log("[redbookctl] XHS creator content-data readback...");
    const command = [
      ...base,
      "content-data",
      "--page-size",
      stringOption(parsed.options, "--page-size", "5")!,
      "--page-num",
      stringOption(parsed.options, "--page-num", "1")!,
      "--type",
      stringOption(parsed.options, "--note-type", "0")!,
    ];
    const csvFile = stringOption(parsed.options, "--csv-file");
    if (csvFile) {
      command.push("--csv-file", csvFile);
    }
    const contentCode = runPassthrough("python3", command);
    if (contentCode !== 0) {
      console.error("[redbookctl] XHS health failed: creator content-data readback did not pass.");
      return contentCode;
    }
  }

  console.log("[redbookctl] XHS health passed.");
  return 0;
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

function commandContentLoop(mode: "challenge" | "emerge" | "draft", commandName: string, args: string[]): number {
  const parsed = parseOptions(args, {
    "--topic": "string",
    "--limit": "string",
    "--print": "boolean",
  });
  if (!parsed.ok) {
    console.error(`redbookctl ${commandName}: ${parsed.message}`);
    printContentLoopHelp(commandName);
    return 2;
  }
  if (parsed.options.help) {
    printContentLoopHelp(commandName);
    return 0;
  }

  const topic = requiredStringOption(parsed.options, "--topic");
  if (!topic) {
    console.error(`redbookctl ${commandName}: missing required --topic`);
    printContentLoopHelp(commandName);
    return 2;
  }

  const command = [
    join(SCRIPT_DIR, "content_loop.py"),
    mode,
    "--topic",
    topic,
    "--limit",
    stringOption(parsed.options, "--limit", "8")!,
  ];
  if (parsed.options["--print"]) {
    command.push("--print");
  }
  return runPassthrough("python3", command);
}

function commandCloseRun(args: string[]): number {
  const parsed = parseOptions(args, {
    "--run-id": "string",
    "--status": "string",
    "--note": "string",
  });
  if (!parsed.ok) {
    console.error(`redbookctl close-run: ${parsed.message}`);
    printCloseRunHelp();
    return 2;
  }
  if (parsed.options.help) {
    printCloseRunHelp();
    return 0;
  }

  const runId = requiredStringOption(parsed.options, "--run-id");
  if (!runId) {
    console.error("redbookctl close-run: missing required --run-id");
    printCloseRunHelp();
    return 2;
  }
  const status = stringOption(parsed.options, "--status", "done")!;
  if (!["done", "closed_stale", "cancelled"].includes(status)) {
    console.error(`redbookctl close-run: invalid --status ${status}`);
    printCloseRunHelp();
    return 2;
  }

  return runPassthrough("python3", [
    "-m",
    "tools.redbook_harness.cli",
    "close-run",
    "--run-id",
    runId,
    "--status",
    status,
    "--note",
    stringOption(parsed.options, "--note", "")!,
  ]);
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
  if (command === "daily") {
    return commandDaily(rest);
  }
  if (command === "publish-record") {
    return commandPublishRecord(rest);
  }
  if (command === "draft") {
    return commandDraft(rest);
  }
  if (command === "browser") {
    return commandBrowser(rest);
  }
  if (command === "x-login") {
    return commandXLogin(rest);
  }
  if (command === "xhs-health") {
    return commandXhsHealth(rest);
  }
  if (command === "challenge") {
    return commandContentLoop("challenge", command, rest);
  }
  if (command === "emerge") {
    return commandContentLoop("emerge", command, rest);
  }
  if (command === "draft-seed") {
    return commandContentLoop("draft", command, rest);
  }
  if (command === "close-run") {
    return commandCloseRun(rest);
  }
  if (command === "legacy") {
    return runLegacy(rest);
  }

  return runLegacy(rawArgs);
}

process.exitCode = main(process.argv.slice(2));
