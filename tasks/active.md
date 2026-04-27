# Active Tasks

> 当前任务面板。历史任务继续保留在 `tasks/todo.md`，本文件只放正在推进或需要用户决策的事项。

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
