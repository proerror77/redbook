# Social Media App Research And Writing Workflow

> Purpose: handle social media app research, writing, and asset preparation without accidentally publishing, replying, commenting, following, or changing account state.

## Scope

This workflow covers:

- X.com research, timeline sampling, account/content diagnosis, drafts, threads, and writing review.
- Xiaohongshu search, note detail review, account content-data readback, drafts, card storyboards, and image assets.
- Cross-platform translation between X.com and Xiaohongshu.

It does not cover publishing. Publishing remains `approved-publish` and must use the platform-specific publish workflow only after explicit user confirmation.

## Hard Gate

When the user says "只收集资料", "review", "写作", "不发布", or equivalent:

- Allowed: search, read, timeline sample, note detail, content-data, notification readback, wiki query, draft, review, storyboard, prompt, image asset generation.
- Blocked: publish, reply, comment, like, follow, unfollow, delete, edit profile, send DM, or submit platform forms.
- If a tool can both read and write, run only the read subcommands and state the mode as `research-only`.

## Evidence Targets

For daily X/social research, the minimum evidence set is:

- `05-选题研究/X-每日日程-YYYY-MM-DD.md`
- `05-选题研究/X-timeline-fresh-following-YYYY-MM-DD.md`
- `05-选题研究/X-timeline-fresh-following-YYYY-MM-DD.json`
- `05-选题研究/X-互动队列-YYYY-MM-DD.md`
- `05-选题研究/X-互动队列-YYYY-MM-DD.json`

`X-timeline-sample-YYYY-MM-DD.*` is useful supplementary evidence, but it is not a replacement for the fresh following sample when answering "今天 X 上有什么".

## Default Commands

Check current state:

```bash
tools/redbookctl status
tools/redbookctl workflow-health
tools/redbookctl social-loop status
```

Run daily social research without publishing:

```bash
tools/redbookctl daily
tools/redbookctl social-loop run --step collect
```

Run browser-free fallback only when X/browser login is unavailable:

```bash
tools/redbookctl daily --skip-x
```

When using `--skip-x`, final answers must state that X timeline evidence is missing.

## Closed Loop

The social media flow is a no-publish loop, not a one-shot daily report:

1. Observe: `tools/redbookctl social-loop status`
2. Collect: `tools/redbookctl social-loop run --step collect`
3. Verify: check fresh following count, engagement candidates, and missing artifacts.
4. Review: `tools/redbookctl social-loop review`
5. Decide: select, reject, or save candidate signals as topic decision cards.
6. Draft/Review: wiki query, local draft, platform-specific writing review, storyboard, or prompt.
7. Writeback: save the report/draft/wiki/progress record.
8. Next: `tools/redbookctl social-loop next`

The loop is complete for a day only when:

- Daily artifacts exist.
- Fresh following is sufficient or the evidence gap is explicit.
- Engagement queue has candidates or the shortage is explicit.
- `docs/reports/social-loop-YYYY-MM-DD.md` exists.
- The next action is one of: pick a topic, write local draft, save to wiki, or wait for user direction.

The loop is still open when the system only collected data but did not produce a review/decision artifact.

## Writing Flow

1. Collect evidence first: daily report, fresh following timeline, search/competitor notes, or user-provided links.
2. Run editorial decision: short comment, thread, long article, Xiaohongshu card post, or "save only".
3. Query wiki before planned content.
4. Draft per platform:
   - X.com: one sharp claim, low friction, no forced XHS structure.
   - Xiaohongshu: business/manager reader task, saveable card logic, not a copied X thread.
5. Review:
   - X.com: `/x-mastery-mentor`.
   - Xiaohongshu: enterprise reader usefulness, business scenario, ROI/risk, flow impact, actionability.
6. Prepare assets:
   - Use `/article-visual-storyboard` before image generation.
   - Use `/baoyu-xhs-images` for Xiaohongshu cards.
   - Keep X and Xiaohongshu canvas/crops separate.

## Closeout

Before claiming the research/writing loop is ready:

- `tools/redbookctl status` shows social collection complete, or the missing evidence is named.
- `tools/redbookctl social-loop status` reaches `decision_ready` or names the blocked phase.
- `docs/reports/social-loop-YYYY-MM-DD.md` exists after review.
- Draft/review/storyboard artifacts are saved under the content package or `docs/reports/`.
- `tasks/progress.md` records what was collected, what is still missing, and the next no-publish action.
