# Loop Engineer Workflow

> Purpose: make Redbook run as a closed loop instead of a set of adjacent commands. This document coordinates existing lanes, harness runs, evidence gates, review gates, and writeback rules.

## Core Loop

Every non-trivial Redbook task should converge through this loop:

1. Observe: read the current state before acting.
2. Decide: map the latest user intent to a lane or subflow.
3. Execute: run the smallest canonical action for that lane.
4. Verify: collect evidence that the action happened.
5. Review: inspect quality, safety, workflow gaps, or platform readback.
6. Writeback: update progress, wiki, publish ledger, or docs when useful.
7. Next: either close, wait for approved-publish, or name the next concrete action.

The loop is not a replacement for Lane A/B/C/D. It is the control plane that decides which lane command should run next.

## State Contract

Use these statuses when describing loop progress:

| Status | Meaning | Typical Evidence |
| --- | --- | --- |
| `input_collected` | Current user intent and active tasks are known. | `tasks/active.md`, current source URL, browser/dashboard readback |
| `decision_ready` | Lane/subflow and next command are chosen. | Decision card, command printed by `loop next`, or workflow doc reference |
| `artifact_created` | A report, draft, queue, run, or candidate artifact exists. | `05-选题研究/*`, `01-内容生产/*`, harness JSON, docs report |
| `review_passed` | Required review/gate passed. | X review, workflow-health clean enough, verifier output |
| `published_or_done` | Local work is done or external submit happened with approval. | Commit, run closed, publish submit evidence |
| `verified` | Platform, harness, or local verifier evidence exists. | URL/readback/JSONL/test output |
| `knowledge_written_back` | Reusable learning was stored in repo memory. | `wiki/log.md`, `tasks/progress.md`, docs update, skill update |
| `retrospected` | Remaining risk and next action are explicit. | progress entry, close-run note, final summary |

Do not skip `verified` for external side effects. `published_pending_verification` remains open until platform-side readback exists.

## Control Surface

Primary entrypoint:

```bash
tools/redbookctl loop status
tools/redbookctl loop next
tools/redbookctl loop run --lane A
tools/redbookctl loop run --lane C --topic "..."
tools/redbookctl loop review
tools/redbookctl loop close --run-id <run_id>
```

`loop` intentionally reuses existing commands:

| Loop Command | Delegates To | Purpose |
| --- | --- | --- |
| `loop status` | `tools/redbookctl status` | Observe dashboard state. |
| `loop next` | `tools/redbookctl workflow-health` | Decide the next actionable gap. |
| `loop run --lane A` | `tools/redbookctl daily` | Execute daily research. |
| `loop run --lane B` | `tools/redbookctl publish` | Stop at publish gates for short comments. |
| `loop run --lane C --topic ...` | `tools/redbookctl draft` | Create a planned-content harness run. |
| `loop run --lane D` | `tools/redbookctl workflow-health` | Review system/workflow gaps. |
| `loop review` | `tools/redbookctl workflow-health` | Review open gaps. |
| `loop close` | `tools/redbookctl close-run` | Close a run through the existing harness. |

## Lane Mapping

Lane A:
- Observe today's research artifacts and X timeline evidence.
- If missing, run `tools/redbookctl loop run --lane A`.
- Output decision cards only. Do not create full drafts unless the user selects a topic.

Lane B:
- Verify the source and draft the short comment.
- Run `/x-mastery-mentor` before publish.
- `loop run --lane B` only prints publish gates and pending confirmations. It must not submit.

Lane C:
- Start with `tools/redbookctl loop run --lane C --topic "..."`
- Then attach wiki query, draft, visual/storyboard, QA, publish checklist, and publish record artifacts to the harness run.
- Close only after verifier evidence and writeback are complete.

Lane D:
- Start with `tools/redbookctl loop next` or `tools/redbookctl loop run --lane D`.
- Patch the smallest workflow/tool/doc gap.
- Run focused checks, update `tasks/progress.md`, then commit.

## Writeback Rule

After the loop produces a reusable finding, write it to the narrowest durable location:

1. Tool guard, if enforceable.
2. `docs/reference/*`, if it is a workflow rule.
3. `docs/shared/redbook-playbook.md`, then run `python3 tools/sync_redbook_playbook.py`, if it changes startup behavior.
4. `wiki/*`, if it is reusable content/market/method knowledge.
5. `tasks/progress.md`, always for system-maintenance completion evidence.
6. `tasks/lessons.md`, only for durable corrections after user feedback or repeated failure.

## Recovery

When resuming a loop:

1. Run `tools/redbookctl loop status`.
2. Run `tools/redbookctl loop next`.
3. Continue from the last verified state, not the last attempted action.
4. If the next action would publish, delete, send, follow, apply, or otherwise affect an external platform, require `approved-publish` unless the current task already approved that exact action.

## Completion Checklist

- The lane/subflow is named.
- The evidence target exists or the missing evidence is explicitly recorded.
- `loop review` has been run or the equivalent focused verifier passed.
- Reusable learning is written back to docs/wiki/progress.
- File changes are committed when the worktree changed.
