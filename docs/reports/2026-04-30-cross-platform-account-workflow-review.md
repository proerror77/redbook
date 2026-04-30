# Cross-Platform Account Workflow Review

> Date: 2026-04-30
> Scope: Redbook content workflow, recent article packages, wiki knowledge loop
> Decision: X.com and Xiaohongshu share one account direction, but use different platform translations.

## Executive Finding

The current workflow has strong production gates, but it was missing one upstream gate:

> Before writing platform drafts, every topic must become one account-level core proposition.

Without this gate, X.com content can become good technical judgment while Xiaohongshu becomes either a direct longform split or a tool-news translation. That drifts away from the intended Xiaohongshu account direction: AI applications in business and enterprise settings.

## Target Positioning

Unified account thesis:

> AI in business is not about buying the strongest model. It is about making agent/workflow capability enter real enterprise processes with ROI, permission, review, audit, rollback, and organizational memory.

Platform roles:

| Platform | Role | Reader task | Content shape |
| --- | --- | --- | --- |
| X.com | Judgment and industry signal | Understand why this shift matters | Longform, Article, thread, quote/reply |
| Xiaohongshu | Business / enterprise translation | Know how to judge or apply it at work | 5-7 card carousel, checklist, scenario explanation |
| WeChat / longform | Durable argument | Preserve full reasoning and source trail | Long article with sources and illustrations |

## Current Workflow Review

### What already works

- Lane A now separates current topics from backlog and publish reminders.
- Lane C requires wiki query, storyboard, visual metaphor map, QA, and platform-side publish evidence.
- Wiki already has strong topic anchors: `AI Agent企业导入与协作`, `AI工具与效率`, and `X每日选题分流与知识沉淀`.
- Recent content packages already produce `素材来源.md`, `QA报告.md`, `图文分镜.md`, `发布清单.md`, and X review artifacts.

### Gaps

1. **No account-thesis gate before platform drafting**
   - Existing Lane C jumps from selected topic to wiki query and drafting.
   - Missing question: "What is the one account-level proposition this topic proves?"

2. **Xiaohongshu platform role was underspecified**
   - Existing docs say XHS must use card narrative and separate image specs.
   - Missing direction: XHS should translate the same thesis into enterprise / business AI application, not developer-tool commentary.

3. **Current article packages can leave XHS as a later afterthought**
   - Example: the Orchestration package has a strong X Article and visual storyboard, but `发布清单.md` only says "如用于小红书，按卡片结构重写".
   - It needs a platform orchestration note before card generation.

4. **Wiki captures themes but not platform translation**
   - `AI Agent企业导入与协作.md` has the right topic framing.
   - It did not yet encode "X = judgment, XHS = enterprise application" as a reusable method.

5. **Publishing evidence is stronger for X than XHS**
   - X records currently have status URLs and platform readback.
   - Xiaohongshu needs the same post-publish loop: note id / creator-management status / T+0 data.

## New Operating Sequence

For any Lane C multi-platform content:

1. **Source**
   - Timeline, daily report, user-selected topic, official blog, HN/Reddit, or direct user brief.

2. **Core proposition**
   - Write one sentence:
     - `这个选题真正要证明的是：...`
     - `它服务账号主线的方式是：...`

3. **Wiki query**
   - Query `AI Agent企业导入与协作`, `AI工具与效率`, `跨平台账号编排`, and relevant素材 pages.

4. **Platform orchestration**
   - Create `平台编排.md` or equivalent section in `发布清单.md`.
   - Decide:
     - X hook and argument.
     - Xiaohongshu business scenario and card tasks.
     - WeChat/longform source and illustration plan.
     - What not to write.

5. **Draft by platform**
   - X draft: viewpoint density, tech/industry signal, source boundary.
   - Xiaohongshu draft: enterprise scenario, management question, checklist, ROI/risk/action.

6. **Storyboard and images**
   - X: concept image or supporting longform images.
   - Xiaohongshu: 5-7 cards, one enterprise reader task per card.

7. **Review**
   - X: `x-mastery-mentor`.
   - Xiaohongshu: enterprise-reader review:
     - Does a business reader understand why it matters?
     - Is there a scenario?
     - Is there a checklist or action?
     - Is it collectible?
     - Is it not just news?

8. **Approved publish**
   - Publish only after explicit user confirmation.
   - Verify from platform side.

9. **Knowledge loop**
   - Update wiki topic/method/material pages with:
     - the new proposition,
     - the reusable phrasing,
     - the platform performance result.

## Required Content Package Shape

Recommended files for a multi-platform package:

- `素材来源.md`
- `平台编排.md`
- `长文稿.md` or `内容母稿.md`
- `X稿.md` / `X-Article版.md`
- `小红书图文稿.md`
- `图文分镜.md`
- `QA报告.md`
- `x-mastery-mentor-审稿.md`
- `发布清单.md`
- `发布记录.md` after publish

If a topic does not fit Xiaohongshu's enterprise/business positioning, the package should say so explicitly instead of forcing a card set.

## Applied To Current Orchestration Topic

Core proposition:

> 企业 AI 的竞争，不在谁接了最强模型，而在谁能把 AI 接进真实业务流程。

X.com version:

- Explain Cursor SDK / Warp / orchestration as industry signal.
- Audience: AI builders, developers, tool observers, technical founders.
- Form: X Article or long thread.

Xiaohongshu version:

- Do not explain Cursor and Warp as news.
- Translate to: "企业选 AI Agent，不要只问模型强不强，要问它能不能稳定进入业务流程。"
- Audience:老板、管理者、企业服务从业者、AI 落地负责人.
- Form: 7-card checklist.

Suggested XHS cards:

1. `企业用 AI，别只问模型强不强`
2. `很多 AI 项目失败，不是模型问题`
3. `企业买的是流程执行能力`
4. `先问 7 个问题`
5. `聊天机器人 vs 企业 Agent`
6. `哪些业务场景最先适合试`
7. `小范围试点：选一个流程，不选一个工具`

## Implementation Changes Made

- Updated `docs/shared/redbook-playbook.md` with account-thesis and Xiaohongshu enterprise-application gates.
- Updated `docs/reference/skills-manifest.md` with the same platform role constraints.
- Added `wiki/方法论/跨平台账号编排.md`.
- Updated `wiki/选题/AI Agent企业导入与协作.md` with the cross-platform positioning.
- Updated `wiki/index.md` and `wiki/overview.md`.
- Added `平台编排.md` to the current Orchestration content package.

## Remaining Risks

- The workflow is now documented, but not yet machine-enforced by `redbookctl draft` or harness gates.
- Xiaohongshu post-publish evidence loop should be exercised on the next XHS publish to ensure note id / management readback are captured.
- Existing old content packages may still lack `平台编排.md`; do not retroactively rewrite all of them unless selected for reuse.
