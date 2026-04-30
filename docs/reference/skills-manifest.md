# Redbook Skills Manifest

> 最后更新：2026-04-30
> 目的：把“当前可直接用的入口”和“历史/本地参考入口”分开，避免流程文档引用跑不到的 skill。

## 使用原则

- 主流程只引用 `status=active` 或 `status=active-global` 的入口。
- `status=legacy-local` 只作为参考资料，不作为默认执行入口。
- 发布类 skill 仍遵守用户确认规则：生成、预览、审稿可以自动推进；提交发布必须等用户明确说“发布/直接发”。
- 每日选题和用户贴来的新闻链接必须先走 `选题决策门`：先判断短评、长文、thread、小红书、只收藏，用户确认形态后才进入对应生产 lane。
- 新闻链接型内容不要直接生成完整内容包；先输出一张固定决策卡，并给出 agent 推荐形态和理由，减少用户反复重复工作。
- X 短评固定结构是：新闻锚点 -> 账号判断 -> 为什么重要 -> 原链接/回复结构；发布前必须过 `/x-mastery-mentor` 快速审稿。
- X 发布前必须通过 `tools/redbookctl x-login`；真实 `--submit` 必须有 `expected_handle` 并在输入/点击前校验账号。
- 小红书发布前必须通过 `tools/redbookctl xhs-health`；需要管理页证据时加 `--with-content-data`。
- X / 小红书发布成功不能只看脚本 stdout；X 必须回查状态 URL、主页/状态页、发布时间/图片证据，小红书不能只看 `FILL_STATUS` / `PUBLISH_STATUS`，必须有成功页、管理页或 note id 等平台侧证据。
- 配图 / 图文生成默认模型是 Tuzi/兔子 `gpt-image-2.0`；Nano Banana / Gemini 只能作为用户明确指定的 fallback。
- 长文配图默认 balanced density：正文 3-5 张，约每 600-900 中文字或每 2-3 个主要小节 1 张；小红书卡片系列可放宽到 5-7 张，除非用户明确要更多。
- 正文配图先产出 visual metaphor map：每张图要有文章锚定短句、语义/情绪判断、视觉隐喻、插入位置和禁用元素；不能只用段落摘要生成装饰图。
- 图文生成先产出 `图文分镜.md` 或等价分镜表，并做排版 QA：卡片职责、读者任务、文字预算、层级、安全边距、图文不重叠、缩略图可读。
- X.com 和小红书规格不可默认共用：X 默认 `16:9` 单张观点卡，小红书默认 `3:4` / `1080x1440` 多卡片。
- X.com 和小红书共享账号主线但不共享长文结构：X 负责观点密度和产业判断，小红书负责把同一判断翻译成企业/商业 AI 应用、管理者决策、ROI/风险和流程落地。
- 小红书同步前必须先有 `核心命题` 与 `平台编排`，并确认选题能落到企业/商业场景；不能落地时只发 X，不强行做卡片。
- 小红书图文不能直接拆 X 长文段落；每张卡必须绑定一个企业读者任务，如场景、判断标准、流程影响、成本/风险、行动清单。
- 新增 workflow / publish / browser / image pipeline 代码默认使用 TypeScript / Bun；Python 入口保留为 legacy 或专项例外，见 `docs/reference/runtime-language-policy.md`。
- 浏览器类任务先用 `tools/redbookctl browser` 检查当前 Chrome/CDP 登录态；发布和账号操作优先复用已有 tab，避免重复开新页面和新 profile。
- Lane A 选题研究必须用当日研究区或当前 X timeline 证据；`tools/redbookctl daily` 里的发布提醒/制作中旧稿只作 backlog，不得当作“今天值得写”的来源。

## Active Entrypoints

| 入口 | 状态 | 位置 | 用途 | 推荐场景 |
| --- | --- | --- | --- | --- |
| `/x-mastery-mentor` | active | `.agents/skills/x-mastery-mentor/SKILL.md` and `~/.codex/skills/x-mentor/SKILL.md` | X 写作方法论、审稿、账号诊断、选题判断 | X 草稿前的结构判断、发布前 QA |
| `/baoyu-post-to-x` | active | `.agents/skills/baoyu-post-to-x/SKILL.md` | 发布 X 普通帖、图片/视频帖、长文 | 用户明确确认发布后 |
| `/article-visual-storyboard` | active | `.agents/skills/article-visual-storyboard/SKILL.md` | 为文章生成平台分镜、X/XHS 规格拆分、排版 QA 和生图交接 | 任何文章转 X 配图、小红书图文、公众号配图之前 |
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
| `tools/redbookctl daily` | active-script | `tools/redbookctl.ts` -> `tools/daily.sh` | 每日研究报告主入口 | 输出 `05-选题研究/X-每日日程-YYYY-MM-DD.md` |
| `tools/redbookctl browser` | active-script | `tools/redbookctl.ts` + `tools/browser-core/interactive/session.mjs` | 只读检查当前 Chrome/CDP tabs 与登录态 | X/XHS/微信/BOSS 动作前 |
| `python3 tools/wiki_workflow.py daily-cycle --date YYYY-MM-DD` | active-script | `tools/wiki_workflow.py` | Wiki ingest + lint 维护 run | research-only run 会自动关闭 |
| `python3 tools/wiki_workflow.py query --topic ... --date YYYY-MM-DD` | active-script | `tools/wiki_workflow.py` | 显式 wiki query 并留 harness 证据 | 内容创作前优先使用 |
| `tools/redbookctl close-run --run-id ...` | active-script | `tools/redbookctl.ts` -> `tools.redbook_harness.cli` | 关闭非完整内容 pipeline 的 run | 支持 `done` / `closed_stale` / `cancelled` |
| `tools/redbookctl draft` | active-script | `tools/redbookctl.ts` -> `tools.redbook_harness.cli` | 创建完整内容 harness run | Python harness 保留为专项例外 |
| `tools/redbookctl workflow-health` | active-script | `tools/redbookctl.ts` -> legacy `tools/redbookctl.py` | 日报、harness、发布确认、账本、分镜缺口总览 | 别名 `publish-health`；待迁 TS |
| `tools/redbookctl x-login` | active-script | `tools/redbookctl.ts` + `/baoyu-post-to-x` | X 发布 profile 登录/账号检查 | 不输入、不发布 |
| `tools/redbookctl xhs-health` | active-script | `tools/redbookctl.ts` -> `RedBookSkills` | 小红书创作者中心登录/管理页回读检查 | 不发布 |
| `tools/redbookctl publish-record` | active-script | `tools/redbookctl.ts` -> `tools/record_publish.py` | 发布数据 JSONL 主账本追加工具 | record 脚本待契约测试后迁移 |
| `tools/redbookctl challenge` / `emerge` / `draft-seed` | active-script | `tools/redbookctl.ts` -> `tools/content_loop.py` | 本地语料 challenge / idea mining / 草稿种子 | content loop 待迁 TS |
| Editorial decision workflow | active-doc | `docs/reference/editorial-decision-workflow.md` | 每日选题和新闻链接的固定形态判断门 | 先判断短评/长文/thread/小红书/只收藏，再生产 |
| `tools/auto-zhipin` npm scripts | active-script | `tools/auto-zhipin/README.md` | BOSS 登录、扫描、投递预检、消息监看、台账报告 | 主链是 `boss:login` / `chrome:collect` / `boss:apply` / `report`；current-tab/OpenCLI 仅 fallback |
| Runtime language policy | active-doc | `docs/reference/runtime-language-policy.md` | TS/Bun canonical runtime 与 Python legacy 边界 | 新增或迁移 workflow 代码前 |

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
