# X Engagement Reply Workflow

> Purpose: keep X replies human, account-aligned, and verifiable. Use this for any request to reply from the current X timeline.

## Trigger

Use this workflow when the user asks to reply to posts from X timeline, expand engagement replies, test reply batches, or operate the account in comment sections.

## Required Sequence

1. Browser and account preflight
   - Run `tools/redbookctl browser --json`.
   - Run `tools/redbookctl x-login --timeout-ms 45000`.
   - Confirm the account is `Smileyface @0xcybersmile`.
   - Reuse existing Chrome/CDP tabs. Do not open a fresh profile unless reuse is unavailable.

2. Candidate collection
   - Use current X timeline evidence.
   - Gather more candidates than needed.
   - Exclude already-replied source status URLs using prior reply logs.
   - Exclude repeated replies to the same account when possible.
   - Exclude low-fit posts: pure entertainment, low-effort viral clips, political fights, low-context outrage, sexual/lowbrow jokes, and topics that cannot naturally connect to the account.

3. Quality filter
   - Prefer AI agent, coding agent, Codex, Claude Code, workflow, tool stack, enterprise AI adoption, ROI, permissions, review, audit, rollback, organization memory, crypto data quality, prediction markets, and trading-system risk.
   - Do not pad the batch. If only 8 good replies exist, publish 8 rather than 20 weak ones.
   - Avoid forcing life/entertainment posts into "product / system / workflow / rules" commentary.

4. Draft replies first
   - Write one reply per source post.
   - Match source language exactly: English posts get English replies; Chinese posts get Chinese replies.
   - Reply to a concrete detail in the source post.
   - Keep the reply short and natural.
   - Prefer personal/use-case phrasing: "我最想先解决..." / "对我最大的价值是..." / "这点我也遇到过..."
   - Avoid template phrases: `本质`, `真正`, `底层结构`, `系统设计`, `这类`, `最值得`, `很关键`, and generic "产品/规则/工作流" abstractions unless the source post is actually about that topic.

5. Review gates
   - Run a real `x-mastery-mentor` style content review before script review.
   - Check:
     - Does it sound like a person responding to the post?
     - Does it mention a concrete detail from the post?
     - Is it account-aligned?
     - Could the author reasonably reply back?
     - Would it look like a batch AI comment?
   - Then run `reply_engagement_queue.mjs --review-only`.
   - If either review fails, rewrite or drop the candidate.

6. Batch safety
   - For a new batch style, publish a 5-reply test first.
   - Only expand after the user accepts the style.
   - For larger batches, do one live smoke reply, then continue the batch.

7. Publish and verify
   - Use `tools/auto-x/scripts/reply_engagement_queue.mjs`.
   - Record reviewed JSON, review markdown, final JSONL, and final markdown under `05-选题研究/`.
   - Verify every reply through `with_replies` and capture the reply status URL.
   - Do not report success from script stdout alone.

## Completion Evidence

Completion requires:

- review result: `approved=N blocked=0`
- publish result: `posted_verified=N failed=0`
- `unique_sources=N`
- `unique_verify_urls=N`
- saved reviewed JSON, review markdown, JSONL, and markdown summary
- `tasks/progress.md` update

## Correction Path

If the user says replies are weak or AI-sounding:

1. Stop expanding.
2. Re-read the final reply log.
3. Create a quality review file that classifies keep / delete / rewrite.
4. Delete only after explicit user confirmation.
5. Verify deleted reply URLs are absent.
