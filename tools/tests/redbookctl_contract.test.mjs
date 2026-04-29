import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const REDBOOKCTL = join(ROOT, "tools", "redbookctl");
const CONTRACT = JSON.parse(
  readFileSync(join(ROOT, "tools", "tests", "fixtures", "redbookctl-contract.json"), "utf8"),
);

function runJson(args) {
  const stdout = execFileSync(REDBOOKCTL, args, {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
  });
  return JSON.parse(stdout);
}

function hasPath(value, dottedPath) {
  let current = value;
  for (const part of dottedPath.split(".")) {
    if (current === null || typeof current !== "object" || !(part in current)) {
      return false;
    }
    current = current[part];
  }
  return true;
}

function assertPaths(value, paths, label) {
  for (const path of paths) {
    assert.equal(hasPath(value, path), true, `${label} missing required path: ${path}`);
  }
}

function assertStringFields(item, paths, label) {
  for (const path of paths) {
    assert.equal(typeof item[path], "string", `${label}.${path} must be a string`);
  }
}

test("redbookctl status JSON keeps the legacy contract", () => {
  const current = runJson(["status", "--json"]);
  const legacy = runJson(["legacy", "status", "--json"]);

  assert.deepEqual(current, legacy, "default status output must match legacy until TS migration is complete");
  assertPaths(current, CONTRACT.statusRequiredPaths, "status");

  assert.equal(typeof current.date, "string");
  assert.equal(typeof current.today_report.exists, "boolean");
  assert.equal(Array.isArray(current.active_tasks.open), true);
  assert.equal(Array.isArray(current.harness_runs.active), true);
  assert.equal(Array.isArray(current.pending_publish_confirmations), true);
  assert.equal(Array.isArray(current.publish_ledger.followups_due), true);
  assert.equal(Array.isArray(current.publish_ledger.followups_unverified), true);
  assert.equal(Array.isArray(current.storyboard_closure_gaps), true);

  for (const run of current.harness_runs.active) {
    assertStringFields(run, ["run_id", "topic", "stage", "status", "updated_at"], "harness run");
    if (Object.keys(run.publish_gate || {}).length > 0) {
      assertPaths(run.publish_gate, CONTRACT.publishGateRequiredPaths, "publish_gate");
      assert.equal(Array.isArray(run.publish_gate.missing), true);
    }
  }
});

test("redbookctl workflow-health JSON wraps status plus actionable items", () => {
  const current = runJson(["workflow-health", "--json"]);
  const legacy = runJson(["legacy", "workflow-health", "--json"]);

  assert.deepEqual(current, legacy, "default workflow-health output must match legacy until TS migration is complete");
  assertPaths(current, CONTRACT.workflowHealthRequiredPaths, "workflow-health");
  assertPaths(current.status, CONTRACT.statusRequiredPaths, "workflow-health.status");
  assert.equal(Array.isArray(current.actions), true);

  for (const action of current.actions) {
    assertPaths(action, CONTRACT.actionRequiredPaths, "workflow-health action");
    assert.equal(["info", "warn"].includes(action.severity), true, `unexpected severity: ${action.severity}`);
  }
});
