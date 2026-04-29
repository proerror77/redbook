# Redbook Runtime Language Policy

> 最后更新：2026-04-29

## Decision

Redbook 新增工作流代码默认使用 **TypeScript / Bun**。

Python 不再作为新 workflow / publish / browser / image pipeline 的默认语言；除非属于下方保留范围。Shell 只保留为薄 wrapper，不承载业务逻辑。Rust 不作为本仓库内容工作流的默认 runtime。

## Why TS/Bun

- 浏览器、CDP、剪贴板、X/微信发布、URL 抓取和网页自动化更贴近 JS/TS 生态。
- 现有核心 skills 已大量使用 TS/Bun：`baoyu-post-to-x`、`baoyu-post-to-wechat`、`baoyu-image-gen`、`baoyu-url-to-markdown`、`baoyu-markdown-to-html`。
- TS 能给跨脚本 JSON 契约、CLI 参数、平台 adapter 提供类型约束。
- 本仓库瓶颈是流程一致性和平台验证，不是 CPU 性能；Rust 的收益不足以覆盖迁移和浏览器生态成本。

## Language Roles

| Role | Default | Notes |
| --- | --- | --- |
| New workflow CLI | TS/Bun | 新增 `redbookctl` 子命令、publish health、storyboard/image orchestration 默认写 TS。 |
| Browser / publisher adapter | TS/Bun | X、微信、小红书浏览器检查、CDP、Playwright、clipboard 相关逻辑优先 TS。 |
| Image / markdown skill scripts | TS/Bun | 新增 skill 脚本默认 TS，复用现有 Bun skill patterns。 |
| Existing harness / wiki / daily research | Python legacy | 暂不大重写；迁移时先加测试和输出契约。 |
| Data one-off / migration scripts | Python allowed | 仅限一次性、离线、非 canonical 入口；完成后标注 legacy 或归档。 |
| Shell | Thin wrapper only | 只负责调用 canonical CLI，不写业务分支。 |
| Rust | Not default | 只在明确性能/系统边界需求出现时单独评估。 |

## Migration Rules

1. New user-facing entrypoints should be TS/Bun unless a documented exception exists.
2. Do not add new Python orchestration around browser/publish/image workflows.
3. Existing Python scripts remain valid until replaced; do not rewrite them just for language purity.
4. Migration must preserve behavior with regression tests or command-level smoke checks.
5. Cross-language calls must use explicit JSON or markdown artifacts, not implicit stdout parsing.
6. Keep `tools/redbookctl` as the user-facing command during migration; implementation may move from Python to TS behind the wrapper.

## Recommended Migration Order

1. Done: create a TS `redbookctl` control surface while preserving the existing `tools/redbookctl` command.
2. Done: move low-risk command dispatch to TS for `browser`, `x-login`, `xhs-health`, `daily`, `draft`, `publish-record`, `close-run`, and content-loop helpers.
3. Move workflow-health, publish gaps, storyboard checks, and publish ledger internals to TS next.
4. Keep wiki/harness/daily research internals in Python until the control surface is stable.
5. Retire legacy Python/shell entrypoints only after docs, tests, and `tools/redbookctl` routes are updated.

## Definition of Done For Runtime Migration

- Canonical command documented in `docs/reference/skills-manifest.md`.
- Old entrypoint marked `legacy` or removed from primary docs.
- Smoke command passes.
- Output artifact shape is unchanged or migration notes explain the change.
- No unrelated publish/content behavior is changed in the same commit.
