# Agent Teams Review Protocol

> Purpose: make multi-agent project reviews a first-class Redbook workflow instead of an ad hoc self-review.

## Trigger

Use this protocol when the user says any of:

- `Agent Teams`
- `项目 review`
- `review 工作流`
- `把流程固定下来`
- `语义层 review`

This is a Lane D / review subflow unless the user explicitly asks to publish content during the same turn.

## Semantic Boot

Before spawning or reading deeply:

1. State the latest user intent in one sentence.
2. Read `tasks/active.md` and `git status --short`.
3. Define the review scope and completion evidence.
4. Split the work into independent lanes.
5. Only use subagents when the user explicitly asked for Agent Teams or parallel agents.

## Standard Review Lanes

Use at least these three lanes:

| Lane | Ownership | Output |
| --- | --- | --- |
| `semantic-policy` | `AGENTS.md`, `CLAUDE.md`, `docs/shared/redbook-playbook.md`, `docs/reference/agents-os-semantic-layer.md` | startup, state, gate, recovery findings |
| `workflow-tooling` | `tools/`, `docs/reference/skills-manifest.md`, workflow READMEs | executable evidence and verification findings |
| `knowledge-writeback` | `wiki/`, `docs/reports/`, `tasks/progress.md`, `tasks/lessons.md` | memory, wiki, and durable rule findings |

For larger reviews, add focused lanes such as `publishing`, `browser`, `timeline-evidence`, or `xhs`.

## Findings Format

Subagents must return findings, not broad impressions:

```text
Severity: High / Medium / Low
File: path:line
Problem:
Impact:
Recommendation:
```

Keep each agent to at most 8 findings. Findings must cite concrete files and lines.

## Synthesis

The lead agent merges findings into:

1. Critical gaps.
2. Protocol changes.
3. Doc/tool updates made.
4. Durable memory or wiki updates.
5. Verification commands and results.
6. Residual risk.

Do not mark the review complete until the durable writeback exists in repo files.

## Durable Writeback Order

When the review finds a recurring workflow gap, fix it in this order:

1. Tool/script guard when practical.
2. `docs/reference/` contract.
3. `docs/shared/redbook-playbook.md`, then sync `AGENTS.md` / `CLAUDE.md`.
4. `wiki/` method/topic page if the insight is reusable knowledge.
5. `tasks/progress.md` evidence.
6. `tasks/lessons.md` only for repeat-prevention corrections.

## External Effects

Agent Teams review is read-only by default. File edits are allowed only in the lead agent synthesis phase after the scope is clear. External publishing, deleting, following, or account operations still require the normal publish/submit gate.
