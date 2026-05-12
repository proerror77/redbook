# Active Tasks

> 当前任务面板。历史任务继续保留在 `tasks/todo.md`，本文件只放正在推进或需要用户决策的事项。

## 2026-05-12 Lane A daily-first 启动检查

- Owner: Codex
- Source: User clarified that when asking “今天有什么选题”, the agent should first check whether today's daily task already ran.
- Status: completed

### Cleanup Plan

- [x] Add daily-run check as the first step for Current Topics / Lane A.
- [x] Sync shared playbook into `AGENTS.md` / `CLAUDE.md`.
- [x] Add a contract test for the daily-first behavior.
- [x] Run checks, record progress, and commit scoped changes.

### Review

- Lane A now starts by checking whether today's daily evidence exists via `tools/redbookctl status` plus today's daily report, fresh following timeline, and engagement queue.
- If today's evidence is missing, the agent should run `tools/redbookctl daily` before answering, unless the user explicitly asks to only read existing materials or not fetch external data.
- This rule is now in `AGENTS.md`, `CLAUDE.md`, shared playbook, semantic layer, and workflow start guide.

## 2026-05-12 AGENTS.md 启动语义修正

- Owner: Codex
- Source: User asked whether the rules/workflows should live in `AGENTS.md` and asked to correct it.
- Status: completed

### Cleanup Plan

- [x] Confirm current `AGENTS.md` already embeds the shared playbook but still has an outdated top-level project description.
- [x] Make `AGENTS.md` itself say Redbook is an Agents OS and contains the mandatory startup contract.
- [x] Keep detailed workflow docs in `docs/reference/` while making the `AGENTS.md` routing rule explicit.
- [x] Sync shared playbook, run contract checks, record progress, and commit scoped changes.

### Review

- `AGENTS.md` now starts as `Redbook Agents OS`, with a mandatory `启动必读` checklist before the detailed workflow sections.
- Shared playbook now includes `AGENTS.md 分层规则`: core startup constitution belongs in `AGENTS.md`; longer workflows belong in `docs/reference/` but cannot bypass `AGENTS.md`.
- `CLAUDE.md` was synced for parity.

## 2026-05-12 Agent Teams 工作流 Review 与固化

- Owner: Codex + Agent Teams
- Source: User asked to use Agent Teams to review the project and fix recurring workflow issues.
- Status: completed

### Cleanup Plan

- [x] Split the review into semantic docs, tooling evidence, and Agent Teams / external-method ingestion lanes.
- [x] Collect findings from parallel review agents.
- [x] Add a canonical Agent Teams review protocol and pin fresh X timeline evidence rules.
- [x] Add a durable semantic-layer method-ingestion path for reusable user-supplied frameworks.
- [x] Run workflow consistency checks and commit scoped changes.

### Review

- Added `docs/reference/agent-teams-review-protocol.md` so project review has a canonical semantic boot, lane split, findings format, synthesis, and durable writeback order.
- Added `docs/reference/external-method-ingestion-workflow.md` so future “固定下来 / 下次复用 / 更新到系统” corrections become verifiable semantic-layer rules, tool gates, wiki knowledge, or lessons.
- Hardened Lane A to use `X-timeline-fresh-following-YYYY-MM-DD` from following chronological timeline as the primary “today” evidence; home/for-you samples and engagement queues are supplemental.
- Synced shared playbook into `AGENTS.md` and `CLAUDE.md`.

## 2026-05-12 Lane A timeline 100 条样本修正

- Owner: Codex
- Source: User pointed out that daily topic selection should first inspect 100 X timeline posts, not infer from the 20-item engagement queue or stale topic artifacts.
- Status: completed

### Cleanup Plan

- [x] Locate the daily timeline / engagement queue path and confirm the current 20-item filtered queue is not enough for Lane A.
- [x] Update the daily X queue script to save a target-100 raw home-timeline sample before filtering.
- [x] Update Lane A workflow docs and shared playbook so future topic selection reads the raw sample first.
- [x] Run focused syntax/contract checks and record progress.
- [x] Commit scoped changes.

### Review

- `build_engagement_queue.py` now saves `X-timeline-sample-YYYY-MM-DD.md` / `.json` from the current home timeline before ranking the 20-item engagement queue.
- `tools/redbookctl daily` / `tools/daily.sh` docs now describe the raw timeline sample as the first Lane A evidence.
- Lane A workflow docs now require the target-100 raw sample and force sample-gap disclosure when fewer than 100 posts are captured.

## 2026-05-12 Redbook Agents OS 语义层

- Owner: Codex
- Source: User asked whether this project should have a semantic layer and make the folder an Agents OS system.
- Status: completed

### Cleanup Plan

- [x] Define the project-level Agents OS semantic contract: intent, lane, state, evidence, publish gate, recovery.
- [x] Add the contract to `docs/reference/agents-os-semantic-layer.md`.
- [x] Wire the startup rules into `docs/shared/redbook-playbook.md` and sync to `AGENTS.md` / `CLAUDE.md`.
- [x] Run focused checks, record progress, and commit scoped changes.

### Review

- Added `docs/reference/agents-os-semantic-layer.md` as the stable semantic contract for Redbook as an Agents OS.
- Shared playbook now has an `Agents OS 启动语义` section that forces lane routing, active-state read, evidence target, publish gate, verifier, and recovery behavior.
- Synced the shared block into `AGENTS.md` and `CLAUDE.md`.

## 2026-05-12 Agents OS 全面 review 与 Wiki OS 补强

- Owner: Codex
- Source: User asked for a comprehensive project review and pointed out the knowledge base / Wiki function should be in the semantic layer.
- Status: completed

### Cleanup Plan

- [x] Review project roles beyond social media publishing: wiki, knowledge base, content package, evidence ledger, tools.
- [x] Produce a concise review report under `docs/reports/`.
- [x] Update `docs/reference/agents-os-semantic-layer.md` so Wiki / Knowledge OS is first-class.
- [x] Update shared playbook and sync `AGENTS.md` / `CLAUDE.md`.
- [x] Run wiki lint and consistency checks; record progress and commit.

### Review

- Review report: `docs/reports/2026-05-12-redbook-agents-os-review.md`.
- Wiki lint clean on 2026-05-12: missing index 0, dangling index 0, orphan pages 0, stale dates 0, overview stale false.
- Semantic layer now includes `Knowledge OS Contract`, query / ingest / lint rules, and knowledge states.
- Shared playbook boot sequence now requires deciding whether a task needs Wiki query / ingest / lint.

## 2026-05-12 OpenAI Deployment Company 评论内容包

- Owner: Codex
- Source: User provided OpenAI X status `2053824997777457651` and asked to use the workflow to write a related article/comment.
- Status: published_verified
- Harness run: `20260511-215113-openai-deployment-company-企业必须-ai-native-重做一遍-508899`

### Cleanup Plan

- [x] Verify the X source and preserve the source markdown.
- [x] Query wiki for enterprise AI / AI native / workflow / agent governance material.
- [x] Create the Lane C content package with decision card, platform orchestration, X longform, short comment, review, and publish checklist.
- [x] Run focused file checks and update progress.
- [x] Commit scoped changes.

### Review

- Created the content package under `01-内容生产/02-制作中的选题/2026-05-12-OpenAI-Deployment-Company企业必须AI-native重做一遍/`.
- Preserved the OpenAI source thread at `x-to-markdown/OpenAI/2053824997777457651.md`.
- Main recommendation: publish as X Article / X longform; optional quote version is available for faster hotspot response.
- Publishing remains blocked until the user explicitly confirms.
- Content package commit: `6111595` (`Add OpenAI deployment company content package`).
- Published as X Article: https://x.com/0xcybersmile/status/2053961416122700186.
- First publish included an internal `发布清单` section; fixed via X Article edit and verified the live article no longer contains it.

## 2026-05-11 Wiki ingest 改用 Codex CLI

- Owner: Codex
- Source: User pointed out daily wiki ingest should use Codex CLI instead of Claude CLI.
- Status: completed

### Cleanup Plan

- [x] Locate the daily wiki ingest runner and the daily script callsite.
- [x] Replace the actual content-write runner with `codex exec` under the repo working directory.
- [x] Update daily script logs so failures no longer mention Claude CLI.
- [x] Run shell/static checks, record progress, and commit scoped changes.

### Review

- `tools/wiki-auto/run_wiki_ingest.sh` now calls `codex --ask-for-approval never exec -C "$ROOT_DIR" -s workspace-write -`.
- `tools/auto-x/scripts/run_daily.sh` now logs `运行 Codex CLI wiki ingest...`.
- Real 2026-05-11 wiki ingest completed through Codex CLI and appended `wiki/log.md`.
- Lint passed with no missing index entries, dangling index entries, orphan pages, stale index dates, or stale overview.

## 2026-05-09 企业导入 AI 长文与配图

- Owner: Codex
- Source: User provided a detailed AI Readiness thesis and asked to complete the longform post with images through the Redbook workflow.
- Status: review_ready_pending_publish_confirmation
- Harness run: `20260509-020521-企业导入ai不是买模型而是重构管理系统-86c12b`

### Cleanup Plan

- [x] Query wiki and confirm this belongs to the AI Agent enterprise-adoption main line.
- [x] Verify official external references for Microsoft AI strategy, NIST AI RMF, Google Cloud data governance, and ISO/IEC 42001.
- [x] Create the Lane C content package: sources, platform orchestration, longform draft, X Article version, Xiaohongshu card copy, storyboard, QA, and publish checklist.
- [x] Generate or prepare image assets with the GPT-Image2 editorial prompt workflow.
- [x] Run harness gates plus markdown/link checks, update progress, and commit scoped changes.

### Review

- Created the full Lane C content package under `01-内容生产/02-制作中的选题/2026-05-09-企业导入AI不是买模型而是重构管理系统/`.
- Drafted the longform article, X Article inline-image version, Xiaohongshu enterprise card copy, storyboard, QA report, and publish checklist.
- Generated 4 local-rendered 16:9 PNG article images after Tuzi returned `Invalid Token` and Google image generation returned quota exhaustion.
- Harness review gate passed; publishing remains blocked until the user explicitly confirms.


## 2026-05-08 BOSS Codex Chrome Extension Priority

- Owner: Codex
- Source: User installed the Codex Chrome extension and requested that BOSS apply work prefer it, with Computer Use only as fallback.
- Status: completed

### Cleanup Plan

- [x] Confirm current callable browser tool surfaces and stop using the rejected Playwright MCP path.
- [x] Update BOSS workflow docs/skill so Codex Chrome extension is the preferred live-apply surface.
- [x] Keep scripts scoped to filtering, local ledger, dry-run gates, and evidence recording; do not claim shell scripts can call the Codex extension unless a real extension API is exposed.
- [x] Run focused checks and record the result in `tasks/progress.md`.

### Review

- Codex Chrome Extension is now the documented first-choice browser control surface for Codex App browser work.
- BOSS live apply docs now prefer Codex Chrome Extension + the user's normal logged-in Chrome profile.
- Playwright MCP, Chrome DevTools/CDP, and Computer Use are documented as fallback / diagnostic / explicit-experiment paths, not default substitutes.

## 2026-05-08 BOSS Current Chrome Script Repair

- Owner: Codex
- Source: User asked whether the BOSS page can be operated after login, then asked to try repairing the script.
- Status: completed

### Cleanup Plan

- [x] Reproduce the current blockers from existing scripts and browser state: no CDP endpoint plus post-apply success overlay remaining on the page.
- [x] Fix the post-apply cleanup path so successful "已向BOSS发送消息" overlays do not block the next job.
- [x] Add a small current-Chrome diagnostic script for the no-CDP / AppleScript-JS fallback boundary.
- [x] Run focused BOSS script tests and syntax checks.
- [x] Record outcome in `tasks/progress.md` and commit scoped changes.

## 2026-05-06 X Longform Inline Image Guard

- Owner: Codex
- Source: User pointed out today's longform images were attached as a gallery instead of inline article illustrations, and asked why X shows AI-generated labels.
- Status: completed

### Cleanup Plan

- [x] Verify the live X post layout and AI-generated label source with platform/asset evidence.
- [x] Add a fail-closed guard so regular X posts cannot accidentally publish longform multi-image content as a gallery.
- [x] Update Redbook workflow docs so X longform inline illustrations must use X Article markdown or a structured thread, not regular post attachments.
- [x] Create a corrected X Article markdown artifact for today's longform so the intended inline structure is explicit.
- [x] Run focused smoke checks, record progress, and commit.

### Review

- Live X status `2051856551867236845` contains `由 AI 生成`; local PNGs contain OpenAI C2PA metadata (`softwareAgent=gpt-image pre-2.0`, `trainedAlgorithmicMedia`), so the label is platform provenance handling rather than script text.
- The published longform used a regular X post; X rendered four images as a gallery, so they could not bind to the intended article sections.
- `x-browser.ts` now resolves image paths to absolute paths and refuses `--submit` for long text plus multiple images unless `--allow-longform-gallery` is explicit.
- Workflow docs now require X Article inline images or a structured thread for longform body illustrations.
- Added `X-Article发布版.md` with cover plus three inline body images for the corrected layout artifact.

## 2026-05-06 Three X Articles Agent Team

- Owner: Codex + native subagents
- Source: User selected today's topic #4 as longform, #2 as news short comment, and #1 as short article, all with images, using Agent Teams and workflow.
- Status: completed

### Cleanup Plan

- [x] Run three disjoint content lanes in parallel: org-memory longform, Coinbase news short comment, Codex/Claude workflow-entry short article.
- [x] Ensure every package has source notes, final draft, review, image storyboard/prompt, and publish checklist.
- [x] Generate or prepare non-SVG image assets using the Codex image workflow after copy review.
- [x] Run X mentor/workflow review and verify package file consistency.
- [x] Publish in requested order after user continued execution, then verify platform status URLs and main-post media.

### Review

- Published fourth topic as X longform with four main-post images: `https://x.com/0xcybersmile/status/2051856551867236845`.
- Published second topic as X news short comment with one image: `https://x.com/0xcybersmile/status/2051856799318626347`.
- Published first topic as X short article with one image: `https://x.com/0xcybersmile/status/2051856982580297819`.
- Verification passed through `x-browser.ts --submit`: expected account `@0xcybersmile`, composer media count before submit, status URL extraction, and main status media detection.
- First longform attempt failed closed because relative image paths produced zero composer media; no text-only post was submitted. Retried with absolute image paths and verified.

## 2026-05-05 X Daily Engagement Queue

- Owner: Codex
- Source: User asked to add a daily task that replies to 20 high-interaction timeline posts to build account liveness.
- Status: completed

### Cleanup Plan

- [x] Make the daily X engagement task prioritize high-interaction people/posts from the current timeline.
- [x] Generate 20 reply candidates/drafts by default without auto-publishing.
- [x] Preserve the language-matching and account-theme guardrails.
- [x] Wire the task into the canonical daily workflow and docs.
- [x] Run focused syntax/tests and record completion.

### Review

- Daily now generates `X-互动队列-YYYY-MM-DD.md` / `.json` from current X timeline by default.
- The queue keeps a minimum weighted interaction threshold (`likes + retweets*2 + replies*3`) so low-energy posts do not fill the list just because they match keywords.
- Reply drafts remain semi-automatic only: the workflow builds account liveness through reviewable, language-matched comments, not auto-posting.
- Generated today's queue with 20 candidates using the existing logged-in Chrome/CDP `9224`.
- Verification passed: Python compile, `test_x_utils.py`, shell syntax checks, and `git diff --check`.

## 2026-05-05 BOSS Browser Status Probe

- Owner: Codex
- Source: User asked to test whether BOSS login/status reading is correct and use Browser Tracing if not.
- Status: completed

### Cleanup Plan

- [x] Verify existing BOSS/CDP session without opening a new browser or clicking live apply controls.
- [x] Use Browser Tracing because the first probe detected security-check context.
- [x] Fix the status reader if the canonical `redbookctl browser` entrypoint misreports the available session.
- [x] Run focused smoke checks and record completion.

### Review

- Current Chrome CDP is on `127.0.0.1:9224`; `9222` is not running.
- BOSS detail page shows logged-in account evidence (`sonic`, `消息`, `简历`) and visible `立即沟通`; no visible auth/security challenge remains.
- Browser Trace captured the current detail page without target URL drift; live apply is still blocked by policy gate for `company_size_excluded`, not by login failure.
- `tools/redbookctl browser` now auto-scans `9222`, `9223`, and `9224`, so it reports the reusable BOSS session instead of failing closed on missing `9222`.
- Verification passed: `tools/redbookctl browser`, `tools/redbookctl browser --json`, explicit bad-port smoke, `node --check`, `bun tools/redbookctl.ts browser --help`, `node --test tools/tests/redbookctl_contract.test.mjs`, and `git diff --check`.

## 2026-04-30 Beneficiary Cold-Read Review Workflow

- Owner: Codex
- Source: User shared MinLiBuilds X article and asked how its writing methodology differs from ours and how to integrate it into the workflow.
- Status: completed

### Cleanup Plan

- [x] Extract the external method into Redbook-native concepts instead of copying the article.
- [x] Compare it against existing `选题决策门` / `跨平台账号编排` / `原创成长内容闭环`.
- [x] Add a durable workflow rule for persona, beneficiary, and cold-read review before planned publishing.
- [x] Update shared playbook / reference docs / wiki index and sync instruction mirrors.
- [x] Run consistency checks and record completion.

### Review

- The X status resolved through `t.co` to X Article `2049481948456976385`; anonymous access was blocked, so the article was read through the existing logged-in Chrome CDP session on `127.0.0.1:9224`.
- MinLiBuilds' method is now mapped as a publishing-stage gate, not a replacement for topic selection or platform orchestration.
- Added `受益人 + 冷读审稿门`: planned content must record persona, concrete beneficiary, and 3 likely reader drop-off points before publish confirmation.
- Added `wiki/方法论/受益人冷读审稿.md` and indexed it in `wiki/index.md` / `wiki/overview.md`.
- Synced shared playbook into `AGENTS.md` and `CLAUDE.md`.
- Verification passed: targeted `rg` consistency check and scoped `git diff --check`.

## 2026-04-30 Editorial Decision Workflow Stabilization

- Owner: Codex
- Source: User is dissatisfied that links jump straight into draft/package generation instead of first discussing post shape and using the fixed article structures.
- Status: completed

### Cleanup Plan

- [x] Add a fixed editorial decision gate between topic/link intake and content production.
- [x] Make morning topic review and pasted-news-link review use the same recommendation card.
- [x] Require agent to recommend one shape, state tradeoffs, and wait for user's shape decision before creating full content packages.
- [x] Lock per-shape output structures for short comment, longform, X thread/article, and Xiaohongshu enterprise cards.
- [x] Update shared playbook, skill manifest, and synced instruction mirrors.
- [x] Add a durable reference doc and progress record.

### Review

- Added `docs/reference/editorial-decision-workflow.md` as the canonical decision gate for morning topics and pasted news links.
- Updated `docs/shared/redbook-playbook.md`: every topic/link now first gets a decision card before drafting or package creation unless the user has already decided the shape.
- Updated Lane B so short comments use the fixed structure: news anchor -> account judgment -> why it matters -> link/reply structure.
- Updated `docs/reference/skills-manifest.md` so the active entrypoint list names the decision workflow.
- Synced shared playbook into `AGENTS.md` and `CLAUDE.md`.
- Added wiki method `wiki/方法论/选题决策门.md` and indexed it in `wiki/index.md` / `wiki/overview.md`.

## 2026-04-30 Cross-Platform Account Direction Workflow

- Owner: Codex
- Source: User clarified that X and Xiaohongshu should share one account direction: X carries judgment, Xiaohongshu translates the same thesis into business / enterprise AI application.
- Status: completed

### Cleanup Plan

- [x] Review current Redbook Lane C, wiki, recent article packages, and publish/checklist artifacts for cross-platform drift.
- [x] Add an account-thesis gate so selected topics must first become one core proposition before platform writing starts.
- [x] Add an XHS enterprise-application gate: no direct longform splitting; cards must map to business scenario, management question, ROI/risk/workflow implication, and action checklist.
- [x] Add durable wiki/methodology support so the direction is searchable before future drafting.
- [x] Update the current orchestration package with a platform orchestration note for X vs Xiaohongshu.
- [x] Run doc sync and consistency checks.

### Review

- Added the core rule: X.com carries judgment and industry signal; Xiaohongshu translates the same thesis into enterprise / business AI application.
- Lane A now asks whether a topic can be translated into Xiaohongshu's enterprise/business reader task; otherwise it remains X-only.
- Lane C now requires `核心命题` and `平台编排` before Xiaohongshu generation.
- Wiki now has `wiki/方法论/跨平台账号编排.md`, and `AI Agent企业导入与协作` records the 2026-04-30 direction correction.
- Current orchestration package now has `平台编排.md` and an updated `发布清单.md` showing X published and Xiaohongshu pending enterprise-oriented rewrite.
- Verification passed: shared playbook sync, targeted `rg` consistency check, and `git diff --check`.

## 2026-04-30 BOSS Batch Apply Planning And Deduping

- Owner: Codex Agent Teams
- Source: User asked to use Agent Teams to plan and execute BOSS AI-role deduped applications from jobs/chat pages with local record consolidation
- Status: completed

### Cleanup Plan

- [ ] Confirm the current normal-Chrome BOSS session can stably access `chat` and `jobs` without Playwright-triggered bounce-back.
- [ ] Audit local ledger, chat triage, and manual dedupe artifacts to identify trustworthy duplicate-avoidance signals.
- [ ] Audit current apply scripts and decide the safest executable path for today's run.
- [ ] Refresh dedupe state from live chat data before any apply attempt.
- [ ] Start low-risk preflight on AI-related roles and only then move into serial apply execution.

## 2026-04-30 Lane A Current-Timeline Guard

- Owner: Codex
- Source: User pointed out topic recommendations were old backlog items, not today's X topics
- Status: completed

### Cleanup Plan

- [x] Make the daily report label backlog/publish reminders as non-current topic sources.
- [x] Add a fail-closed source contract for Lane A so missing X timeline evidence cannot be replaced by old drafts.
- [x] Update shared playbook/docs and sync generated mirrors.
- [x] Run focused smoke checks and commit only scoped workflow changes.

### Review

- `tools/auto-x/scripts/daily_schedule.py` now labels backlog as `发布提醒（非今日选题来源）` and writes an explicit `当日选题来源判定` block into the daily report.
- Lane A now fails closed in the shared playbook: when X timeline / X search / X Pro are unavailable, the workflow must disclose the evidence gap and must not substitute old drafts, old backlog, or the topic pool.
- `docs/shared/redbook-playbook.md`, `AGENTS.md`, `CLAUDE.md`, and `docs/reference/skills-manifest.md` now all state the same rule so the constraint is not chat-only.
- Verification passed: `bash -n tools/auto-x/scripts/run_daily.sh`, `python3 -m py_compile tools/auto-x/scripts/daily_schedule.py`, `python3 tools/sync_redbook_playbook.py`, and report grep checks for the new guard text.

## 2026-04-30 AI Agent Orchestration Longform

- Owner: Codex
- Source: User selected the orchestration angle and asked for a long article with images, then pointed out the workflow had skipped review / de-slop / formatting steps
- Status: completed

### Cleanup Plan

- [ ] Build a proper Lane C content package for the orchestration topic under `01-内容生产/02-制作中的选题/`.
- [ ] Write the longform draft from current X / Cursor SDK / Warp / Oz evidence and repo wiki context.
- [ ] Run a de-slop and editorial pass so the draft reads like account-native judgment instead of generic AI copy.
- [ ] Produce `图文分镜.md`, image anchors, and a publish checklist for later platform adaptation.
- [ ] Verify file set consistency and keep the package ready for next-step review/publishing.

## 2026-04-30 BOSS Apply Safety Repair

- Owner: Codex
- Source: User asked to fix review findings and test whether the safer BOSS flow is usable
- Status: completed

### Cleanup Plan

- [x] Make BOSS dry-run a read-only preflight that never clicks the primary CTA.
- [x] Disable stale live batch apply entrypoints unless an explicit environment gate is set.
- [x] Align example config with conservative supervisor defaults.
- [x] Add target URL identity validation to Playwright apply ledger writes.
- [x] Exclude legacy tests from default `npm test` and run focused verification.

### Review

- BOSS dry-run now returns `dry_run_preflight` from a no-click CTA probe; tests assert the dry-run script contains no click/dispatch path.
- `auto-zhipin` now prefers the repo vendor OpenCLI boss core over global OpenCLI to avoid version drift during apply/search tests.
- Stale batch live apply requires `BOSS_ENABLE_LIVE_APPLY=1`; default invocation aborts before search/apply.
- `config.example.json` supervisor defaults are conservative: disabled and paused.
- `boss_apply_playwright` records failed instead of applied when the actual job detail id cannot be verified against the requested URL.
- Verification passed: `npm test` in `tools/auto-zhipin` reports 109/109 pass; changed scripts pass `node --check`; live batch gate smoke aborts as expected; `git diff --check` passes.

## 2026-04-30 Redbookctl TS Control Surface Migration

- Owner: Codex
- Source: User asked to continue after setting TS/Bun as the default workflow runtime
- Status: completed

### Cleanup Plan

- [x] Add a TS/Bun `redbookctl` control surface while preserving the existing `tools/redbookctl` command.
- [x] Move low-risk browser/X login dispatch into TS first.
- [x] Keep unmigrated Python commands available through an explicit legacy delegation path.
- [x] Update docs to show TS as canonical and Python as legacy implementation.
- [x] Run wrapper/help/smoke checks and commit the scoped migration start.

### Review

- `tools/redbookctl` now executes `tools/redbookctl.ts` with Bun.
- `browser` and `x-login` dispatch live in TS; `browser --json` still returns structured CDP health without opening a page.
- Unmigrated commands continue through an explicit legacy delegation to `tools/redbookctl.py`, preserving the existing command surface.
- Docs now mark `redbookctl.ts` as canonical and `redbookctl.py` as legacy delegated implementation.
- Verification passed: `tools/redbookctl --help`, `tools/redbookctl browser --help`, `tools/redbookctl x-login --help`, `tools/redbookctl status --json`, `tools/redbookctl browser --json`, `python3 -m py_compile tools/redbookctl.py`, and `git diff --check`.

## 2026-04-30 Redbookctl TS Dispatch Migration

- Owner: Codex
- Source: User said continue after TS control surface landed
- Status: completed

### Cleanup Plan

- [x] Move low-risk command dispatch from legacy Python into `tools/redbookctl.ts`.
- [x] Keep existing Python business scripts as called tools, not as the control surface.
- [x] Update docs to show which commands are now TS-dispatched.
- [x] Run non-destructive help/smoke checks for migrated commands.
- [x] Commit the scoped dispatch migration.

### Review

- `daily`, `draft`, `publish-record`, `xhs-health`, `challenge`, `emerge`, `draft-seed`, and `close-run` now dispatch from `tools/redbookctl.ts`.
- Existing implementation scripts remain in place: daily shell runner, Python harness, publish ledger recorder, XHS skill script, and content loop are now called by the TS control surface.
- `status`, `pick`, `publish`, `workflow-health`, and `publish-health` remain legacy Python until the status/publish-gap collector has a JSON contract fixture.
- Verification passed: help smoke for migrated commands, `status --json`, `browser --json`, `draft` empty guidance, `close-run` missing-id validation, Python compile for legacy file, and `git diff --check`.

## 2026-04-30 Redbookctl Status Contract Fixture

- Owner: Codex
- Source: User said continue after TS dispatch migration
- Status: completed

### Cleanup Plan

- [x] Add a fixture that documents the required `status` and `workflow-health` JSON paths.
- [x] Add a no-dependency `node --test` contract check against current and legacy redbookctl output.
- [x] Verify current default wrapper matches legacy output before TS migration of status collection.
- [x] Document the contract test as the next migration guard.

### Review

- Added `tools/tests/fixtures/redbookctl-contract.json` with required JSON paths for status, workflow-health actions, and publish gates.
- Added `tools/tests/redbookctl_contract.test.mjs`.
- The test runs `tools/redbookctl status --json` and `tools/redbookctl legacy status --json`, then does the same for `workflow-health --json`; it checks shape and exact parity while the legacy fallback is still authoritative.
- Verification passed: `node --test tools/tests/redbookctl_contract.test.mjs`.

## 2026-04-29 Workflow Review Follow-up Fixes

- Owner: Codex Agent Teams
- Source: User asked Agent Teams to review Redbook and BOSS workflows
- Status: completed

### Cleanup Plan

- [x] Fix BOSS apply defaults so all apply paths are dry-run unless explicitly configured or requested live.
- [x] Stop current-tab BOSS dry-run from being recorded as a real application and hard-stop on verify/auth/restricted states.
- [x] Tighten content harness and publish ledger semantics so `done` and follow-up stages cannot silently mean "not really verified".
- [x] Align workflow docs and skill entrypoints so BOSS, X, and XHS do not route agents to stale paths.
- [x] Run focused tests/static checks and commit the scoped changes.

### Review

- BOSS `boss:apply` now respects `config.apply.dryRun` by default; live apply requires `--dry-run false` or config opt-in.
- BOSS current-tab fallback now pauses on active verify pages, runs runtime health guard before matching/clicking, and records dry-run as `dry_run` instead of `applied`.
- Follow-up publish records now require metrics plus live readback evidence, or explicit closure evidence; `workflow-health` surfaces closure-only follow-ups as unverified instead of silently green.
- Content harness `close-run --status done` now requires the final `retrospect` stage for normal content pipelines, while wiki maintenance/research closures remain allowed.
- BOSS, X, and XHS docs now point to the current canonical entrypoints and mark stale paths as fallback, archived, or historical.

## 2026-04-29 Publish Workflow Hardening Team Fix

- Owner: Codex Agent Teams
- Source: User asked to complete all workflow fixes with Agent Teams
- Status: completed

### Cleanup Plan

- [x] Review X publish submit path, XHS publish path, ledger health, daily gap, and storyboard closure in parallel.
- [x] Make X submit fail closed on account/profile mismatch before any input or click.
- [x] Add XHS health/preflight and prevent `PUBLISH_STATUS` from being treated as verified success without platform evidence.
- [x] Add an operator workflow-health surface for daily report, active harness runs, pending publish confirmations, ledger gaps, and follow-ups.
- [x] Update publish ledger validation and workflow docs.
- [x] Run smoke/static checks and commit the scoped fix.

### Review

- X submit now checks `expected_handle` before typing/uploading/clicking, requires a configured expected handle for `--submit`, defaults submit to the configured publishing profile, and only reuses CDP when `--cdp-endpoint` is explicit.
- XHS now has `tools/redbookctl xhs-health`; RedBookSkills publish paths only print `PUBLISH_STATUS: PUBLISHED` after note link or creator-management evidence is found.
- `tools/redbookctl workflow-health` / `publish-health` now reports daily report gaps, launchd/log health, active publish runs, pending publish confirmations, item-level JSONL gaps, T+1/T+3 due items, and storyboard closure gaps.
- 4/29 missing daily report was regenerated with `--skip-x`; 4/29 AI Agent content package received T+0 JSONL records, a `publish_record` artifact, `published=true`, a retrospective `图文分镜.md`, and the harness run is closed as `done`.
- Remaining health items are intentionally not auto-resolved: the 2026-04-28 Agent long-thread run still needs explicit user publish confirmation, and 2026-04-28 T+1 metrics require live platform readback.

## 2026-04-29 Article Storyboard Layout Workflow

- Owner: Codex
- Source: User approved storyboard workflow and emphasized layout quality
- Status: completed

### Cleanup Plan

- [x] Add a required `图文分镜` gate before image/card generation.
- [x] Add concrete layout QA rules: hierarchy, text budget, safe margins, non-overlap, and regeneration triggers.
- [x] Update image-related skills and shared playbook so article structure and visual-card structure are separated.
- [x] Sync docs, verify consistency, and commit the workflow change.

### Review

- Lane C now separates article structure from visual-card structure: article = linear argument; image/carousel = storyboard.
- Image workflows now require `图文分镜.md` or equivalent with card role, reader task, anchor phrase, layout spec, text budget, hierarchy, and layout QA.
- Layout QA is explicit: headline/subtitle/label limits, >= 8% safe margins, no text-subject overlap, thumbnail readability, and regenerate-on-fail.
- Verification passed: shared playbook sync, `git diff --check`, `python3 -m py_compile tools/sync_redbook_playbook.py`, and `rg` checks for storyboard/layout QA terms across synced docs and active skills.

## 2026-04-29 X Login Workflow Review Fix

- Owner: Codex
- Source: Review found x-login preflight was not strongly bound to the publish profile/account
- Status: completed

### Cleanup Plan

- [x] Force `tools/redbookctl x-login` to inspect the configured publishing profile unless a CDP endpoint is explicitly requested.
- [x] Add expected-handle validation so composer visibility alone cannot pass the preflight.
- [x] Make check-only headless failures fail closed instead of opening a headed recovery browser.
- [x] Surface `x-login` as a publish helper gate and verify positive/negative cases.

### Review

- `tools/redbookctl x-login` now adds `--new-browser` by default, so it checks the configured publish profile instead of opportunistically reusing `9222`.
- `x-browser.ts --check-login` now validates `expected_handle` from config/env or `--expected-handle`; wrong-account checks fail.
- Headless `--check-login` no longer opens headed Chrome on failure; `tools/redbookctl x-login` uses a bounded composer wait and manual recovery stays explicit through `tools/redbookctl x-login --headed --login-wait-ms 600000`.
- User config now includes `expected_handle: @0xcybersmile`.
- Verification passed: Python compile, x-browser help, positive x-login, wrong-handle failure, logged-out-profile failure without headed recovery, publish helper gate text, and diff whitespace check.

## 2026-04-29 Article Visual Metaphor Workflow

- Owner: Codex
- Source: User shared X article `https://x.com/xiaoxiaodong01/status/2048443572119330853`
- Status: completed

### Cleanup Plan

- [x] Extract the reusable article-image method from the referenced X article.
- [x] Add a concrete visual-metaphor planning gate to Redbook longform and image-generation docs.
- [x] Sync shared playbook targets and update the active document-illustrator skill guidance.
- [x] Run doc consistency checks and commit the scoped workflow change.

### Review

- The referenced X article was distilled into a Redbook-specific `visual metaphor map` workflow: anchor phrase, semantic read, visual metaphor, composition, text-image integration, avoid list, and insertion placement.
- Longform Lane C now has a dedicated配图规划 gate before QA, and publish checklists must include each image's anchor phrase and visual metaphor.
- `document-illustrator`, XHS image routing, and article-illustrator guidance now discourage paragraph-summary/decorative images and require viewpoint-serving visual metaphors.
- Verification passed: shared playbook sync, `git diff --check`, `python3 -m py_compile tools/sync_redbook_playbook.py`, and `rg` checks for the new workflow terms across synced docs.

## 2026-04-29 Stable X Login Command

- Owner: Codex
- Source: User asked for a more stable way to handle X.com login
- Status: completed

### Cleanup Plan

- [x] Add a stable `redbookctl` wrapper for X login/composer checks.
- [x] Document the stable path and manual recovery mode in the tools guide.
- [x] Verify the wrapper against the configured `@0xcybersmile` profile.
- [x] Commit the small workflow hardening change.

### Review

- Added `tools/redbookctl x-login` as the stable preflight for the `/baoyu-post-to-x` publishing profile.
- Default mode is headless and non-publishing; `--headed --login-wait-ms 600000` is the manual recovery mode.
- Updated the shared playbook and tools guide so X publishing routes through `x-login` before publish.
- Verification passed: `python3 -m py_compile tools/redbookctl.py`, `tools/redbookctl x-login --help`, `tools/redbookctl x-login`, `git diff --check`, and no launched Chrome process remained.

## 2026-04-29 X Login Profile Recovery Fix

- Owner: Codex
- Source: User request to continue fixing today's X.com login correction
- Status: completed

### Cleanup Plan

- [x] Add a configurable default X browser profile so publish scripts do not fall back to the logged-out legacy profile.
- [x] Add a non-publishing X login smoke command for composer/login verification.
- [x] Point the local user config at the verified `@0xcybersmile` automation profile.
- [x] Run help/static/login smoke checks and record the remaining risks.

### Review

- `x-utils.ts` now reads `X_BROWSER_PROFILE_DIR`, `X_BROWSER_PROFILE`, or `default_profile` / `profile_dir` / `chrome_profile` from `EXTEND.md` before using the legacy profile.
- `x-browser.ts` now has `--check-login`, which verifies the X composer and prints the visible account without typing or publishing.
- User config `~/.baoyu-skills/baoyu-post-to-x/EXTEND.md` now points `default_profile` at `/Users/proerror/.local/share/x-article-v4-data/x-browser-profile`.
- Verification passed: default profile resolves to the verified profile, `--help` exposes `--check-login`, `--check-login --headless` passed as `Smileyface @0xcybersmile`, import has no CLI side effect, no launched Chrome process remained, and `git diff --check` passed.
- Remaining risk: `tools/redbookctl browser` still reports `9222` unavailable when the normal Shih Chrome was not launched with HTTP CDP; this fix makes the publish script's fallback profile usable instead of changing the already-running human Chrome.

## 2026-04-28 Redbook Browser Session Reuse Review

- Owner: Codex
- Source: User concern about repeated new browser pages and repeated login/session work
- Status: completed

### Cleanup Plan

- [x] Inventory browser login/session routes and identify paths still launching new Chrome/profile/page by default.
- [x] Add a lightweight browser-session inspection entrypoint that reads existing CDP tabs without opening new pages.
- [x] Move the main X regular-post script toward current Chrome/CDP reuse before launching an isolated profile.
- [x] Update workflow docs and run static verification.

### Review

- Added `tools/redbookctl browser` backed by `tools/browser-core/interactive/session.mjs`; it reads existing Chrome/CDP tabs and does not open new pages.
- Updated browser-mode docs, playbook, skill manifest, and tools README to make browser session inspection the first step before X/XHS/WeChat/BOSS workflows.
- Updated local `/baoyu-post-to-x` regular post script so it reuses `X_BROWSER_CDP_ENDPOINT` / `127.0.0.1:9222` and an existing X tab before falling back to a new isolated Chrome/profile.
- Wrote `docs/reports/2026-04-28-browser-session-reuse-review.md` with findings and remaining migration targets.
- Verification passed: `python3 -m py_compile tools/redbookctl.py`, `node --check tools/browser-core/interactive/session.mjs`, `tools/redbookctl browser --json | python3 -m json.tool`, and `bun .agents/skills/baoyu-post-to-x/scripts/x-browser.ts --help`.
- Current live check shows `127.0.0.1:9222` is unavailable, so this run did not inspect a live logged-in Chrome tab.

## 2026-04-28 Redbook Media And Timeline Flow Audit

- Owner: Codex
- Source: User question about Tuzi image model, image density, and timeline headless mode
- Status: completed

### Cleanup Plan

- [x] Verify current image-generation paths and remove stale Nano Banana / Gemini defaults from active workflow prompts.
- [x] Add explicit image-density rules for long articles and multi-platform content.
- [x] Clarify X timeline capture mode: logged-in Chrome/CDP first, headless adapter fallback, no focus-stealing headed browser by default.
- [x] Run static checks and commit the scoped workflow fixes.

### Review

- Workflow docs now state Tuzi/兔子 `gpt-image-2.0` as the default image model and require image model/count/insert positions in publish checklists.
- `document-illustrator`, `baoyu-article-illustrator`, and `baoyu-xhs-images` local skills no longer steer prompts toward Nano Banana/Gemini defaults; global `~/.codex/skills/document-illustrator` was updated too.
- Longform image density is now balanced by default: optional cover, 3-5 body images, about every 600-900 Chinese chars or every 2-3 major sections, max 6 unless explicitly richer.
- X timeline docs/scripts now log and prefer logged-in Chrome/CDP first, then headless `agent-browser-session` fallback with `AGENT_BROWSER_HEADED=false`.
- Verification passed: Python compile, shell syntax check, shared playbook sync, stale default wording search, and diff whitespace check.

## 2026-04-28 Redbook P2.1 Dashboard State Cleanup

- Owner: Codex
- Source: `tools/redbookctl status`
- Status: completed

### Cleanup Plan

- [x] Convert today's live topic research into the canonical daily report path.
- [x] Close stale harness runs as `closed_stale` instead of leaving them active forever.
- [x] Keep only recent publish confirmations in the active dashboard.
- [x] Verify the dashboard reaches a clean current-state view.

### Review

- Added `05-选题研究/X-每日日程-2026-04-28.md` as the standard daily report generated from the live X/HN/Reddit topic-selection files.
- Closed 15 stale harness runs with status `closed_stale` and a cleanup note; remaining active harness run is the real 2026-04-28 publish-confirmation item.
- Adjusted `tools/redbookctl.py` so stale old publish checklists no longer appear as current pending confirmations.
- Verification passed: `tools/redbookctl status` now shows today's report exists, `stale_count = 0`, and exactly 1 active pending publish confirmation.

## 2026-04-28 Redbook P2 Control Surface

- Owner: Codex
- Source: `docs/reports/2026-04-28-redbook-workflow-review.md`
- Status: completed

### Cleanup Plan

- [x] Add a lightweight `redbookctl` entrypoint for daily, pick, draft, publish, close-run, and status.
- [x] Make the default dashboard show today's report, active harness runs, pending publish confirmations, publish ledger state, and stale runs.
- [x] Update the primary tool docs/playbook to route daily operations through `redbookctl`.
- [x] Run smoke checks and commit the scoped change.

### Review

- Added `tools/redbookctl.py` and executable wrapper `tools/redbookctl` as the unified daily control surface.
- `status` now shows today's daily report, active tasks, harness active/stale runs, pending publish confirmations, publish ledger latest record, due follow-ups, and recent publish records missing JSONL.
- `daily` and `publish-record` delegate to existing canonical tools; `pick`, `draft`, `publish`, and `close-run` provide safe workflow shortcuts without replacing approved-publish rules.
- Updated `docs/shared/redbook-playbook.md`, `AGENTS.md`, `CLAUDE.md`, and `tools/README.md` so daily operations point to `redbookctl`.
- Verification passed: Python compile, help/status/JSON/pick/draft/publish/publish-record smokes, shared playbook sync, and `git diff --check`.

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

## 2026-04-28 Redbook P1 Skill Manifest Cleanup

- Owner: Codex
- Source: `docs/reports/2026-04-28-redbook-workflow-review.md`
- Status: completed

### Cleanup Plan

- [x] Inventory current repo-local and global Redbook-relevant skill entrypoints.
- [x] Create `docs/reference/skills-manifest.md` as the canonical skill routing table.
- [x] Update primary workflow docs to reference the manifest and demote missing/legacy skill names.
- [x] Run doc consistency checks and commit the scoped changes.

### Review

- Added `docs/reference/skills-manifest.md` with active, active-global, script, legacy-local, and deprecated entrypoints.
- Demoted `x-collect` / `x-create` / `x-filter` to legacy local references and routed current X work through `tools/daily.sh`, `wiki_workflow.py query`, and `/x-mastery-mentor`.
- Replaced default 小红书 `/post-to-xhs` routing with `/baoyu-xhs-images` for图文 and `RedBookSkills` for video/data/search.
- Updated `.rules`, `AGENTS.md`, `CLAUDE.md`, `docs/shared/redbook-playbook.md`, `tools/README.md`, and `tools/post-to-xhs-使用指南.md`.
- Verification passed: shared playbook sync was unchanged after edits, manifest paths exist, diff whitespace check passed, and stale default-entry regex checks returned no matches.

## 2026-04-28 Redbook P1 Generated Artifact Cleanup

- Owner: Codex
- Source: `docs/reports/2026-04-28-redbook-workflow-review.md`
- Status: completed

### Cleanup Plan

- [x] Confirm tracked generated artifacts targeted in this pass are dependency folders and browser runtime state.
- [x] Add ignore rules for `node_modules/` and package-manager caches.
- [x] Untrack generated dependency files with `git rm --cached` while preserving local files.
- [x] Verify no tracked `node_modules` remain and commit the scoped cleanup.

### Review

- Added `.gitignore` rules for `node_modules/`, package-manager caches, and `tools/auto-zhipin/.chrome-boss-profile/`.
- Untracked generated dependencies in `docs/plans/pptx-build/node_modules/` and `tools/auto-zhipin/node_modules/`.
- Untracked `tools/auto-zhipin/.chrome-boss-profile/` browser runtime state.
- Local generated directories are still present on disk; only git tracking changed.
- Verification passed: tracked `node_modules` count is `0`, tracked `.chrome-boss-profile` count is `0`, and git ignore checks cover the removed paths.

## 2026-04-28 Redbook P1 Lean Playbook Cleanup

- Owner: Codex
- Source: `docs/reports/2026-04-28-redbook-workflow-review.md`
- Status: completed

### Cleanup Plan

- [x] Move long system optimization guidance out of the always-loaded playbook and into `docs/reference/`.
- [x] Replace the shared playbook with four executable lanes and concise completion gates.
- [x] Shorten `AGENTS.md` / `CLAUDE.md` operating sections so they point to the lean playbook and manifest.
- [x] Sync shared docs, verify line-count reduction and doc consistency, then commit.

### Review

- Replaced the always-loaded workflow playbook with four executable lanes: 选题研究、热点速评、计划内容、系统维护。
- Moved system optimization guidance to `docs/reference/system-optimization-methods.md`.
- Shortened `AGENTS.md` from 728 lines to 310 lines and `CLAUDE.md` from 739 lines to 311 lines.
- Updated `tools/sync_redbook_playbook.py` so future syncs use the lean playbook header.
- Verification passed: shared sync completed, stale long-rule regex checks no longer match, and line counts are reduced.

## 2026-04-28 Redbook P1 Topic Pool Cleanup

- Owner: Codex
- Source: `docs/reports/2026-04-28-redbook-workflow-review.md`
- Status: completed

### Cleanup Plan

- [x] Archive existing `X 每日研究发现` scrape-noise sections from `00-选题记录.md`.
- [x] Keep the main topic pool limited to manually selected or explicitly promoted topics.
- [x] Stop daily scripts from auto-appending research keywords to the topic pool by default.
- [x] Update docs, verify no scrape-noise remains in the live topic pool, then commit.

### Review

- Moved 127 non-empty lines of `X 每日研究发现` scrape noise into `01-内容生产/选题管理/archive/2026-04-28-X每日研究发现-自动抓取噪音归档.md`.
- Left `00-选题记录.md` with only manually meaningful pending/deepened topics plus an archive pointer.
- Added explicit `--append-topics-to-record` compatibility flags to `daily_schedule.py` and `daily_research.py`; default daily runs no longer write candidates into the topic pool.
- Updated `tools/auto-x/README.md` to state that recommendations stay in the daily report until explicitly promoted.
- Verification passed: Python compile, both CLI help outputs include the new flag, live topic pool has no `X 每日研究` rows, archive contains the old rows, and diff whitespace check passed.

## 2026-04-28 Redbook P1 Structured Publish Data

- Owner: Codex
- Source: `docs/reports/2026-04-28-redbook-workflow-review.md`
- Status: completed

### Cleanup Plan

- [x] Add a canonical JSONL publish ledger with T+0/T+1/T+3 schema.
- [x] Add a small CLI to append validated publish records without hand-editing markdown tables.
- [x] Seed the ledger from the latest verified X publish record.
- [x] Update docs/playbook pointers, verify the CLI, then commit.

### Review

- Added `04-内容数据统计/publish-records.jsonl` as the canonical publish ledger and `publish-records.schema.md` as the field/stage contract.
- Seeded the ledger with the verified 2026-04-28 X.com T+0 record for the gpt-realtime voice-control short comment.
- Added `tools/record_publish.py` to append validated T+0/T+1/T+3 records with duplicate protection.
- Updated `数据统计表.md`, `docs/shared/redbook-playbook.md`, `AGENTS.md`, `CLAUDE.md`, and `tools/README.md` to point publishing data back to the JSONL ledger.
- Verification passed: script compiles, dry-run emits valid JSON, ledger parses, shared playbook sync is stable, references are present, and diff whitespace check passed.

## 2026-05-01 X Article Body Image Insertion Repair

- Owner: Codex
- Source: user report that inline images were being inserted into the header/cover area and overwriting the first image
- Status: completed

### Cleanup Plan

- [x] Add explicit CDP endpoint support so browser-trace and the article script operate on the same Chrome instance.
- [x] Replace global media-button lookup with body-editor-scoped media-button selection.
- [x] Re-run a traced X Article draft without submitting, then inspect `ArticleEntityUpdateContent` for body media entities and preview media count.
- [x] Record the trace-backed result in the publish checklist and progress log.

## 2026-05-02 X Browser Long Post Image Verification Repair

- Owner: Codex
- Source: 2026-05-02 X long post published text-only while `x-browser.ts` also extracted a third-party status URL.
- Status: completed

### Cleanup Plan

- [x] Scope composer media counting to the active X composer instead of the whole page.
- [x] Restrict post-submit status URL extraction to the expected publishing account.
- [x] Resolve the posted URL from the expected account's timeline by matching the submitted text, not arbitrary `/status/` anchors.
- [x] Verify image posts against the matched status article itself and fail closed if the main post has no media.
- [x] Update skill docs, run build/static checks, and record the result.

### Review

- `x-browser.ts` no longer trusts arbitrary `/status/` anchors after submit. It only accepts status URLs under the configured `expected_handle`.
- Post-submit URL resolution now navigates to the expected account timeline and matches the submitted text before returning a status URL.
- Composer media counting is scoped to the active compose surface, so avatars, quoted-post previews, timeline images, and unrelated page media cannot satisfy the image gate.
- Image verification now checks media on the matched main status article itself; an image reply cannot make a text-only main post look successful.
- Verification passed: Bun build smoke, `--help` smoke, scoped `git diff --check`, and `tools/redbookctl x-login --timeout-ms 45000`.

## 2026-05-05 Cover Prompt Seasoning Workflow

- Owner: Codex
- Source: User shared Xiaoxiaodong's "汤底 + 佐料" reusable GPT-image2 cover prompt method and asked to write a short comment plus check whether our image prompts should change.
- Status: in_progress

### Cleanup Plan

- [x] Write a Lane B X short-comment draft and run X mentor review without publishing.
- [x] Compare the method against current image prompt standards and active image skills.
- [x] Add a reusable base-broth / style-seasoning layer to image prompt docs and storyboard fields.
- [x] Fix any obvious prompt preset inconsistency found during review.
- [x] Run scoped checks and record the result.

### Review

- Created a Lane B draft package at `01-内容生产/02-制作中的选题/2026-05-05-GPT-image2-cover-recipe-short-comment/` with source note, X short comment, X mentor review, and publish checklist.
- The X draft reframes Xiaoxiaodong's method as a reusable visual system: base broth, style seasoning, and content variables.
- Updated the tracked GPT-image-2 editorial standard and active image skills so cover/image prompts must define the visual recipe before prompt generation.
- Fixed the tracked `x-card` example from `3:4` to `16:9`, matching the X.com default image spec.
- Verification passed: scoped `git diff --check`, visual-recipe keyword check, and trailing-whitespace check.
- Publishing remains blocked until the user explicitly says publish; the original X status URL has not been verified yet.

## 2026-05-05 Codex Image Gen Skill Evolution

- Owner: Codex
- Source: User clarified that the target is the Codex image generation skill itself, and asked to research GPT Image 2.0 cover / self-media image prompting patterns before deciding changes.
- Status: in_progress

### Cleanup Plan

- [x] Audit the current `baoyu-image-gen` skill and script prompt preset assembly.
- [x] Collect current X/search evidence around GPT Image 2 cover, self-media cards, Prompt-as-Code, and cover prompt patterns.
- [x] Patch the script so reusable visual recipes are executable arguments, not just prose documentation.
- [x] Add cover/info-card presets for self-media use cases.
- [x] Run focused CLI checks, diff checks, and record the result.

### Review

- X research saved `05-选题研究/X-搜索-GPT-image2-封面提示词-2026-05-05.md` and `05-选题研究/X-搜索-GPT-Image-2-自媒体封面-2026-05-05.md`.
- Added `social-cover` and `info-card` presets to `baoyu-image-gen`.
- Added `--broth`, `--seasoning`, `--title`, `--subtitle`, `--text-mode`, and `--print-prompt`.
- Fixed the actual script default so editorial/social presets default to `16:9`; Xiaohongshu vertical cards now require explicit `--ar 3:4`.
- Added a research note at `docs/reports/2026-05-05-gpt-image2-cover-prompt-research.md`.
- Verification passed: CLI help smoke, `social-cover --print-prompt`, `info-card --print-prompt --ar 3:4`, scoped `git diff --check`.

## 2026-05-06 X Article Longform Correction

- Owner: Codex
- Source: User confirmed delete and resend because the previous X longform images rendered as a gallery instead of article inline illustrations.
- Status: completed

### Cleanup Plan

- [x] Verify the old gallery post is owned and delete it.
- [x] Reuse the existing X Article draft with Markdown inline images.
- [x] Patch the Article publish click path so it can click the visible topbar publish button and the confirmation dialog publish button.
- [x] Publish the corrected X Article and verify public page title, body, and media count.
- [x] Record publish evidence in the content package, publish ledger, and progress log.

### Review

- Old URL deleted: `https://x.com/0xcybersmile/status/2051856551867236845`.
- Corrected URL published: `https://x.com/0xcybersmile/status/2051900903901569131`.
- Public readback found the expected title, body key phrases, and 4 large media images.
- Script fix is scoped to `.agents/skills/baoyu-post-to-x/scripts/x-article.ts` publish-button selection.
