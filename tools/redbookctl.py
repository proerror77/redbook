#!/usr/bin/env python3
"""Small control surface for common Redbook workflow operations."""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
import json
from pathlib import Path
import subprocess
import sys
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RUNS_DIR = ROOT / "tasks" / "harness" / "runs"
ACTIVE_TASKS = ROOT / "tasks" / "active.md"
TOPIC_RECORD = ROOT / "01-内容生产" / "选题管理" / "00-选题记录.md"
IN_PROGRESS_DIR = ROOT / "01-内容生产" / "02-制作中的选题"
PUBLISHED_DIR = ROOT / "01-内容生产" / "03-已发布的选题"
PUBLISH_LEDGER = ROOT / "04-内容数据统计" / "publish-records.jsonl"
TERMINAL_RUN_STATUSES = {"done", "closed_stale", "cancelled"}


@dataclass
class CommandResult:
    code: int


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed


def run_passthrough(argv: list[str]) -> CommandResult:
    completed = subprocess.run(argv, cwd=ROOT, check=False)
    return CommandResult(completed.returncode)


def load_json_file(path: Path) -> dict[str, Any] | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def read_harness_runs() -> list[dict[str, Any]]:
    if not RUNS_DIR.exists():
        return []
    runs = []
    for path in RUNS_DIR.glob("*.json"):
        item = load_json_file(path)
        if item:
            item["_path"] = path
            runs.append(item)
    return sorted(runs, key=lambda run: run.get("updated_at", ""), reverse=True)


def active_run(run: dict[str, Any]) -> bool:
    return run.get("status") not in TERMINAL_RUN_STATUSES


def parse_active_tasks() -> list[dict[str, str]]:
    if not ACTIVE_TASKS.exists():
        return []
    tasks: list[dict[str, str]] = []
    current: dict[str, str] | None = None
    for line in ACTIVE_TASKS.read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            current = {"title": line.removeprefix("## ").strip(), "status": "unknown"}
            tasks.append(current)
        elif current and line.startswith("- Status:"):
            current["status"] = line.split(":", 1)[1].strip()
    return tasks


def read_publish_ledger() -> list[dict[str, Any]]:
    if not PUBLISH_LEDGER.exists():
        return []
    records = []
    for line_number, line in enumerate(PUBLISH_LEDGER.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            record = {"record_id": f"invalid-line-{line_number}", "stage": "invalid"}
        records.append(record)
    return records


def find_pending_publish_confirmations(limit: int, recent_days: int) -> list[dict[str, str]]:
    if not IN_PROGRESS_DIR.exists():
        return []

    pending = []
    cutoff = datetime.now().timestamp() - recent_days * 24 * 60 * 60
    candidates = sorted(
        {
            path.parent
            for path in IN_PROGRESS_DIR.rglob("*")
            if path.is_file() and path.parent != IN_PROGRESS_DIR
        }
    )
    trigger_names = {"发布清单.md", "QA报告.md", "x-mastery-mentor.md"}
    trigger_phrases = ("发布前确认", "待确认发布", "待发布", "- [ ] 发布")

    for directory in candidates:
        publish_record = directory / "发布记录.md"
        if publish_record.exists():
            continue

        files = [path for path in directory.iterdir() if path.is_file()]
        reason_path: Path | None = None
        for path in files:
            if path.name in trigger_names:
                reason_path = path
                break

        if not reason_path:
            for path in files:
                if path.suffix.lower() not in {".md", ".txt"}:
                    continue
                try:
                    text = path.read_text(encoding="utf-8", errors="ignore")
                except OSError:
                    continue
                if any(phrase in text for phrase in trigger_phrases):
                    reason_path = path
                    break

        if reason_path and reason_path.stat().st_mtime >= cutoff:
            pending.append({"path": rel(directory), "reason": reason_path.name})

    return pending[:limit]


def find_publish_records_missing_ledger(records: list[dict[str, Any]], recent_days: int, limit: int) -> list[str]:
    recorded_paths = {
        record.get("publish_record_path")
        for record in records
        if record.get("publish_record_path")
    }
    cutoff = datetime.now().timestamp() - recent_days * 24 * 60 * 60
    missing = []
    for root in (IN_PROGRESS_DIR, PUBLISHED_DIR):
        if not root.exists():
            continue
        for path in sorted(root.rglob("发布记录.md")):
            if path.stat().st_mtime < cutoff:
                continue
            relative = rel(path)
            if relative not in recorded_paths:
                missing.append(relative)
    return missing[:limit]


def publish_followups_due(records: list[dict[str, Any]], today: date, limit: int) -> list[dict[str, str]]:
    stages_by_id: dict[str, set[str]] = defaultdict(set)
    first_record: dict[str, dict[str, Any]] = {}
    for record in records:
        record_id = record.get("record_id")
        stage = record.get("stage")
        if not record_id or not stage:
            continue
        stages_by_id[record_id].add(stage)
        first_record.setdefault(record_id, record)

    due = []
    for record_id, stages in stages_by_id.items():
        base = first_record.get(record_id, {})
        published_at = parse_timestamp(base.get("published_at"))
        if not published_at:
            continue
        age_days = (today - published_at.date()).days
        if age_days >= 1 and "T+1" not in stages:
            due.append({"record_id": record_id, "stage": "T+1", "title": base.get("title", "")})
        if age_days >= 3 and "T+3" not in stages:
            due.append({"record_id": record_id, "stage": "T+3", "title": base.get("title", "")})
    return due[:limit]


def collect_status(stale_days: int, limit: int, recent_days: int) -> dict[str, Any]:
    today = date.today()
    today_report = ROOT / "05-选题研究" / f"X-每日日程-{today.isoformat()}.md"
    report_candidates = sorted(
        (ROOT / "05-选题研究").glob("X-每日日程-*.md"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    latest_report = report_candidates[0] if report_candidates else None

    runs = read_harness_runs()
    active_runs = [run for run in runs if active_run(run)]
    now = datetime.now(UTC)
    stale_cutoff = now - timedelta(days=stale_days)
    stale_runs = [
        run
        for run in active_runs
        if (parse_timestamp(run.get("updated_at")) or now) < stale_cutoff
    ]
    run_statuses = Counter(run.get("status", "unknown") for run in runs)

    active_tasks = parse_active_tasks()
    open_tasks = [
        task
        for task in active_tasks
        if task.get("status") not in {"completed", "done", "cancelled"}
    ]

    publish_records = read_publish_ledger()
    latest_publish_record = publish_records[-1] if publish_records else None

    return {
        "date": today.isoformat(),
        "today_report": {"path": rel(today_report), "exists": today_report.exists()},
        "latest_report": rel(latest_report) if latest_report else None,
        "active_tasks": {
            "open_count": len(open_tasks),
            "total_count": len(active_tasks),
            "open": open_tasks[:limit],
        },
        "harness_runs": {
            "total_count": len(runs),
            "status_counts": dict(run_statuses),
            "active_count": len(active_runs),
            "active": [
                {
                    "run_id": run.get("run_id", ""),
                    "topic": run.get("topic", ""),
                    "stage": run.get("current_stage", ""),
                    "status": run.get("status", ""),
                    "updated_at": run.get("updated_at", ""),
                }
                for run in active_runs[:limit]
            ],
            "stale_count": len(stale_runs),
            "stale": [
                {
                    "run_id": run.get("run_id", ""),
                    "topic": run.get("topic", ""),
                    "updated_at": run.get("updated_at", ""),
                }
                for run in stale_runs[:limit]
            ],
        },
        "pending_publish_confirmations": find_pending_publish_confirmations(limit, recent_days),
        "publish_ledger": {
            "path": rel(PUBLISH_LEDGER),
            "record_count": len(publish_records),
            "latest": latest_publish_record,
            "followups_due": publish_followups_due(publish_records, today, limit),
            "recent_publish_records_missing_ledger": find_publish_records_missing_ledger(
                publish_records,
                recent_days,
                limit,
            ),
        },
    }


def print_status(status: dict[str, Any]) -> None:
    print(f"Redbook Dashboard - {status['date']}")

    report = status["today_report"]
    report_state = "exists" if report["exists"] else "missing"
    print(f"- 今日日报: {report_state} | {report['path']}")
    if not report["exists"] and status["latest_report"]:
        print(f"  latest: {status['latest_report']}")

    tasks = status["active_tasks"]
    print(f"- Active tasks: {tasks['open_count']} open / {tasks['total_count']} total")
    for task in tasks["open"]:
        print(f"  - {task['title']} [{task['status']}]")

    runs = status["harness_runs"]
    print(f"- Harness runs: {runs['active_count']} active / {runs['total_count']} total | {runs['status_counts']}")
    for run in runs["active"]:
        print(f"  - {run['run_id']} | {run['stage']} | {run['topic']}")
    print(f"- Stale runs: {runs['stale_count']}")
    for run in runs["stale"]:
        print(f"  - {run['run_id']} | updated {run['updated_at']} | {run['topic']}")

    pending = status["pending_publish_confirmations"]
    print(f"- 待确认发布: {len(pending)}")
    for item in pending:
        print(f"  - {item['path']} | signal: {item['reason']}")

    ledger = status["publish_ledger"]
    print(f"- 发布账本: {ledger['record_count']} records | {ledger['path']}")
    latest = ledger["latest"]
    if latest:
        print(
            "  latest: "
            + f"{latest.get('stage', '')} | {latest.get('platform', '')} | {latest.get('title', '')}"
        )
    if ledger["followups_due"]:
        print("  due:")
        for item in ledger["followups_due"]:
            print(f"  - {item['stage']} | {item['record_id']} | {item['title']}")
    if ledger["recent_publish_records_missing_ledger"]:
        print("  recent publish records not in JSONL:")
        for path in ledger["recent_publish_records_missing_ledger"]:
            print(f"  - {path}")


def insert_topic_record(topic: str, source: str, record_date: str, dry_run: bool) -> int:
    line = f"- [ ] {topic} | {source} | {record_date}\n"
    if dry_run:
        print(line, end="")
        return 0

    text = TOPIC_RECORD.read_text(encoding="utf-8")
    if topic in text:
        print(f"already present: {topic}")
        return 0

    marker = "<!-- 格式：- [ ] 选题想法 | 来源/灵感 | 记录日期 -->"
    if marker in text:
        updated = text.replace(marker + "\n", marker + "\n" + line, 1)
    else:
        heading = "## 待处理选题\n"
        updated = text.replace(heading, heading + "\n" + line, 1) if heading in text else text + "\n" + line
    TOPIC_RECORD.write_text(updated, encoding="utf-8")
    print(f"added topic: {rel(TOPIC_RECORD)}")
    print(line, end="")
    return 0


def command_daily(args: argparse.Namespace) -> int:
    return run_passthrough(["/bin/bash", str(ROOT / "tools" / "daily.sh"), *args.args]).code


def command_pick(args: argparse.Namespace) -> int:
    today_report = ROOT / "05-选题研究" / f"X-每日日程-{date.today().isoformat()}.md"
    if not args.topic:
        print(f"今日报告: {rel(today_report)} ({'exists' if today_report.exists() else 'missing'})")
        print("选中题目后运行:")
        print('  tools/redbookctl pick --topic "题目" --source "来源"')
        return 0
    return insert_topic_record(
        topic=args.topic,
        source=args.source,
        record_date=args.date,
        dry_run=args.dry_run,
    )


def command_draft(args: argparse.Namespace) -> int:
    if not args.topic:
        print("创建完整内容 run:")
        print('  tools/redbookctl draft --topic "题目" --source "日报/链接/路径" --summary "一句话目标"')
        return 0
    command = [
        sys.executable,
        "-m",
        "tools.redbook_harness.cli",
        "new-run",
        "--topic",
        args.topic,
        "--source",
        args.source,
        "--owner",
        args.owner,
        "--priority",
        args.priority,
        "--summary",
        args.summary,
    ]
    return run_passthrough(command).code


def command_publish(args: argparse.Namespace) -> int:
    status = collect_status(stale_days=args.stale_days, limit=args.limit, recent_days=args.recent_days)
    print("Approved-publish helper")
    print("- submit/publish 仍需用户明确说“发布 / 直接发”。")
    print("- X 发布主链: /baoyu-post-to-x")
    print("- 小红书图文主链: /baoyu-xhs-images")
    print("- 发布后补账: tools/redbookctl publish-record -- --stage T+0 ...")
    print("")
    pending = status["pending_publish_confirmations"]
    print(f"待确认发布: {len(pending)}")
    for item in pending:
        print(f"- {item['path']} | signal: {item['reason']}")
    missing = status["publish_ledger"]["recent_publish_records_missing_ledger"]
    if missing:
        print("")
        print("近期已有发布记录但未进 JSONL:")
        for path in missing:
            print(f"- {path}")
    return 0


def command_publish_record(args: argparse.Namespace) -> int:
    if not args.args:
        return run_passthrough([sys.executable, str(ROOT / "tools" / "record_publish.py"), "--help"]).code
    passthrough_args = args.args
    if passthrough_args and passthrough_args[0] == "--":
        passthrough_args = passthrough_args[1:]
    return run_passthrough([sys.executable, str(ROOT / "tools" / "record_publish.py"), *passthrough_args]).code


def command_browser(args: argparse.Namespace) -> int:
    command = [
        "node",
        str(ROOT / "tools" / "browser-core" / "interactive" / "session.mjs"),
        "--endpoint",
        args.endpoint,
    ]
    if args.json:
        command.append("--json")
    return run_passthrough(command).code


def command_close_run(args: argparse.Namespace) -> int:
    return run_passthrough(
        [
            sys.executable,
            "-m",
            "tools.redbook_harness.cli",
            "close-run",
            "--run-id",
            args.run_id,
            "--status",
            args.status,
            "--note",
            args.note,
        ]
    ).code


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Redbook workflow control surface.")
    subparsers = parser.add_subparsers(dest="command")

    status = subparsers.add_parser("status", help="Show the workflow dashboard.")
    status.add_argument("--json", action="store_true", help="Print machine-readable JSON.")
    status.add_argument("--stale-days", type=int, default=7)
    status.add_argument("--recent-days", type=int, default=14)
    status.add_argument("--limit", type=int, default=5)

    daily = subparsers.add_parser("daily", help="Run the canonical daily workflow.")
    daily.add_argument("args", nargs=argparse.REMAINDER)

    pick = subparsers.add_parser("pick", help="Promote one selected topic into the topic record.")
    pick.add_argument("--topic")
    pick.add_argument("--source", default="manual promotion")
    pick.add_argument("--date", default=date.today().isoformat())
    pick.add_argument("--dry-run", action="store_true")

    draft = subparsers.add_parser("draft", help="Create a full content harness run.")
    draft.add_argument("--topic")
    draft.add_argument("--source", default="manual")
    draft.add_argument("--summary", default="")
    draft.add_argument("--owner", default="Codex")
    draft.add_argument("--priority", default="P1")

    publish = subparsers.add_parser("publish", help="Show publish readiness and post-publish writeback gaps.")
    publish.add_argument("--stale-days", type=int, default=7)
    publish.add_argument("--recent-days", type=int, default=14)
    publish.add_argument("--limit", type=int, default=10)

    publish_record = subparsers.add_parser(
        "publish-record",
        help="Delegate to tools/record_publish.py.",
        add_help=False,
    )
    publish_record.add_argument("args", nargs=argparse.REMAINDER)

    browser = subparsers.add_parser("browser", help="Inspect existing Chrome/CDP tabs without opening new pages.")
    browser.add_argument("--endpoint", default="http://127.0.0.1:9222")
    browser.add_argument("--json", action="store_true")

    close_run = subparsers.add_parser("close-run", help="Close a harness run.")
    close_run.add_argument("--run-id", required=True)
    close_run.add_argument("--status", choices=["done", "closed_stale", "cancelled"], default="done")
    close_run.add_argument("--note", default="")

    return parser


def main(argv: list[str] | None = None) -> int:
    raw_args = list(sys.argv[1:] if argv is None else argv)
    if raw_args and raw_args[0] in {"-h", "--help"}:
        pass
    elif raw_args and raw_args[0] == "daily":
        return command_daily(argparse.Namespace(args=raw_args[1:]))
    elif raw_args and raw_args[0] == "publish-record":
        return command_publish_record(argparse.Namespace(args=raw_args[1:]))
    elif not raw_args or raw_args[0].startswith("-"):
        raw_args = ["status", *raw_args]

    parser = build_parser()
    args = parser.parse_args(raw_args)

    if args.command == "status":
        status = collect_status(args.stale_days, args.limit, args.recent_days)
        if args.json:
            print(json.dumps(status, ensure_ascii=False, indent=2, sort_keys=True))
        else:
            print_status(status)
        return 0
    if args.command == "daily":
        return command_daily(args)
    if args.command == "pick":
        return command_pick(args)
    if args.command == "draft":
        return command_draft(args)
    if args.command == "publish":
        return command_publish(args)
    if args.command == "publish-record":
        return command_publish_record(args)
    if args.command == "browser":
        return command_browser(args)
    if args.command == "close-run":
        return command_close_run(args)

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
