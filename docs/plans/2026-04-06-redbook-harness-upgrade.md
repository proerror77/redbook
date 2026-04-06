# Redbook Harness Upgrade

## 目标

把 redbook 从“有流程文档的多 Agent 内容系统”升级为“带最小运行时控制的 harness 系统”。

本次升级不试图一次做完全部能力。
只补最缺、最能立刻改变系统性质的四层：

1. `run state`
2. `stage gates`
3. `artifact trace`
4. `CLI runtime`
5. `verifier layer`
6. `retry / escalation policy`

## 当前判断

### 已具备

- 有清晰阶段流转：研究 -> 创作 -> 发布 -> 复盘
- 有多角色分工：Lead / Research / Writing / Platform / QA
- 有知识沉淀：wiki / 素材库 / 研究报告
- 有任务文档：`tasks/todo.md`
- 有经验回写：`tasks/lessons.md`

### 关键缺口

- 流程更多靠文档约定，不是运行时强约束
- 缺少 machine-readable run state
- 缺少阶段 gate 校验
- 缺少 artifact 追踪
- 缺少统一 CLI / runtime 入口
- 缺少失败恢复、自动 verifier、tracing、eval loop

## 本次实现

### 1. Run State

新增最小 run JSON：

- `run_id`
- `topic`
- `source`
- `owner`
- `priority`
- `current_stage`
- `status`
- `checks`
- `artifacts`
- `events`

保存位置：

- `tasks/harness/runs/*.json`

### 2. Stage Gates

定义五个阶段：

1. `research`
2. `draft`
3. `review`
4. `publish`
5. `retrospect`

每个阶段都绑定：

- `required_artifact_types`
- `required_checks`

这让“是否允许推进到下一阶段”从主观判断变成显式 gate。

### 3. Artifact Trace

每次关键产物都能挂到 run 上：

- `research_report`
- `draft`
- `qa_report`
- `publish_checklist`
- `publish_record`
- `progress_log`
- `wiki_log`

这解决两个问题：

- 以后能追溯“这个结果是怎么来的”
- 后续能基于 artifact 做 verifier 和 eval

### 4. CLI Runtime

新增：

- `python3 -m tools.redbook_harness.cli new-run`
- `list-runs`
- `show-run`
- `add-artifact`
- `set-check`
- `check-gates`
- `promote`
- `describe`

这让系统第一次拥有了最小运行时，而不只是说明文档。

### 5. Verifier Layer

新增 `tools/redbook_harness/verifier.py`，让 gate 不再只看：

- 有没有 artifact
- 有没有手工勾 check

而开始检查 artifact 本身是否合格。

当前已覆盖：

- `research_report`
- `draft`
- `qa_report`
- `publish_checklist`
- `publish_record`
- `progress_log`
- `wiki_log`

其中 `research_report` / `draft` 已经检查：

- Markdown 标题
- 二级标题数量
- 关键 section 是否存在
- 最小内容长度

`check-gates` 与 `promote` 已经把 verifier 结果一并算入 gate。
所以现在“手工把 check 勾成 true”已经不够了；如果稿件结构不合格，阶段仍然不能推进。

### 6. Retry / Escalation Policy

新增 `tools/redbook_harness/policy.py`，让 run 在失败时不只是“报错”，而是能明确：

- 当前故障是什么
- 下一步应该 `retry` 还是 `escalate`
- 还剩几次重试额度
- 当前阶段是否应被阻塞

当前已支持的故障类型：

- `tool_transient`
- `artifact_missing`
- `verification_failed`
- `rate_limited`
- `permission_required`
- `manual_review_required`
- `unknown`

新增 CLI：

- `report-incident`
- `incident-plan`
- `retry-incident`
- `escalate-incident`
- `resolve-incident`

当前策略是保守的：

- 临时性故障优先 `retry`
- 结构错误、权限问题、人工审核边界优先 `escalate`
- 当前阶段只要存在未解决 incident，`check-gates` 就会把它视为 blocking issue

## 为什么先做这四层

因为它们是后续能力的支点。

没有 run state，就没法做 tracing。
没有 stage gates，就没法做 verifier。
没有 artifacts，就没法做 eval。
没有 runtime CLI，就没法把流程从“手工约定”升级成“系统操作”。

## 还没做的部分

### 下一批优先级最高

1. `run tracing`
   - 每次 tool 调用、agent 决策、产出变化都记录

2. `memory injection`
   - 把 `lessons/wiki` 变成可结构化检索并注入 run 的 memory

### 再下一批

3. `eval loop`
4. `policy / permission layer`
5. `subagent orchestration runtime`
6. `dashboard`

## 对当前系统的影响

### 不变的部分

- 现有 `AGENTS.md` 工作流仍成立
- 现有 skills / 发布工具仍继续使用
- 现有 `tasks/todo.md` / `wiki/log.md` / `tasks/progress.md` 不需要停用

### 新增的部分

- 以后每个重要内容任务都可以先创建一个 harness run
- 每推进一阶段，就把 artifact 与 checks 回写到 run
- `tasks/todo.md` 继续做人类可读任务板
- `tasks/harness/runs/*.json` 负责机器可读运行时

## 迁移建议

### Phase 1

先用 harness 跑“单篇内容生产”：

- 创建 run
- 研究完成后挂 `research_report`
- 写稿后挂 `draft`
- QA 后挂 `qa_report`
- 发布后挂 `publish_record`
- 复盘后挂 `progress_log` / `wiki_log`

### Phase 2

把 `daily.sh` 产出的每日日报，也纳入 harness run。

### Phase 3

再把多 Agent 协作接到统一 orchestrator 上。

## 成功标准

本次升级后的系统，不再只是：

- “我们约定应该这样做”

而开始变成：

- “系统里明确知道现在在哪一阶段”
- “系统里明确知道缺什么不能继续”
- “系统里明确知道这个产物是怎么来的”

这就是 redbook 从流程化系统迈向 Harness Engineering 的第一步。
