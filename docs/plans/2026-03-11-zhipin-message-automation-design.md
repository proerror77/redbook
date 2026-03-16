# Zhipin Message Automation Design

**Date:** 2026-03-11

**Goal:** Extend `tools/auto-zhipin` so chat monitoring can queue and execute two guarded automatic actions while the tool keeps applying to jobs: send the built-in BOSS resume button when recruiters ask for a CV, and send one short follow-up when recruiters send an explicit rejection.

## Scope

- Detect `cv_request` from recruiter text or unread conversation preview.
- Detect explicit rejection signals such as `不合适` / `暂不匹配` / `已招满`.
- Queue actions in the local ledger instead of firing browser clicks directly from message detection.
- Execute queued actions sequentially with rate limits and replay-safe status updates.
- Prefer built-in site buttons for resume sending.
- Generate one short rejection follow-up using JD context and the configured CV/profile summary.

## Non-Goals

- Upload new attachments, email resumes, or fill external application forms.
- Handle passive states such as `已读不回` or system-side silent rejection.
- Turn the prototype into a general workflow engine.

## Design

### 1. Detection And Queueing

`monitor_messages.js` continues to collect conversation snapshots, but it will now also:

- compare current conversation previews to the last stored preview
- treat unread preview changes as inbound recruiter signals even when the thread is not currently open
- create action records for:
  - `send_resume_button`
  - `send_text_reply`

The detection layer only records intent and payload. It does not click UI controls directly.

### 2. Action Execution

Add a reusable action runner that:

- loads pending actions
- re-opens the matching conversation
- verifies whether the action is still needed
- executes at most `chat.maxAutoActionsPerRun`
- updates action status to `completed`, `skipped`, or `failed`

The runner must be idempotent. If a run is interrupted, the next run checks ledger state and visible chat state before retrying.

### 3. Resume Sending

When a recruiter asks for a CV:

- first look for built-in send controls such as `发送简历`, `投递简历`, `发简历`
- only click one of those controls
- if no built-in control exists, fall back to a conservative text reply
- never attempt upload dialogs or off-site submission

### 4. Rejection Follow-Up

When the latest recruiter message is an explicit rejection:

- build one short sentence from:
  - configured candidate profile summary / focus keywords
  - best-effort matched job title and summary from the ledger
- send only one follow-up message
- avoid repeated follow-ups via cooldown and dedupe

### 5. Persistence

Extend `ledger.json` with:

- `actions`
- richer conversation metadata such as last preview text and last preview timestamp

Each action stores:

- `id`
- `conversationId`
- `messageId`
- `jobId`
- `type`
- `status`
- `reason`
- `payload`
- `createdAt`
- `executedAt`

### 6. Safety Rules

- Run actions sequentially, never in parallel.
- Cap automatic actions per run.
- Skip if the same message already produced a completed action.
- Skip rejection follow-up unless the source message is a clear rejection.
- Keep browser behavior single-page and background-friendly.

## Planned Code Areas

- `tools/auto-zhipin/lib/reply.js`
- `tools/auto-zhipin/lib/store.js`
- `tools/auto-zhipin/lib/zhipin.js`
- `tools/auto-zhipin/scripts/monitor_messages.js`
- `tools/auto-zhipin/scripts/reply_worker.js`
- `tools/auto-zhipin/config.example.json`
- `tools/auto-zhipin/README.md`
- `tools/auto-zhipin/tests/*.test.js`
