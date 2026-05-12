# External Method Ingestion Workflow

> Purpose: turn useful user-supplied methods, external frameworks, and repeated corrections into durable Redbook semantics instead of one-off chat memory.

## Trigger

Use this workflow when the user says any of:

- `把这个方法固定下来`
- `下次复用同样的方法`
- `更新到系统`
- `以后都这样做`
- `这个流程为什么没有固定下来`
- repeated corrections that reveal a missing workflow rule

This is usually Lane D / knowledge subflow. If the method changes publishing behavior, apply the normal publish/submit gates before any external action.

## Semantic Intake

Before editing files, identify:

1. The reusable method in one sentence.
2. The trigger phrase or situation where future agents should apply it.
3. The failure it prevents.
4. The evidence that proves future runs are using it.
5. Whether it belongs in policy docs, executable tooling, wiki knowledge, or `tasks/lessons.md`.

Do not name the method after a person unless the user's actual requirement depends on that identity. Prefer behavior names such as `fresh-following-timeline`, `approved-publish-readback`, or `semantic-boot`.

## Durability Decision

Choose the strongest durable layer that fits:

| Layer | Use When | Evidence |
| --- | --- | --- |
| Tool/script guard | The rule can be checked or enforced mechanically | script exit code, test, generated artifact |
| `docs/reference/` contract | The rule defines a canonical workflow | doc update plus contract test |
| `docs/shared/redbook-playbook.md` | Every future agent must see it at startup | synced `AGENTS.md` / `CLAUDE.md` |
| `wiki/` | The method is reusable knowledge or content strategy | wiki page/log entry |
| `tasks/lessons.md` | The rule prevents a repeated mistake after user correction | short lesson with trigger and correction |
| Memory note | The rule must survive outside this repo | ad hoc memory note, only when explicitly requested |

Prefer executable guards over prose when a repeated mistake can be detected automatically.

## Writeback Order

1. Add or update the narrowest tool guard.
2. Update the authoritative `docs/reference/` workflow.
3. Update `docs/shared/redbook-playbook.md` only if startup behavior changes, then run `python3 tools/sync_redbook_playbook.py`.
4. Update `docs/reference/skills-manifest.md` when an entrypoint, skill, or route changes.
5. Update wiki only if the method is reusable knowledge, not just an operating rule.
6. Append `tasks/progress.md` with evidence.
7. Add `tasks/lessons.md` only when the user correction should become an explicit repeat-prevention lesson.

## Verification

A method is not fixed until at least one of these is true:

- A contract test asserts the rule.
- A script fails closed when the rule is violated.
- `rg` shows the authoritative docs and startup playbook carry the rule.
- A generated artifact proves the new method ran.

Finish by reporting the exact files, checks, and commit.
