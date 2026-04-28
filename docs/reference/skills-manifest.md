# Redbook Skills Manifest

> 最后更新：2026-04-28
> 目的：把“当前可直接用的入口”和“历史/本地参考入口”分开，避免流程文档引用跑不到的 skill。

## 使用原则

- 主流程只引用 `status=active` 或 `status=active-global` 的入口。
- `status=legacy-local` 只作为参考资料，不作为默认执行入口。
- 发布类 skill 仍遵守用户确认规则：生成、预览、审稿可以自动推进；提交发布必须等用户明确说“发布/直接发”。
- X / 小红书发布成功不能只看脚本 stdout；必须回查状态 URL、主页/管理页、发布时间、note id 等平台侧证据。
- 配图 / 图文生成默认模型是 Tuzi/兔子 `gpt-image-2.0`；Nano Banana / Gemini 只能作为用户明确指定的 fallback。
- 长文配图默认 balanced density：正文 3-5 张，约每 600-900 中文字或每 2-3 个主要小节 1 张；小红书卡片系列可放宽到 5-7 张，除非用户明确要更多。
- 浏览器类任务先用 `tools/redbookctl browser` 检查当前 Chrome/CDP 登录态；发布和账号操作优先复用已有 tab，避免重复开新页面和新 profile。

## Active Entrypoints

| 入口 | 状态 | 位置 | 用途 | 推荐场景 |
| --- | --- | --- | --- | --- |
| `/x-mastery-mentor` | active | `.agents/skills/x-mastery-mentor/SKILL.md` and `~/.codex/skills/x-mentor/SKILL.md` | X 写作方法论、审稿、账号诊断、选题判断 | X 草稿前的结构判断、发布前 QA |
| `/baoyu-post-to-x` | active | `.agents/skills/baoyu-post-to-x/SKILL.md` | 发布 X 普通帖、图片/视频帖、长文 | 用户明确确认发布后 |
| `/baoyu-xhs-images` | active | `.agents/skills/baoyu-xhs-images/SKILL.md` | 生成小红书图文卡片，并支持图文发布链路 | 小红书图文内容 |
| `RedBookSkills` | active-global | `~/.codex/skills/xiaohongshu-skills/SKILL.md` and `~/.codex/skills/XiaohongshuSkills/SKILL.md` | 小红书发布、视频、搜索、详情、评论、数据表 | 视频、多账号、数据回查、竞品/搜索 |
| `/document-illustrator` | active | `.agents/skills/document-illustrator/SKILL.md` and `~/.codex/skills/document-illustrator/SKILL.md` | 用 Tuzi `gpt-image-2.0` 为文章生成封面和文内配图 | 长文配图、多图叙事 |
| `/baoyu-url-to-markdown` | active | `.agents/skills/baoyu-url-to-markdown/SKILL.md` | URL 转 Markdown | 保存网页素材 |
| `/baoyu-danger-x-to-markdown` | active | `.agents/skills/baoyu-danger-x-to-markdown/SKILL.md` | X 帖/长文转 Markdown | 保存 X 来源，需注意 reverse-engineered API 风险 |
| `/baoyu-format-markdown` | active | `.agents/skills/baoyu-format-markdown/SKILL.md` | Markdown 排版 | 文章排版与整理 |
| `/baoyu-markdown-to-html` | active | `.agents/skills/baoyu-markdown-to-html/SKILL.md` | Markdown 转 HTML | 公众号/网页排版 |
| `/baoyu-post-to-wechat` | active | `.agents/skills/baoyu-post-to-wechat/SKILL.md` | 发布到微信公众号 | 用户明确确认发布后 |
| `/baoyu-image-gen` | active | `.agents/skills/baoyu-image-gen/SKILL.md` | 通用 AI 图片生成，Tuzi 优先且默认 `gpt-image-2.0` | 非小红书专用图像 |
| `/baoyu-infographic` | active | `.agents/skills/baoyu-infographic/SKILL.md` | 信息图生成 | 单张视觉总结 |

## Script Entrypoints

| 入口 | 状态 | 位置 | 用途 | 备注 |
| --- | --- | --- | --- | --- |
| `bash tools/daily.sh` | active-script | `tools/daily.sh` | 每日研究报告主入口 | 输出 `05-选题研究/X-每日日程-YYYY-MM-DD.md` |
| `tools/redbookctl browser` | active-script | `tools/redbookctl.py` + `tools/browser-core/interactive/session.mjs` | 只读检查当前 Chrome/CDP tabs 与登录态 | X/XHS/微信/BOSS 动作前 |
| `python3 tools/wiki_workflow.py daily-cycle --date YYYY-MM-DD` | active-script | `tools/wiki_workflow.py` | Wiki ingest + lint 维护 run | research-only run 会自动关闭 |
| `python3 tools/wiki_workflow.py query --topic ... --date YYYY-MM-DD` | active-script | `tools/wiki_workflow.py` | 显式 wiki query 并留 harness 证据 | 内容创作前优先使用 |
| `python3 -m tools.redbook_harness.cli close-run --run-id ...` | active-script | `tools/redbook_harness/cli.py` | 关闭非完整内容 pipeline 的 run | 支持 `done` / `closed_stale` / `cancelled` |

## Legacy Or Reference Only

| 入口 | 状态 | 位置 | 替代方案 |
| --- | --- | --- | --- |
| `/x-collect` | legacy-local | `tools/x-skills/x-collect/SKILL.md` | 默认用 `tools/daily.sh` + `wiki_workflow.py query` + 当前 X Timeline 检索 |
| `/x-create` | legacy-local | `tools/x-skills/x-create/SKILL.md` | 默认用 `/x-mastery-mentor` 做结构/审稿，再按账号风格手写或改写 |
| `/x-filter` | legacy-local | `tools/x-skills/x-filter/SKILL.md` | 默认在每日研究报告或 `wiki_workflow.py query` 后人工/agent 评分 |
| `/x-publish` | legacy-local | `tools/x-skills/x-publish/SKILL.md` | 用 `/baoyu-post-to-x` |
| `/post-to-xhs` | legacy-alias | `tools/post-to-xhs-使用指南.md` | 当前环境优先用 `/baoyu-xhs-images`；视频/数据/搜索用 `RedBookSkills` |

## Deprecated Scripts

| 入口 | 状态 | 替代方案 |
| --- | --- | --- |
| `tools/auto-redbook/render_simple.sh` | deprecated | `/baoyu-xhs-images` |
| `tools/auto-redbook/publish_xhs.py` | deprecated | `/baoyu-xhs-images` or `RedBookSkills` |
| `tools/auto-x/publish_x.sh` | deprecated | `/baoyu-post-to-x` |
