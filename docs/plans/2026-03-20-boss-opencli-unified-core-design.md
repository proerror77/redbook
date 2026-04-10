# BOSS OpenCLI Unified Core Design

**Date:** 2026-03-20
**Owner:** Codex
**Status:** Reviewed and locked

## Goal

用 `opencli` 统一 BOSS 自动化的浏览器执行核心，替代现有 `tools/auto-zhipin` 里的 Playwright/CDP/current-tab 执行层；同时保留 `supervisor / ledger / dedupe / circuit breaker / dashboard` 作为仓库内上层编排。

## Final Architecture

```text
global @jackwener/opencli
  └─ boss core
     ├─ browser session / tab control
     ├─ health detection
     ├─ search / detail
     ├─ apply
     ├─ chat-list / chat-thread
     ├─ send-message / send-resume
     ├─ post-action verification
     └─ lifecycle hooks

repo: tools/auto-zhipin
  └─ orchestration layer
     ├─ supervisor
     ├─ queue / scheduling
     ├─ ledger / events
     ├─ dedupe
     ├─ circuit breaker
     ├─ reporting / dashboard
     └─ policy + config
```

## Core Boundary

### `opencli boss core` owns

- Browser Bridge session reuse
- Tab claim / navigation / select
- DOM read / click / type
- BOSS page health detection
- Search and detail retrieval
- Apply flow execution
- Chat list and thread retrieval
- Message sending
- Resume sending
- Post-action verification
- Standardized action result objects
- Thin lifecycle hooks

### `tools/auto-zhipin` owns

- Supervisor runtime
- Lock/checkpoint orchestration
- Daily targets / budgets
- Ledger schema
- Events stream
- Dedupe logic
- Restricted circuit breaker policy
- Retry policy
- Dashboard/reporting
- Profile/config/prompting policy

## Why This Split

`opencli` should become the single browser engine because all critical BOSS actions are browser-driven and already depend on the same logged-in Chrome environment.

`tools/auto-zhipin` should remain the control plane because it already contains durable state, reporting, and operational safeguards. Moving all of that into global `node_modules` would make the real system harder to test, review, version, and recover.

## Hook Contract

Hooks must stay thin and stateless.

Allowed:
- `beforeAction(action, context)`
- `afterAction(action, result, context)`
- `onHealthChange(health, context)`

Not allowed:
- Hook mutating ledger schema
- Hook deciding next supervisor step
- Hook owning retry policy
- Hook owning dedupe policy
- Hook owning breaker state

## Standard Result Model

Every `boss core` action should return the same shape:

```text
{
  ok: boolean,
  action: 'search' | 'detail' | 'apply' | 'chat_list' | 'chat_thread' | 'send_message' | 'send_resume',
  status: 'success' | 'blocked' | 'auth_gate' | 'restricted' | 'not_found' | 'ambiguous' | 'failed',
  reason: string | null,
  evidence: object,
  recoveryAt: string | null,
  normalized: object | null
}
```

This keeps `supervisor` dumb in the right way: it only interprets standardized outcomes instead of scraping page details itself.

## Migration Plan

### Phase 1: Browser core extraction

Move these capabilities behind `opencli boss core`:
- current tab/session handling
- page health detection
- search/detail fetch
- apply button + modal handling
- chat history pull
- send message / send resume

Targets to absorb or replace:
- `tools/auto-zhipin/lib/chrome_current.js`
- `tools/auto-zhipin/lib/zhipin.js`
- `tools/auto-zhipin/lib/apply_flow.js`
- `tools/auto-zhipin/lib/chat_history.js`
- parts of `tools/auto-zhipin/lib/runtime_guard.js`

### Phase 2: Repo orchestration rewire

Keep the repo state layer, but change it to call `opencli boss core` directly:
- `store.js`
- `supervisor.js`
- `managed_tabs.js`
- `runtime_guard.js`
- queue runners

### Phase 3: Thin CLI surface

Expose these single-action commands on top of the same core:
- `opencli boss search`
- `opencli boss detail`
- `opencli boss apply`
- `opencli boss chat-list`
- `opencli boss chat-thread`
- `opencli boss send-message`
- `opencli boss send-resume`

### Phase 4: Supervisor hooks

Allow repo runtime to subscribe to thin hook events without moving state ownership out of the repo.

## Test Diagram

```text
BOSS unified core
├─ search
│  ├─ healthy search returns normalized jobs
│  ├─ cookie expired => auth_gate
│  └─ restricted page => restricted
├─ detail
│  ├─ valid security_id returns normalized detail
│  └─ missing/offline job => not_found
├─ apply
│  ├─ apply button click succeeds
│  ├─ quota modal still counts as applied
│  ├─ chat redirect counts as applied
│  └─ ambiguous result => ambiguous
├─ chat-list
│  ├─ list conversations
│  └─ auth/restricted detection
├─ chat-thread
│  ├─ pull real history
│  └─ normalize context lines
├─ send-message
│  ├─ input found + send confirmed
│  └─ input/button missing => failed
└─ send-resume
   ├─ already sent
   ├─ inline send
   ├─ consent dialog
   └─ ambiguous delivery
```

## Failure Modes

| Codepath | Likely production failure | Must test | Must handle | Silent failure allowed |
|---|---|---:|---:|---:|
| search | cookie expired or XHR blocked | yes | yes | no |
| detail | security id stale/offline | yes | yes | no |
| apply | modal changes but click still fires | yes | yes | no |
| apply | redirected but message not actually sent | yes | yes | no |
| chat-list | DOM shape changes | yes | yes | no |
| chat-thread | history pull URL not discoverable | yes | yes | no |
| send-message | input exists but submit disabled | yes | yes | no |
| send-resume | consent flow changes | yes | yes | no |
| health | restricted page wording changes | yes | yes | no |

## Code Quality Notes

- Do not keep duplicate health logic in both `opencli` and `auto-zhipin`.
- Do not keep duplicate apply outcome classifiers in both layers.
- Do not let repo code shell out to `opencli boss ...` for every step; direct core calls are required.
- Keep the hook API smaller than the action API.

## Performance Notes

- Avoid per-step subprocess spawning in supervisor loops.
- Prefer one reused browser session/tab set over repeated fresh navigations where state allows.
- Keep chat history on API pull where possible; DOM-only history reconstruction is slower and noisier.
- Preserve the existing serial execution rule to avoid automation tab cross-contamination.

## Not In Scope

- Rebuilding the whole supervisor inside `opencli`
- Multi-platform hiring support
- Generic workflow engine abstraction
- Replacing repo ledger/events/dashboard with global package state

## Recommended File Ownership

```text
global opencli package
  src/clis/boss/*
  src/core/boss/*

repo redbook
  tools/auto-zhipin/lib/store.js
  tools/auto-zhipin/lib/supervisor.js
  tools/auto-zhipin/lib/managed_tabs.js
  tools/auto-zhipin/lib/report*.js
  tools/auto-zhipin/scripts/*
```

## Final Decision

Use `opencli` as the single BOSS browser core.
Keep `supervisor / ledger / dedupe / breaker / dashboard` in the repo.
Connect the two through direct imports and a thin hook contract, not through repeated shell command invocation.
