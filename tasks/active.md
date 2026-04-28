# Active Tasks

> 当前任务面板。历史任务继续保留在 `tasks/todo.md`，本文件只放正在推进或需要用户决策的事项。

## 2026-04-28 Redbook Media And Timeline Flow Audit

- Owner: Codex
- Source: User question about Tuzi image model, image density, and timeline headless mode
- Status: completed

### Cleanup Plan

- [x] Verify current image-generation paths and remove stale Nano Banana / Gemini defaults from active workflow prompts.
- [x] Add explicit image-density rules for long articles and multi-platform content.
- [x] Clarify X timeline capture mode: logged-in Chrome/CDP first, headless adapter fallback, no focus-stealing headed browser by default.
- [x] Run static checks and commit the scoped workflow fixes.

### Review

- Workflow docs now state Tuzi/兔子 `gpt-image-2.0` as the default image model and require image model/count/insert positions in publish checklists.
- `document-illustrator`, `baoyu-article-illustrator`, and `baoyu-xhs-images` local skills no longer steer prompts toward Nano Banana/Gemini defaults; global `~/.codex/skills/document-illustrator` was updated too.
- Longform image density is now balanced by default: optional cover, 3-5 body images, about every 600-900 Chinese chars or every 2-3 major sections, max 6 unless explicitly richer.
- X timeline docs/scripts now log and prefer logged-in Chrome/CDP first, then headless `agent-browser-session` fallback with `AGENT_BROWSER_HEADED=false`.
- Verification passed: Python compile, shell syntax check, shared playbook sync, stale default wording search, and diff whitespace check.

## 2026-04-28 Redbook P2.1 Dashboard State Cleanup

- Owner: Codex
- Source: `tools/redbookctl status`
- Status: completed

### Cleanup Plan

- [x] Convert today's live topic research into the canonical daily report path.
- [x] Close stale harness runs as `closed_stale` instead of leaving them active forever.
- [x] Keep only recent publish confirmations in the active dashboard.
- [x] Verify the dashboard reaches a clean current-state view.

### Review

- Added `05-选题研究/X-每日日程-2026-04-28.md` as the standard daily report generated from the live X/HN/Reddit topic-selection files.
- Closed 15 stale harness runs with status `closed_stale` and a cleanup note; remaining active harness run is the real 2026-04-28 publish-confirmation item.
- Adjusted `tools/redbookctl.py` so stale old publish checklists no longer appear as current pending confirmations.
- Verification passed: `tools/redbookctl status` now shows today's report exists, `stale_count = 0`, and exactly 1 active pending publish confirmation.

## 2026-04-28 Redbook P2 Control Surface

- Owner: Codex
- Source: `docs/reports/2026-04-28-redbook-workflow-review.md`
- Status: completed

### Cleanup Plan

- [x] Add a lightweight `redbookctl` entrypoint for daily, pick, draft, publish, close-run, and status.
- [x] Make the default dashboard show today's report, active harness runs, pending publish confirmations, publish ledger state, and stale runs.
- [x] Update the primary tool docs/playbook to route daily operations through `redbookctl`.
- [x] Run smoke checks and commit the scoped change.

### Review

- Added `tools/redbookctl.py` and executable wrapper `tools/redbookctl` as the unified daily control surface.
- `status` now shows today's daily report, active tasks, harness active/stale runs, pending publish confirmations, publish ledger latest record, due follow-ups, and recent publish records missing JSONL.
- `daily` and `publish-record` delegate to existing canonical tools; `pick`, `draft`, `publish`, and `close-run` provide safe workflow shortcuts without replacing approved-publish rules.
- Updated `docs/shared/redbook-playbook.md`, `AGENTS.md`, `CLAUDE.md`, and `tools/README.md` so daily operations point to `redbookctl`.
- Verification passed: Python compile, help/status/JSON/pick/draft/publish/publish-record smokes, shared playbook sync, and `git diff --check`.

## 2026-04-28 Redbook P0 Workflow Cleanup

- Owner: Codex
- Source: `docs/reports/2026-04-28-redbook-workflow-review.md`
- Status: completed

### Checklist

- [x] Fix `tools/daily.sh` completion output so it names the real report file and wiki maintenance state.
- [x] Make following full audit opt-in in `tools/auto-x/scripts/run_daily.sh`.
- [x] Add a harness close command and terminalize old wiki maintenance runs.
- [x] Remove stale `02-内容素材库/` and mismatched `早报-*` references from the primary workflow docs.
- [x] Verify tests/checks and commit the scoped changes.

### Review

- `tools/daily.sh` now reports `05-选题研究/X-每日日程-YYYY-MM-DD.md` and points to the daily log for wiki daily-cycle state.
- `tools/auto-x/scripts/run_daily.sh` skips following full audit by default; use `--with-following-audit` to run it.
- Wiki maintenance runs now close through `close-run`; current LLM Wiki harness runs are terminalized as `done`.
- Primary workflow docs now route reusable material to `wiki/素材/` and use the real daily report filename.
- Verification passed: shell syntax, Python compile, wiki workflow help, and redbook harness unit tests.

## 2026-04-28 Redbook P1 Skill Manifest Cleanup

- Owner: Codex
- Source: `docs/reports/2026-04-28-redbook-workflow-review.md`
- Status: completed

### Cleanup Plan

- [x] Inventory current repo-local and global Redbook-relevant skill entrypoints.
- [x] Create `docs/reference/skills-manifest.md` as the canonical skill routing table.
- [x] Update primary workflow docs to reference the manifest and demote missing/legacy skill names.
- [x] Run doc consistency checks and commit the scoped changes.

### Review

- Added `docs/reference/skills-manifest.md` with active, active-global, script, legacy-local, and deprecated entrypoints.
- Demoted `x-collect` / `x-create` / `x-filter` to legacy local references and routed current X work through `tools/daily.sh`, `wiki_workflow.py query`, and `/x-mastery-mentor`.
- Replaced default 小红书 `/post-to-xhs` routing with `/baoyu-xhs-images` for图文 and `RedBookSkills` for video/data/search.
- Updated `.rules`, `AGENTS.md`, `CLAUDE.md`, `docs/shared/redbook-playbook.md`, `tools/README.md`, and `tools/post-to-xhs-使用指南.md`.
- Verification passed: shared playbook sync was unchanged after edits, manifest paths exist, diff whitespace check passed, and stale default-entry regex checks returned no matches.

## 2026-04-28 Redbook P1 Generated Artifact Cleanup

- Owner: Codex
- Source: `docs/reports/2026-04-28-redbook-workflow-review.md`
- Status: completed

### Cleanup Plan

- [x] Confirm tracked generated artifacts targeted in this pass are dependency folders and browser runtime state.
- [x] Add ignore rules for `node_modules/` and package-manager caches.
- [x] Untrack generated dependency files with `git rm --cached` while preserving local files.
- [x] Verify no tracked `node_modules` remain and commit the scoped cleanup.

### Review

- Added `.gitignore` rules for `node_modules/`, package-manager caches, and `tools/auto-zhipin/.chrome-boss-profile/`.
- Untracked generated dependencies in `docs/plans/pptx-build/node_modules/` and `tools/auto-zhipin/node_modules/`.
- Untracked `tools/auto-zhipin/.chrome-boss-profile/` browser runtime state.
- Local generated directories are still present on disk; only git tracking changed.
- Verification passed: tracked `node_modules` count is `0`, tracked `.chrome-boss-profile` count is `0`, and git ignore checks cover the removed paths.

## 2026-04-28 Redbook P1 Lean Playbook Cleanup

- Owner: Codex
- Source: `docs/reports/2026-04-28-redbook-workflow-review.md`
- Status: completed

### Cleanup Plan

- [x] Move long system optimization guidance out of the always-loaded playbook and into `docs/reference/`.
- [x] Replace the shared playbook with four executable lanes and concise completion gates.
- [x] Shorten `AGENTS.md` / `CLAUDE.md` operating sections so they point to the lean playbook and manifest.
- [x] Sync shared docs, verify line-count reduction and doc consistency, then commit.

### Review

- Replaced the always-loaded workflow playbook with four executable lanes: 选题研究、热点速评、计划内容、系统维护。
- Moved system optimization guidance to `docs/reference/system-optimization-methods.md`.
- Shortened `AGENTS.md` from 728 lines to 310 lines and `CLAUDE.md` from 739 lines to 311 lines.
- Updated `tools/sync_redbook_playbook.py` so future syncs use the lean playbook header.
- Verification passed: shared sync completed, stale long-rule regex checks no longer match, and line counts are reduced.

## 2026-04-28 Redbook P1 Topic Pool Cleanup

- Owner: Codex
- Source: `docs/reports/2026-04-28-redbook-workflow-review.md`
- Status: completed

### Cleanup Plan

- [x] Archive existing `X 每日研究发现` scrape-noise sections from `00-选题记录.md`.
- [x] Keep the main topic pool limited to manually selected or explicitly promoted topics.
- [x] Stop daily scripts from auto-appending research keywords to the topic pool by default.
- [x] Update docs, verify no scrape-noise remains in the live topic pool, then commit.

### Review

- Moved 127 non-empty lines of `X 每日研究发现` scrape noise into `01-内容生产/选题管理/archive/2026-04-28-X每日研究发现-自动抓取噪音归档.md`.
- Left `00-选题记录.md` with only manually meaningful pending/deepened topics plus an archive pointer.
- Added explicit `--append-topics-to-record` compatibility flags to `daily_schedule.py` and `daily_research.py`; default daily runs no longer write candidates into the topic pool.
- Updated `tools/auto-x/README.md` to state that recommendations stay in the daily report until explicitly promoted.
- Verification passed: Python compile, both CLI help outputs include the new flag, live topic pool has no `X 每日研究` rows, archive contains the old rows, and diff whitespace check passed.

## 2026-04-28 Redbook P1 Structured Publish Data

- Owner: Codex
- Source: `docs/reports/2026-04-28-redbook-workflow-review.md`
- Status: completed

### Cleanup Plan

- [x] Add a canonical JSONL publish ledger with T+0/T+1/T+3 schema.
- [x] Add a small CLI to append validated publish records without hand-editing markdown tables.
- [x] Seed the ledger from the latest verified X publish record.
- [x] Update docs/playbook pointers, verify the CLI, then commit.

### Review

- Added `04-内容数据统计/publish-records.jsonl` as the canonical publish ledger and `publish-records.schema.md` as the field/stage contract.
- Seeded the ledger with the verified 2026-04-28 X.com T+0 record for the gpt-realtime voice-control short comment.
- Added `tools/record_publish.py` to append validated T+0/T+1/T+3 records with duplicate protection.
- Updated `数据统计表.md`, `docs/shared/redbook-playbook.md`, `AGENTS.md`, `CLAUDE.md`, and `tools/README.md` to point publishing data back to the JSONL ledger.
- Verification passed: script compiles, dry-run emits valid JSON, ledger parses, shared playbook sync is stable, references are present, and diff whitespace check passed.
