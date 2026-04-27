#!/usr/bin/env python3
"""Append a structured publish record to the Redbook JSONL ledger."""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LEDGER = ROOT / "04-内容数据统计" / "publish-records.jsonl"
STAGES = ("T+0", "T+1", "T+3")
METRIC_FIELDS = (
    "views",
    "likes",
    "reposts",
    "replies",
    "bookmarks",
    "shares",
    "comments",
    "saves",
    "followers",
)


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:60] or "publish"


def make_record_id(platform: str, title: str, published_at: str, stage: str) -> str:
    date_part = published_at[:10] if published_at else datetime.now().strftime("%Y-%m-%d")
    return f"{date_part}-{slugify(platform)}-{slugify(title)}-{stage.lower().replace('+', '')}"


def parse_metric(value: str | None) -> int | None:
    if value is None or value == "":
        return None
    return int(value)


def load_existing_keys(path: Path) -> set[tuple[str, str]]:
    if not path.exists():
        return set()
    keys: set[tuple[str, str]] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        item = json.loads(line)
        keys.add((item.get("record_id", ""), item.get("stage", "")))
    return keys


def build_record(args: argparse.Namespace) -> dict[str, Any]:
    metrics = {
        field: parse_metric(getattr(args, field))
        for field in METRIC_FIELDS
        if parse_metric(getattr(args, field)) is not None
    }
    record_id = args.record_id or make_record_id(args.platform, args.title, args.published_at, args.stage)
    record: dict[str, Any] = {
        "record_id": record_id,
        "stage": args.stage,
        "platform": args.platform,
        "title": args.title,
        "published_at": args.published_at,
        "status_url": args.status_url,
        "post_id": args.post_id,
        "note_id": args.note_id,
        "account": args.account,
        "content_path": args.content_path,
        "publish_record_path": args.publish_record_path,
        "metrics": metrics,
        "source_urls": args.source_url,
        "evidence": args.evidence,
        "notes": args.note,
        "recorded_at": datetime.now().isoformat(timespec="seconds"),
    }
    return {key: value for key, value in record.items() if value not in (None, "", [], {})}


def validate_record(record: dict[str, Any]) -> None:
    if record["stage"] not in STAGES:
        raise ValueError(f"stage must be one of {', '.join(STAGES)}")
    if record["stage"] == "T+0" and not (record.get("status_url") or record.get("note_id")):
        raise ValueError("T+0 records need a status_url or note_id")
    for key in ("content_path", "publish_record_path"):
        value = record.get(key)
        if value and not (ROOT / value).exists():
            raise ValueError(f"{key} does not exist: {value}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Append a Redbook publish record to JSONL.")
    parser.add_argument("--ledger", type=Path, default=DEFAULT_LEDGER)
    parser.add_argument("--record-id")
    parser.add_argument("--stage", choices=STAGES, required=True)
    parser.add_argument("--platform", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--published-at", required=True, help="ISO-like datetime, preferably with timezone")
    parser.add_argument("--status-url")
    parser.add_argument("--post-id")
    parser.add_argument("--note-id")
    parser.add_argument("--account")
    parser.add_argument("--content-path")
    parser.add_argument("--publish-record-path")
    for field in METRIC_FIELDS:
        parser.add_argument(f"--{field}")
    parser.add_argument("--source-url", action="append", default=[])
    parser.add_argument("--evidence", action="append", default=[])
    parser.add_argument("--note")
    parser.add_argument("--allow-duplicate", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    ledger = args.ledger if args.ledger.is_absolute() else ROOT / args.ledger
    record = build_record(args)
    validate_record(record)

    existing = load_existing_keys(ledger)
    key = (record["record_id"], record["stage"])
    if key in existing and not args.allow_duplicate:
        raise SystemExit(f"duplicate publish record: {record['record_id']} {record['stage']}")

    line = json.dumps(record, ensure_ascii=False, sort_keys=True)
    if args.dry_run:
        print(line)
        return 0

    ledger.parent.mkdir(parents=True, exist_ok=True)
    with ledger.open("a", encoding="utf-8") as handle:
        handle.write(line + "\n")
    print(f"appended: {ledger}")
    print(record["record_id"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
