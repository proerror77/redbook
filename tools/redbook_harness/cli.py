"""CLI entrypoint for the redbook harness."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from .config import CHECK_DEFINITIONS, FAILURE_DEFINITIONS, STAGE_GATES, STAGE_ORDER
from .runtime import HarnessRuntime


ROOT = Path(__file__).resolve().parents[2]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Minimal harness runtime for redbook.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    new_run = subparsers.add_parser("new-run", help="Create a new harness run.")
    new_run.add_argument("--topic", required=True)
    new_run.add_argument("--source", required=True)
    new_run.add_argument("--owner", default="Codex")
    new_run.add_argument("--priority", default="P1")
    new_run.add_argument("--summary", default="")

    list_runs = subparsers.add_parser("list-runs", help="List existing runs.")
    list_runs.add_argument("--limit", type=int, default=10)

    show_run = subparsers.add_parser("show-run", help="Show a single run.")
    show_run.add_argument("--run-id", required=True)

    add_artifact = subparsers.add_parser("add-artifact", help="Attach an artifact to a run.")
    add_artifact.add_argument("--run-id", required=True)
    add_artifact.add_argument("--type", required=True)
    add_artifact.add_argument("--path", required=True)
    add_artifact.add_argument("--description", required=True)
    add_artifact.add_argument("--stage")

    set_check = subparsers.add_parser("set-check", help="Set a check value on a run.")
    set_check.add_argument("--run-id", required=True)
    set_check.add_argument("--name", required=True, choices=sorted(CHECK_DEFINITIONS))
    set_check.add_argument("--value", required=True, choices=["true", "false"])

    check_gates = subparsers.add_parser("check-gates", help="Inspect stage gate readiness.")
    check_gates.add_argument("--run-id", required=True)
    check_gates.add_argument("--stage", choices=STAGE_ORDER)

    verify_run = subparsers.add_parser("verify-run", help="Verify required artifacts for a stage.")
    verify_run.add_argument("--run-id", required=True)
    verify_run.add_argument("--stage", choices=STAGE_ORDER)

    report_incident = subparsers.add_parser("report-incident", help="Record a failure incident.")
    report_incident.add_argument("--run-id", required=True)
    report_incident.add_argument("--code", required=True, choices=sorted(FAILURE_DEFINITIONS))
    report_incident.add_argument("--summary", required=True)
    report_incident.add_argument("--details", default="")
    report_incident.add_argument("--stage", choices=STAGE_ORDER)

    incident_plan = subparsers.add_parser("incident-plan", help="Show next action for an incident.")
    incident_plan.add_argument("--run-id", required=True)
    incident_plan.add_argument("--incident-id")

    retry_incident = subparsers.add_parser("retry-incident", help="Apply retry to an incident.")
    retry_incident.add_argument("--run-id", required=True)
    retry_incident.add_argument("--incident-id", required=True)

    escalate_incident = subparsers.add_parser("escalate-incident", help="Escalate an incident.")
    escalate_incident.add_argument("--run-id", required=True)
    escalate_incident.add_argument("--incident-id", required=True)
    escalate_incident.add_argument("--owner", default="human")

    resolve_incident = subparsers.add_parser("resolve-incident", help="Resolve an incident.")
    resolve_incident.add_argument("--run-id", required=True)
    resolve_incident.add_argument("--incident-id", required=True)
    resolve_incident.add_argument("--note", default="")

    promote = subparsers.add_parser("promote", help="Promote the current stage if gates pass.")
    promote.add_argument("--run-id", required=True)

    describe = subparsers.add_parser("describe", help="Print stage and check definitions.")
    describe.add_argument("--format", choices=["json", "text"], default="text")

    return parser


def print_json(value: object) -> None:
    print(json.dumps(value, ensure_ascii=False, indent=2))


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    runtime = HarnessRuntime(ROOT)

    try:
        if args.command == "new-run":
            run = runtime.create_run(
                topic=args.topic,
                source=args.source,
                owner=args.owner,
                priority=args.priority,
                summary=args.summary,
            )
            print_json(run)
            return 0

        if args.command == "list-runs":
            runs = runtime.list_runs()[: args.limit]
            print_json(
                [
                    {
                        "run_id": run["run_id"],
                        "topic": run["topic"],
                        "current_stage": run["current_stage"],
                        "status": run["status"],
                        "updated_at": run["updated_at"],
                    }
                    for run in runs
                ]
            )
            return 0

        if args.command == "show-run":
            print_json(runtime.load_run(args.run_id))
            return 0

        if args.command == "add-artifact":
            artifact = runtime.add_artifact(
                args.run_id,
                artifact_type=args.type,
                path=args.path,
                description=args.description,
                stage=args.stage,
            )
            print_json(artifact)
            return 0

        if args.command == "set-check":
            run = runtime.set_check(
                args.run_id,
                check_name=args.name,
                value=args.value == "true",
            )
            print_json(
                {
                    "run_id": run["run_id"],
                    "check": args.name,
                    "value": run["checks"][args.name],
                    "updated_at": run["updated_at"],
                }
            )
            return 0

        if args.command == "check-gates":
            run = runtime.load_run(args.run_id)
            print_json(runtime.stage_gate_report(run, args.stage))
            return 0

        if args.command == "verify-run":
            run = runtime.load_run(args.run_id)
            stage = args.stage or run["current_stage"]
            print_json(runtime.verifier.verify_stage(run, stage))
            return 0

        if args.command == "report-incident":
            incident = runtime.report_incident(
                args.run_id,
                code=args.code,
                summary=args.summary,
                details=args.details,
                stage=args.stage,
            )
            print_json(incident)
            return 0

        if args.command == "incident-plan":
            run = runtime.load_run(args.run_id)
            print_json(runtime.incident_plan(run, args.incident_id))
            return 0

        if args.command == "retry-incident":
            incident = runtime.retry_incident(args.run_id, incident_id=args.incident_id)
            print_json(incident)
            return 0

        if args.command == "escalate-incident":
            incident = runtime.escalate_incident(
                args.run_id,
                incident_id=args.incident_id,
                owner=args.owner,
            )
            print_json(incident)
            return 0

        if args.command == "resolve-incident":
            incident = runtime.resolve_incident(
                args.run_id,
                incident_id=args.incident_id,
                note=args.note,
            )
            print_json(incident)
            return 0

        if args.command == "promote":
            run = runtime.promote(args.run_id)
            print_json(
                {
                    "run_id": run["run_id"],
                    "current_stage": run["current_stage"],
                    "status": run["status"],
                    "updated_at": run["updated_at"],
                }
            )
            return 0

        if args.command == "describe":
            if args.format == "json":
                print_json(
                    {
                        "stages": STAGE_ORDER,
                        "gates": STAGE_GATES,
                        "checks": CHECK_DEFINITIONS,
                        "failures": FAILURE_DEFINITIONS,
                    }
                )
                return 0
            for stage in STAGE_ORDER:
                gate = STAGE_GATES[stage]
                print(f"[{stage}] {gate['description']}")
                print(f"  artifacts: {', '.join(gate['required_artifact_types'])}")
                print(f"  checks: {', '.join(gate['required_checks'])}")
            print("[failures]")
            for code, definition in FAILURE_DEFINITIONS.items():
                print(
                    "  "
                    + f"{code}: {definition['action']} (max_retries={definition['max_retries']})"
                )
            return 0
    except Exception as exc:  # noqa: BLE001
        print(f"error: {exc}", file=sys.stderr)
        return 1

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
