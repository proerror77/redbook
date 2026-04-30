# Active Tasks

> 当前任务面板。历史任务继续保留在 `tasks/todo.md`，本文件只放正在推进或需要用户决策的事项。

## 2026-04-30 Lane A Current-Timeline Guard

- Owner: Codex
- Source: User pointed out topic recommendations were old backlog items, not today's X topics
- Status: completed

### Cleanup Plan

- [x] Make the daily report label backlog/publish reminders as non-current topic sources.
- [x] Add a fail-closed source contract for Lane A so missing X timeline evidence cannot be replaced by old drafts.
- [x] Update shared playbook/docs and sync generated mirrors.
- [x] Run focused smoke checks and commit only scoped workflow changes.

### Review

- `tools/auto-x/scripts/daily_schedule.py` now labels backlog as `发布提醒（非今日选题来源）` and writes an explicit `当日选题来源判定` block into the daily report.
- Lane A now fails closed in the shared playbook: when X timeline / X search / X Pro are unavailable, the workflow must disclose the evidence gap and must not substitute old drafts, old backlog, or the topic pool.
- `docs/shared/redbook-playbook.md`, `AGENTS.md`, `CLAUDE.md`, and `docs/reference/skills-manifest.md` now all state the same rule so the constraint is not chat-only.
- Verification passed: `bash -n tools/auto-x/scripts/run_daily.sh`, `python3 -m py_compile tools/auto-x/scripts/daily_schedule.py`, `python3 tools/sync_redbook_playbook.py`, and report grep checks for the new guard text.

## 2026-04-30 BOSS Apply Safety Repair

- Owner: Codex
- Source: User asked to fix review findings and test whether the safer BOSS flow is usable
- Status: completed

### Cleanup Plan

- [x] Make BOSS dry-run a read-only preflight that never clicks the primary CTA.
- [x] Disable stale live batch apply entrypoints unless an explicit environment gate is set.
- [x] Align example config with conservative supervisor defaults.
- [x] Add target URL identity validation to Playwright apply ledger writes.
- [x] Exclude legacy tests from default `npm test` and run focused verification.

### Review

- BOSS dry-run now returns `dry_run_preflight` from a no-click CTA probe; tests assert the dry-run script contains no click/dispatch path.
- `auto-zhipin` now prefers the repo vendor OpenCLI boss core over global OpenCLI to avoid version drift during apply/search tests.
- Stale batch live apply requires `BOSS_ENABLE_LIVE_APPLY=1`; default invocation aborts before search/apply.
- `config.example.json` supervisor defaults are conservative: disabled and paused.
- `boss_apply_playwright` records failed instead of applied when the actual job detail id cannot be verified against the requested URL.
- Verification passed: `npm test` in `tools/auto-zhipin` reports 109/109 pass; changed scripts pass `node --check`; live batch gate smoke aborts as expected; `git diff --check` passes.

## 2026-04-30 Redbookctl TS Control Surface Migration

- Owner: Codex
- Source: User asked to continue after setting TS/Bun as the default workflow runtime
- Status: completed

### Cleanup Plan

- [x] Add a TS/Bun `redbookctl` control surface while preserving the existing `tools/redbookctl` command.
- [x] Move low-risk browser/X login dispatch into TS first.
- [x] Keep unmigrated Python commands available through an explicit legacy delegation path.
- [x] Update docs to show TS as canonical and Python as legacy implementation.
- [x] Run wrapper/help/smoke checks and commit the scoped migration start.

### Review

- `tools/redbookctl` now executes `tools/redbookctl.ts` with Bun.
- `browser` and `x-login` dispatch live in TS; `browser --json` still returns structured CDP health without opening a page.
- Unmigrated commands continue through an explicit legacy delegation to `tools/redbookctl.py`, preserving the existing command surface.
- Docs now mark `redbookctl.ts` as canonical and `redbookctl.py` as legacy delegated implementation.
- Verification passed: `tools/redbookctl --help`, `tools/redbookctl browser --help`, `tools/redbookctl x-login --help`, `tools/redbookctl status --json`, `tools/redbookctl browser --json`, `python3 -m py_compile tools/redbookctl.py`, and `git diff --check`.

## 2026-04-30 Redbookctl TS Dispatch Migration

- Owner: Codex
- Source: User said continue after TS control surface landed
- Status: completed

### Cleanup Plan

- [x] Move low-risk command dispatch from legacy Python into `tools/redbookctl.ts`.
- [x] Keep existing Python business scripts as called tools, not as the control surface.
- [x] Update docs to show which commands are now TS-dispatched.
- [x] Run non-destructive help/smoke checks for migrated commands.
- [x] Commit the scoped dispatch migration.

### Review

- `daily`, `draft`, `publish-record`, `xhs-health`, `challenge`, `emerge`, `draft-seed`, and `close-run` now dispatch from `tools/redbookctl.ts`.
- Existing implementation scripts remain in place: daily shell runner, Python harness, publish ledger recorder, XHS skill script, and content loop are now called by the TS control surface.
- `status`, `pick`, `publish`, `workflow-health`, and `publish-health` remain legacy Python until the status/publish-gap collector has a JSON contract fixture.
- Verification passed: help smoke for migrated commands, `status --json`, `browser --json`, `draft` empty guidance, `close-run` missing-id validation, Python compile for legacy file, and `git diff --check`.

## 2026-04-30 Redbookctl Status Contract Fixture

- Owner: Codex
- Source: User said continue after TS dispatch migration
- Status: completed

### Cleanup Plan

- [x] Add a fixture that documents the required `status` and `workflow-health` JSON paths.
- [x] Add a no-dependency `node --test` contract check against current and legacy redbookctl output.
- [x] Verify current default wrapper matches legacy output before TS migration of status collection.
- [x] Document the contract test as the next migration guard.

### Review

- Added `tools/tests/fixtures/redbookctl-contract.json` with required JSON paths for status, workflow-health actions, and publish gates.
- Added `tools/tests/redbookctl_contract.test.mjs`.
- The test runs `tools/redbookctl status --json` and `tools/redbookctl legacy status --json`, then does the same for `workflow-health --json`; it checks shape and exact parity while the legacy fallback is still authoritative.
- Verification passed: `node --test tools/tests/redbookctl_contract.test.mjs`.

## 2026-04-29 Workflow Review Follow-up Fixes

- Owner: Codex Agent Teams
- Source: User asked Agent Teams to review Redbook and BOSS workflows
- Status: completed

### Cleanup Plan

- [x] Fix BOSS apply defaults so all apply paths are dry-run unless explicitly configured or requested live.
- [x] Stop current-tab BOSS dry-run from being recorded as a real application and hard-stop on verify/auth/restricted states.
- [x] Tighten content harness and publish ledger semantics so `done` and follow-up stages cannot silently mean "not really verified".
- [x] Align workflow docs and skill entrypoints so BOSS, X, and XHS do not route agents to stale paths.
- [x] Run focused tests/static checks and commit the scoped changes.

### Review

- BOSS `boss:apply` now respects `config.apply.dryRun` by default; live apply requires `--dry-run false` or config opt-in.
- BOSS current-tab fallback now pauses on active verify pages, runs runtime health guard before matching/clicking, and records dry-run as `dry_run` instead of `applied`.
- Follow-up publish records now require metrics plus live readback evidence, or explicit closure evidence; `workflow-health` surfaces closure-only follow-ups as unverified instead of silently green.
- Content harness `close-run --status done` now requires the final `retrospect` stage for normal content pipelines, while wiki maintenance/research closures remain allowed.
- BOSS, X, and XHS docs now point to the current canonical entrypoints and mark stale paths as fallback, archived, or historical.

## 2026-04-29 Publish Workflow Hardening Team Fix

- Owner: Codex Agent Teams
- Source: User asked to complete all workflow fixes with Agent Teams
- Status: completed

### Cleanup Plan

- [x] Review X publish submit path, XHS publish path, ledger health, daily gap, and storyboard closure in parallel.
- [x] Make X submit fail closed on account/profile mismatch before any input or click.
- [x] Add XHS health/preflight and prevent `PUBLISH_STATUS` from being treated as verified success without platform evidence.
- [x] Add an operator workflow-health surface for daily report, active harness runs, pending publish confirmations, ledger gaps, and follow-ups.
- [x] Update publish ledger validation and workflow docs.
- [x] Run smoke/static checks and commit the scoped fix.

### Review

- X submit now checks `expected_handle` before typing/uploading/clicking, requires a configured expected handle for `--submit`, defaults submit to the configured publishing profile, and only reuses CDP when `--cdp-endpoint` is explicit.
- XHS now has `tools/redbookctl xhs-health`; RedBookSkills publish paths only print `PUBLISH_STATUS: PUBLISHED` after note link or creator-management evidence is found.
- `tools/redbookctl workflow-health` / `publish-health` now reports daily report gaps, launchd/log health, active publish runs, pending publish confirmations, item-level JSONL gaps, T+1/T+3 due items, and storyboard closure gaps.
- 4/29 missing daily report was regenerated with `--skip-x`; 4/29 AI Agent content package received T+0 JSONL records, a `publish_record` artifact, `published=true`, a retrospective `图文分镜.md`, and the harness run is closed as `done`.
- Remaining health items are intentionally not auto-resolved: the 2026-04-28 Agent long-thread run still needs explicit user publish confirmation, and 2026-04-28 T+1 metrics require live platform readback.

## 2026-04-29 Article Storyboard Layout Workflow

- Owner: Codex
- Source: User approved storyboard workflow and emphasized layout quality
- Status: completed

### Cleanup Plan

- [x] Add a required `图文分镜` gate before image/card generation.
- [x] Add concrete layout QA rules: hierarchy, text budget, safe margins, non-overlap, and regeneration triggers.
- [x] Update image-related skills and shared playbook so article structure and visual-card structure are separated.
- [x] Sync docs, verify consistency, and commit the workflow change.

### Review

- Lane C now separates article structure from visual-card structure: article = linear argument; image/carousel = storyboard.
- Image workflows now require `图文分镜.md` or equivalent with card role, reader task, anchor phrase, layout spec, text budget, hierarchy, and layout QA.
- Layout QA is explicit: headline/subtitle/label limits, >= 8% safe margins, no text-subject overlap, thumbnail readability, and regenerate-on-fail.
- Verification passed: shared playbook sync, `git diff --check`, `python3 -m py_compile tools/sync_redbook_playbook.py`, and `rg` checks for storyboard/layout QA terms across synced docs and active skills.

## 2026-04-29 X Login Workflow Review Fix

- Owner: Codex
- Source: Review found x-login preflight was not strongly bound to the publish profile/account
- Status: completed

### Cleanup Plan

- [x] Force `tools/redbookctl x-login` to inspect the configured publishing profile unless a CDP endpoint is explicitly requested.
- [x] Add expected-handle validation so composer visibility alone cannot pass the preflight.
- [x] Make check-only headless failures fail closed instead of opening a headed recovery browser.
- [x] Surface `x-login` as a publish helper gate and verify positive/negative cases.

### Review

- `tools/redbookctl x-login` now adds `--new-browser` by default, so it checks the configured publish profile instead of opportunistically reusing `9222`.
- `x-browser.ts --check-login` now validates `expected_handle` from config/env or `--expected-handle`; wrong-account checks fail.
- Headless `--check-login` no longer opens headed Chrome on failure; `tools/redbookctl x-login` uses a bounded composer wait and manual recovery stays explicit through `tools/redbookctl x-login --headed --login-wait-ms 600000`.
- User config now includes `expected_handle: @0xcybersmile`.
- Verification passed: Python compile, x-browser help, positive x-login, wrong-handle failure, logged-out-profile failure without headed recovery, publish helper gate text, and diff whitespace check.

## 2026-04-29 Article Visual Metaphor Workflow

- Owner: Codex
- Source: User shared X article `https://x.com/xiaoxiaodong01/status/2048443572119330853`
- Status: completed

### Cleanup Plan

- [x] Extract the reusable article-image method from the referenced X article.
- [x] Add a concrete visual-metaphor planning gate to Redbook longform and image-generation docs.
- [x] Sync shared playbook targets and update the active document-illustrator skill guidance.
- [x] Run doc consistency checks and commit the scoped workflow change.

### Review

- The referenced X article was distilled into a Redbook-specific `visual metaphor map` workflow: anchor phrase, semantic read, visual metaphor, composition, text-image integration, avoid list, and insertion placement.
- Longform Lane C now has a dedicated配图规划 gate before QA, and publish checklists must include each image's anchor phrase and visual metaphor.
- `document-illustrator`, XHS image routing, and article-illustrator guidance now discourage paragraph-summary/decorative images and require viewpoint-serving visual metaphors.
- Verification passed: shared playbook sync, `git diff --check`, `python3 -m py_compile tools/sync_redbook_playbook.py`, and `rg` checks for the new workflow terms across synced docs.

## 2026-04-29 Stable X Login Command

- Owner: Codex
- Source: User asked for a more stable way to handle X.com login
- Status: completed

### Cleanup Plan

- [x] Add a stable `redbookctl` wrapper for X login/composer checks.
- [x] Document the stable path and manual recovery mode in the tools guide.
- [x] Verify the wrapper against the configured `@0xcybersmile` profile.
- [x] Commit the small workflow hardening change.

### Review

- Added `tools/redbookctl x-login` as the stable preflight for the `/baoyu-post-to-x` publishing profile.
- Default mode is headless and non-publishing; `--headed --login-wait-ms 600000` is the manual recovery mode.
- Updated the shared playbook and tools guide so X publishing routes through `x-login` before publish.
- Verification passed: `python3 -m py_compile tools/redbookctl.py`, `tools/redbookctl x-login --help`, `tools/redbookctl x-login`, `git diff --check`, and no launched Chrome process remained.

## 2026-04-29 X Login Profile Recovery Fix

- Owner: Codex
- Source: User request to continue fixing today's X.com login correction
- Status: completed

### Cleanup Plan

- [x] Add a configurable default X browser profile so publish scripts do not fall back to the logged-out legacy profile.
- [x] Add a non-publishing X login smoke command for composer/login verification.
- [x] Point the local user config at the verified `@0xcybersmile` automation profile.
- [x] Run help/static/login smoke checks and record the remaining risks.

### Review

- `x-utils.ts` now reads `X_BROWSER_PROFILE_DIR`, `X_BROWSER_PROFILE`, or `default_profile` / `profile_dir` / `chrome_profile` from `EXTEND.md` before using the legacy profile.
- `x-browser.ts` now has `--check-login`, which verifies the X composer and prints the visible account without typing or publishing.
- User config `~/.baoyu-skills/baoyu-post-to-x/EXTEND.md` now points `default_profile` at `/Users/proerror/.local/share/x-article-v4-data/x-browser-profile`.
- Verification passed: default profile resolves to the verified profile, `--help` exposes `--check-login`, `--check-login --headless` passed as `Smileyface @0xcybersmile`, import has no CLI side effect, no launched Chrome process remained, and `git diff --check` passed.
- Remaining risk: `tools/redbookctl browser` still reports `9222` unavailable when the normal Shih Chrome was not launched with HTTP CDP; this fix makes the publish script's fallback profile usable instead of changing the already-running human Chrome.

## 2026-04-28 Redbook Browser Session Reuse Review

- Owner: Codex
- Source: User concern about repeated new browser pages and repeated login/session work
- Status: completed

### Cleanup Plan

- [x] Inventory browser login/session routes and identify paths still launching new Chrome/profile/page by default.
- [x] Add a lightweight browser-session inspection entrypoint that reads existing CDP tabs without opening new pages.
- [x] Move the main X regular-post script toward current Chrome/CDP reuse before launching an isolated profile.
- [x] Update workflow docs and run static verification.

### Review

- Added `tools/redbookctl browser` backed by `tools/browser-core/interactive/session.mjs`; it reads existing Chrome/CDP tabs and does not open new pages.
- Updated browser-mode docs, playbook, skill manifest, and tools README to make browser session inspection the first step before X/XHS/WeChat/BOSS workflows.
- Updated local `/baoyu-post-to-x` regular post script so it reuses `X_BROWSER_CDP_ENDPOINT` / `127.0.0.1:9222` and an existing X tab before falling back to a new isolated Chrome/profile.
- Wrote `docs/reports/2026-04-28-browser-session-reuse-review.md` with findings and remaining migration targets.
- Verification passed: `python3 -m py_compile tools/redbookctl.py`, `node --check tools/browser-core/interactive/session.mjs`, `tools/redbookctl browser --json | python3 -m json.tool`, and `bun .agents/skills/baoyu-post-to-x/scripts/x-browser.ts --help`.
- Current live check shows `127.0.0.1:9222` is unavailable, so this run did not inspect a live logged-in Chrome tab.

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
