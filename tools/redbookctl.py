#!/usr/bin/env python3
"""Small control surface for common Redbook workflow operations."""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
import json
import os
from pathlib import Path
import re
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
X_BROWSER_SCRIPT = ROOT / ".agents" / "skills" / "baoyu-post-to-x" / "scripts" / "x-browser.ts"
XHS_CDP_PUBLISH_SCRIPT = Path.home() / ".codex" / "skills" / "xiaohongshu-skills" / "scripts" / "cdp_publish.py"
DAILY_LOG_DIR = ROOT / "tools" / "auto-x" / "data" / "logs"
DAILY_LAUNCHD_LABEL = "com.redbook.daily-x"
DAILY_LAUNCHD_PLIST = ROOT / "tools" / "auto-x" / f"{DAILY_LAUNCHD_LABEL}.plist"
TERMINAL_RUN_STATUSES = {"done", "closed_stale", "cancelled"}
FOLLOWUP_STAGES = {"T+1", "T+3"}
LIVE_READBACK_EVIDENCE = {
    "status_page_visible",
    "homepage_top_post",
    "post_analytics_visible",
    "live_platform_readback",
    "platform_readback",
    "x_status_readback",
    "x_analytics_readback",
    "creator_management_visible",
    "creator_management_readback",
    "note_management_visible",
    "note_management_reviewing",
    "note_management_published",
    "xhs_management_readback",
}
CLOSURE_ONLY_EVIDENCE = {
    "user_confirmed_complete",
    "closed_without_metrics",
    "metrics_unavailable",
    "followup_closed_without_readback",
}


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


def latest_file(paths: list[Path]) -> Path | None:
    return max(paths, key=lambda path: path.stat().st_mtime) if paths else None


def collect_daily_health(today_report: Path) -> dict[str, Any]:
    logs = sorted(
        [path for path in DAILY_LOG_DIR.glob("*.log") if path.is_file()],
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    ) if DAILY_LOG_DIR.exists() else []
    today_logs = [path for path in logs if date.today().isoformat() in path.name]
    latest_log = latest_file(logs)
    launchd_loaded = False
    launchd_error = ""
    if sys.platform == "darwin":
        try:
            completed = subprocess.run(
                ["launchctl", "print", f"gui/{os.getuid()}/{DAILY_LAUNCHD_LABEL}"],
                cwd=ROOT,
                check=False,
                capture_output=True,
                text=True,
                timeout=2,
            )
            launchd_loaded = completed.returncode == 0
            if completed.returncode != 0:
                launchd_error = (completed.stderr or completed.stdout).strip().splitlines()[-1:] or [""]
                launchd_error = launchd_error[0]
        except (OSError, subprocess.TimeoutExpired) as error:
            launchd_error = str(error)

    return {
        "today_report_exists": today_report.exists(),
        "today_logs": [rel(path) for path in today_logs[:5]],
        "latest_log": rel(latest_log) if latest_log else None,
        "latest_log_mtime": datetime.fromtimestamp(latest_log.stat().st_mtime).isoformat(timespec="seconds") if latest_log else None,
        "launchd_plist_exists": DAILY_LAUNCHD_PLIST.exists(),
        "launchd_loaded": launchd_loaded,
        "launchd_error": launchd_error,
    }


def publish_record_identity(record: dict[str, Any]) -> set[str]:
    identities = set()
    for key in ("status_url", "post_id", "note_id"):
        value = record.get(key)
        if value:
            identities.add(str(value))
    status_url = str(record.get("status_url", ""))
    match = re.search(r"/status/(\d+)", status_url)
    if match:
        identities.add(match.group(1))
    note_url = str(record.get("status_url", ""))
    match = re.search(r"/explore/([A-Za-z0-9]+)", note_url)
    if match:
        identities.add(match.group(1))
    return identities


def extract_publish_items(path: Path) -> list[dict[str, str]]:
    url_re = re.compile(r"https://(?:x\.com|twitter\.com)/[^)\s`，,]+/status/(\d+)|https://www\.xiaohongshu\.com/explore/([A-Za-z0-9]+)")
    skip_markers = ("旧文字版", "已删除", "特殊核查", "旧版本", "新的版本", "原帖")
    generic_labels = {"图文重发状态链接", "状态链接", "公开链接", "发布链接"}
    items: list[dict[str, str]] = []
    current_heading = path.parent.name

    try:
        lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    except OSError:
        return items

    previous_nonempty = ""
    for line in lines:
        if line.startswith("## "):
            current_heading = line.removeprefix("## ").strip()
            current_heading = current_heading.split("|", 1)[-1].strip() or current_heading

        if any(marker in line for marker in skip_markers) or "旧回复" in previous_nonempty:
            if line.strip():
                previous_nonempty = line.strip()
            continue

        for match in url_re.finditer(line):
            url = match.group(0).rstrip("。；;，,")
            identity = match.group(1) or match.group(2) or url
            label = current_heading
            label_match = re.search(r"[-*]\s+`?([^`：:]+)`?\s*[：:]", line)
            if label_match:
                candidate = label_match.group(1).strip()
                if candidate and candidate not in generic_labels:
                    label = candidate
            platform = "x.com" if "/status/" in url else "xiaohongshu"
            items.append({
                "path": rel(path),
                "title": label,
                "platform": platform,
                "url": url,
                "identity": identity,
            })
        if line.strip():
            previous_nonempty = line.strip()

    deduped: dict[str, dict[str, str]] = {}
    for item in items:
        deduped.setdefault(item["identity"], item)
    return list(deduped.values())


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


def find_publish_records_missing_ledger(records: list[dict[str, Any]], recent_days: int, limit: int) -> list[dict[str, str]]:
    recorded_identities: set[str] = set()
    for record in records:
        recorded_identities.update(publish_record_identity(record))

    cutoff = datetime.now().timestamp() - recent_days * 24 * 60 * 60
    missing: list[dict[str, str]] = []
    for root in (IN_PROGRESS_DIR, PUBLISHED_DIR):
        if not root.exists():
            continue
        for path in sorted(root.rglob("发布记录.md")):
            if path.stat().st_mtime < cutoff:
                continue
            items = extract_publish_items(path)
            if items:
                for item in items:
                    if item["identity"] not in recorded_identities and item["url"] not in recorded_identities:
                        missing.append(item)
            elif rel(path) not in {record.get("publish_record_path") for record in records}:
                missing.append({
                    "path": rel(path),
                    "title": path.parent.name,
                    "platform": "",
                    "url": "",
                    "identity": rel(path),
                })
    return missing[:limit]


def content_run_root(path: Path) -> Path | None:
    for root in (IN_PROGRESS_DIR, PUBLISHED_DIR):
        try:
            relative = path.relative_to(root)
        except ValueError:
            continue
        parts = relative.parts
        if parts:
            return root / parts[0]
    return None


def run_content_root(run: dict[str, Any]) -> Path | None:
    for artifact in run.get("artifacts", []):
        raw_path = artifact.get("path")
        if not raw_path:
            continue
        root = content_run_root(ROOT / raw_path)
        if root:
            return root
    return None


def summarize_publish_gate(run: dict[str, Any]) -> dict[str, Any]:
    artifacts = run.get("artifacts", [])
    artifact_types = {artifact.get("type") for artifact in artifacts}
    checks = run.get("checks", {})
    root = run_content_root(run)
    publish_record_file = root / "发布记录.md" if root else None
    missing = []
    if "publish_record" not in artifact_types:
        missing.append("artifact:publish_record")
    if checks.get("published") is not True:
        missing.append("check:published")
    return {
        "run_id": run.get("run_id", ""),
        "root": rel(root) if root else "",
        "missing": missing,
        "publish_record_file": rel(publish_record_file) if publish_record_file and publish_record_file.exists() else "",
    }


def has_storyboard_doc(directory: Path) -> bool:
    required_terms = ("卡片职责", "读者任务", "文字预算", "安全边距", "排版 QA", "视觉层级", "锚定短句")
    for path in directory.rglob("*.md"):
        if path.stat().st_size > 250_000:
            continue
        if "分镜" not in path.name and "storyboard" not in path.name.lower():
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        hits = sum(1 for term in required_terms if term in text)
        if hits >= 4:
            return True
    return False


def find_storyboard_closure_gaps(recent_days: int, limit: int) -> list[dict[str, str]]:
    cutoff = datetime.now().timestamp() - recent_days * 24 * 60 * 60
    roots: dict[Path, list[Path]] = defaultdict(list)
    for root in (IN_PROGRESS_DIR, PUBLISHED_DIR):
        if not root.exists():
            continue
        for image in root.rglob("*.png"):
            if image.name != "cover.png" and not image.name.startswith("card_"):
                continue
            if image.stat().st_mtime < cutoff:
                continue
            content_root = content_run_root(image)
            if content_root:
                roots[content_root].append(image)

    gaps = []
    for directory, images in sorted(roots.items()):
        if has_storyboard_doc(directory):
            continue
        gaps.append({
            "path": rel(directory),
            "image_count": str(len(images)),
            "issue": "has cover/card images but no 图文分镜.md with layout QA fields",
        })
    return gaps[:limit]


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


def normalized_evidence(record: dict[str, Any]) -> set[str]:
    return {
        str(item).strip().lower()
        for item in record.get("evidence", [])
        if str(item).strip()
    }


def followup_has_readback(record: dict[str, Any]) -> bool:
    if record.get("stage") not in FOLLOWUP_STAGES:
        return True
    metrics = record.get("metrics") or {}
    if not metrics:
        return False
    return bool(normalized_evidence(record) & LIVE_READBACK_EVIDENCE)


def followup_has_explicit_closure(record: dict[str, Any]) -> bool:
    if record.get("stage") not in FOLLOWUP_STAGES:
        return False
    evidence = normalized_evidence(record)
    notes = str(record.get("notes", "")).lower()
    return bool(evidence & CLOSURE_ONLY_EVIDENCE) or "no live platform readback" in notes


def publish_followups_unverified(records: list[dict[str, Any]], limit: int) -> list[dict[str, str]]:
    gaps = []
    for record in records:
        if record.get("stage") not in FOLLOWUP_STAGES:
            continue
        if followup_has_readback(record):
            continue
        gaps.append({
            "record_id": str(record.get("record_id", "")),
            "stage": str(record.get("stage", "")),
            "title": str(record.get("title", "")),
            "closure_only": str(followup_has_explicit_closure(record)).lower(),
            "evidence": ",".join(sorted(normalized_evidence(record))),
        })
    return gaps[:limit]


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
        "daily_health": collect_daily_health(today_report),
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
                    "publish_gate": summarize_publish_gate(run) if run.get("current_stage") == "publish" else {},
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
            "followups_unverified": publish_followups_unverified(publish_records, limit),
            "recent_publish_records_missing_ledger": find_publish_records_missing_ledger(
                publish_records,
                recent_days,
                limit,
            ),
        },
        "storyboard_closure_gaps": find_storyboard_closure_gaps(recent_days, limit),
    }


def print_status(status: dict[str, Any]) -> None:
    print(f"Redbook Dashboard - {status['date']}")

    report = status["today_report"]
    report_state = "exists" if report["exists"] else "missing"
    print(f"- 今日日报: {report_state} | {report['path']}")
    if not report["exists"] and status["latest_report"]:
        print(f"  latest: {status['latest_report']}")
    daily = status["daily_health"]
    if not report["exists"]:
        print(f"  latest log: {daily['latest_log'] or 'none'} | launchd loaded: {daily['launchd_loaded']}")

    tasks = status["active_tasks"]
    print(f"- Active tasks: {tasks['open_count']} open / {tasks['total_count']} total")
    for task in tasks["open"]:
        print(f"  - {task['title']} [{task['status']}]")

    runs = status["harness_runs"]
    print(f"- Harness runs: {runs['active_count']} active / {runs['total_count']} total | {runs['status_counts']}")
    for run in runs["active"]:
        print(f"  - {run['run_id']} | {run['stage']} | {run['topic']}")
        publish_gate = run.get("publish_gate") or {}
        if publish_gate.get("missing"):
            print(f"    gate gaps: {', '.join(publish_gate['missing'])}")
        if publish_gate.get("publish_record_file"):
            print(f"    publish record file exists: {publish_gate['publish_record_file']}")
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
    if ledger["followups_unverified"]:
        print("  unverified follow-ups:")
        for item in ledger["followups_unverified"]:
            marker = "closure-only" if item.get("closure_only") == "true" else "missing metrics/readback"
            print(f"  - {item['stage']} | {item['record_id']} | {marker} | {item['title']}")
    if ledger["recent_publish_records_missing_ledger"]:
        print("  recent publish records not in JSONL:")
        for item in ledger["recent_publish_records_missing_ledger"]:
            label = f"{item.get('title', '')} | {item.get('url', '')}".strip(" |")
            print(f"  - {item['path']} | {label}")

    storyboard_gaps = status["storyboard_closure_gaps"]
    print(f"- Storyboard closure gaps: {len(storyboard_gaps)}")
    for gap in storyboard_gaps:
        print(f"  - {gap['path']} | images={gap['image_count']} | {gap['issue']}")


def collect_workflow_actions(status: dict[str, Any]) -> list[dict[str, str]]:
    actions: list[dict[str, str]] = []

    report = status["today_report"]
    if not report["exists"]:
        daily = status["daily_health"]
        actions.append({
            "severity": "warn",
            "area": "daily",
            "issue": f"今日日报缺失: {report['path']}",
            "action": (
                "运行 tools/redbookctl daily；如果浏览器不可用，先用 tools/redbookctl daily --skip-x 生成无浏览器日报。"
                f" latest_log={daily['latest_log'] or 'none'}, launchd_loaded={daily['launchd_loaded']}"
            ),
        })
        if not daily["launchd_loaded"]:
            actions.append({
                "severity": "warn",
                "area": "daily",
                "issue": f"launchd 未加载: {DAILY_LAUNCHD_LABEL}",
                "action": "需要定时日报时运行 bash tools/reload_daily_launch_agent.sh，然后用 launchctl print 验证。",
            })

    for run in status["harness_runs"]["active"]:
        action = "确认是否仍在等待用户发布；已发布则补 T+0 JSONL，promote 到 retrospect 并补 progress/wiki/lessons gate 后再 close-run，未发布则保留 approved-publish 等待确认。"
        if run.get("stage") != "publish":
            action = "检查当前阶段产物；完成后推进或用 tools/redbookctl close-run 明确关闭。"
        publish_gate = run.get("publish_gate") or {}
        if publish_gate.get("publish_record_file"):
            action = f"已有发布记录文件 {publish_gate['publish_record_file']}；补 JSONL / harness publish_record artifact / published check 后 promote 到 retrospect，再补复盘 gate 后 close-run。"
        actions.append({
            "severity": "warn",
            "area": "harness",
            "issue": f"active run: {run.get('run_id', '')} | {run.get('stage', '')} | {run.get('topic', '')}",
            "action": action,
        })

    for item in status["pending_publish_confirmations"]:
        actions.append({
            "severity": "info",
            "area": "publish",
            "issue": f"待用户确认发布: {item['path']} | signal: {item['reason']}",
            "action": "不要自动 submit；用户明确说“发布/直接发”后再走平台发布链路。",
        })

    ledger = status["publish_ledger"]
    for item in ledger["followups_due"]:
        actions.append({
            "severity": "warn",
            "area": "ledger",
            "issue": f"{item['stage']} due: {item['record_id']} | {item['title']}",
            "action": f"回读平台数据后运行 tools/redbookctl publish-record -- --stage {item['stage']} --record-id {item['record_id']} ...",
        })

    for item in ledger["followups_unverified"]:
        marker = "按用户确认关闭但没有平台指标" if item.get("closure_only") == "true" else "缺少平台回读指标"
        actions.append({
            "severity": "info" if item.get("closure_only") == "true" else "warn",
            "area": "ledger",
            "issue": f"{item['stage']} unverified: {item['record_id']} | {item['title']} | {marker}",
            "action": "需要数据驱动复盘时，回读平台指标后追加带 metrics + readback evidence 的 follow-up 记录。",
        })

    for item in ledger["recent_publish_records_missing_ledger"]:
        title = item.get("title") or item.get("identity", "")
        url = item.get("url", "")
        actions.append({
            "severity": "warn",
            "area": "ledger",
            "issue": f"发布 item 未进 JSONL: {item['path']} | {title} | {url}",
            "action": "按单条 URL/note_id 补 T+0：tools/redbookctl publish-record -- --stage T+0 --status-url ...",
        })

    for gap in status["storyboard_closure_gaps"]:
        actions.append({
            "severity": "warn",
            "area": "storyboard",
            "issue": f"{gap['path']} | images={gap['image_count']}",
            "action": "补 `图文分镜.md`，至少包含卡片职责、读者任务、文字预算、安全边距、视觉层级和排版 QA。",
        })

    return actions


def print_workflow_health(status: dict[str, Any], actions: list[dict[str, str]]) -> None:
    print(f"Redbook Workflow Health - {status['date']}")
    if not actions:
        print("- OK: 没有发现日报、harness、发布确认、账本 follow-up 或 JSONL 缺口。")
        return

    for action in actions:
        print(f"- {action['severity'].upper()} | {action['area']} | {action['issue']}")
        print(f"  action: {action['action']}")


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
    print("- X 发布前门槛: tools/redbookctl x-login 必须通过。")
    print("- 小红书发布前门槛: tools/redbookctl xhs-health 必须通过；需要管理页证据时加 --with-content-data。")
    print("- X 发布主链: /baoyu-post-to-x")
    print("- 小红书图文主链: /baoyu-xhs-images")
    print("- 发布后补账: tools/redbookctl publish-record -- --stage T+0 ...；XHS 不能只填 PUBLISH_STATUS。")
    print("")
    pending = status["pending_publish_confirmations"]
    print(f"待确认发布: {len(pending)}")
    for item in pending:
        print(f"- {item['path']} | signal: {item['reason']}")
    followups = status["publish_ledger"]["followups_due"]
    if followups:
        print("")
        print("T+1/T+3 待回读:")
        for item in followups:
            print(f"- {item['stage']} | {item['record_id']} | {item['title']}")
            print(f"  template: tools/redbookctl publish-record -- --stage {item['stage']} --record-id {item['record_id']} ...")
    missing = status["publish_ledger"]["recent_publish_records_missing_ledger"]
    if missing:
        print("")
        print("近期已有发布 item 但未进 JSONL:")
        for item in missing:
            print(f"- {item['path']} | {item.get('title', '')} | {item.get('url', '')}")
    return 0


def command_workflow_health(args: argparse.Namespace) -> int:
    status = collect_status(stale_days=args.stale_days, limit=args.limit, recent_days=args.recent_days)
    actions = collect_workflow_actions(status)
    if args.json:
        print(json.dumps({"status": status, "actions": actions}, ensure_ascii=False, indent=2, sort_keys=True))
    else:
        print_workflow_health(status, actions)
    return 1 if args.strict and actions else 0


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


def command_x_login(args: argparse.Namespace) -> int:
    command = ["bun", str(X_BROWSER_SCRIPT), "--check-login"]
    if args.profile:
        command.extend(["--profile", args.profile])
    if args.expected_handle:
        command.extend(["--expected-handle", args.expected_handle])
    if args.cdp_endpoint:
        command.extend(["--cdp-endpoint", args.cdp_endpoint])
    if args.new_browser or not args.cdp_endpoint:
        command.append("--new-browser")
    command.append("--headed" if args.headed else "--headless")
    command.extend(["--timeout-ms", str(args.timeout_ms)])
    if args.login_wait_ms is not None:
        command.extend(["--login-wait-ms", str(args.login_wait_ms)])
    return run_passthrough(command).code


def command_xhs_health(args: argparse.Namespace) -> int:
    if not XHS_CDP_PUBLISH_SCRIPT.exists():
        print(f"XHS skill script not found: {XHS_CDP_PUBLISH_SCRIPT}", file=sys.stderr)
        return 2

    base = [
        sys.executable,
        str(XHS_CDP_PUBLISH_SCRIPT),
        "--host",
        args.host,
        "--port",
        str(args.port),
    ]
    if args.account:
        base.extend(["--account", args.account])
    if args.reuse_existing_tab:
        base.append("--reuse-existing-tab")
    base.append("--headed" if args.headed else "--headless")

    print("[redbookctl] XHS creator login preflight...")
    login_code = run_passthrough([*base, "check-login"]).code
    if login_code != 0:
        print("[redbookctl] XHS health failed: creator login check did not pass.", file=sys.stderr)
        return login_code

    if args.with_content_data:
        print("[redbookctl] XHS creator content-data readback...")
        command = [
            *base,
            "content-data",
            "--page-size",
            str(args.page_size),
            "--page-num",
            str(args.page_num),
            "--type",
            str(args.note_type),
        ]
        if args.csv_file:
            command.extend(["--csv-file", args.csv_file])
        content_code = run_passthrough(command).code
        if content_code != 0:
            print("[redbookctl] XHS health failed: creator content-data readback did not pass.", file=sys.stderr)
            return content_code

    print("[redbookctl] XHS health passed.")
    return 0


def command_content_loop(mode: str, args: argparse.Namespace) -> int:
    command = [
        sys.executable,
        str(ROOT / "tools" / "content_loop.py"),
        mode,
        "--topic",
        args.topic,
        "--limit",
        str(args.limit),
    ]
    if args.print_only:
        command.append("--print")
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

    workflow_health = subparsers.add_parser("workflow-health", aliases=["publish-health"], help="Show actionable workflow gaps.")
    workflow_health.add_argument("--json", action="store_true", help="Print machine-readable JSON.")
    workflow_health.add_argument("--strict", action="store_true", help="Exit non-zero when any action is open.")
    workflow_health.add_argument("--stale-days", type=int, default=7)
    workflow_health.add_argument("--recent-days", type=int, default=14)
    workflow_health.add_argument("--limit", type=int, default=10)

    publish_record = subparsers.add_parser(
        "publish-record",
        help="Delegate to tools/record_publish.py.",
        add_help=False,
    )
    publish_record.add_argument("args", nargs=argparse.REMAINDER)

    browser = subparsers.add_parser("browser", help="Inspect existing Chrome/CDP tabs without opening new pages.")
    browser.add_argument("--endpoint", default="http://127.0.0.1:9222")
    browser.add_argument("--json", action="store_true")

    x_login = subparsers.add_parser("x-login", help="Verify or recover the X publishing browser profile.")
    x_login.add_argument("--profile", help="Override the configured X browser profile directory.")
    x_login.add_argument("--expected-handle", help="Override the configured expected X handle.")
    x_login.add_argument("--cdp-endpoint", help="Reuse an existing Chrome CDP endpoint instead of launching the configured profile.")
    x_login.add_argument("--new-browser", action="store_true", help="Force launching the configured/profile browser instead of CDP reuse.")
    x_login.add_argument("--headed", action="store_true", help="Open a visible browser and wait for manual login/verification recovery.")
    x_login.add_argument("--timeout-ms", type=int, default=45_000, help="How long to wait for the X composer before failing.")
    x_login.add_argument("--login-wait-ms", type=int, help="How long headed mode waits for manual login recovery.")

    xhs_health = subparsers.add_parser("xhs-health", help="Verify Xiaohongshu creator login/readback without publishing.")
    xhs_health.add_argument("--host", default="127.0.0.1")
    xhs_health.add_argument("--port", type=int, default=9222)
    xhs_health.add_argument("--account", help="XHS account name configured in RedBookSkills.")
    xhs_health.add_argument("--headed", action="store_true", help="Use a visible browser for login/CAPTCHA recovery.")
    xhs_health.add_argument("--reuse-existing-tab", action="store_true", help="Prefer reusing an existing tab.")
    xhs_health.add_argument("--with-content-data", action="store_true", help="Also verify creator management/data readback.")
    xhs_health.add_argument("--page-num", type=int, default=1)
    xhs_health.add_argument("--page-size", type=int, default=5)
    xhs_health.add_argument("--note-type", type=int, default=0)
    xhs_health.add_argument("--csv-file", help="Optional CSV output path for content-data readback.")

    for mode, help_text in [
        ("challenge", "Generate challenge questions from local corpus."),
        ("emerge", "Mine implicit ideas and frame candidates from local corpus."),
        ("draft-seed", "Generate a draft seed from local corpus."),
    ]:
        loop = subparsers.add_parser(mode, help=help_text)
        loop.add_argument("--topic", required=True)
        loop.add_argument("--limit", type=int, default=8)
        loop.add_argument("--print", action="store_true", dest="print_only")

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
    if args.command in {"workflow-health", "publish-health"}:
        return command_workflow_health(args)
    if args.command == "publish-record":
        return command_publish_record(args)
    if args.command == "browser":
        return command_browser(args)
    if args.command == "x-login":
        return command_x_login(args)
    if args.command == "xhs-health":
        return command_xhs_health(args)
    if args.command == "challenge":
        return command_content_loop("challenge", args)
    if args.command == "emerge":
        return command_content_loop("emerge", args)
    if args.command == "draft-seed":
        return command_content_loop("draft", args)
    if args.command == "close-run":
        return command_close_run(args)

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
