# Redbook Agents OS Semantic Layer

> Purpose: make this repository operate as the user's content-and-publishing Agents OS. The semantic layer converts user intent into lane, state, gates, tools, evidence, and recovery behavior before any agent starts doing work.

## Core Model

Redbook is not just a content folder. Treat it as an operating system with six durable layers:

| Layer | Meaning | Durable Location |
| --- | --- | --- |
| Intent | What the user is trying to accomplish now | chat + `tasks/active.md` |
| Policy | What is allowed, blocked, or requires confirmation | `AGENTS.md`, `CLAUDE.md`, `docs/reference/*` |
| Memory | Reusable knowledge, materials, and prior decisions | `wiki/`, `tasks/progress.md`, `tasks/lessons.md` |
| Workflow | Repeatable lane-specific execution paths | `docs/shared/redbook-playbook.md`, `tools/redbookctl`, `tools/auto-*` |
| Evidence | Proof that work actually happened | platform URLs, JSONL logs, reports, screenshots, publish records |
| Recovery | How to resume, verify, retry, or rollback safely | `tasks/active.md`, `tasks/progress.md`, lane-specific verifier scripts |

Every non-trivial turn should move through these layers in order. If a layer is missing, stop and fill the smallest necessary gap instead of improvising from memory.

## Startup Contract

At the start of a Redbook task, run this semantic boot sequence:

1. Identify the user's latest intent in one sentence.
2. Map it to one lane: `A research`, `B short comment`, `C planned content`, or `D system maintenance`.
3. Read `tasks/active.md` for collisions, unfinished publish states, or recovery requirements.
4. Select the authoritative workflow doc or skill before acting.
5. Decide the evidence target before executing: which file, URL, status page, JSONL, report, or commit will prove completion.
6. If the task can create external side effects, identify the publish/submit gate and verifier before doing it.

This contract is mandatory for publishing, browser automation, batch replies, workflow changes, and any task that touches multiple files.

## Intent Routing

Use user wording as the primary routing signal:

| User Intent | Lane | Default Behavior |
| --- | --- | --- |
| "今天有什么", "timeline", "热点", "值得写" | Lane A | collect current evidence, output decision cards, do not draft/publish by default |
| "写一条", "快评", "回复这个", "短评" | Lane B | verify source, draft, review, wait for publish confirmation unless user already said publish |
| "做成文章", "小红书", "多平台", "完整内容" | Lane C | full content package, wiki query, persona gate, platform orchestration, publish checklist |
| "修流程", "更稳定", "改 AGENTS", "workflow", "脚本问题" | Lane D | update docs/tools/tasks, run minimal checks, commit |
| "直接发", "发布", "继续发" after a reviewed artifact | publishing subflow | submit only the already reviewed artifact, then verify externally |

When intent is mixed, choose the lane with the highest external-risk burden. For example, "帮我发 50 个 timeline 回复" is publishing, so it must use the X engagement workflow even though it starts with timeline research.

## State Model

Use consistent state names so future agents can resume safely:

| State | Meaning |
| --- | --- |
| `planned` | Scope is known, work has not started |
| `in_progress` | Agent is actively changing files, generating artifacts, or operating browser |
| `review_ready` | Draft/artifact exists and is waiting for user or review gate |
| `publish_ready` | User has approved publication and required gates passed |
| `published_pending_verification` | External submit likely happened, but platform proof is not complete |
| `published_verified` | Platform-side evidence exists and is recorded |
| `blocked_user_action` | User login/CAPTCHA/permission/manual action is required |
| `blocked_tooling` | Tool/browser/API is unavailable or inconsistent |
| `completed` | Work is closed, evidence recorded, and commit made when files changed |

Never collapse `published_pending_verification` into `failed`. Failed means the action did not happen or the platform explicitly rejected it. A delayed readback needs a verifier, not a retry.

## Evidence Contract

Completion claims require evidence appropriate to the lane:

| Lane | Minimum Evidence |
| --- | --- |
| A research | current source report under `05-选题研究/`, decision cards, and explicit source limitations |
| B short comment | source URL, final draft, review result, publish URL if submitted |
| C planned content | content package, wiki query, review/QA files, publish checklist, platform records after publish |
| D system maintenance | changed docs/tools, focused checks, `tasks/progress.md`, commit |
| X batch replies | reviewed targets JSON, content review, script gate, raw logs, verifier output, verified-only summary with unique counts |
| XHS publish | note id or creator-center status, not only fill/publish stdout |
| X article/post | status URL and page/home/article evidence, not only script stdout |

If no external evidence can be acquired, say exactly which evidence is missing and leave the state as pending or blocked.

## Publish Gate

External side effects use `approved-publish`:

- Drafting, reviewing, previewing, and local file generation can be autonomous.
- Posting, replying, deleting, following, unfollowing, sending, purchasing, or applying requires either explicit user approval in the current task or a workflow where the user already said to do that exact action.
- "继续" only means continue the current approved workflow. It does not approve a new platform, new target set, or destructive action.

After any publish:

1. Read back platform-side evidence.
2. Save raw and final evidence under the lane's expected location.
3. Update `tasks/progress.md`.
4. Commit scoped files if the worktree changes are yours.

## Recovery Rules

When interrupted or resumed:

1. Read `tasks/active.md`.
2. Check `git status --short`.
3. Inspect the newest evidence files, not only terminal output.
4. For browser/platform tasks, run the relevant health check before continuing.
5. Continue from the last verified state, not from the last attempted action.

For X batch replies specifically:

- `posted_pending_verification` is a verification backlog, not a retry queue.
- Run `tools/auto-x/scripts/verify_engagement_replies.mjs` before any retry.
- Final completion must be based on a verified-only summary with `verified=N`, `unique_sources=N`, `unique_verify_urls=N`, and `missing=0`.

## Folder Ownership

Treat these directories as OS subsystems:

| Directory | OS Role |
| --- | --- |
| `AGENTS.md` / `CLAUDE.md` | boot policy |
| `docs/reference/` | stable contracts and detailed workflows |
| `docs/shared/redbook-playbook.md` | synced startup playbook |
| `tasks/active.md` | current process table |
| `tasks/progress.md` | append-only session journal |
| `tasks/lessons.md` | corrections that should change future behavior |
| `wiki/` | semantic memory and reusable knowledge |
| `05-选题研究/` | research and operation evidence |
| `01-内容生产/` | planned content workspaces |
| `04-内容数据统计/` | publishing and performance ledger |
| `tools/` | executable control plane |

Keep generated evidence close to the workflow that produced it. Do not hide external-side-effect evidence only in chat.

## Maintenance Rule

If a failure reveals a recurring workflow gap, fix the OS layer in this order:

1. Tool or script guard if machine-enforceable.
2. Workflow contract in `docs/reference/`.
3. Shared playbook rule in `docs/shared/redbook-playbook.md`, then sync to `AGENTS.md` / `CLAUDE.md`.
4. `tasks/progress.md` entry with evidence.
5. `tasks/lessons.md` only when it is a durable correction, not ordinary progress.

Prefer enforceable gates over prose. Prose is acceptable only when no practical guard exists yet.
