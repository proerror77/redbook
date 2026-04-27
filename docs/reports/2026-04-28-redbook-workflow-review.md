# Redbook 工作流全面 Review

日期：2026-04-28

## 一句话结论

这个 workspace 已经不是“缺流程”，而是“流程太多、入口太多、状态太多”。真正让使用变卡的核心不是某个脚本慢，而是每次任务都会被拉进过重的全流程：读大规则、建任务、建 harness、query wiki、写 progress、写 log、可能还要 commit、还要验证多平台发布。结果是局部任务做不轻，完整任务又经常收不干净。

建议方向：把 Redbook 从“所有任务都跑完整内容工厂”改成“四条可选 lane + 一个可信状态面板”。默认走轻量 lane，只有计划长文和真实发布才升级到完整 lane。

## 当前做得好的部分

- 已经有清晰的内容域：AI 工具、agent workflow、独立开发者、内容增长。
- X 发布验证标准已经成熟：不能只看脚本 stdout，要看主页顶部、状态页、发布时间和 URL。
- 小红书发布也已经沉淀出更高证据门槛：管理页、审核中/已发布、note id。
- Wiki 已经补成可查询的知识底座，`wiki/index.md`、`wiki/overview.md`、`wiki/素材/` 都存在。
- `tools/redbook_harness` 有 run、artifact、check、incident 的最小 runtime，方向是对的。
- 浏览器模式已经有标准：默认 headless，登录/验证码/明确视觉确认才 headed。

## 主要卡点

### 1. 指令层过重，且互相打架

证据：

- `AGENTS.md` 727 行，`CLAUDE.md` 735 行，`docs/shared/redbook-playbook.md` 380 行。
- `tasks/todo.md` 3717 行，`tasks/progress.md` 2877 行，已经更像历史账本，不像操作面板。
- `CLAUDE.md` 已经把素材库改成 `wiki/素材/`，但 `AGENTS.md` 和部分规则仍要求检索 `02-内容素材库/`。
- `docs/superpowers/specs/2026-04-17-content-workflow-design.md` 明确“废弃独立素材库”，但 `工作流程图.md` 仍写“搜索 02-内容素材库/”。

影响：

- Agent 每次进来都要同时服从多套旧规则和新规则。
- 用户说一个轻量需求，系统会自动膨胀成“完整内容生产任务”。
- 越认真执行，越容易慢。

建议：

- `AGENTS.md` 只保留 1 页“操作宪法”：目录、四条 lane、发布硬门槛、浏览器原则、状态原则。
- 把 25 个系统优化方法、长篇 Agent Team 说明、历史工具说明移到 `docs/reference/`，不要放在每次必须读取的主指令里。
- `CLAUDE.md`、`AGENTS.md`、`docs/shared/redbook-playbook.md` 保留一个来源，其他文件同步生成或只作为 mirror。

### 2. Daily 入口的输出口径不一致

证据：

- `tools/daily.sh` 末尾提示生成的是 `05-选题研究/早报-YYYY-MM-DD.md`，还提示“请执行 wiki ingest”。
- 实际 `daily_schedule.py` 保存的是 `05-选题研究/X-每日日程-YYYY-MM-DD.md`。
- `tools/auto-x/scripts/run_daily.sh` 已经自动运行 `wiki_workflow.py daily-cycle`，并且还会尝试 `tools/wiki-auto/run_wiki_ingest.sh`。
- `docs/shared/redbook-playbook.md` 也写输出为 `早报-YYYY-MM-DD.md`，而 `工作流程图.md` 写的是 `X-每日日程-{日期}.md`。

影响：

- 人和 agent 都会找错文件。
- 会以为 wiki ingest 没做，实际运行层已经做了一部分。
- “早报”与“X 每日日程”两个概念没有收敛。

建议：

- 统一一个名字：建议用 `早报-YYYY-MM-DD.md` 作为给人看的日报；如果保留 `X-每日日程`，就把它定义成 raw/source，不再在主文档里混用。
- `daily.sh` 的结束提示必须改成真实输出，并说明 wiki 是“已记录 daily-cycle；内容写回是否成功看 log”。

### 3. Daily 默认后台启动 following 全量巡检，负担太重

证据：

- `tools/auto-x/scripts/run_daily.sh` 默认 `SHOULD_RUN_FOLLOWING_AUDIT=true`。
- 它每天后台启动 `audit_following.py --full-scrape --scroll-times 130`。
- 只有传入 `--skip-research`、`--skip-x`、`--skip-following` 才跳过。

影响：

- 每日任务会偷偷变成长任务。
- 本地 Chrome/CDP/X session 更容易不稳定。
- 用户体感会是“只是看早报，怎么机器又忙起来了”。

建议：

- 改成默认不跑 following audit。
- 新增显式参数：`--with-following-audit`。
- 全量 following audit 改成每周一次，或只在用户说“关注列表巡检/清理”时启动。

### 4. Harness 状态不可信：大量 run 永远 in_progress

证据：

- 当前 `tasks/harness/runs` 里 47 个 run，只有 3 个 `done`，43 个 `in_progress`，1 个 `retry_pending`。
- 41 个 `in_progress` 卡在 `research`。
- `tools/wiki_workflow.py` 会创建 `LLM Wiki ingest/query/lint` run 并设置 research checks，但没有把这类维护任务 promote 到终态。
- `HarnessRuntime.promote()` 只有在最后阶段再次 promote 才把 run 置为 `done`，但 wiki maintenance 并不需要完整 `research -> draft -> review -> publish -> retrospect`。

影响：

- dashboard 一看全是未完成，用户自然觉得“不完整”。
- agent 后续不知道哪些是真未完成，哪些只是当时没有关闭。
- `in_progress` 失去语义。

建议：

- 给 harness 加 `run_type`：
  - `content_pipeline`：完整五阶段。
  - `wiki_maintenance`：`research -> done`。
  - `research_only`：`research -> done`。
  - `publish_task`：`draft/review/publish/retrospect`。
- 给旧 run 加关闭脚本：把已产出报告但不再推进的 run 标为 `closed_stale` 或 `research_done`，不要继续叫 `in_progress`。

### 5. `tasks/todo.md` 已经不是任务面板

证据：

- 文件 3717 行，顶部仍是 2026-04-22 已完成工具链任务。
- 它混合了安装 skill、修脚本、内容生产、发布记录、review 结论。

影响：

- 当前任务和历史完成任务混在一起。
- Agent 每次“按规则更新 todo”会继续增加噪音。
- 用户想看今天该做什么时，无法快速判断。

建议：

- 新建或重构为两层：
  - `tasks/active.md`：只保留当前 5-10 个活跃项。
  - `tasks/archive/YYYY-QX.md`：完成任务归档。
- `tasks/todo.md` 要么废弃为兼容入口，要么只放 active task 的摘要和链接。

### 6. 选题池被自动追加污染

证据：

- `01-内容生产/选题管理/00-选题记录.md` 中出现多段重复日期。
- 早期自动追加过 `@handle`、`Deck 列数`、`抓取推文数`、`code`、`dev` 这类非选题。
- 虽然后来 `_extract_topics_for_record()` 已避免 naive bold extraction，但旧噪音还在。

影响：

- “选题池”不像候选题库，更像抓取残渣。
- 计划内容时会被低质量条目干扰。

建议：

- Daily 不再自动写入 `00-选题记录.md`。
- Daily 只在日报里生成“推荐选题 Top 3/5”。
- 用户或 agent 明确选中后，才 promotion 到 `00-选题记录.md` 或 `01-待深化的选题/`。
- 清理旧 `X 每日研究发现` 噪音到归档，不删除原始日报。

### 7. 发布和数据回写没有形成闭环

证据：

- `wiki/log.md` 记录了很多 X 已发布状态 URL。
- `04-内容数据统计/数据统计表.md` 的 X.com 数据表仍为空。
- `01-内容生产/02-制作中的选题/` 仍有很多已经发过或半发过的 X 稿，归档状态不一致。

影响：

- 内容是否有效，主要靠记忆和聊天记录，不靠结构化数据。
- 方法论无法真正“数据驱动”。

建议：

- 发布完成后必须生成 `publish_record.md`，但数据统计可以拆成 T+0 / T+1 / T+3：
  - T+0：状态 URL、发布时间、初始 views。
  - T+1：浏览/赞/转/回复。
  - T+3：是否值得复盘进方法论。
- `04-内容数据统计/数据统计表.md` 不适合长期手写，建议改成 CSV/JSONL + markdown report。

### 8. “自动发布”与“用户确认发布”两种规则并存

证据：

- `docs/shared/redbook-playbook.md` 对计划内容和热点速评都要求用户确认后才发布。
- `工作流程图.md`、`tools/README.md` 多处写“全自动发布”“自动生成 + 发布”。
- 用户历史偏好是：写稿/审稿可以自动，发布动作要有状态 URL 级验证；部分热点还要求先给审核。

影响：

- Agent 容易在“准备好”和“发出去”之间误判。
- 也容易在不该发布时真的执行外部 side effect。

建议：

- 统一叫法：
  - `auto-prepare`：自动生成、自动填充、自动预览。
  - `approved-publish`：用户明确说“发布/直接发”后才 submit。
- 文档里不要再把发布 skill 描述为无条件“全自动发布”。

### 9. 文档引用了不存在或不稳定的 skill 名称

证据：

- 多个文档使用 `/x-collect`、`/x-create`、`/x-filter`、`/post-to-xhs`。
- 当前可见本地 skill 主要是 `.agents/skills/baoyu-*`、`x-mastery-mentor`、`document-illustrator` 等；`x-collect/x-create/x-filter` 不是当前显式可用入口。

影响：

- Agent 会按文档找工具，结果找不到或走 fallback。
- 用户感觉“流程写得很完整，但跑起来总缺一块”。

建议：

- 做一次 `skills manifest`：
  - `docs/reference/skills-manifest.md` 记录真实可用名称、位置、用途、是否推荐。
  - 主流程只引用 manifest 里 `status=active` 的入口。

### 10. Repo 物理体积和历史产物太重

证据：

- 当前目录约 10G。
- git tracked files 约 1922 个。
- `git ls-files | rg node_modules` 约 833 个，其中 `docs/plans/pptx-build/node_modules` 约 7.6M 且已被跟踪。
- 本地扫描还发现大量 ignored/generated 缓存、运行产物、图片和工具子项目。

影响：

- `rg/find/git status` 更慢。
- agent 上下文探索更容易被无关项目和产物干扰。
- 内容 workspace 与工具试验场混在一起。

建议：

- 把大型工具试验目录移入 `tools/_archive/` 或单独 repo。
- untrack `node_modules` 和 build artifacts，保留 lockfile/package manifest。
- `docs/plans/pptx-build/node_modules` 应从 git 中移除。

## 建议的新工作流

### Lane A：今天有什么值得写

目标：选题，不进入写稿。

步骤：
1. 跑或读取今日日报。
2. 如果用户要求看 X timeline，就优先当前登录 X/X Pro。
3. 输出 3-5 个“可写选题”，每个只给：热度、争议点、账号契合、建议形态。
4. 不创建完整 content run，不写发布清单。

完成标准：
- 有推荐选题列表。
- 有来源报告路径。
- 不污染 `00-选题记录.md`，除非用户选中。

### Lane B：热点速评

目标：0-1 小时内完成 X 短评。

步骤：
1. 来源核验。
2. 写短评。
3. x-mastery 快速审稿，只看算法层 + Hook 层 + 事实风险。
4. 用户确认后发布。
5. 保存 `X短评.md` + `发布记录.md`。

完成标准：
- 状态 URL 可打开。
- `tasks/progress.md` 简短记录。
- wiki 只追加 log；不强制更新多个 wiki 页面。

### Lane C：计划内容

目标：完整 X 长帖/小红书/公众号内容。

步骤：
1. 选题确认。
2. wiki query。
3. 爆款对标。
4. 主稿。
5. QA + 发布清单。
6. 用户确认。
7. 发布 + 验证。
8. 数据回写 + wiki 沉淀。

完成标准：
- 适合保留完整 harness 五阶段。
- 只有这条 lane 强制完整 `research -> draft -> review -> publish -> retrospect`。

### Lane D：系统维护 / 工具修复

目标：修脚本、安装 skill、整理环境。

步骤：
1. 明确修复目标。
2. 小范围改动。
3. 本地 smoke。
4. 记录进 `tasks/progress.md`。

完成标准：
- 不进入内容生产 harness。
- 不强制 wiki log，除非影响内容知识库。

## 优先级修复清单

### P0：马上做

1. 修正 `tools/daily.sh` 的结束提示，避免说错文件和重复提示 wiki ingest。
2. `run_daily.sh` 默认关闭 following 全量巡检，改成显式 `--with-following-audit`。
3. 给 stale harness runs 做一次状态关闭，至少把 wiki maintenance 类 run 标成终态。
4. 主流程文档去掉 `02-内容素材库/` 旧引用，统一到 `wiki/`。
5. 建立 `tasks/active.md`，停止把历史任务继续堆进 `tasks/todo.md` 顶部。

### P1：一轮整理

1. 把 `AGENTS.md` 缩短到 lean playbook，长规则移到 reference。
2. 清理 `00-选题记录.md` 的自动抓取噪音。
3. 建 `skills manifest`，修正文档里的不存在 skill。
4. 发布后数据回写改为结构化记录。
5. untrack `node_modules` / build artifacts。

### P2：增强体验

1. 做一个 `redbookctl` 或 Makefile：
   - `redbookctl daily`
   - `redbookctl pick`
   - `redbookctl draft`
   - `redbookctl publish`
   - `redbookctl close-run`
2. 用一个 dashboard 汇总：
   - 今日日报
   - active runs
   - 待确认发布
   - 已发布待数据回写
   - stale runs

## 推荐的第一步改动

不要先重写整个系统。第一步只做“降噪和终态修正”：

1. 修改 `run_daily.sh`：following audit 默认关闭。
2. 修改 `daily.sh`：输出提示与真实文件一致。
3. 新增 `tasks/active.md`：今天只看活跃项。
4. 新增 harness close 命令或维护脚本：关闭旧的 wiki maintenance run。
5. 修正 `docs/shared/redbook-playbook.md` 与 `AGENTS.md` 的素材库/早报名不一致。

这五项完成后，体感会明显改善，因为 agent 不会再一进入任务就被旧状态、旧命名、后台长任务和过量 checklist 拖住。

