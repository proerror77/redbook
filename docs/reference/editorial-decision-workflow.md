# Editorial Decision Workflow

> Last updated: 2026-04-30
> Purpose: Fix the Redbook content workflow so topic intake, link review, content-shape decision, drafting, review, and publishing follow one repeatable path.

## Core Rule

Do not jump from a topic or news link directly into writing.

Every morning topic and every pasted news link first passes through the same decision gate:

```text
选题/新闻 -> 决策卡 -> 用户确认形态 -> 对应生产结构 -> 审稿 -> 发布确认 -> 发布回读
```

The agent must recommend one shape instead of asking the user to choose from scratch.

## Decision Card

Use this exact shape when the user asks for morning topics or pastes a news link without already deciding the output format:

```markdown
✓ 我建议这条做：短评 / 长文 / Thread / 小红书 / 只收藏

新闻一句话：
账号主线契合：
为什么值得写：
建议形态：
为什么不是其他形态：
推荐角度：
小红书企业翻译：
下一步：
```

### Shape Decision Rules

| Shape | Use when | Do not use when |
| --- | --- | --- |
| X 短评 | News is fresh, one sharp take is enough, good for replying under source post | Needs a full framework or multiple evidence points |
| X Thread | The idea has 3-5 separate points but is still timely | It needs careful source trail or evergreen searchability |
| X Article / 长文 | The topic can become a durable argument, framework, or account thesis | It is only a product announcement with one obvious take |
| 小红书图文 | The same thesis can translate into enterprise/business AI application, decision checklist, ROI/risk, workflow | It is only developer-tool news or crypto market noise |
| 只收藏 / wiki | Interesting but not aligned, weak source, or no distinctive account take | User explicitly wants to publish |

## Morning Topic Flow

1. Run or read today's topic report / current X evidence.
2. Output 3-5 topics as decision cards.
3. For each topic, include the recommended content shape.
4. Do not create content packages yet.
5. When the user picks one topic and shape, continue into Lane B or Lane C.

## Pasted News Link Flow

When the user pastes a link:

1. Fetch and verify the source.
2. Summarize the news in one sentence.
3. Output one decision card.
4. Recommend one shape.
5. Wait for the user's shape decision unless the user already gave it.

If the user says "写一个短评", shape is already decided. Continue Lane B, but still show the review result before publish.

## Lane B Fixed Short Comment Structure

Required files only after shape is confirmed:

- `素材来源.md`
- `X短评.md`
- `x-mastery-mentor-审稿.md`
- `发布清单.md`
- `发布记录.md`

Required draft structure:

```text
新闻锚点：这条新闻真正发生了什么
账号判断：我怎么看
为什么重要：它连接到 agent / workflow / enterprise AI / business application 的哪条主线
发布结构：回复原帖 or 独立发帖；是否附原链接
```

Publishing rules:

- If replying under the source post, use the reply version and do not repeat the link unless needed.
- If publishing independently, include the original link at the end.
- Always run `/x-mastery-mentor` quick review before showing the final publishable version.
- Do not submit until the user explicitly says publish.

## Lane C Fixed Longform Structure

Required package shape:

- `素材来源.md`
- `平台编排.md`
- `长文稿.md` or `内容母稿.md`
- `X稿.md` / `X-Article版.md`
- `小红书图文稿.md` or explicit no-XHS decision
- `图文分镜.md`
- `QA报告.md`
- `x-mastery-mentor-审稿.md`
- `发布清单.md`
- `发布记录.md` after publish

Required order:

1. Core proposition.
2. Platform orchestration.
3. Persona and beneficiary gate: "我是那个 __ 型账号", who benefits, and what the reader can do or judge after reading.
4. Draft.
5. De-slop / account voice pass.
6. Cold-read pass: mark 3 likely drop-off points from a first-time reader's perspective and rewrite them.
7. Storyboard / visual metaphor map if images are needed.
8. Review.
9. Publish confirmation.
10. Platform-side verification.
11. Progress/wiki/publish ledger update.

For planned longform and Xiaohongshu content, cold-read should happen after at least one context break when practical. If the topic is time-sensitive, use an independent reviewer/subagent-style pass as the minimum substitute, and record that no real waiting period was used.

## Agent Behavior

The agent should avoid repeatedly asking broad questions like:

```text
你想写短评还是长文？
```

Instead, it should say:

```text
我建议做短评。原因是这条新闻的核心判断可以在 3 段内讲清楚，
但还不足以支撑长文。小红书暂不建议，因为它还没有企业应用场景。
如果你同意，我按短评结构继续。
```

If the user disagrees, follow the user's chosen shape.
