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

---

### Lane A：今天有什么值得写

目标：只做选题，不进入写稿。

步骤：
1. 跑或读取 `05-选题研究/X-每日日程-YYYY-MM-DD.md`。
2. 如果用户要求看 X timeline，优先当前已登录 X/X Pro 页面。
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
5. QA / 审稿：X 内容必须过 `/x-mastery-mentor` 四层诊断。
6. 发布前确认：展示最终稿、平台版本、配图方案和风险点。
7. 发布与验证：按平台 skill 执行，并拿到真实平台侧证据。
8. 回写：发布记录、数据统计、wiki 沉淀、`tasks/progress.md`、git commit。

完成标准：
- 适合保留完整 harness 五阶段：`research -> draft -> review -> publish -> retrospect`。
- 主稿在 `01-内容生产/02-制作中的选题/` 或 `03-已发布的选题/`。
- X：不能只看脚本 stdout，要有状态 URL、发布时间、主页/状态页可见证据。
- 小红书：不能只看 `PUBLISH_STATUS`，要有成功页、笔记管理状态或 note id。
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
- 每日研究：`tools/redbookctl daily`（等价于 `bash tools/daily.sh`）
- 关注列表全量巡检：`tools/redbookctl daily --with-following-audit`
- 选中日报题目：`tools/redbookctl pick --topic "..." --source "..."`
- 创建完整内容 run：`tools/redbookctl draft --topic "..." --source "..." --summary "..."`
- 发布前/发布后缺口：`tools/redbookctl publish`
- 发布数据记录：`tools/redbookctl publish-record -- --stage T+0 ...`
- 关闭 harness run：`tools/redbookctl close-run --run-id ... --status done`
- Wiki query：`python3 tools/wiki_workflow.py query --topic "..." --date YYYY-MM-DD`
- Wiki daily-cycle：由 `tools/auto-x/scripts/run_daily.sh` 调用，状态看 `wiki/log.md` 与 harness run。
- Harness：`python3 -m tools.redbook_harness.cli --help`
- X 审稿 / 创作辅助：`/x-mastery-mentor`
- X 发布：`/baoyu-post-to-x`
- 文档配图：`/document-illustrator`
- 小红书图文：`/baoyu-xhs-images`
- 小红书视频 / 数据 / 搜索：`RedBookSkills`
- 当前 skill 清单：`docs/reference/skills-manifest.md`

### 已降级入口

- `tools/auto-redbook/render_simple.sh`：用 `/baoyu-xhs-images` 替代。
- `tools/auto-redbook/publish_xhs.py`：用 `/baoyu-xhs-images` 替代。
- `tools/x-skills/x-collect` / `x-create` / `x-filter`：legacy local reference，不作为主流程默认入口。
- 单独运行 `search_x.py`、`scrape_following.py`、`trending_topics.py`：只用于调试或每日自动化内部。
