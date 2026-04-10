"""Static configuration for the redbook harness runtime."""

from __future__ import annotations

from collections.abc import Mapping

RUN_KIND = "content_pipeline"

STAGE_ORDER = [
    "research",
    "draft",
    "review",
    "publish",
    "retrospect",
]

CHECK_DEFINITIONS = {
    "materials_queried": "相关素材库与 wiki 已检索",
    "research_complete": "研究结论已经沉淀成报告",
    "outline_locked": "主论点与文章结构已确定",
    "draft_written": "母稿已经写出并保存",
    "facts_checked": "事实与关键表述已校验",
    "platform_ready": "发布清单与平台适配已准备",
    "published": "至少一个平台已经完成发布",
    "progress_updated": "tasks/progress.md 已追加本次会话摘要",
    "wiki_logged": "wiki/log.md 已追加 ingest/query 记录",
    "lessons_reviewed": "lessons 已复盘，必要时新增规则",
}

FAILURE_DEFINITIONS = {
    "tool_transient": {
        "description": "工具调用临时失败，可优先自动重试",
        "action": "retry",
        "max_retries": 2,
    },
    "artifact_missing": {
        "description": "关键产物缺失，先补产物再继续",
        "action": "retry",
        "max_retries": 1,
    },
    "verification_failed": {
        "description": "verifier 未通过，需要人工修正内容或结构",
        "action": "escalate",
        "max_retries": 0,
    },
    "rate_limited": {
        "description": "外部平台限流，允许有限重试",
        "action": "retry",
        "max_retries": 2,
    },
    "permission_required": {
        "description": "需要人工授权或登录态处理",
        "action": "escalate",
        "max_retries": 0,
    },
    "manual_review_required": {
        "description": "命中高风险边界，需要人工接管",
        "action": "escalate",
        "max_retries": 0,
    },
    "unknown": {
        "description": "未知故障，默认升级处理",
        "action": "escalate",
        "max_retries": 0,
    },
}

STAGE_GATES: Mapping[str, Mapping[str, object]] = {
    "research": {
        "required_artifact_types": ["research_report"],
        "required_checks": ["materials_queried", "research_complete"],
        "description": "研究阶段要把外部与内部材料沉淀为结构化结论。",
    },
    "draft": {
        "required_artifact_types": ["draft"],
        "required_checks": ["outline_locked", "draft_written"],
        "description": "草稿阶段要明确主论点并落成母稿。",
    },
    "review": {
        "required_artifact_types": ["qa_report", "publish_checklist"],
        "required_checks": ["facts_checked", "platform_ready"],
        "description": "评审阶段要完成事实校验与发布前检查。",
    },
    "publish": {
        "required_artifact_types": ["publish_record"],
        "required_checks": ["published"],
        "description": "发布阶段至少要留下可追溯的发布记录。",
    },
    "retrospect": {
        "required_artifact_types": ["progress_log", "wiki_log"],
        "required_checks": ["progress_updated", "wiki_logged", "lessons_reviewed"],
        "description": "复盘阶段要把会话结果和经验沉淀回系统。",
    },
}
