# Zhipin Supervisor Agent Design

**Date:** 2026-03-20

**Goal:** Turn the current `tools/auto-zhipin` prototype into a usable first-stage agent that can continuously auto-apply and auto-reply correctly, without expanding into a broader multi-platform career platform yet.

## Scope

- Replace fragmented manual/script orchestration with one scheduled supervisor entrypoint.
- Keep using the user's currently logged-in Chrome window.
- Automatically claim and maintain two managed tabs in that window:
  - `Jobs`
  - `Chat`
- Make auto-apply continuous within one supervisor tick.
- Make auto-reply use real conversation history before LLM judgment.
- Persist all business state, checkpoint state, and managed-tab ownership in one ledger.
- Require strong post-action verification for both apply and reply.
- Freeze any uncertain external action instead of auto-retrying it.
- Produce a minimum operator-facing dashboard/report for each run.

## Non-Goals

- Multi-platform job search.
- Always-on daemon mode.
- Full workflow platform or general-purpose agent framework.
- Human-like strategy optimization beyond the rules already approved.
- Automatic recovery from every browser/site-level unknown state.

## Approved Product Decisions

### Browser Control Model

- The system stays inside the user's regular logged-in Chrome window.
- That same window contains two managed tabs, one for `Jobs` and one for `Chat`.
- The system auto-claims those tabs, re-creates them if missing, and auto-switches back if the user temporarily moves them away during a run.

### Runtime Model

- Execution stays in `periodic jobs` mode.
- Only one scheduled entrypoint exists: the supervisor.
- Each wake-up runs a bounded supervisor tick, then exits.
- If another tick is already active, the new one skips instead of running in parallel.

### Apply Model

- One supervisor decides when to collect, apply, pause, or stop.
- Apply work is continuous across safe checkpoints, not split into manual `collect` and `apply` operator steps.
- Jobs use an explicit state machine, not only `matched/applied/skipped/failed`.

### Reply Model

- Reply decisions require real message history, not only sidebar preview text.
- The LLM may directly decide and send, without an additional policy gate in this phase.
- Reply automation covers:
  - immediate replies to new incoming recruiter messages
  - positive but stale conversations that deserve one follow-up
- Conversations use an explicit state machine to avoid spam and duplicate nudges.

### Reliability Model

- Every external action must be post-verified.
- If verification is ambiguous, the object enters `uncertain/frozen`.
- Frozen objects are excluded from automatic retries until explicitly handled.

### Ledger Model

- One unified ledger stores:
  - jobs/application state
  - conversation/reply state
  - supervisor lock and checkpoint
  - managed-tab ownership
  - decision evidence and reason codes
- Each meaningful state transition stores:
  - state
  - reason code(s)
  - evidence snapshot
  - decision source
  - timestamps

### Default Operating Parameters

- Scheduler cadence: every 5 minutes
- Per-tick runtime budget: 10 minutes
- Reply context window: latest 12 real messages
- Same-conversation auto-send cap: 1 outbound auto-send per 24 hours
- Stale-positive threshold: 48 hours
- Global pause switch: supported
- Daily successful apply target: 130
- Each run writes:
  - one operator-facing markdown dashboard
  - one machine-friendly JSON snapshot

## High-Level Architecture

```text
launchd
  -> chrome_supervisor.js
      -> acquire lock / restore checkpoint
      -> ensure managed tabs
      -> pick next unit of work
          -> jobs tab: collect/apply flow
          -> chat tab: history/reply flow
      -> verify action result
      -> update ledger + checkpoint + dashboard
      -> release lock / exit
```

## Core State Machines

### Job / Apply State Machine

```text
collected
  -> matched
  -> closed_skip

matched
  -> detail_verified
  -> closed_skip

detail_verified
  -> apply_in_flight
  -> closed_skip

apply_in_flight
  -> applied
  -> retryable_failure
  -> uncertain_frozen

retryable_failure
  -> detail_verified
  -> closed_skip
```

### Conversation / Reply State Machine

```text
new_incoming
  -> awaiting_user_send
  -> closed_rejected
  -> closed_done

awaiting_user_send
  -> awaiting_recruiter_reply
  -> uncertain_frozen

awaiting_recruiter_reply
  -> new_incoming
  -> stale_positive
  -> closed_rejected
  -> closed_done

stale_positive
  -> awaiting_user_send
  -> closed_done
  -> uncertain_frozen
```

## Failure Philosophy

- Silent failure is not allowed.
- Unknown outcomes do not auto-retry.
- Scheduler collisions skip, not race.
- Missing managed tabs are re-created.
- Missing real chat history blocks auto-send for that conversation.
- Site restriction/login gates stop the current tick explicitly.

## First Implementation Slice

This design is larger than one patch. The first implementation slice should only establish:

1. supervisor runtime state in the ledger
2. managed tab discovery/claim/rebuild
3. single scheduled supervisor entrypoint
4. bounded tick execution with lock + checkpoint

That gives the system one controlling brain before deeper reply-history and state-machine upgrades land.
