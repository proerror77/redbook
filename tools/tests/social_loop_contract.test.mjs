import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const REDBOOKCTL = join(ROOT, "tools", "redbookctl.ts");

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

test("social-loop exposes the resumable Loop Engineer contract", () => {
  const help = execFileSync("bun", [REDBOOKCTL, "social-loop", "--help"], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
  });

  for (const term of ["grok-research", "record-collection", "prepare", "review", "publish", "--confirm 发布"]) {
    assert.ok(help.includes(term), `social-loop help missing ${term}`);
  }
});

test("social-loop keeps source, image, review, confirmation, and verification gates", () => {
  const implementation = read("tools/social_loop.ts");
  const workflow = read("docs/reference/social-loop-engineer-workflow.md");

  for (const term of [
    "hacker_news_source",
    "reddit_source",
    "grok_research",
    "Grok Builder",
    "wiki_ingested",
    "source_link_present",
    "assets/X-01.png",
    "事实审稿.md",
    "AI味审稿.md",
    "平台审稿.md",
    "视觉审稿.md",
    "awaiting_user_confirmation",
    "published_pending_verification",
    "禁止重试",
  ]) {
    assert.ok(implementation.includes(term) || workflow.includes(term), `social-loop contract missing ${term}`);
  }
});

test("daily records the Loop Engineer collection evidence after multi-source work", () => {
  const daily = read("tools/daily.sh");
  assert.match(daily, /social_loop\.ts.*record-collection/);
  assert.match(daily, /docs\/reports\/social-loop-/);
});
