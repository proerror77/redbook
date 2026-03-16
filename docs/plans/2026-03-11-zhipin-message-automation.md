# Zhipin Message Automation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add resumable chat actions to `tools/auto-zhipin` so the prototype can auto-send the built-in resume button and auto-send one rejection follow-up sentence.

**Architecture:** Keep detection and execution separate. `monitor_messages.js` detects recruiter intent and stores pending actions in the ledger; a shared runner replays those actions sequentially and updates durable status so interrupted runs can recover safely. New behavior stays conservative: only explicit rejection messages trigger follow-up, and resume automation only uses built-in site buttons.

**Tech Stack:** Node.js 24, Playwright, local JSON ledger, JSON config, `node --test`.

---

### Task 1: Persist Action State

**Files:**
- Modify: `tools/auto-zhipin/lib/store.js`
- Test: `tools/auto-zhipin/tests/store_actions.test.js`

**Step 1: Write the failing test**
- Assert that the store can create, list, and complete pending actions without duplicating the same action key.

**Step 2: Run test to verify it fails**
- Run: `node --test tools/auto-zhipin/tests/store_actions.test.js`
- Expected: FAIL because action helpers do not exist yet.

**Step 3: Write minimal implementation**
- Add `actions` to the ledger schema.
- Add helpers to upsert actions, list pending actions, and mark action status.

**Step 4: Run test to verify it passes**
- Run: `node --test tools/auto-zhipin/tests/store_actions.test.js`
- Expected: PASS.

### Task 2: Expand Intent And Reply Generation

**Files:**
- Modify: `tools/auto-zhipin/lib/reply.js`
- Test: `tools/auto-zhipin/tests/reply.test.js`

**Step 1: Write the failing tests**
- Add coverage for `cv_request`.
- Add coverage for explicit rejection classification.
- Add coverage for rejection follow-up text generation using config profile and job summary.

**Step 2: Run test to verify they fail**
- Run: `node --test tools/auto-zhipin/tests/reply.test.js`
- Expected: FAIL on missing intents / helper output.

**Step 3: Write minimal implementation**
- Extend intent classification.
- Add small helpers for action decisions and rejection follow-up text.

**Step 4: Run test to verify it passes**
- Run: `node --test tools/auto-zhipin/tests/reply.test.js`
- Expected: PASS.

### Task 3: Add Browser Action Primitives

**Files:**
- Modify: `tools/auto-zhipin/lib/zhipin.js`
- Test: `tools/auto-zhipin/tests/zhipin_actions.test.js`

**Step 1: Write the failing tests**
- Add pure helper coverage for locating resume send text candidates and dedup-safe message checks.

**Step 2: Run test to verify it fails**
- Run: `node --test tools/auto-zhipin/tests/zhipin_actions.test.js`
- Expected: FAIL because helper exports do not exist.

**Step 3: Write minimal implementation**
- Add resume button candidate handling.
- Add helpers to detect whether a text reply already appears in the active conversation.

**Step 4: Run test to verify it passes**
- Run: `node --test tools/auto-zhipin/tests/zhipin_actions.test.js`
- Expected: PASS.

### Task 4: Queue And Execute Actions

**Files:**
- Create: `tools/auto-zhipin/lib/action_runner.js`
- Modify: `tools/auto-zhipin/scripts/monitor_messages.js`
- Modify: `tools/auto-zhipin/scripts/reply_worker.js`

**Step 1: Write the failing integration-leaning tests**
- Add focused unit tests around action building and no-op behavior when limits or config disable automation.

**Step 2: Run test to verify it fails**
- Run: `node --test tools/auto-zhipin/tests/*.test.js`
- Expected: FAIL on missing action runner behavior.

**Step 3: Write minimal implementation**
- Queue actions from inbound previews/messages.
- Process pending actions sequentially.
- Mark completed / skipped / failed with reasons.

**Step 4: Run test to verify it passes**
- Run: `node --test tools/auto-zhipin/tests/*.test.js`
- Expected: PASS.

### Task 5: Config, Docs, And Verification

**Files:**
- Modify: `tools/auto-zhipin/lib/config.js`
- Modify: `tools/auto-zhipin/config.example.json`
- Modify: `tools/auto-zhipin/README.md`
- Modify: `tasks/todo.md`

**Step 1: Add safe config defaults**
- Add profile summary / focus keywords, auto-action toggles, cooldown, and per-run cap.

**Step 2: Document operator expectations**
- Explain what is automated and what is intentionally skipped.

**Step 3: Run verification**
- Run: `rtk test npm test`
- Expected: PASS.
- Run: `node scripts/report.js`
- Expected: summary still loads with old or upgraded ledgers.
