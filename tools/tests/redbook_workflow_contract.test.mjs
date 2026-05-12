import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(import.meta.dirname, "..", "..");

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function sharedBlock(path) {
  const text = read(path);
  const start = "<!-- BEGIN SHARED_RED_BOOK_PLAYBOOK -->";
  const end = "<!-- END SHARED_RED_BOOK_PLAYBOOK -->";
  const startIndex = text.indexOf(start);
  const endIndex = text.indexOf(end);

  assert.notEqual(startIndex, -1, `${path} missing shared playbook start marker`);
  assert.notEqual(endIndex, -1, `${path} missing shared playbook end marker`);
  assert.ok(endIndex > startIndex, `${path} shared playbook markers are out of order`);

  return text.slice(startIndex + start.length, endIndex).trim();
}

function assertIncludesAll(text, terms, label) {
  for (const term of terms) {
    assert.ok(text.includes(term), `${label} missing required workflow term: ${term}`);
  }
}

test("AGENTS and CLAUDE use the canonical shared playbook", () => {
  const canonical = read("docs/shared/redbook-playbook.md").trim();
  assert.equal(sharedBlock("AGENTS.md"), canonical);
  assert.equal(sharedBlock("CLAUDE.md"), canonical);
});

test("AGENTS is the startup constitution for the Redbook Agents OS", () => {
  const agents = read("AGENTS.md");
  assertIncludesAll(agents, [
    "# Redbook Agents OS",
    "`AGENTS.md` 是启动宪法",
    "## 启动必读",
    "先读 `tasks/active.md`",
    "判断用户意图属于 Lane A/B/C/D",
    "发布、删除、关注、提交等外部副作用必须先有用户明确确认",
    "### AGENTS.md 分层规则",
  ], "AGENTS startup constitution");
});

test("decision workflow keeps the shape, beneficiary, and persona gates", () => {
  const decision = read("docs/reference/editorial-decision-workflow.md");
  assertIncludesAll(decision, [
    "选题/新闻 -> 决策卡 -> 用户确认形态 -> 对应生产结构 -> Persona/受益人/冷读 -> 审稿 -> 发布确认 -> 发布回读",
    "目标受益人：",
    "Persona 匹配：",
    "Before `/x-mastery-mentor`, state the target beneficiary",
    "X-timeline-fresh-following-YYYY-MM-DD.md",
    "Do not substitute publish reminders, old drafts, stale reports, historical topic pools, or prior-day timeline posts.",
    "Before X publish, require `tools/redbookctl x-login`",
    "How To Start Future Workflows",
  ], "editorial decision workflow");
});

test("shared playbook keeps the Redbook workflow hard gates", () => {
  const playbook = read("docs/shared/redbook-playbook.md");
  assertIncludesAll(playbook, [
    "每天早上的选题和用户贴来的新闻链接，都必须先进入 `选题决策门`",
    "目标受益人、Persona 匹配",
    "计划内容发稿前必须过 `受益人 + 冷读审稿门`",
    "快速说明目标受益人和转发/回复理由",
    "工作流启动指南：`docs/reference/workflow-start-guide.md`",
  ], "shared playbook");
});

test("workflow start guide covers the user-facing starts", () => {
  const guide = read("docs/reference/workflow-start-guide.md");
  assertIncludesAll(guide, [
    "Before any start, run the Redbook semantic boot sequence:",
    "今天有什么值得写？",
    "First check whether today's daily task already ran",
    "tools/redbookctl status",
    "If today's daily evidence is missing, run `tools/redbookctl daily`",
    "这个链接值得写吗？<url>",
    "把这个做成短评。<url or topic>",
    "把这个做成完整内容。",
    "继续做这个",
    "直接发",
    "X-timeline-fresh-following-YYYY-MM-DD.md",
    "tools/redbookctl x-login",
    "tools/redbookctl xhs-health",
    "docs/reference/agent-teams-review-protocol.md",
    "Publishing always needs explicit user confirmation plus platform-side readback after submit.",
  ], "workflow start guide");
});

test("Agent Teams and method-ingestion protocols are durable workflow docs", () => {
  const agentTeams = read("docs/reference/agent-teams-review-protocol.md");
  assertIncludesAll(agentTeams, [
    "semantic-policy",
    "workflow-tooling",
    "knowledge-writeback",
    "Findings Format",
    "Durable Writeback Order",
  ], "agent teams review protocol");

  const methodIngestion = read("docs/reference/external-method-ingestion-workflow.md");
  assertIncludesAll(methodIngestion, [
    "Semantic Intake",
    "Durability Decision",
    "Tool/script guard",
    "docs/reference/",
    "wiki/",
    "tasks/lessons.md",
  ], "external method ingestion workflow");
});
