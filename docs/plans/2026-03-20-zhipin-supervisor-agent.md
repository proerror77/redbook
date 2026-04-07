# Zhipin Supervisor Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the first supervisor-based control layer for `tools/auto-zhipin`, including managed Chrome tabs, a unified runtime checkpoint, and a single scheduled entrypoint.

**Architecture:** Keep the existing collect/apply/monitor scripts as the execution workers for now, but place a new single-threaded supervisor above them. The supervisor owns lock state, managed tab state, checkpoint state, and bounded orchestration within one periodic wake-up.

**Tech Stack:** Node.js, AppleScript-driven Chrome control, local JSON ledger, Node test runner

---

### Task 1: Document the frozen design in code-adjacent docs

**Files:**
- Create: `docs/plans/2026-03-20-zhipin-supervisor-agent-design.md`
- Create: `docs/plans/2026-03-20-zhipin-supervisor-agent.md`

**Step 1: Write the frozen design doc**

Capture the approved runtime boundaries, browser ownership model, state-machine decisions, stop policy defaults, and first implementation slice.

**Step 2: Write the implementation plan**

Break the first slice into concrete tasks with exact files and tests.

**Step 3: Verify docs exist**

Run: `ls docs/plans | rg '2026-03-20-zhipin-supervisor-agent'`

Expected: both plan files are listed.

### Task 2: Extend config and ledger for supervisor runtime state

**Files:**
- Modify: `tools/auto-zhipin/lib/config.js`
- Modify: `tools/auto-zhipin/lib/store.js`
- Test: `tools/auto-zhipin/tests/store_save.test.js`
- Create: `tools/auto-zhipin/tests/store_supervisor.test.js`

**Step 1: Write failing tests for supervisor state helpers**

Add tests for:
- acquiring a supervisor lock
- rejecting a second lock while the first is fresh
- reclaiming a stale lock
- persisting checkpoint and managed-tab ownership

**Step 2: Run the focused test file**

Run: `node --test tools/auto-zhipin/tests/store_supervisor.test.js`

Expected: FAIL because supervisor helpers do not exist yet.

**Step 3: Add minimal config defaults**

Add a `supervisor` section with:
- `enabled`
- `tickBudgetMs`
- `schedulerIntervalMinutes`
- `dailySuccessfulAppliesTarget`
- `maxAutoRepliesPerDay`
- `maxStaleFollowupsPerDay`
- `staleConversationHours`
- `pause`

**Step 4: Add supervisor state helpers to the store**

Implement:
- ledger schema upgrade for `supervisor`
- lock acquire/release/heartbeat
- checkpoint read/write
- managed-tab read/write
- daily success counters derived from timestamps where possible

**Step 5: Re-run focused store tests**

Run: `node --test tools/auto-zhipin/tests/store_supervisor.test.js tools/auto-zhipin/tests/store_save.test.js`

Expected: PASS

### Task 3: Add specific-tab Chrome primitives

**Files:**
- Modify: `tools/auto-zhipin/lib/chrome_current.js`
- Test: `tools/auto-zhipin/tests/chrome_current.test.js`
- Create: `tools/auto-zhipin/tests/chrome_tabs.test.js`

**Step 1: Write failing tests for specific-tab helpers**

Cover pure logic around:
- selecting a managed tab by role
- preferring an already-marked tab
- falling back to URL match
- requesting tab creation when missing

**Step 2: Add Chrome primitives**

Implement helpers for the front window:
- list tabs
- activate a specific tab
- evaluate JavaScript in a specific tab
- navigate a specific tab
- create a new tab

Keep current-tab helpers backward compatible.

**Step 3: Re-run focused Chrome tests**

Run: `node --test tools/auto-zhipin/tests/chrome_current.test.js tools/auto-zhipin/tests/chrome_tabs.test.js`

Expected: PASS

### Task 4: Add managed-tab registry

**Files:**
- Create: `tools/auto-zhipin/lib/managed_tabs.js`
- Test: `tools/auto-zhipin/tests/managed_tabs.test.js`

**Step 1: Write failing tests for role discovery and repair**

Cover:
- claim existing tab by session marker
- claim by expected URL when marker is missing
- create missing tab
- persist repaired ownership back to the store

**Step 2: Implement the managed-tab registry**

Use front-window Chrome helpers plus per-tab session markers to maintain two owned tabs:
- `jobs`
- `chat`

**Step 3: Re-run the managed-tab tests**

Run: `node --test tools/auto-zhipin/tests/managed_tabs.test.js`

Expected: PASS

### Task 5: Add the supervisor entrypoint

**Files:**
- Create: `tools/auto-zhipin/scripts/chrome_supervisor.js`
- Modify: `tools/auto-zhipin/package.json`
- Test: `tools/auto-zhipin/tests/chrome_supervisor.test.js`

**Step 1: Write failing tests for bounded supervisor behavior**

Cover:
- exits when paused
- skips when lock is already held
- ensures managed tabs before work
- records checkpoint and summary snapshot

**Step 2: Implement the first supervisor slice**

The first slice should:
- acquire supervisor lock
- ensure managed tabs
- decide one bounded cycle of `jobs` then `chat`
- invoke existing workers in-process or via child process
- update checkpoint and release lock

**Step 3: Add package script**

Add a script such as:
- `chrome:supervisor`

**Step 4: Re-run focused supervisor tests**

Run: `node --test tools/auto-zhipin/tests/chrome_supervisor.test.js`

Expected: PASS

### Task 6: Add minimum runtime verification

**Files:**
- Modify: `tools/auto-zhipin/scripts/report.js`
- Create: `tools/auto-zhipin/tests/report_supervisor_format.test.js`

**Step 1: Extend report output**

Show:
- supervisor status
- active checkpoint
- managed tab ownership
- frozen counts
- today successful applies

**Step 2: Run focused report tests**

Run: `node --test tools/auto-zhipin/tests/report_supervisor_format.test.js`

Expected: PASS

### Task 7: Run targeted verification

**Files:**
- No code changes

**Step 1: Syntax-check touched scripts**

Run:
- `node --check tools/auto-zhipin/scripts/chrome_supervisor.js`
- `node --check tools/auto-zhipin/scripts/chrome_collect_queue.js`
- `node --check tools/auto-zhipin/scripts/chrome_apply_queue.js`
- `node --check tools/auto-zhipin/scripts/chrome_monitor_queue.js`

Expected: all PASS

**Step 2: Run focused tests**

Run:
- `node --test tools/auto-zhipin/tests/store_supervisor.test.js`
- `node --test tools/auto-zhipin/tests/chrome_tabs.test.js`
- `node --test tools/auto-zhipin/tests/managed_tabs.test.js`
- `node --test tools/auto-zhipin/tests/chrome_supervisor.test.js`

Expected: PASS

**Step 3: Run the repo test entrypoint**

Run: `cd tools/auto-zhipin && rtk test npm test`

Expected: PASS or a clearly explained known failure unrelated to this slice.
