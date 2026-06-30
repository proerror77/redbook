<!-- BEGIN COMPOUND CODEX TOOL MAP -->
## Compound Codex Tool Mapping (Claude Compatibility)

This section maps Claude Code plugin tool references to Codex behavior.
Only this block is managed automatically.

Tool mapping:
- Read: use shell reads (cat/sed) or rg
- Write: create files via shell redirection or apply_patch
- Edit/MultiEdit: use apply_patch
- Bash: use shell_command
- Grep: use rg (fallback: grep)
- Glob: use rg --files or find
- LS: use ls via shell_command
- WebFetch/WebSearch: use curl or Context7 for library docs
- AskUserQuestion/Question: ask the user in chat
- Task/Subagent/Parallel: run sequentially in main thread; use multi_tool_use.parallel for tool calls
- TodoWrite/TodoRead: use file-based todos in todos/ with file-todos skill
- Skill: open the referenced SKILL.md and follow it
- ExitPlanMode: ignore
<!-- END COMPOUND CODEX TOOL MAP -->

--- project-doc ---

# Redbook Agents OS

## 项目概述
这是用户的内容、发布、研究与知识库 Agents OS，不是普通资料夹。Agent 进入本 repo 后，必须先读本文件里的启动语义，再按 Lane / workflow / skill 执行。

`AGENTS.md` 是启动宪法：放每次启动都不能遗漏的项目定义、Lane 路由、硬门槛、状态语义和工具入口。更长的细节流程放在 `docs/reference/`，但不能绕过本文件的启动规则。

## 启动必读

1. 先读 `tasks/active.md`，确认未完成发布、验证、恢复或系统维护任务。
2. 判断用户意图属于 Lane A/B/C/D，或发布、Knowledge、Review、Method Ingestion 子流程。
3. 选择对应 `docs/reference/` workflow 或 skill，再执行工具。
4. 写作、选题、复盘、素材沉淀默认先 query `wiki/`。
5. 发布、删除、关注、提交等外部副作用必须先有用户明确确认，并在事后回读平台证据。
6. 完成前必须留下可验证证据：文件、URL、JSONL、报告、wiki 页面、测试结果或 commit。

## 内容领域
- AI 商业应用与工具分享
- 个人成长与效率提升
- 技术教程与编程
- 商业思维与创业

## 目录结构
```
01-内容生产/          # 内容生产流水线
  ├── 选题管理/       # 选题记录和管理
  ├── 01-待深化的选题/ # 已确定要做的选题
  ├── 02-制作中的选题/ # 正在制作的内容
  └── 03-已发布的选题/ # 已发布归档

02-内容素材库-archived/ # 已归档，不再维护（素材已迁移至 wiki/素材/）

03-方法论沉淀/        # 数据驱动的方法论
04-内容数据统计/      # 发布数据记录
05-选题研究/          # 选题分析（原始素材，不修改）
06-业务运营/          # 商业数据
wiki/                 # LLM 维护的知识库（唯一知识底座，见下方 Wiki Schema）
  ├── index.md        # 目录索引
  ├── log.md          # 操作日志（append-only）
  ├── overview.md     # 当前知识状态
  ├── 选题/           # 话题知识页
  ├── 创作者/         # 创作者研究页
  ├── 方法论/         # 创作方法论
  ├── 概念/           # 核心概念
  └── 素材/           # 金句、案例、可复用框架（替代独立素材库）
```

## 写作风格指南

### 核心原则
- **简洁有力**：一句话能说清的，不用两句
- **口语化**：像跟朋友聊天，不要书面语
- **有观点**：敢于表达立场，不要模棱两可
- **有价值**：每条内容都要让读者有收获

### 平台差异
- **小红书**：标题要有情绪，内容要有干货
- **抖音**：前3秒定生死，节奏要快
- **X.com**：观点要锐利，表达要精炼
- **公众号**：可以深度，但要有结构

## 核心提醒
1. **先检索，再创作**：每次写新内容前，先 query `wiki/`（`wiki/选题/` + `wiki/方法论/` + `wiki/素材/`）
2. **数据驱动**：发布后记录数据，反哺方法论
3. **持续沉淀**：好的内容、框架、表达，都要存入 `wiki/素材/`

## 🛠️ Redbook 操作宪法

### 1. 默认执行方式
- 先判断 lane：选题研究、热点速评、计划内容、系统维护。
- 简单任务直接做；非简单任务先在 `tasks/active.md` 写简短计划。
- `tasks/todo.md` 是历史兼容账本，不再作为当前任务面板。
- 被用户纠正时，才新增 `tasks/lessons.md`；不要把每个普通进展都写成 lesson。

### 2. 状态与验证
- 内容任务需要按 lane 选择状态负担：只有计划内容强制完整 harness。
- 系统维护、工具修复、workflow 清理不进入内容生产 harness。
- 完成前必须跑能证明结果的最小验证，并在 `tasks/progress.md` 记录完成、遗留、下次优先项。
- 有文件变更时按 Lore Commit Protocol 提交。

### 3. 内容生产硬门槛
- 创作前 query `wiki/`；素材主库是 `wiki/素材/`，不是旧 `02-内容素材库`。
- X 内容发布前必须过 `/x-mastery-mentor` 对应审稿；计划内容走四层诊断。
- 小红书图文优先走 `/baoyu-xhs-images`；视频、数据、搜索走 `RedBookSkills`。
- 发布是 `approved-publish`：必须等用户明确说“发布 / 直接发”才 submit。
- 发布成功不能只看脚本 stdout；要回读平台侧 URL、主页/状态页、管理页、note id 或等价证据。

### 4. 工具与技能路由
- 当前入口以 `docs/reference/skills-manifest.md` 为准。
- 每日研究入口：`bash tools/daily.sh`；关注列表全量巡检需要显式 `--with-following-audit`。
- 详细系统优化方法已移到 `docs/reference/system-optimization-methods.md`，按需读取，不作为每轮 mandatory checklist。

<!-- 内容领域见 .rules -->

<!-- Shared block: edit docs/shared/redbook-playbook.md then run `python3 tools/sync_redbook_playbook.py` -->

<!-- BEGIN SHARED_RED_BOOK_PLAYBOOK -->
## 🎯 Redbook Lean Playbook（四条 Lane）

> 主流程只保留可执行规则。Agents OS 语义层详见 `docs/reference/agents-os-semantic-layer.md`；选题决策门详见 `docs/reference/editorial-decision-workflow.md`；长篇系统优化方法见 `docs/reference/system-optimization-methods.md`；技能入口见 `docs/reference/skills-manifest.md`。

### AGENTS.md 分层规则

`AGENTS.md` 是启动宪法，不是普通 README：必须直接承载项目身份、启动语义、Lane 路由、发布硬门槛、状态语义、恢复规则和主要入口。`docs/reference/` 承载详细流程，但任何 workflow 不能绕过 `AGENTS.md` 的启动规则；shared playbook 更新后必须运行 `python3 tools/sync_redbook_playbook.py` 同步到 `AGENTS.md / CLAUDE.md`。

### Agents OS 启动语义

Redbook 是用户的内容与发布 Agents OS，不只是资料夹。每个非简单任务先按语义层启动：

1. 用一句话确认用户最新意图。
2. 映射到 Lane A/B/C/D 或发布子流程。
3. 读取 `tasks/active.md`，确认是否有未完成发布、验证或恢复事项。
4. 选择权威 workflow doc / skill，再执行工具。
5. 判断是否需要 Wiki `query / ingest / lint`：写作、选题、复盘、方法论、素材沉淀默认需要进入 Knowledge OS。
6. 先定义完成证据：本轮完成后应该有哪个文件、URL、JSONL、报告、wiki 页面或 commit。
7. 任何外部副作用先确认 publish/submit gate 和 verifier；发布后不能只看 stdout。
8. 如果用户明确要求 `Agent Teams` / 项目 review，进入 `docs/reference/agent-teams-review-protocol.md`：先拆 semantic-policy、workflow-tooling、knowledge-writeback 三条 review lane，再合并 findings 并写回 repo。
9. 如果用户说“固定下来 / 下次复用 / 更新到系统 / 以后都这样做”，进入 `docs/reference/external-method-ingestion-workflow.md`，把方法写成可验证的语义层规则、工具 gate、wiki 知识或 lesson。

统一状态语义：
- `review_ready`：已有草稿或候选，等待审稿或用户确认。
- `publish_ready`：用户已明确批准发布，且必要 gate 已通过。
- `published_pending_verification`：平台 submit 可能已发生，但证据未闭环；这是验证 backlog，不是失败。
- `published_verified`：平台侧 URL / 管理页 / note id / verifier 证据已记录。
- `knowledge_queried`：已经检索 Wiki，并有 query 报告或明确引用的页面。
- `knowledge_ingest_pending`：新材料有长期价值，但还没压缩写入 Wiki。
- `knowledge_ingested`：稳定判断已写入 Wiki，并更新 `wiki/log.md`。
- `knowledge_lint_clean`：Wiki lint 无 index、链接、孤立页、日期或 overview 缺口。
- `blocked_user_action`：需要用户登录、扫码、验证码、权限或人工确认。
- `blocked_tooling`：浏览器、API、脚本、账号状态不可用或不一致。
- `review_in_progress`：Agent Teams / review lanes 正在并行审查。
- `review_findings_ready`：review findings 已收齐，等待 synthesis / durable writeback。

恢复规则：
- 中断或恢复后，先看 `tasks/active.md`、`git status --short` 和最新证据文件，再继续。
- 从“最后已验证状态”继续，而不是从“最后尝试动作”继续。
- 如果失败暴露了可重复缺口，优先修工具 gate，其次修 `docs/reference/` workflow，再同步 shared playbook 到 `AGENTS.md / CLAUDE.md`。
- 对 X 批量回复，`posted_pending_verification` 必须先跑 `tools/auto-x/scripts/verify_engagement_replies.mjs`，不得直接重试。
- 对知识任务，恢复时必须看 `wiki/log.md`、最新 `docs/reports/wiki-*` 和相关 wiki 页面；有可复用判断只停在原始报告里时，状态仍是 `knowledge_ingest_pending`。

### 快速路由

| 用户意图 | 默认 Lane | 状态负担 |
| --- | --- | --- |
| “今天有什么值得写 / 看看热点 / timeline” | Lane A：选题研究 | 不建完整 content run |
| “快评一下 / 写条 X / 热点速评” | Lane B：热点速评 | 轻量记录 |
| “做成完整内容 / 多平台 / 小红书 + X” | Lane C：计划内容 | 完整 harness |
| “修工具 / 整理 workflow / 装 skill / 清状态” | Lane D：系统维护 | 不进内容 harness |
| “Agent Teams / 项目 review / 语义层 review” | Review 子流程 | 拆 lane，写 durable findings |
| “固定下来 / 下次复用 / 更新到系统” | Method Ingestion 子流程 | 写成可验证规则 |

共同规则：
- Redbook 会话回复以 `✓` 开头。
- 先用 `tasks/active.md` 判断当前活跃任务；`tasks/todo.md` 只作历史兼容账本。
- 用户问“今天有什么选题 / 今天有什么值得写 / 看看热点”时，先检查今天 daily 是否已经跑过：看 `tools/redbookctl status`、`05-选题研究/X-每日日程-YYYY-MM-DD.md`、`X-timeline-fresh-following-YYYY-MM-DD.md`、`X-互动队列-YYYY-MM-DD.md`；当天证据缺失时先跑 `tools/redbookctl daily`，除非用户明确只要读现有材料。
- 需要写内容前先 query `wiki/`：`wiki/选题/`、`wiki/方法论/`、`wiki/素材/`。
- `02-内容素材库-archived/` 已归档，不作为主素材库。
- 不自动污染 `01-内容生产/选题管理/00-选题记录.md`；只有用户或 agent 明确选中题目后才 promotion。
- 每天早上的选题和用户贴来的新闻链接，都必须先进入 `选题决策门`，不要直接写稿、建完整内容包或发布。
- `选题决策门` 固定输出：新闻/选题一句话、账号主线契合、建议形态、为什么不是其他形态、推荐角度、目标受益人、Persona 匹配、是否需要小红书企业翻译、下一步动作。
- Agent 必须先给一个明确推荐，例如“我建议短评 / 我建议长文 / 我建议只收藏不写”，不要把所有选项平铺给用户重复决策。
- 用户确认发布形态后，才进入对应 Lane：短评走 Lane B，长文/多平台走 Lane C，只收藏走 wiki / 素材沉淀。
- 如果用户已经明确说“写短评 / 写长文 / 做小红书 / 发出”，可以跳过形态讨论，但仍要执行来源核验、结构、审稿和发布确认门。
- 外部发布统一是 `approved-publish`：草稿、预览、审稿可自动；submit/publish 必须等用户明确说“发布 / 直接发”。
- 图片生成统一优先走 Tuzi/兔子 `gpt-image-2.0`；不要再把 Nano Banana / Gemini 写成默认图像模型。
- 长文配图使用 balanced visual arc：封面可选，正文默认 3-5 张，约每 600-900 中文字或每 2-3 个主要小节 1 张，除小红书卡片系列外最多 6 张。
- 文内插图先做 visual metaphor map：每张图必须绑定一个文章短句 / 关键词，先判断语义、情绪、张力和读者感受，再决定视觉隐喻、承载面、主体关系、文字是否进入构图；不要只把段落摘要翻译成泛插画。
- 图文内容先做 `图文分镜.md`，再生图：文章结构负责论证，图文结构负责卡片叙事；每张图必须有版式职责、文字预算、安全边距和不重叠检查。
- X.com 和小红书图片规格必须分开：X 默认 `16:9` 单张观点卡（可选 `1:1`），小红书默认 `3:4` / `1080x1440` 的 5-7 张卡片；只共享视觉隐喻，不共享最终裁切图。
- X 长文如果需要正文插图，必须使用 X Article Markdown inline image 流或拆成结构化 thread；禁止用普通 X 主帖多图附件冒充正文插图，因为普通帖只会把图片渲染成 gallery，图片会脱离段落语义。
- `x-browser.ts` 只适合普通帖、短评、单图观点卡或明确要 gallery 的帖子；长文本 + 多图在 submit 时必须 fail-closed，除非发布清单明确写明“gallery 是故意的”并使用 `--allow-longform-gallery`。
- Codex / GPT Image 生成的 PNG 可能携带 OpenAI C2PA / Content Credentials，X 可能显示“由 AI 生成”。这是平台依据图片来源凭证自动标注，不是发布脚本加字；不要为了隐藏 AI 来源而剥离 provenance。若内容策略要求不出现 AI 标签，改用真实截图、人工设计图或授权素材。
- X.com 和小红书必须共享同一个账号主线，但不能共享同一篇长文结构：先写 `核心命题`，再分别做平台翻译。
- 当前账号主线是：AI 在企业/商业场景里如何真正落地，尤其是 agent、workflow、ROI、权限、review、审计、回滚、组织记忆和管理者判断。
- X.com 负责观点密度、产业判断和技术圈讨论；小红书负责把同一个判断翻译成企业经营、管理者决策、业务流程、ROI 风险和可执行清单。
- 小红书默认不做“开发者工具新闻搬运”和“X 长文切片”：每张卡必须回答一个企业读者任务，例如为什么相关、怎么判断、落在哪个部门/流程、有什么风险、下一步怎么做。
- 计划内容发稿前必须过 `受益人 + 冷读审稿门`：确认“我是那个 __ 型账号”、这篇具体让哪类人受益、陌生读者最可能在哪里划走；长文/小红书默认至少隔一次上下文再改稿，时间敏感内容可用独立冷读审稿替代实际等待。
- 新增 workflow / publish / browser / image pipeline 代码默认使用 TypeScript / Bun；Python 只保留 legacy、wiki/harness/daily research 或一次性数据脚本。详细规则见 `docs/reference/runtime-language-policy.md`。
- Codex App 里的浏览器调用优先使用 `Chrome` 插件 / Codex Chrome Extension：通过 `agent.browsers.get("extension")` 连接用户真实 Chrome，先 `browser.user.openTabs()` / `claimTab()` 复用现有页；需要新页时也在 extension backend 下新建。不要把 Playwright MCP 或 Chrome DevTools MCP 当作默认替代，除非 extension 不可用、任务是诊断/QA，或用户明确指定。
- 浏览器工作先跑 `tools/redbookctl browser` 检查现有 Chrome/CDP tabs；X 发布 profile 先跑 `tools/redbookctl x-login` 检查 composer 和 `expected_handle`；小红书发布前先跑 `tools/redbookctl xhs-health`，需要管理页证据时加 `--with-content-data`；优先复用已登录 tab 或已配置 profile，不默认新开未登录 profile、空白页或可见窗口。
- 每日 X 运营必须先生成 `X-timeline-fresh-following-YYYY-MM-DD.md` / `.json`：从当前 X following chronological timeline 读取目标 100 条，并按当天日期过滤，作为“今天发生了什么”的第一证据；`X-timeline-sample-YYYY-MM-DD.md` / `.json` 是 fresh following 派生补充样本，不再默认抓 home/for-you，也不使用 X Pro/search；再生成 `X-互动队列-YYYY-MM-DD.md`，从 fresh following 样本里筛 20 条高互动人/帖和回复草稿。默认只生成候选和草稿，不自动发布评论。
- X timeline 批量回复必须使用 `docs/reference/x-engagement-reply-workflow.md`：先预检账号与当前浏览器，排除已回复 source status，只选账号主线相关帖，先做真人感 / 原帖细节 / 账号契合的内容审稿，再跑脚本 gate；候选不足时少回，不硬凑数量。
- X 批量回复扩量前先做 5 条测试；用户认可风格后才扩大。发布后必须逐条拿 `with_replies` 验证 URL。用户指出 AI 味或质量差时，先做 keep/delete/rewrite 复审；删除必须等用户明确确认。

---

### Lane A：今天有什么值得写

目标：只做选题，不进入写稿。

步骤：
1. 先检查今天 daily 是否已跑：优先看 `tools/redbookctl status`，并确认 `05-选题研究/X-每日日程-YYYY-MM-DD.md`、`X-timeline-fresh-following-YYYY-MM-DD.md`、`X-互动队列-YYYY-MM-DD.md` 是否存在；缺失时先跑 `tools/redbookctl daily`，除非用户明确只要读现有材料或不抓取外部数据。
2. 读取 `05-选题研究/X-每日日程-YYYY-MM-DD.md`，但只把当日研究区作为选题来源。
3. 如果用户要求看 X timeline，必须优先读取或生成 `05-选题研究/X-timeline-fresh-following-YYYY-MM-DD.md`：默认目标 100 条当前 following chronological timeline，并按当天日期过滤；样本不足时必须在结论里标明缺口，不能把补充样本或 20 条互动队列当成完整 today timeline 观察。
4. 浏览器姿态默认 headless，只有登录、验证码或明确视觉确认才 headed。
5. fail-closed：X timeline / X search / X Pro 不可用时，必须明确说 X 证据缺口；不得用发布提醒、制作中旧稿、待深化旧题或历史选题池冒充“今天值得写”。
6. 发布提醒只用于提醒旧稿可发布，不是当日选题来源；除非用户明确要求“从旧稿里挑今天发什么”。
7. 输出 3-5 个可写选题，每个使用 `选题决策卡`：热度、争议点、账号契合、建议形态、推荐角度、目标受益人、Persona 匹配、为什么不建议其他形态。
8. 对每个候选明确平台翻译：X.com 的观点钩子是什么，小红书能否落到企业/商业/管理者场景；不能落地的小红书只标 X，不强行多平台。
9. 同步生成每日 X 互动队列：优先从 fresh following timeline 样本中挑有回复/转帖/喜欢势能、且能接上账号主线的人和帖子，生成 20 条回复候选；实际发布回复时必须按 `x-engagement-reply-workflow` 复筛和审稿。
10. 不创建完整 content run，不写发布清单，不自动写 `00-选题记录.md`。

完成标准：
- 有推荐选题列表。
- 有来源报告或当前浏览器证据；如果 X 证据不可用，结论必须标明不是来自 X timeline；如果 fresh following 样本少于目标数，必须标明样本不足。
- 明确哪些题适合 X、哪些适合小红书或长文。
- 有 `X-timeline-fresh-following-YYYY-MM-DD.md` 和 `X-互动队列-YYYY-MM-DD.md`，或明确说明 X timeline 证据/浏览器不可用导致样本/互动队列缺口。

---

### Lane B：热点速评

目标：0-1 小时内完成 X 短评或轻量图文准备。

步骤：
1. 如果用户只贴新闻链接，先输出 `选题决策卡`，建议是否短评、长文、thread、小红书或只收藏；用户确认形态后再写稿。
2. 核验来源和时效性。
3. 按固定短评结构写稿：`新闻锚点 -> 账号判断 -> 为什么重要 -> 原链接/回复结构`。
4. 快速说明目标受益人和转发/回复理由；热点短评不强制实际等待，但必须做一次独立冷读式检查。
5. `/x-mastery-mentor` 快速审稿：算法层、Hook 层、事实风险、链接/回复结构。
6. 展示最终稿、审稿结论和发布结构，等用户确认发布。
7. 发布后保存 `X短评.md` / `发布记录.md`，并记录状态 URL。

完成标准：
- 发布前：用户看过最终稿和审稿结论。
- 新闻链接型短评必须说明发在原帖下面还是独立发帖；独立发帖必须保留原链接，回复原帖则可不重复贴链接。
- 必须能说清这条短评写给谁、为什么值得对方转发或回复。
- 发布后：状态 URL 可打开，主页或管理页能看到对应内容。
- `tasks/progress.md` 有简短记录；wiki 只追加必要 log，不强制更新多个页面。

---

### Lane C：计划内容

目标：完整 X 长帖、小红书图文、公众号或多平台内容。

步骤：
1. 选题确认：来自日报、timeline、用户指令或已选中题库。
2. Wiki query：提炼角度、金句、案例和历史相关内容，尤其先查 `AI Agent企业导入与协作`、`AI工具与效率`、`跨平台账号编排`。
3. 账号命题门：先写 1 句话 `核心命题`，明确它如何服务“企业/商业 AI 落地”主线；如果只能写成工具新闻，回到 Lane A 重新选题。
4. 平台编排：保存 `平台编排.md` 或在 `发布清单.md` 中写清楚 X.com / 小红书 / 公众号各自承担的读者任务、角度、格式和不写什么。
5. 爆款对标：从当前平台高互动样本找 Hook、节奏、CTA，但只吸收表达结构，不迁移账号定位。
6. Persona / 受益人门：写清“我是那个 __ 型账号”、具体受益人、读者拿走的判断或动作；答不出就回到命题或素材层。
7. 创作主稿：嵌入 3-5 个人工素材，避免纯 AI 拼贴；X 主稿偏观点判断，小红书主稿偏企业应用、管理者判断和行动清单。
8. 冷读审稿：从陌生读者视角标出 3 处最可能划走的位置，给出“原文 -> 改法”；长文/小红书默认隔一次上下文再改稿，热点短评可用独立审稿替代等待。
9. 图文分镜：先拆出平台视觉结构，保存 `图文分镜.md`；小红书用卡片叙事，X 用强概念图，公众号/长文用文内插图，不直接复用文章段落结构。
10. 小红书企业应用门：每张卡必须绑定一个企业读者任务，至少覆盖场景、判断标准、ROI/风险、流程影响或行动建议之一；不能只解释产品更新。
11. 配图规划：为封面和正文插图写 visual metaphor map，列出插入位置、锚定短句、视觉隐喻、图文咬合方式、禁用元素。
12. 排版 QA：每张图必须检查标题/副标题/标签层级、图内文字字数、安全边距、主体与文字不重叠、缩略图可读；不通过就改 prompt 或重生。
13. X 长文载体门：如果图片职责是“正文插图”，先产出 `X-Article发布版.md`，用 Markdown `![](...)` 把图片插入对应段落；如果不走 X Article，则必须拆 thread，让每张图随对应 tweet 出现。只有“图片本来就是主帖 gallery”时才允许普通 X 主帖多图。
14. QA / 审稿：X 内容必须过 `/x-mastery-mentor` 四层诊断；小红书必须过“企业读者是否能用、是否不像新闻搬运、是否有业务场景、是否可收藏”的检查；配图方案必须过“是否服务观点、是否可读、是否非装饰、是否不侵权/不误导”的检查。
15. 发布前确认：展示最终稿、平台版本、配图方案、插图位置和风险点。
16. 发布与验证：按平台 skill 执行，并拿到真实平台侧证据。
17. 回写：发布记录、数据统计、wiki 沉淀、`tasks/progress.md`、git commit。

完成标准：
- 适合保留完整 harness 五阶段：`research -> draft -> review -> publish -> retrospect`。
- 主稿在 `01-内容生产/02-制作中的选题/` 或 `03-已发布的选题/`。
- 多平台内容必须有 `核心命题` 和 `平台编排` 记录；没有这两项时不能进入小红书图文生成。
- 计划内容必须记录 Persona / 受益人 / 冷读修改结论；没有冷读结论时只能标为草稿，不进入发布确认。
- X：不能只看脚本 stdout，要有状态 URL、发布时间、主页/状态页可见证据。
- 长文 / 公众号 / 小红书图文：发布清单必须说明图片模型、图片数量、插图插入位置、每张图的锚定短句与视觉隐喻、排版检查结论；默认模型为 Tuzi `gpt-image-2.0`。
- X 长文：若使用 2 张以上正文插图，发布清单必须明确载体是 `X Article inline images` 或 `thread-per-image`；不得只写“主帖附 4 张图”。
- 小红书图文必须有 `图文分镜.md` 或等价分镜表；每张卡片只承担一个读者任务，不把长文段落硬塞进图。
- 小红书图文必须明确企业/商业应用落点；如果选题只适合技术圈争论，就只做 X，不强行同步。
- 小红书：不能只看 `FILL_STATUS` 或 `PUBLISH_STATUS`，要有成功页、笔记管理状态或 note id。
- 数据回写至少有 T+0 `04-内容数据统计/publish-records.jsonl` 记录；T+1/T+3 数据可后续补。

---

### Lane D：系统维护 / 工具修复

目标：修脚本、整理 workflow、安装 skill、清理状态或优化 repo。

步骤：
1. 明确修复目标和影响范围。
2. 在 `tasks/active.md` 写简短 cleanup plan。
3. 小范围改动，优先删除、复用和降噪，不新增依赖。
4. 跑最小 smoke / lint / consistency check。
5. 更新 `tasks/progress.md`，提交 git。

完成标准：
- 不进入内容生产 harness。
- 不强制 wiki log，除非改动影响内容知识库。
- 删除/覆盖/外部副作用必须有明确授权；生成物清理优先 `git rm --cached` 或归档。

---

### 当前主要入口

- 工作流看板：`tools/redbookctl status`
- Loop Engineer 控制面：`tools/redbookctl loop status` / `tools/redbookctl loop next` / `tools/redbookctl loop run --lane A|B|C|D` / `tools/redbookctl loop review` / `tools/redbookctl loop close --run-id ...`
- 浏览器会话检查：`tools/redbookctl browser`（只读现有 Chrome/CDP，不开新页）
- X 发布 profile 检查：`tools/redbookctl x-login`（强制检查发布 profile 的 composer 和账号，不输入、不发布；`--headed` 用于人工登录恢复）
- 小红书发布健康检查：`tools/redbookctl xhs-health`；需要创作者管理页回读时用 `tools/redbookctl xhs-health --with-content-data`
- 每日研究：`tools/redbookctl daily`（等价于 `bash tools/daily.sh`）
- 每日 X timeline 样本与互动队列：`tools/redbookctl daily` 默认先生成目标 100 条、按今天过滤的 `X-timeline-fresh-following-YYYY-MM-DD.md`，再从 fresh following 样本派生补充 `X-timeline-sample-YYYY-MM-DD.md` 和 20 条 `X-互动队列-YYYY-MM-DD.md`；单独调试 fresh following 用 `node tools/auto-x/scripts/build_fresh_following_sample.mjs --date YYYY-MM-DD --target 100 --min-fresh 80`
- Agent Teams review：`docs/reference/agent-teams-review-protocol.md`
- 外部方法 / 用户纠偏摄入：`docs/reference/external-method-ingestion-workflow.md`
- 关注列表全量巡检：`tools/redbookctl daily --with-following-audit`
- 选中日报题目：`tools/redbookctl pick --topic "..." --source "..."`
- 创建完整内容 run：`tools/redbookctl draft --topic "..." --source "..." --summary "..."`
- 原创闭环挑战：`tools/redbookctl challenge --topic "..."`
- 隐性观点涌现：`tools/redbookctl emerge --topic "..."`
- 草稿种子生成：`tools/redbookctl draft-seed --topic "..."`
- 发布前/发布后缺口：`tools/redbookctl publish`
- Workflow 缺口总览：`tools/redbookctl workflow-health`（别名 `publish-health`）
- 发布数据记录：`tools/redbookctl publish-record -- --stage T+0 ...`
- 关闭 harness run：`tools/redbookctl close-run --run-id ... --status done`
- Wiki query：`python3 tools/wiki_workflow.py query --topic "..." --date YYYY-MM-DD`
- Wiki daily-cycle：由 `tools/auto-x/scripts/run_daily.sh` 调用，状态看 `wiki/log.md` 与 harness run。
- Harness：`python3 -m tools.redbook_harness.cli --help`
- X 审稿 / 创作辅助：`/x-mastery-mentor`
- X 发布：`/baoyu-post-to-x`（发帖前先 `tools/redbookctl x-login`）
- 固定选题决策门：`docs/reference/editorial-decision-workflow.md`
- 工作流启动指南：`docs/reference/workflow-start-guide.md`
- 图文分镜：`/article-visual-storyboard`
- 文档配图：`/document-illustrator`
- 小红书图文：`/baoyu-xhs-images`
- 小红书视频 / 数据 / 搜索：`RedBookSkills`
- 当前 skill 清单：`docs/reference/skills-manifest.md`

### 已降级入口

- `tools/auto-redbook/render_simple.sh`：用 `/baoyu-xhs-images` 替代。
- `tools/auto-redbook/publish_xhs.py`：用 `/baoyu-xhs-images` 替代。
- `tools/x-skills/x-collect` / `x-create` / `x-filter`：legacy local reference，不作为主流程默认入口。
- 单独运行 `search_x.py`、`scrape_following.py`、`trending_topics.py`：只用于调试或每日自动化内部。
<!-- END SHARED_RED_BOOK_PLAYBOOK -->

---

## 📚 Wiki Schema（LLM 知识库维护规范）

> 基于 Karpathy 的 LLM Wiki 模式。`wiki/` 是 LLM 维护的持续知识库，不是 RAG，是编译式知识。

### 三层架构

- **原始素材**（只读）：`05-选题研究/`、`01-内容生产/03-已发布的选题/`、`04-内容数据统计/`
- **Wiki**（LLM 维护）：`wiki/` — 结构化 markdown，LLM 写，用户读
- **Schema**（本节）：告诉 LLM 如何维护 wiki

### 操作一：Ingest（摄入新素材）

**触发时机**：
- 每日研究报告生成后（`05-选题研究/X-每日日程-{日期}.md`）
- 内容发布归档后
- 用户说「更新 wiki」「摄入今天的研究」

**流程**：
1. 读取原始素材
2. 判断涉及哪些 wiki 页面（选题/创作者/方法论/概念）
3. 更新相关页面（新增内容、修订旧内容、标记矛盾）
4. 更新 `wiki/index.md`（修改最后更新日期）
5. 在 `wiki/log.md` 追加一条记录：
   ```
   ## [日期] ingest | 素材标题
   触及页面：X个
   关键更新：...
   ```

**一次 ingest 可能触及 3-8 个页面**，这是正常的。

### 操作二：Query（查询 wiki）

**触发时机**：
- 用户说「深化选题」「检索素材」「生成标题」时，**先查 wiki**
- 创作任何内容前，先读 `wiki/index.md` 找相关页面

**流程**：
1. 读 `wiki/index.md` 找相关页面
2. 读相关页面，综合回答
3. 如果答案有价值（新的分析、对比、洞察），存回 wiki 作为新页面或更新

### 操作三：Lint（健康检查）

**触发时机**：用户说「检查 wiki」「wiki 健康检查」，或每周日

**检查项**：
- 矛盾：不同页面的说法是否一致？
- 孤立页面：有没有页面没有任何 `[[链接]]`？
- 过时内容：有没有被新数据推翻的结论？
- 缺失页面：有没有多次提到但没有独立页面的概念？
- 数据空白：哪些页面的数据表格还是空的？

### Wiki 页面格式规范

```markdown
# 页面标题

> 来源：原始文件路径 | 最后更新：YYYY-MM-DD

## 核心内容

...

## 相关页面

- [[其他页面]] — 一句话说明关联
```

### 目录结构约定

| 目录 | 存放内容 | 命名规范 |
|------|----------|----------|
| `wiki/选题/` | 话题知识页，从研究报告提炼 | `{话题名}.md` |
| `wiki/创作者/` | 创作者研究，风格拆解 | `@{handle}.md` |
| `wiki/方法论/` | 创作方法论，数据驱动更新 | `{方法名}.md` |
| `wiki/概念/` | 核心概念，可用于选题的理论框架 | `{概念名}.md` |
