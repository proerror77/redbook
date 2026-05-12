#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(SCRIPT_DIR, "..", "..", "..");
const OUTPUT_DIR = join(ROOT_DIR, "05-选题研究");

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function localDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseTwitterDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function parseJsonArray(output) {
  const start = output.indexOf("[");
  const end = output.lastIndexOf("]");
  if (start === -1 || end < start) {
    throw new Error("opencli did not return a JSON array");
  }
  return JSON.parse(output.slice(start, end + 1));
}

function renderMarkdown(rows, { date, target, minFresh }) {
  const status = rows.length >= target ? "sufficient" : "insufficient";
  const lines = [
    `# X Timeline Fresh Following - ${date}`,
    "",
    "> Lane A 选题研究证据。来源为真实登录态的 following chronological timeline；先按当天日期过滤，再判断今天发生了什么。",
    "",
    "## 样本状态",
    "",
    `- 目标样本数：${target}`,
    `- 最小通过数：${minFresh}`,
    `- 实际新鲜样本数：${rows.length}`,
    `- 状态：${status}`,
    "- 来源：`opencli twitter timeline --type following --limit 100 -f json`",
    "- 时区：Asia/Shanghai",
    "",
    "## Fresh Posts",
    "",
  ];

  for (const [index, item] of rows.entries()) {
    lines.push(`### ${index + 1}. @${item.author || "unknown"}`);
    lines.push("");
    lines.push(`- URL: ${item.url || ""}`);
    lines.push(`- Time: ${item.created_at || ""}`);
    lines.push(`- Metrics: likes ${item.likes ?? 0} / retweets ${item.retweets ?? 0} / replies ${item.replies ?? 0} / views ${item.views ?? 0}`);
    lines.push("");
    lines.push("> " + String(item.text || "").replace(/\n/g, " ").slice(0, 900));
    lines.push("");
  }

  return lines.join("\n");
}

const date = argValue("--date", localDate());
const target = Number(argValue("--target", "100"));
const minFresh = Number(argValue("--min-fresh", "80"));

mkdirSync(OUTPUT_DIR, { recursive: true });

const rawOutput = execFileSync(
  "opencli",
  ["twitter", "timeline", "--type", "following", "--limit", String(target), "-f", "json"],
  { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
);
const rows = parseJsonArray(rawOutput);
const freshRows = rows.filter((item) => {
  const parsed = parseTwitterDate(item.created_at);
  return parsed && localDate(parsed) === date;
});

const latestPath = join(OUTPUT_DIR, `X-timeline-following-latest-${date}.json`);
const freshJsonPath = join(OUTPUT_DIR, `X-timeline-fresh-following-${date}.json`);
const freshMdPath = join(OUTPUT_DIR, `X-timeline-fresh-following-${date}.md`);

writeFileSync(latestPath, JSON.stringify(rows, null, 2) + "\n");
writeFileSync(freshJsonPath, JSON.stringify(freshRows, null, 2) + "\n");
writeFileSync(freshMdPath, renderMarkdown(freshRows, { date, target, minFresh }) + "\n");

const result = {
  date,
  target,
  minFresh,
  captured: rows.length,
  fresh: freshRows.length,
  latestPath,
  freshJsonPath,
  freshMdPath,
  status: freshRows.length >= minFresh ? "ok" : "insufficient",
};
console.log(JSON.stringify(result, null, 2));

if (freshRows.length < minFresh) {
  process.exitCode = 2;
}
