# Redbook Agents OS Review

日期：2026-05-12

## 结论

Redbook 现在不应该只被定义为 social media 发布工作流。它已经具备一个完整 Agents OS 的雏形，至少包含五个子系统：

| 子系统 | 当前职责 | 当前状态 | 主要缺口 |
| --- | --- | --- | --- |
| Social Publishing OS | X / 小红书 / 公众号发布、回复、验证、数据回写 | 较成熟 | 外部平台验证已补强，但仍需统一状态快照 |
| Knowledge / Wiki OS | 选题、方法论、素材、概念、创作者的语义知识底座 | 可用且 lint 干净 | 语义层里权重不够，query / ingest / lint 需要成为 boot contract |
| Research OS | 每日 X/HN/Reddit/timeline 研究与候选筛选 | 可用 | 需要更强区分“今天证据”和旧素材 |
| Content Production OS | Lane C 内容包、harness、平台编排、QA、发布清单 | 可用 | 与 Wiki 的双向回写还应更显式 |
| Evidence / Recovery OS | JSONL、报告、progress、active、verifier、commit | 可用 | 需要统一 state snapshot，减少靠人工读多个文件 |

核心判断：`wiki/` 应该被写进语义层，而且不是作为普通资料库，而是作为 Redbook 的 semantic memory subsystem。任何创作、选题、复盘、方法论沉淀都应该明确经过 Wiki query / ingest / lint 的入口。

## 证据

- `wiki/index.md` 当前索引 28 个页面，覆盖方法论、概念、选题、创作者、素材。
- `wiki/overview.md` 已维护核心论点，包括账号主线、跨平台翻译、AI 工具信任、选题决策门、冷读审稿。
- `tools/wiki_workflow.py` 已提供 `start-daily-ingest`、`query`、`lint`、`daily-cycle` 四类显式 workflow。
- 2026-05-12 wiki lint 结果：
  - `missing_from_index=0`
  - `dangling_in_index=0`
  - `orphan_pages=0`
  - `stale_index_dates=0`
  - `overview_stale=false`
- `docs/reference/agents-os-semantic-layer.md` 已定义 Intent / Policy / Memory / Workflow / Evidence / Recovery，但原版本对 Wiki OS 的独立状态、入口和证据要求不足。

## 主要发现

1. **发布系统已经比知识系统更硬**

X 批量回复已经有预检、审稿、脚本 gate、publisher、verifier、verified-only 汇总。Wiki 也有工具，但语义层没有同等强度地要求“创作前 query、发布后 ingest、定期 lint”。

2. **Wiki 是唯一长期语义记忆，不应只是素材库**

`05-选题研究/` 是原始证据，`01-内容生产/` 是内容工件，`04-内容数据统计/` 是表现账本。真正跨会话复用的判断应该进入 `wiki/`，否则下一次 agent 只能重新读大量历史文件。

3. **当前最大风险是知识只进报告，不进 Wiki**

许多选题研究、发布记录、平台反馈会形成报告，但不一定被压缩成 Wiki 页面里的稳定判断。这会导致 repo 越来越大，semantic memory 却增长较慢。

4. **Wiki workflow 需要状态语义**

发布系统有 `published_pending_verification`。Wiki 也需要相同级别的状态：

- `knowledge_queried`
- `knowledge_ingest_pending`
- `knowledge_ingested`
- `knowledge_lint_clean`
- `knowledge_conflict_detected`
- `knowledge_stale`

5. **Review / recovery 应该同时看 active、progress、wiki/log**

现在恢复发布任务会看 `tasks/active.md` 和 JSONL，但恢复知识任务还应该看 `wiki/log.md`、`docs/reports/wiki-*` 和最近更新的 Wiki 页面。

## 修订建议

### 1. 语义层升级

在 `docs/reference/agents-os-semantic-layer.md` 中新增 `Knowledge OS Contract`：

- Wiki 是唯一长期语义记忆。
- 创作前必须 query。
- 发布 / 每日研究 / 有价值复盘后应 ingest。
- 每次大规模 ingest 后跑 lint。
- 原始素材留在 `05-选题研究/`，稳定判断进入 `wiki/`。

### 2. Shared playbook 启动规则升级

在 Agents OS boot sequence 中加入：

- 如果任务涉及写作、选题、复盘、方法论、素材沉淀，先判断是否需要 Wiki query / ingest / lint。
- 如果任务产出可复用判断，结束时写入 Wiki 或明确说明不写入原因。

### 3. 后续工具化

后续可把 `tools/redbookctl status` 扩展为 Agents OS state snapshot，至少输出：

- active tasks
- pending publish verification
- latest wiki lint status
- latest wiki ingest/query report
- pending publish records
- dirty worktree summary

## 本轮已执行

- 跑 `python3 tools/wiki_workflow.py lint --date 2026-05-12`。
- 准备更新语义层和 shared playbook，让 Knowledge / Wiki OS 成为一等子系统。
