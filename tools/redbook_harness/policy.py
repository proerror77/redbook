"""Failure policy for the redbook harness."""

from __future__ import annotations

from typing import Any

from .config import FAILURE_DEFINITIONS


class HarnessPolicy:
    def definition(self, code: str) -> dict[str, Any]:
        if code not in FAILURE_DEFINITIONS:
            raise KeyError(f"Unknown failure code: {code}")
        return FAILURE_DEFINITIONS[code]

    def build_incident(
        self,
        *,
        incident_id: str,
        code: str,
        summary: str,
        details: str,
        stage: str,
        created_at: str,
    ) -> dict[str, Any]:
        definition = self.definition(code)
        return {
            "id": incident_id,
            "code": code,
            "summary": summary,
            "details": details,
            "stage": stage,
            "status": "open",
            "recommended_action": definition["action"],
            "max_retries": definition["max_retries"],
            "retry_count": 0,
            "created_at": created_at,
            "updated_at": created_at,
        }

    def next_action(self, incident: dict[str, Any]) -> dict[str, Any]:
        definition = self.definition(incident["code"])
        retry_remaining = max(incident["max_retries"] - incident["retry_count"], 0)
        action = incident["recommended_action"]
        if action == "retry" and retry_remaining == 0:
            action = "escalate"
        return {
            "incident_id": incident["id"],
            "code": incident["code"],
            "description": definition["description"],
            "recommended_action": action,
            "retry_count": incident["retry_count"],
            "max_retries": incident["max_retries"],
            "retry_remaining": retry_remaining,
            "status": incident["status"],
            "summary": incident["summary"],
            "details": incident["details"],
        }
