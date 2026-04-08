"""Artifact verification for the redbook harness."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
import re
from typing import Any

from .config import STAGE_GATES


class HarnessVerifier:
    def __init__(self, root: Path) -> None:
        self.root = root

    def verify_stage(self, run: dict[str, Any], stage: str) -> dict[str, Any]:
        if stage not in STAGE_GATES:
            raise KeyError(f"Unknown stage: {stage}")

        required_types = STAGE_GATES[stage]["required_artifact_types"]
        artifacts_by_type: dict[str, list[dict[str, Any]]] = {}
        for artifact in run["artifacts"]:
            artifacts_by_type.setdefault(artifact["type"], []).append(artifact)

        verified_artifacts = []
        invalid_artifacts = []
        for artifact_type in required_types:
            artifact = self._latest_artifact(artifacts_by_type.get(artifact_type, []))
            if artifact is None:
                continue
            result = self.verify_artifact(run, artifact)
            verified_artifacts.append(result)
            if not result["ok"]:
                invalid_artifacts.append(result)

        return {
            "stage": stage,
            "verified_artifacts": verified_artifacts,
            "invalid_artifacts": invalid_artifacts,
        }

    def verify_artifact(self, run: dict[str, Any], artifact: dict[str, Any]) -> dict[str, Any]:
        errors: list[str] = []
        warnings: list[str] = []
        checks: list[str] = []

        artifact_path = self._resolve_path(artifact["path"])
        if not artifact_path.exists():
            errors.append("artifact path does not exist")
        elif not artifact_path.is_file():
            errors.append("artifact path is not a file")
        else:
            validator = getattr(
                self,
                f"_validate_{artifact['type']}",
                self._validate_generic_artifact,
            )
            validator(
                run=run,
                artifact=artifact,
                artifact_path=artifact_path,
                checks=checks,
                warnings=warnings,
                errors=errors,
            )

        return {
            "artifact_id": artifact["id"],
            "type": artifact["type"],
            "path": artifact["path"],
            "ok": not errors,
            "checks": checks,
            "warnings": warnings,
            "errors": errors,
        }

    def _resolve_path(self, path: str) -> Path:
        candidate = Path(path)
        if not candidate.is_absolute():
            candidate = self.root / candidate
        return candidate

    def _latest_artifact(self, artifacts: list[dict[str, Any]]) -> dict[str, Any] | None:
        if not artifacts:
            return None
        return sorted(artifacts, key=lambda item: item["created_at"])[-1]

    def _read_markdown(
        self,
        *,
        artifact_path: Path,
        checks: list[str],
        errors: list[str],
    ) -> str | None:
        if artifact_path.suffix.lower() not in {".md", ".markdown"}:
            errors.append("artifact is not a markdown file")
            return None

        text = artifact_path.read_text(encoding="utf-8").strip()
        if not text:
            errors.append("artifact file is empty")
            return None

        if not self._first_nonempty_line(text).startswith("# "):
            errors.append("markdown file must start with a level-1 title")
            return None

        checks.append("markdown exists and has a level-1 title")
        return text

    def _first_nonempty_line(self, text: str) -> str:
        for line in text.splitlines():
            if line.strip():
                return line.strip()
        return ""

    def _require_heading_count(
        self,
        *,
        text: str,
        minimum: int,
        checks: list[str],
        errors: list[str],
    ) -> None:
        heading_count = len(re.findall(r"^##\s+", text, flags=re.MULTILINE))
        if heading_count < minimum:
            errors.append(f"needs at least {minimum} second-level headings")
            return
        checks.append(f"has {heading_count} second-level headings")

    def _require_any_token(
        self,
        *,
        text: str,
        tokens: tuple[str, ...],
        checks: list[str],
        errors: list[str],
        label: str,
    ) -> None:
        if not any(token in text for token in tokens):
            errors.append(f"missing required section: {label}")
            return
        checks.append(f"contains {label}")

    def _require_min_length(
        self,
        *,
        text: str,
        minimum: int,
        checks: list[str],
        errors: list[str],
    ) -> None:
        compact_length = len(re.sub(r"\s+", "", text))
        if compact_length < minimum:
            errors.append(f"content too short: {compact_length} < {minimum}")
            return
        checks.append(f"content length {compact_length} >= {minimum}")

    def _validate_generic_artifact(
        self,
        *,
        artifact_path: Path,
        checks: list[str],
        warnings: list[str],
        errors: list[str],
        **_: Any,
    ) -> None:
        if artifact_path.stat().st_size == 0:
            errors.append("artifact file is empty")
            return
        checks.append("artifact file exists and is non-empty")

    def _validate_research_report(
        self,
        *,
        artifact_path: Path,
        checks: list[str],
        warnings: list[str],
        errors: list[str],
        **_: Any,
    ) -> None:
        text = self._read_markdown(artifact_path=artifact_path, checks=checks, errors=errors)
        if text is None:
            return
        if artifact_path.name.startswith("wiki-query-"):
            self._validate_wiki_query_report(
                text=text,
                checks=checks,
                errors=errors,
            )
            return
        if artifact_path.name.startswith("wiki-ingest-"):
            self._validate_wiki_ingest_report(
                text=text,
                checks=checks,
                errors=errors,
            )
            return
        if artifact_path.name.startswith("wiki-lint-"):
            self._validate_wiki_lint_report(
                text=text,
                checks=checks,
                errors=errors,
            )
            return
        self._require_heading_count(text=text, minimum=3, checks=checks, errors=errors)
        self._require_any_token(
            text=text,
            tokens=("## 一句话结论", "## 最终判断"),
            checks=checks,
            errors=errors,
            label="结论 section",
        )
        self._require_any_token(
            text=text,
            tokens=("## 研究来源", "## 参考链接", "## 来源"),
            checks=checks,
            errors=errors,
            label="source section",
        )
        self._require_min_length(text=text, minimum=1200, checks=checks, errors=errors)

    def _validate_wiki_query_report(
        self,
        *,
        text: str,
        checks: list[str],
        errors: list[str],
    ) -> None:
        self._require_heading_count(text=text, minimum=4, checks=checks, errors=errors)
        self._require_any_token(
            text=text,
            tokens=("## 查询主题",),
            checks=checks,
            errors=errors,
            label="query topic section",
        )
        self._require_any_token(
            text=text,
            tokens=("## 研究来源", "## 来源"),
            checks=checks,
            errors=errors,
            label="source section",
        )
        self._require_any_token(
            text=text,
            tokens=("## 命中页面",),
            checks=checks,
            errors=errors,
            label="matched pages section",
        )
        self._require_any_token(
            text=text,
            tokens=("## 一句话结论", "## 结论"),
            checks=checks,
            errors=errors,
            label="结论 section",
        )
        self._require_min_length(text=text, minimum=200, checks=checks, errors=errors)

    def _validate_wiki_lint_report(
        self,
        *,
        text: str,
        checks: list[str],
        errors: list[str],
    ) -> None:
        self._require_heading_count(text=text, minimum=6, checks=checks, errors=errors)
        self._require_any_token(
            text=text,
            tokens=("## 结论", "## 一句话结论"),
            checks=checks,
            errors=errors,
            label="结论 section",
        )
        self._require_any_token(
            text=text,
            tokens=("## 来源", "## 研究来源"),
            checks=checks,
            errors=errors,
            label="source section",
        )
        self._require_any_token(
            text=text,
            tokens=("## 摘要",),
            checks=checks,
            errors=errors,
            label="summary section",
        )
        self._require_any_token(
            text=text,
            tokens=("## overview 状态",),
            checks=checks,
            errors=errors,
            label="overview status section",
        )
        self._require_min_length(text=text, minimum=150, checks=checks, errors=errors)

    def _validate_wiki_ingest_report(
        self,
        *,
        text: str,
        checks: list[str],
        errors: list[str],
    ) -> None:
        self._require_heading_count(text=text, minimum=4, checks=checks, errors=errors)
        self._require_any_token(
            text=text,
            tokens=("## 结论", "## 一句话结论"),
            checks=checks,
            errors=errors,
            label="结论 section",
        )
        self._require_any_token(
            text=text,
            tokens=("## 来源", "## 研究来源"),
            checks=checks,
            errors=errors,
            label="source section",
        )
        self._require_any_token(
            text=text,
            tokens=("## 已附加日报",),
            checks=checks,
            errors=errors,
            label="attached reports section",
        )
        self._require_any_token(
            text=text,
            tokens=("## 当前状态",),
            checks=checks,
            errors=errors,
            label="current status section",
        )
        self._require_min_length(text=text, minimum=180, checks=checks, errors=errors)

    def _validate_draft(
        self,
        *,
        artifact_path: Path,
        checks: list[str],
        warnings: list[str],
        errors: list[str],
        **_: Any,
    ) -> None:
        text = self._read_markdown(artifact_path=artifact_path, checks=checks, errors=errors)
        if text is None:
            return
        self._require_heading_count(text=text, minimum=3, checks=checks, errors=errors)
        self._require_any_token(
            text=text,
            tokens=("## 发布清单",),
            checks=checks,
            errors=errors,
            label="publish checklist section",
        )
        self._require_min_length(text=text, minimum=1500, checks=checks, errors=errors)

    def _validate_qa_report(
        self,
        *,
        artifact_path: Path,
        checks: list[str],
        warnings: list[str],
        errors: list[str],
        **_: Any,
    ) -> None:
        text = self._read_markdown(artifact_path=artifact_path, checks=checks, errors=errors)
        if text is None:
            return
        self._require_any_token(
            text=text,
            tokens=("风险", "问题", "结论", "检查"),
            checks=checks,
            errors=errors,
            label="QA findings section",
        )
        checkbox_count = len(re.findall(r"^- \[[ xX]\]\s+", text, flags=re.MULTILINE))
        if checkbox_count == 0:
            warnings.append("qa report has no checkbox items")
        else:
            checks.append(f"contains {checkbox_count} checklist items")

    def _validate_publish_checklist(
        self,
        *,
        artifact_path: Path,
        checks: list[str],
        warnings: list[str],
        errors: list[str],
        **_: Any,
    ) -> None:
        text = self._read_markdown(artifact_path=artifact_path, checks=checks, errors=errors)
        if text is None:
            return
        checkbox_count = len(re.findall(r"^- \[[ xX]\]\s+", text, flags=re.MULTILINE))
        if checkbox_count < 2:
            errors.append("publish checklist needs at least 2 checkbox items")
            return
        checks.append(f"contains {checkbox_count} checklist items")

    def _validate_publish_record(
        self,
        *,
        artifact_path: Path,
        checks: list[str],
        warnings: list[str],
        errors: list[str],
        **_: Any,
    ) -> None:
        text = self._read_markdown(artifact_path=artifact_path, checks=checks, errors=errors)
        if text is None:
            return
        self._require_any_token(
            text=text,
            tokens=("X.com", "小红书", "公众号", "抖音", "已发布"),
            checks=checks,
            errors=errors,
            label="publish evidence",
        )

    def _validate_progress_log(
        self,
        *,
        run: dict[str, Any],
        artifact_path: Path,
        checks: list[str],
        warnings: list[str],
        errors: list[str],
        **_: Any,
    ) -> None:
        text = self._read_markdown(artifact_path=artifact_path, checks=checks, errors=errors)
        if text is None:
            return
        run_date = self._run_date(run)
        self._require_any_token(
            text=text,
            tokens=(f"## [{run_date}] 会话摘要",),
            checks=checks,
            errors=errors,
            label=f"session summary for {run_date}",
        )

    def _validate_wiki_log(
        self,
        *,
        run: dict[str, Any],
        artifact_path: Path,
        checks: list[str],
        warnings: list[str],
        errors: list[str],
        **_: Any,
    ) -> None:
        text = self._read_markdown(artifact_path=artifact_path, checks=checks, errors=errors)
        if text is None:
            return
        run_date = self._run_date(run)
        self._require_any_token(
            text=text,
            tokens=(f"## [{run_date}]",),
            checks=checks,
            errors=errors,
            label=f"wiki log entry for {run_date}",
        )

    def _run_date(self, run: dict[str, Any]) -> str:
        return datetime.fromisoformat(run["created_at"]).date().isoformat()
