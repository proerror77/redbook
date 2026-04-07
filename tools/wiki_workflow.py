#!/usr/bin/env python3
"""Helpers for making wiki workflows explicit and traceable."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from tools.redbook_harness.runtime import HarnessRuntime


def daily_source_paths(date_str: str) -> list[Path]:
    base = ROOT / "05-选题研究"
    return [
        base / f"X-每日日程-{date_str}.md",
        base / f"HN-每日热点-{date_str}.md",
        base / f"Reddit-每日监控-{date_str}.md",
    ]


def relative(path: Path) -> str:
    return str(path.relative_to(ROOT))


def find_existing_run(runtime: HarnessRuntime, *, topic: str, source: str) -> dict | None:
    for run in runtime.list_runs():
        if run.get("topic") == topic and run.get("source") == source:
            return run
    return None


def ensure_daily_ingest_run(date_str: str) -> dict:
    runtime = HarnessRuntime(ROOT)
    topic = f"LLM Wiki ingest {date_str}"
    source = relative(ROOT / "05-选题研究" / f"X-每日日程-{date_str}.md")
    summary = "为当日研究报告创建显式 wiki ingest 运行痕迹"

    existing = find_existing_run(runtime, topic=topic, source=source)
    if existing is not None:
        run = runtime.load_run(existing["run_id"])
        created = False
    else:
        run = runtime.create_run(
            topic=topic,
            source=source,
            owner="Codex",
            priority="P1",
            summary=summary,
        )
        created = True

    existing_paths = {artifact["path"] for artifact in run.get("artifacts", [])}
    attached_sources: list[str] = []
    for candidate in daily_source_paths(date_str):
        if not candidate.exists():
            continue
        rel_path = relative(candidate)
        attached_sources.append(rel_path)
        if rel_path in existing_paths:
            continue
        runtime.add_artifact(
            run["run_id"],
            artifact_type="research_report",
            path=rel_path,
            description=f"Daily source for wiki ingest: {candidate.name}",
            stage="research",
        )

    if attached_sources:
        runtime.set_check(run["run_id"], check_name="materials_queried", value=True)
        runtime.set_check(run["run_id"], check_name="research_complete", value=True)

    final_run = runtime.load_run(run["run_id"])
    return {
        "created": created,
        "run_id": final_run["run_id"],
        "topic": final_run["topic"],
        "source": final_run["source"],
        "attached_sources": attached_sources,
        "checks": {
            "materials_queried": final_run["checks"]["materials_queried"],
            "research_complete": final_run["checks"]["research_complete"],
        },
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Explicit wiki workflow helpers.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    ingest = subparsers.add_parser(
        "start-daily-ingest",
        help="Create or refresh an explicit wiki ingest run for a daily research batch.",
    )
    ingest.add_argument("--date", required=True, help="Date string in YYYY-MM-DD format.")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "start-daily-ingest":
            result = ensure_daily_ingest_run(args.date)
            print(json.dumps(result, ensure_ascii=False, indent=2))
            return 0
    except Exception as exc:  # noqa: BLE001
        print(f"error: {exc}", file=sys.stderr)
        return 1
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
