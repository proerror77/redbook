# Zhipin Automation Prototype Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local prototype for BOSS直聘 that can bootstrap login, monitor chat, scan jobs, filter opportunities, optionally apply, and keep a local tracking ledger.

**Architecture:** Use a standalone Node + Playwright tool under `tools/auto-zhipin/`. Authentication uses a persistent browser profile created in headed mode first, then reused in headless mode when possible. Runtime behavior stays conservative by default: detect blockers, draft replies instead of sending, and dry-run applications unless an explicit flag enables submission.

**Tech Stack:** Node.js 24, Playwright, local JSON ledger, JSON config.

---

### Task 1: Tool Skeleton And Config

**Files:**
- Create: `tools/auto-zhipin/package.json`
- Create: `tools/auto-zhipin/README.md`
- Create: `tools/auto-zhipin/config.example.json`
- Modify: `.gitignore`

**Step 1: Create standalone tool metadata**
- Add isolated `package.json` with Playwright dependency and scripts for `bootstrap`, `monitor`, `scan`, `reply`, `report`, and `test`.

**Step 2: Document the operating model**
- Explain that first login is headed and manual.
- Explain that headless cold start is not reliable because of slider / abnormal-access verification.
- Document config and runtime files.

**Step 3: Protect sensitive state**
- Ignore `.auth/` and runtime artifacts in `data/`.

### Task 2: Browser / Auth Layer

**Files:**
- Create: `tools/auto-zhipin/lib/browser.js`
- Create: `tools/auto-zhipin/lib/zhipin.js`
- Create: `tools/auto-zhipin/scripts/bootstrap_auth.js`

**Step 1: Launch persistent browser profile**
- Use `launchPersistentContext` so login state is preserved in `.auth/profile`.

**Step 2: Detect blockers**
- Treat `verify-slider`, login pages, and body text such as `异常访问行为` as hard blockers.

**Step 3: Build manual bootstrap**
- Open chat page in headed mode.
- Wait until the page looks like an authenticated chat shell.
- Exit cleanly once the session is usable.

### Task 3: Local Store, Filters, And Reply Drafting

**Files:**
- Create: `tools/auto-zhipin/lib/config.js`
- Create: `tools/auto-zhipin/lib/store.js`
- Create: `tools/auto-zhipin/lib/filters.js`
- Create: `tools/auto-zhipin/lib/reply.js`

**Step 1: Load config with safe defaults**
- Support a local override file while keeping the checked-in example generic.

**Step 2: Build append-only and snapshot tracking**
- Keep one JSON ledger and one JSONL event stream for auditability.

**Step 3: Add rule evaluation**
- Include keyword, salary, experience, degree, stage, location, and recruiter/company exclusion checks.

**Step 4: Add draft replies**
- Default to deterministic reply templates keyed by recruiter intent.

### Task 4: Chat Monitoring

**Files:**
- Create: `tools/auto-zhipin/scripts/monitor_messages.js`

**Step 1: Reuse saved profile and enter chat page**
- Fail fast when auth is expired or a verification page appears.

**Step 2: Poll DOM and diff messages**
- Extract conversation list plus active-thread messages.
- Record only new messages in the ledger.

**Step 3: Create reply drafts**
- For new inbound messages, build a pending draft entry.
- Keep actual sending behind `--send-drafts`.

### Task 5: Job Scanning, Filtering, And Apply Flow

**Files:**
- Create: `tools/auto-zhipin/scripts/scan_jobs.js`

**Step 1: Scan configured search URLs**
- Extract cards heuristically from logged-in search pages and persist normalized job entries.

**Step 2: Apply rule filters**
- Record `matched`, `skipped`, and reason lists for every inspected job.

**Step 3: Add guarded application flow**
- Keep default mode as dry-run.
- Only click CTA buttons when explicitly enabled and within a max-per-run cap.

### Task 6: Reporting And Verification

**Files:**
- Create: `tools/auto-zhipin/scripts/reply_worker.js`
- Create: `tools/auto-zhipin/scripts/report.js`
- Create: `tools/auto-zhipin/tests/filters.test.js`
- Create: `tools/auto-zhipin/tests/reply.test.js`
- Modify: `tasks/todo.md`

**Step 1: Provide runtime summaries**
- Show pending reply drafts, matched jobs, applied jobs, and failures.

**Step 2: Add unit tests for non-browser logic**
- Cover filter decisions and reply drafting heuristics with `node --test`.

**Step 3: Verify what is feasible locally**
- Run tests and any non-login browser checks that do not require a real account.
- Document gaps clearly.
