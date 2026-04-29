"""Runtime helpers for the redbook harness."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
import fcntl
import json
import os
from pathlib import Path
import re
from typing import Any
from uuid import uuid4

from .config import CHECK_DEFINITIONS, RUN_KIND, STAGE_GATES, STAGE_ORDER
from .policy import HarnessPolicy
from .verifier import HarnessVerifier


def utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def slugify(value: str) -> str:
    normalized = re.sub(r"\s+", "-", value.strip().lower())
    cleaned = re.sub(r"[^a-z0-9\u4e00-\u9fff_-]+", "-", normalized)
    collapsed = re.sub(r"-{2,}", "-", cleaned).strip("-")
    return collapsed or "run"


@dataclass
class HarnessPaths:
    root: Path

    @property
    def storage_dir(self) -> Path:
        return self.root / "tasks" / "harness"

    @property
    def runs_dir(self) -> Path:
        return self.storage_dir / "runs"

    @property
    def locks_dir(self) -> Path:
        return self.storage_dir / "locks"

    def ensure(self) -> None:
        self.runs_dir.mkdir(parents=True, exist_ok=True)
        self.locks_dir.mkdir(parents=True, exist_ok=True)


class HarnessRuntime:
    def __init__(self, root: Path) -> None:
        self.paths = HarnessPaths(root)
        self.paths.ensure()
        self.policy = HarnessPolicy()
        self.verifier = HarnessVerifier(root)

    def create_run(
        self,
        *,
        topic: str,
        source: str,
        owner: str,
        priority: str,
        summary: str,
    ) -> dict[str, Any]:
        run_id = f"{datetime.now(UTC).strftime('%Y%m%d-%H%M%S')}-{slugify(topic)}-{uuid4().hex[:6]}"
        timestamp = utc_now()
        run = {
            "run_id": run_id,
            "kind": RUN_KIND,
            "topic": topic,
            "summary": summary,
            "source": source,
            "owner": owner,
            "priority": priority,
            "current_stage": STAGE_ORDER[0],
            "status": "in_progress",
            "created_at": timestamp,
            "updated_at": timestamp,
            "artifacts": [],
            "checks": {name: False for name in CHECK_DEFINITIONS},
            "incidents": [],
            "events": [
                {
                    "at": timestamp,
                    "type": "run_created",
                    "stage": STAGE_ORDER[0],
                    "message": f"Run created for topic: {topic}",
                    "meta": {},
                }
            ],
        }
        self.save_run(run)
        return run

    def run_path(self, run_id: str) -> Path:
        return self.paths.runs_dir / f"{run_id}.json"

    def lock_path(self, run_id: str) -> Path:
        return self.paths.locks_dir / f"{run_id}.lock"

    def load_run(self, run_id: str) -> dict[str, Any]:
        path = self.run_path(run_id)
        if not path.exists():
            raise FileNotFoundError(f"Run not found: {run_id}")
        run = json.loads(path.read_text(encoding="utf-8"))
        run.setdefault("incidents", [])
        return run

    def save_run(self, run: dict[str, Any]) -> None:
        run["updated_at"] = utc_now()
        self.run_path(run["run_id"]).write_text(
            json.dumps(run, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    def _mutate_run(self, run_id: str, mutator: Any) -> dict[str, Any]:
        lock_path = self.lock_path(run_id)
        lock_fd = os.open(lock_path, os.O_CREAT | os.O_RDWR)
        with os.fdopen(lock_fd, "r+", encoding="utf-8") as lock_file:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
            run = self.load_run(run_id)
            result = mutator(run)
            self.save_run(run)
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
            return result

    def list_runs(self) -> list[dict[str, Any]]:
        runs = []
        for path in sorted(self.paths.runs_dir.glob("*.json")):
            runs.append(json.loads(path.read_text(encoding="utf-8")))
        return sorted(runs, key=lambda item: item["updated_at"], reverse=True)

    def append_event(
        self,
        run: dict[str, Any],
        *,
        event_type: str,
        message: str,
        stage: str | None = None,
        meta: dict[str, Any] | None = None,
    ) -> None:
        run["events"].append(
            {
                "at": utc_now(),
                "type": event_type,
                "stage": stage or run["current_stage"],
                "message": message,
                "meta": meta or {},
            }
        )

    def add_artifact(
        self,
        run_id: str,
        *,
        artifact_type: str,
        path: str,
        description: str,
        stage: str | None = None,
    ) -> dict[str, Any]:
        def mutate(run: dict[str, Any]) -> dict[str, Any]:
            artifact = {
                "id": uuid4().hex[:10],
                "type": artifact_type,
                "path": path,
                "description": description,
                "stage": stage or run["current_stage"],
                "created_at": utc_now(),
            }
            run["artifacts"].append(artifact)
            self.append_event(
                run,
                event_type="artifact_added",
                message=f"Artifact added: {artifact_type}",
                meta={"path": path, "artifact_id": artifact["id"]},
            )
            return artifact

        return self._mutate_run(run_id, mutate)

    def set_check(self, run_id: str, *, check_name: str, value: bool) -> dict[str, Any]:
        if check_name not in CHECK_DEFINITIONS:
            raise KeyError(f"Unknown check: {check_name}")

        def mutate(run: dict[str, Any]) -> dict[str, Any]:
            run["checks"][check_name] = value
            self.append_event(
                run,
                event_type="check_updated",
                message=f"Check {check_name} set to {value}",
                meta={"check_name": check_name, "value": value},
            )
            return run

        return self._mutate_run(run_id, mutate)

    def _can_close_done_without_final_stage(self, run: dict[str, Any]) -> bool:
        topic = str(run.get("topic", "")).lower()
        source = str(run.get("source", "")).lower()
        if topic.startswith("llm wiki") or "llm-wiki" in topic:
            return True
        if source.startswith("wiki/"):
            return True
        return False

    def close_run(self, run_id: str, *, status: str = "done", note: str = "") -> dict[str, Any]:
        if status not in {"done", "closed_stale", "cancelled"}:
            raise ValueError(f"Unsupported close status: {status}")

        def mutate(run: dict[str, Any]) -> dict[str, Any]:
            if (
                status == "done"
                and run.get("kind") == RUN_KIND
                and run.get("current_stage") != STAGE_ORDER[-1]
                and not self._can_close_done_without_final_stage(run)
            ):
                raise ValueError(
                    "content_pipeline runs can only close as done from the final retrospect stage; "
                    "use promote after satisfying gates, or use closed_stale/cancelled for abandoned work."
                )
            closed_at = utc_now()
            run["status"] = status
            run["closed_at"] = closed_at
            self.append_event(
                run,
                event_type="run_closed",
                message=f"Run closed with status: {status}",
                meta={"status": status, "note": note, "closed_at": closed_at},
            )
            return run

        return self._mutate_run(run_id, mutate)

    def stage_gate_report(self, run: dict[str, Any], stage: str | None = None) -> dict[str, Any]:
        current_stage = stage or run["current_stage"]
        if current_stage not in STAGE_GATES:
            raise KeyError(f"Unknown stage: {current_stage}")
        gate = STAGE_GATES[current_stage]
        artifact_types = {artifact["type"] for artifact in run["artifacts"]}
        missing_artifacts = [
            artifact_type
            for artifact_type in gate["required_artifact_types"]
            if artifact_type not in artifact_types
        ]
        missing_checks = [
            check_name
            for check_name in gate["required_checks"]
            if not run["checks"].get(check_name, False)
        ]
        verification = self.verifier.verify_stage(run, current_stage)
        blocking_incidents = [
            self.policy.next_action(incident)
            for incident in run.get("incidents", [])
            if incident["stage"] == current_stage and incident["status"] != "resolved"
        ]
        return {
            "stage": current_stage,
            "description": gate["description"],
            "ready": (
                not missing_artifacts
                and not missing_checks
                and not verification["invalid_artifacts"]
                and not blocking_incidents
            ),
            "missing_artifacts": missing_artifacts,
            "missing_checks": missing_checks,
            "verification": verification,
            "invalid_artifacts": verification["invalid_artifacts"],
            "blocking_incidents": blocking_incidents,
        }

    def report_incident(
        self,
        run_id: str,
        *,
        code: str,
        summary: str,
        details: str,
        stage: str | None = None,
    ) -> dict[str, Any]:
        def mutate(run: dict[str, Any]) -> dict[str, Any]:
            incident = self.policy.build_incident(
                incident_id=uuid4().hex[:10],
                code=code,
                summary=summary,
                details=details,
                stage=stage or run["current_stage"],
                created_at=utc_now(),
            )
            run["incidents"].append(incident)
            next_action = self.policy.next_action(incident)
            run["status"] = "blocked" if next_action["recommended_action"] == "escalate" else "retry_pending"
            self.append_event(
                run,
                event_type="incident_reported",
                message=f"Incident reported: {code}",
                stage=incident["stage"],
                meta=next_action,
            )
            return incident

        return self._mutate_run(run_id, mutate)

    def incident_plan(self, run: dict[str, Any], incident_id: str | None = None) -> dict[str, Any]:
        incident = self._find_incident(run, incident_id)
        if incident is None:
            raise ValueError("No matching incident found")
        return self.policy.next_action(incident)

    def retry_incident(self, run_id: str, *, incident_id: str) -> dict[str, Any]:
        def mutate(run: dict[str, Any]) -> dict[str, Any]:
            incident = self._require_incident(run, incident_id)
            next_action = self.policy.next_action(incident)
            if next_action["recommended_action"] != "retry":
                raise ValueError(f"Incident {incident_id} requires escalation, not retry")
            incident["retry_count"] += 1
            incident["status"] = "retrying"
            incident["updated_at"] = utc_now()
            run["status"] = "in_progress"
            self.append_event(
                run,
                event_type="incident_retried",
                message=f"Retry triggered for incident {incident['code']}",
                stage=incident["stage"],
                meta=self.policy.next_action(incident),
            )
            return incident

        return self._mutate_run(run_id, mutate)

    def escalate_incident(self, run_id: str, *, incident_id: str, owner: str) -> dict[str, Any]:
        def mutate(run: dict[str, Any]) -> dict[str, Any]:
            incident = self._require_incident(run, incident_id)
            incident["status"] = "escalated"
            incident["updated_at"] = utc_now()
            run["status"] = "blocked"
            self.append_event(
                run,
                event_type="incident_escalated",
                message=f"Incident escalated to {owner}",
                stage=incident["stage"],
                meta={"incident_id": incident_id, "owner": owner},
            )
            return incident

        return self._mutate_run(run_id, mutate)

    def resolve_incident(self, run_id: str, *, incident_id: str, note: str) -> dict[str, Any]:
        def mutate(run: dict[str, Any]) -> dict[str, Any]:
            incident = self._require_incident(run, incident_id)
            incident["status"] = "resolved"
            incident["updated_at"] = utc_now()
            unresolved = [item for item in run["incidents"] if item["status"] != "resolved"]
            run["status"] = "in_progress" if not unresolved else run["status"]
            self.append_event(
                run,
                event_type="incident_resolved",
                message=f"Incident resolved: {incident['code']}",
                stage=incident["stage"],
                meta={"incident_id": incident_id, "note": note},
            )
            return incident

        return self._mutate_run(run_id, mutate)

    def _find_incident(self, run: dict[str, Any], incident_id: str | None) -> dict[str, Any] | None:
        incidents = run.get("incidents", [])
        if incident_id is not None:
            for incident in incidents:
                if incident["id"] == incident_id:
                    return incident
            return None
        unresolved = [incident for incident in incidents if incident["status"] != "resolved"]
        if not unresolved:
            return None
        return sorted(unresolved, key=lambda item: item["updated_at"])[-1]

    def _require_incident(self, run: dict[str, Any], incident_id: str) -> dict[str, Any]:
        incident = self._find_incident(run, incident_id)
        if incident is None:
            raise ValueError(f"Incident not found: {incident_id}")
        return incident

    def promote(self, run_id: str) -> dict[str, Any]:
        def mutate(run: dict[str, Any]) -> dict[str, Any]:
            report = self.stage_gate_report(run)
            if not report["ready"]:
                raise ValueError(
                    "Stage gates not satisfied: "
                    + json.dumps(
                        {
                            "missing_artifacts": report["missing_artifacts"],
                            "missing_checks": report["missing_checks"],
                            "blocking_incidents": report["blocking_incidents"],
                        },
                        ensure_ascii=False,
                    )
                )
            current_index = STAGE_ORDER.index(run["current_stage"])
            if current_index == len(STAGE_ORDER) - 1:
                run["status"] = "done"
                self.append_event(
                    run,
                    event_type="run_completed",
                    message="Run completed; final stage already reached.",
                )
                return run
            next_stage = STAGE_ORDER[current_index + 1]
            run["current_stage"] = next_stage
            if next_stage == STAGE_ORDER[-1]:
                run["status"] = "in_review"
            self.append_event(
                run,
                event_type="stage_promoted",
                message=f"Stage promoted to {next_stage}",
                stage=next_stage,
            )
            return run

        return self._mutate_run(run_id, mutate)
