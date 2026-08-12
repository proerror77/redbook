#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SCRIPT_DIR = join(ROOT, "tools");
const LEGACY_PY = join(SCRIPT_DIR, "redbookctl.py");
const BROWSER_SESSION = join(SCRIPT_DIR, "browser-core", "interactive", "session.mjs");
const X_BROWSER_SCRIPT = join(ROOT, ".agents", "skills", "baoyu-post-to-x", "scripts", "x-browser.ts");
const XHS_CDP_PUBLISH_SCRIPT = join(homedir(), ".codex", "skills", "xiaohongshu-skills", "scripts", "cdp_publish.py");
const RESEARCH_DIR = join(ROOT, "05-选题研究");
const REPORTS_DIR = join(ROOT, "docs", "reports");

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

function runCapture(command: string, args: string[]): { code: number; stdout: string; stderr: string } {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
  });
  if (result.error) {
    return { code: 127, stdout: "", stderr: result.error.message };
  }
  return {
    code: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
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
  loop          Run the Loop Engineer coordinator.
  social-loop   Run the no-publish social research/writing loop.
  publish-record
                Append structured publish ledger records.
  x-login      Verify or recover the X publishing browser profile.
  xhs-health   Verify Xiaohongshu creator login/readback.
  challenge, emerge, draft-seed, close-run

Legacy delegated commands:
  status, pick, publish, workflow-health, publish-health

Examples:
  tools/redbookctl status
  tools/redbookctl loop next
  tools/redbookctl social-loop next
  tools/redbookctl loop run --lane A
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
  --endpoint URL   Chrome DevTools endpoint. Default: auto-scan 9222, 9223, 9224
  --json           Print machine-readable JSON.
  -h, --help       Show this help.
`);
}

function printDailyHelp(): void {
  console.log(`Usage: tools/redbookctl daily [daily.sh args]

Run the canonical daily workflow.

Common options passed through to tools/daily.sh:
  --skip-x                  Generate a report without live X capture.
  --skip-engagement         Skip the fresh following timeline sample, supplemental home/for-you sample, and 20-candidate reply queue.
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

function printLoopHelp(): void {
  console.log(`Usage: tools/redbookctl loop <status|next|run|review|close> [options]

Loop Engineer coordinates existing Redbook controls into one cycle:
  Observe -> Decide -> Execute -> Verify -> Review -> Writeback -> Next

Subcommands:
  status   Show the current workflow dashboard plus the loop phases.
  next     Show the next actionable workflow gaps.
  run      Execute the lane's canonical first action.
  review   Run workflow health review.
  close    Close a harness run through the standard close-run gate.

Run options:
  --lane A|B|C|D       Lane to run.
  --topic TOPIC        Required for lane C draft runs.
  --source SOURCE      Source for lane C. Default: loop engineer.
  --summary TEXT       Summary for lane C. Default: empty.
  --skip-x             Lane A: pass --skip-x to daily.

Close options:
  --run-id RUN_ID      Harness run id.
  --status STATUS      done | closed_stale | cancelled. Default: done.
  --note TEXT          Close note. Default: Loop Engineer close.

Examples:
  tools/redbookctl loop status
  tools/redbookctl loop next
  tools/redbookctl loop run --lane A
  tools/redbookctl loop run --lane C --topic "AI Agent ROI"
  tools/redbookctl loop close --run-id 20260630-120000-ai-agent-roi
`);
}

function printSocialLoopHelp(): void {
  console.log(`Usage: tools/redbookctl social-loop <status|next|run|review> [options]

Social Loop closes the research/writing cycle without external platform side effects:
  Observe -> Collect -> Decide -> Draft/Review -> Writeback -> Next

Subcommands:
  status   Show social loop state and evidence gates.
  next     Print the next no-publish action.
  run      Execute one loop step.
  review   Write a local social-loop review report from current evidence.

Run options:
  --step collect|review   collect runs tools/redbookctl daily; review writes docs/reports/social-loop-YYYY-MM-DD.md.
  --skip-x                Step collect: pass --skip-x to daily.
  --json                  status/next: print machine-readable JSON.

Examples:
  tools/redbookctl social-loop status
  tools/redbookctl social-loop next
  tools/redbookctl social-loop run --step collect
  tools/redbookctl social-loop review
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

  const command = [BROWSER_SESSION];
  const endpoint = stringOption(parsed.options, "--endpoint");
  if (endpoint) {
    command.push("--endpoint", endpoint);
  }
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

function todayInShanghai(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function relative(path: string): string {
  return path.startsWith(`${ROOT}/`) ? path.slice(ROOT.length + 1) : path;
}

function legacyStatusJson(): Record<string, any> {
  const result = runCapture("python3", [LEGACY_PY, "status", "--json"]);
  if (result.code !== 0) {
    throw new Error(result.stderr || result.stdout || "legacy status failed");
  }
  return JSON.parse(result.stdout);
}

function socialLoopPaths(date: string): Record<string, string> {
  return {
    dailyReport: join(RESEARCH_DIR, `X-每日日程-${date}.md`),
    freshFollowingJson: join(RESEARCH_DIR, `X-timeline-fresh-following-${date}.json`),
    freshFollowingMd: join(RESEARCH_DIR, `X-timeline-fresh-following-${date}.md`),
    sampleJson: join(RESEARCH_DIR, `X-timeline-sample-${date}.json`),
    sampleMd: join(RESEARCH_DIR, `X-timeline-sample-${date}.md`),
    engagementJson: join(RESEARCH_DIR, `X-互动队列-${date}.json`),
    engagementMd: join(RESEARCH_DIR, `X-互动队列-${date}.md`),
    reviewReport: join(REPORTS_DIR, `social-loop-${date}.md`),
  };
}

function jsonArrayCount(path: string): number | null {
  if (!existsSync(path)) return null;
  const value = readJson(path);
  return Array.isArray(value) ? value.length : null;
}

function buildSocialLoopState(): Record<string, any> {
  const status = legacyStatusJson();
  const date = status.date || todayInShanghai();
  const paths = socialLoopPaths(date);
  const daily = status.daily_health || {};
  const freshCount = jsonArrayCount(paths.freshFollowingJson);
  const engagementCount = jsonArrayCount(paths.engagementJson);
  const sampleCount = jsonArrayCount(paths.sampleJson);
  const missingArtifacts = Array.isArray(daily.missing_social_artifacts)
    ? daily.missing_social_artifacts
    : [];
  const collectReady = Boolean(status.today_report?.exists)
    && missingArtifacts.length === 0
    && (freshCount ?? 0) >= 80
    && (engagementCount ?? 0) > 0;
  const reviewExists = existsSync(paths.reviewReport);

  let phase = "review";
  let state = "ready_for_review";
  let nextAction = "tools/redbookctl social-loop review";
  if (!collectReady) {
    phase = "collect";
    state = "needs_collection";
    nextAction = "tools/redbookctl social-loop run --step collect";
  } else if (reviewExists) {
    phase = "next";
    state = "decision_ready";
    nextAction = "Read the social-loop report, pick or reject a topic, then use wiki query before drafting. No publish/comment action is allowed without explicit confirmation.";
  }

  return {
    date,
    workflow: "social-loop",
    mode: "research-only",
    phase,
    state,
    noPublishGate: {
      publish: "blocked_without_explicit_user_confirmation",
      reply: "blocked_without_explicit_user_confirmation",
      comment: "blocked_without_explicit_user_confirmation",
      likeFollowDm: "blocked",
    },
    evidence: {
      dailyReport: { path: relative(paths.dailyReport), exists: existsSync(paths.dailyReport) },
      freshFollowing: {
        path: relative(paths.freshFollowingJson),
        exists: existsSync(paths.freshFollowingJson),
        count: freshCount,
        sufficient: (freshCount ?? 0) >= 80,
      },
      supplementalSample: {
        path: relative(paths.sampleJson),
        exists: existsSync(paths.sampleJson),
        count: sampleCount,
      },
      engagementQueue: {
        path: relative(paths.engagementJson),
        exists: existsSync(paths.engagementJson),
        count: engagementCount,
        sufficient: (engagementCount ?? 0) > 0,
      },
      reviewReport: { path: relative(paths.reviewReport), exists: reviewExists },
    },
    nextAction,
  };
}

function printSocialLoopState(state: Record<string, any>): void {
  console.log(`Redbook Social Loop - ${state.date}`);
  console.log("- Mode: research-only | publish/comment/reply/follow blocked");
  console.log(`- Phase: ${state.phase} | state: ${state.state}`);
  console.log(`- Daily report: ${state.evidence.dailyReport.exists ? "exists" : "missing"} | ${state.evidence.dailyReport.path}`);
  console.log(`- Fresh following: ${state.evidence.freshFollowing.count ?? "missing"} | sufficient=${state.evidence.freshFollowing.sufficient}`);
  console.log(`- Supplemental sample: ${state.evidence.supplementalSample.count ?? "missing"}`);
  console.log(`- Engagement queue: ${state.evidence.engagementQueue.count ?? "missing"} | sufficient=${state.evidence.engagementQueue.sufficient}`);
  console.log(`- Review report: ${state.evidence.reviewReport.exists ? "exists" : "missing"} | ${state.evidence.reviewReport.path}`);
  console.log(`- Next: ${state.nextAction}`);
}

function renderSocialLoopReport(state: Record<string, any>): string {
  const paths = socialLoopPaths(state.date);
  const queue = existsSync(paths.engagementJson) ? readJson(paths.engagementJson) : [];
  const candidates = Array.isArray(queue) ? queue.slice(0, 8) : [];
  const lines = [
    `# Social Loop Review - ${state.date}`,
    "",
    "> Research-only social media loop report. This artifact does not approve publishing, replying, commenting, liking, following, DM, or profile edits.",
    "",
    "## Loop State",
    "",
    `- Phase: ${state.phase}`,
    `- State: ${state.state}`,
    `- Daily report: ${state.evidence.dailyReport.path}`,
    `- Fresh following: ${state.evidence.freshFollowing.count ?? 0}`,
    `- Engagement candidates: ${state.evidence.engagementQueue.count ?? 0}`,
    "",
    "## No-Publish Gate",
    "",
    "- Publishing, replying, commenting, liking, following, unfollowing, DM, delete, profile edit, and submit forms are blocked.",
    "- Next writing actions may create local drafts, review notes, storyboards, prompts, or wiki queries only.",
    "",
    "## Candidate Signals",
    "",
  ];

  if (candidates.length === 0) {
    lines.push("- No usable engagement candidates. Run `tools/redbookctl social-loop run --step collect` or inspect the fresh following sample.");
  } else {
    for (const [index, item] of candidates.entries()) {
      const handle = item?.handle || "unknown";
      const score = item?.score ?? "?";
      const total = item?.interaction_total ?? 0;
      const url = item?.target_url || "";
      const content = String(item?.content || "").replace(/\s+/g, " ").trim().slice(0, 280);
      lines.push(`### ${index + 1}. @${handle} | score ${score} | interaction ${total}`);
      lines.push("");
      lines.push(`- URL: ${url}`);
      lines.push(`- Source: ${item?.source || "unknown"}`);
      lines.push("");
      lines.push(`> ${content}`);
      lines.push("");
    }
  }

  lines.push("## Next");
  lines.push("");
  lines.push("- Decide whether any candidate deserves a topic decision card.");
  lines.push("- If selected, run wiki query before drafting.");
  lines.push("- Keep all output local until the user explicitly approves publish/comment/reply.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function commandSocialLoop(args: string[]): number {
  const subcommand = args[0];
  const rest = args.slice(1);

  if (!subcommand || subcommand === "-h" || subcommand === "--help") {
    printSocialLoopHelp();
    return 0;
  }

  if (subcommand === "status" || subcommand === "next") {
    const parsed = parseOptions(rest, { "--json": "boolean" });
    if (!parsed.ok) {
      console.error(`redbookctl social-loop ${subcommand}: ${parsed.message}`);
      printSocialLoopHelp();
      return 2;
    }
    if (parsed.options.help) {
      printSocialLoopHelp();
      return 0;
    }
    const state = buildSocialLoopState();
    if (parsed.options["--json"]) {
      console.log(JSON.stringify(state, null, 2));
    } else if (subcommand === "next") {
      console.log(`Redbook Social Loop Next - ${state.date}`);
      console.log(`- Phase: ${state.phase}`);
      console.log(`- Next: ${state.nextAction}`);
    } else {
      printSocialLoopState(state);
    }
    return 0;
  }

  if (subcommand === "run") {
    const parsed = parseOptions(rest, {
      "--step": "string",
      "--skip-x": "boolean",
    });
    if (!parsed.ok) {
      console.error(`redbookctl social-loop run: ${parsed.message}`);
      printSocialLoopHelp();
      return 2;
    }
    if (parsed.options.help) {
      printSocialLoopHelp();
      return 0;
    }
    const step = stringOption(parsed.options, "--step", "review");
    if (step === "collect") {
      return commandDaily(parsed.options["--skip-x"] ? ["--skip-x"] : []);
    }
    if (step === "review") {
      return commandSocialLoop(["review"]);
    }
    console.error("redbookctl social-loop run: --step must be collect or review");
    return 2;
  }

  if (subcommand === "review") {
    const state = buildSocialLoopState();
    const paths = socialLoopPaths(state.date);
    const reportState = state.phase === "review"
      ? {
          ...state,
          phase: "next",
          state: "decision_ready",
          nextAction: "Read the social-loop report, pick or reject a topic, then use wiki query before drafting. No publish/comment action is allowed without explicit confirmation.",
          evidence: {
            ...state.evidence,
            reviewReport: { path: relative(paths.reviewReport), exists: true },
          },
        }
      : state;
    mkdirSync(REPORTS_DIR, { recursive: true });
    writeFileSync(paths.reviewReport, renderSocialLoopReport(reportState), "utf8");
    console.log(`wrote ${relative(paths.reviewReport)}`);
    return 0;
  }

  console.error(`redbookctl social-loop: unknown subcommand ${subcommand}`);
  printSocialLoopHelp();
  return 2;
}

function commandLoop(args: string[]): number {
  const subcommand = args[0];
  const rest = args.slice(1);

  if (!subcommand || subcommand === "-h" || subcommand === "--help") {
    printLoopHelp();
    return 0;
  }

  if (subcommand === "status") {
    if (!rest.includes("--json")) {
      console.log("Loop Engineer phases: Observe -> Decide -> Execute -> Verify -> Review -> Writeback -> Next");
      console.log("");
    }
    return runLegacy(["status", ...rest]);
  }

  if (subcommand === "next" || subcommand === "review") {
    return runLegacy(["workflow-health", ...rest]);
  }

  if (subcommand === "run") {
    const parsed = parseOptions(rest, {
      "--lane": "string",
      "--topic": "string",
      "--source": "string",
      "--summary": "string",
      "--skip-x": "boolean",
    });
    if (!parsed.ok) {
      console.error(`redbookctl loop run: ${parsed.message}`);
      printLoopHelp();
      return 2;
    }
    if (parsed.options.help) {
      printLoopHelp();
      return 0;
    }

    const lane = stringOption(parsed.options, "--lane")?.toUpperCase();
    if (!lane || !["A", "B", "C", "D"].includes(lane)) {
      console.error("redbookctl loop run: --lane must be one of A, B, C, D");
      printLoopHelp();
      return 2;
    }

    if (lane === "A") {
      const dailyArgs = parsed.options["--skip-x"] ? ["--skip-x"] : [];
      return commandDaily(dailyArgs);
    }

    if (lane === "B") {
      console.log("Lane B is a publish-sensitive short-comment flow.");
      console.log("- Verify the source, draft the short comment, run /x-mastery-mentor review, then wait for approved-publish.");
      console.log("- Use tools/redbookctl publish to inspect publish gates after the draft exists.");
      return runLegacy(["publish"]);
    }

    if (lane === "C") {
      const topic = requiredStringOption(parsed.options, "--topic");
      if (!topic) {
        console.error("redbookctl loop run: lane C requires --topic");
        printLoopHelp();
        return 2;
      }
      return commandDraft([
        "--topic",
        topic,
        "--source",
        stringOption(parsed.options, "--source", "loop engineer")!,
        "--summary",
        stringOption(parsed.options, "--summary", "")!,
      ]);
    }

    return runLegacy(["workflow-health"]);
  }

  if (subcommand === "close") {
    const parsed = parseOptions(rest, {
      "--run-id": "string",
      "--status": "string",
      "--note": "string",
    });
    if (!parsed.ok) {
      console.error(`redbookctl loop close: ${parsed.message}`);
      printLoopHelp();
      return 2;
    }
    if (parsed.options.help) {
      printLoopHelp();
      return 0;
    }
    const runId = requiredStringOption(parsed.options, "--run-id");
    if (!runId) {
      console.error("redbookctl loop close: missing required --run-id");
      printLoopHelp();
      return 2;
    }
    return commandCloseRun([
      "--run-id",
      runId,
      "--status",
      stringOption(parsed.options, "--status", "done")!,
      "--note",
      stringOption(parsed.options, "--note", "Loop Engineer close")!,
    ]);
  }

  console.error(`redbookctl loop: unknown subcommand ${subcommand}`);
  printLoopHelp();
  return 2;
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
  if (command === "loop") {
    return commandLoop(rest);
  }
  if (command === "social-loop") {
    return commandSocialLoop(rest);
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
