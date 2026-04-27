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
