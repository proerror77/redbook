# Redbook Harness Storage

这个目录保存最小 harness 运行时的状态文件。

## 结构

- `runs/`：每个内容生产 run 的 JSON 状态

## 目标

把原来主要依赖文档约定的流程，升级为可机读、可校验、可追溯的运行时状态。

## 常用命令

```bash
python3 -m tools.redbook_harness.cli describe
python3 -m tools.redbook_harness.cli new-run --topic "选题" --source "wiki/选题/..." --summary "一句话目标"
python3 -m tools.redbook_harness.cli add-artifact --run-id <run_id> --type research_report --path 05-选题研究/xxx.md --description "研究结论"
python3 -m tools.redbook_harness.cli set-check --run-id <run_id> --name materials_queried --value true
python3 -m tools.redbook_harness.cli verify-run --run-id <run_id> --stage draft
python3 -m tools.redbook_harness.cli report-incident --run-id <run_id> --code tool_transient --summary "临时失败"
python3 -m tools.redbook_harness.cli incident-plan --run-id <run_id>
python3 -m tools.redbook_harness.cli retry-incident --run-id <run_id> --incident-id <incident_id>
python3 -m tools.redbook_harness.cli escalate-incident --run-id <run_id> --incident-id <incident_id> --owner human
python3 -m tools.redbook_harness.cli resolve-incident --run-id <run_id> --incident-id <incident_id> --note "已处理"
python3 -m tools.redbook_harness.cli check-gates --run-id <run_id>
python3 -m tools.redbook_harness.cli promote --run-id <run_id>
```

## 当前 verifier 能力

- `research_report`：检查标题、二级标题数量、结论 section、来源 section、最小内容长度
- `draft`：检查标题、二级标题数量、`## 发布清单`、最小内容长度
- `qa_report`：检查标题与基础 QA 结构
- `publish_checklist`：检查 checkbox 数量
- `publish_record`：检查是否留下平台/发布证据
- `progress_log` / `wiki_log`：检查是否包含当前 run 日期的回写记录

`check-gates` 和 `promote` 已经会把 verifier 结果一起算进 gate。

## 当前 retry / escalation 能力

- `report-incident`：记录故障类型、摘要、细节和所属阶段
- `incident-plan`：给出下一步建议，只有两种：`retry` 或 `escalate`
- `retry-incident`：对允许重试的故障增加一次 retry 记录
- `escalate-incident`：把故障明确升级给人或指定 owner
- `resolve-incident`：故障处理完成后关闭 incident

当前默认故障类型：

- `tool_transient`
- `artifact_missing`
- `verification_failed`
- `rate_limited`
- `permission_required`
- `manual_review_required`
- `unknown`

`check-gates` 会把当前阶段未解决的 incident 视为 blocking issue。
