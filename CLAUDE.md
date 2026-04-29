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

# Redbook 内容生产系统

## 项目概述
这是一个系统化的内容生产工作流，用于管理多平台（小红书、抖音、X.com、公众号）的内容创作。

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

> 主流程只保留可执行规则。长篇系统优化方法见 `docs/reference/system-optimization-methods.md`；技能入口见 `docs/reference/skills-manifest.md`。

### 快速路由

| 用户意图 | 默认 Lane | 状态负担 |
| --- | --- | --- |
| “今天有什么值得写 / 看看热点 / timeline” | Lane A：选题研究 | 不建完整 content run |
| “快评一下 / 写条 X / 热点速评” | Lane B：热点速评 | 轻量记录 |
| “做成完整内容 / 多平台 / 小红书 + X” | Lane C：计划内容 | 完整 harness |
| “修工具 / 整理 workflow / 装 skill / 清状态” | Lane D：系统维护 | 不进内容 harness |

共同规则：
- Redbook 会话回复以 `✓` 开头。
- 先用 `tasks/active.md` 判断当前活跃任务；`tasks/todo.md` 只作历史兼容账本。
- 需要写内容前先 query `wiki/`：`wiki/选题/`、`wiki/方法论/`、`wiki/素材/`。
- `02-内容素材库-archived/` 已归档，不作为主素材库。
- 不自动污染 `01-内容生产/选题管理/00-选题记录.md`；只有用户或 agent 明确选中题目后才 promotion。
- 外部发布统一是 `approved-publish`：草稿、预览、审稿可自动；submit/publish 必须等用户明确说“发布 / 直接发”。
- 图片生成统一优先走 Tuzi/兔子 `gpt-image-2.0`；不要再把 Nano Banana / Gemini 写成默认图像模型。
- 长文配图使用 balanced visual arc：封面可选，正文默认 3-5 张，约每 600-900 中文字或每 2-3 个主要小节 1 张，除小红书卡片系列外最多 6 张。
- 文内插图先做 visual metaphor map：每张图必须绑定一个文章短句 / 关键词，先判断语义、情绪、张力和读者感受，再决定视觉隐喻、承载面、主体关系、文字是否进入构图；不要只把段落摘要翻译成泛插画。
- 图文内容先做 `图文分镜.md`，再生图：文章结构负责论证，图文结构负责卡片叙事；每张图必须有版式职责、文字预算、安全边距和不重叠检查。
- X.com 和小红书图片规格必须分开：X 默认 `16:9` 单张观点卡（可选 `1:1`），小红书默认 `3:4` / `1080x1440` 的 5-7 张卡片；只共享视觉隐喻，不共享最终裁切图。
- 浏览器工作先跑 `tools/redbookctl browser` 检查现有 Chrome/CDP tabs；X 发布 profile 先跑 `tools/redbookctl x-login` 检查 composer 和 `expected_handle`；小红书发布前先跑 `tools/redbookctl xhs-health`，需要管理页证据时加 `--with-content-data`；优先复用已登录 tab 或已配置 profile，不默认新开未登录 profile、空白页或可见窗口。

---

### Lane A：今天有什么值得写

目标：只做选题，不进入写稿。

步骤：
1. 跑或读取 `05-选题研究/X-每日日程-YYYY-MM-DD.md`。
2. 如果用户要求看 X timeline，优先当前已登录 X/X Pro 页面；浏览器姿态默认 headless，只有登录、验证码或明确视觉确认才 headed。
3. 输出 3-5 个可写选题，每个只给：热度、争议点、账号契合、建议形态。
4. 不创建完整 content run，不写发布清单，不自动写 `00-选题记录.md`。

完成标准：
- 有推荐选题列表。
- 有来源报告或浏览器证据路径。
- 明确哪些题适合 X、哪些适合小红书或长文。

---

### Lane B：热点速评

目标：0-1 小时内完成 X 短评或轻量图文准备。

步骤：
1. 核验来源和时效性。
2. 写短评或轻量草稿。
3. `/x-mastery-mentor` 快速审稿：算法层、Hook 层、事实风险。
4. 展示稿件，等用户确认发布。
5. 发布后保存 `X短评.md` / `发布记录.md`，并记录状态 URL。

完成标准：
- 发布前：用户看过最终稿和审稿结论。
- 发布后：状态 URL 可打开，主页或管理页能看到对应内容。
- `tasks/progress.md` 有简短记录；wiki 只追加必要 log，不强制更新多个页面。

---

### Lane C：计划内容

目标：完整 X 长帖、小红书图文、公众号或多平台内容。

步骤：
1. 选题确认：来自日报、timeline、用户指令或已选中题库。
2. Wiki query：提炼角度、金句、案例和历史相关内容。
3. 爆款对标：从当前平台高互动样本找 Hook、节奏、CTA。
4. 创作主稿：嵌入 3-5 个人工素材，避免纯 AI 拼贴。
5. 图文分镜：先拆出平台视觉结构，保存 `图文分镜.md`；小红书用卡片叙事，X 用强概念图，公众号/长文用文内插图，不直接复用文章段落结构。
6. 配图规划：为封面和正文插图写 visual metaphor map，列出插入位置、锚定短句、视觉隐喻、图文咬合方式、禁用元素。
7. 排版 QA：每张图必须检查标题/副标题/标签层级、图内文字字数、安全边距、主体与文字不重叠、缩略图可读；不通过就改 prompt 或重生。
8. QA / 审稿：X 内容必须过 `/x-mastery-mentor` 四层诊断；配图方案必须过“是否服务观点、是否可读、是否非装饰、是否不侵权/不误导”的检查。
9. 发布前确认：展示最终稿、平台版本、配图方案、插图位置和风险点。
10. 发布与验证：按平台 skill 执行，并拿到真实平台侧证据。
11. 回写：发布记录、数据统计、wiki 沉淀、`tasks/progress.md`、git commit。

完成标准：
- 适合保留完整 harness 五阶段：`research -> draft -> review -> publish -> retrospect`。
- 主稿在 `01-内容生产/02-制作中的选题/` 或 `03-已发布的选题/`。
- X：不能只看脚本 stdout，要有状态 URL、发布时间、主页/状态页可见证据。
- 长文 / 公众号 / 小红书图文：发布清单必须说明图片模型、图片数量、插图插入位置、每张图的锚定短句与视觉隐喻、排版检查结论；默认模型为 Tuzi `gpt-image-2.0`。
- 小红书图文必须有 `图文分镜.md` 或等价分镜表；每张卡片只承担一个读者任务，不把长文段落硬塞进图。
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
- 浏览器会话检查：`tools/redbookctl browser`（只读现有 Chrome/CDP，不开新页）
- X 发布 profile 检查：`tools/redbookctl x-login`（强制检查发布 profile 的 composer 和账号，不输入、不发布；`--headed` 用于人工登录恢复）
- 小红书发布健康检查：`tools/redbookctl xhs-health`；需要创作者管理页回读时用 `tools/redbookctl xhs-health --with-content-data`
- 每日研究：`tools/redbookctl daily`（等价于 `bash tools/daily.sh`）
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
| `wiki/素材/` | 金句、案例、可复用框架（替代独立素材库） | `{类型}.md`（金句库/案例库/框架库） |
