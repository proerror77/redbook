# Workflow Start Guide

> Last updated: 2026-04-30
> Purpose: Give the user stable phrases for starting Redbook workflows without re-explaining the whole process.

## Default Starts

### Current Topics

Use:

```text
今天有什么值得写？
```

Expected behavior:

- Run Lane A.
- Use today's research or current X/timeline evidence.
- Return 3-5 decision cards.
- Each card must include recommended shape, target beneficiary, persona fit, and whether Xiaohongshu can translate it into an enterprise/business task.
- Stop before drafting unless the user selects a topic and shape.

### Link Intake

Use:

```text
这个链接值得写吗？<url>
```

Expected behavior:

- Verify the source and timing.
- Produce one decision card.
- Recommend one shape: short comment, longform/article, thread, Xiaohongshu, or wiki-only.
- Include target beneficiary and persona fit.
- Wait for the user's shape decision unless the user already specified the output.

### X Short Comment

Use:

```text
把这个做成短评。<url or topic>
```

Expected behavior:

- Run Lane B.
- Verify source and timing.
- Use the fixed structure: news anchor -> account judgment -> why it matters -> link/reply structure.
- Name target beneficiary and repost/reply reason.
- Run quick review before publish confirmation.
- Do not publish until the user says "发布" or "直接发".

### Planned Content

Use:

```text
把这个做成完整内容。
```

or:

```text
把这个做成多平台内容 / 小红书图文。
```

Expected behavior:

- Run Lane C.
- Create or update a content package only after shape confirmation.
- Write core proposition and platform orchestration first.
- Record persona, target beneficiary, and cold-read conclusions.
- For Xiaohongshu, translate the thesis into enterprise/business reader tasks instead of splitting an X article into cards.
- Generate storyboard and visual metaphor map before images.
- Show final draft, review result, image plan, and risks before publish confirmation.

## Shortcut Meanings

```text
只收藏
```

Save the source or idea into wiki/materials without starting a content package.

```text
继续做这个
```

Read `tasks/active.md`, identify the active content package, and continue from the next missing gate instead of restarting.

```text
直接发
```

Only publish if a final draft, review result, publish structure, and platform/account preflight already exist. Otherwise finish the missing gate first and show the blocker.

## Non-Negotiable Gates

- Link or topic intake starts with a decision card unless the user already chose the shape.
- Planned content needs core proposition and platform orchestration before drafting.
- Planned content cannot enter publish confirmation without persona, beneficiary, and cold-read evidence.
- Publishing always needs explicit user confirmation plus platform-side readback after submit.
