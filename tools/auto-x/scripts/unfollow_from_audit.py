#!/usr/bin/env python3
"""
根据 following 巡检结果执行 unfollow。

默认 dry-run，只打印候选；
必须显式传 `--apply` 才会点击 unfollow。
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from x_utils import DATA_DIR, ensure_browser, print_colored, run_abs, today_str


DEFAULT_AUDIT_JSON = DATA_DIR / "following_audit_latest.json"


def load_candidates(
    path: Path,
    *,
    include_review: bool,
    limit: int,
) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    rows = payload.get("results", [])
    statuses = {"not_found", "suspended", "no_posts", "inactive"}
    if include_review:
        statuses.add("quiet")
    candidates = [row for row in rows if row.get("status") in statuses]
    if limit > 0:
        return candidates[:limit]
    return candidates


def unfollow(username: str, wait_seconds: float) -> bool:
    run_abs(f'open "https://x.com/{username}"', timeout=40)
    time.sleep(wait_seconds)
    snapshot = run_abs("snapshot -c -d 4", timeout=20)

    if "该页面不存在" in snapshot or "page doesn" in snapshot.lower():
        print_colored(f"@{username} 页面已失效，无需点按钮，跳过。", "yellow")
        return True

    has_unfollow_button = (
        "button \"取消关注" in snapshot
        or "button \"Unfollow" in snapshot
        or "button \"正在关注" in snapshot
        or "button \"Following" in snapshot
    )

    if not has_unfollow_button:
        print_colored(f"@{username} 未找到正在关注按钮，可能已 unfollow 或页面异常。", "yellow")
        return False

    if "button \"取消关注" in snapshot:
        ref_match = __import__("re").search(r'button "取消关注 [^"]*" \[ref=(e\d+)\]', snapshot)
        if ref_match:
            run_abs(f"click @{ref_match.group(1)}", timeout=15)
        else:
            run_abs('find text 取消关注 click', timeout=15)
    elif "button \"Unfollow" in snapshot:
        run_abs('find text Unfollow click', timeout=15)
    else:
        run_abs('find role button click --name 正在关注', timeout=15)
    time.sleep(0.8)

    confirm_snapshot = run_abs("snapshot -c -d 4", timeout=20)
    if "取消关注" in confirm_snapshot:
        run_abs('find text 取消关注 click', timeout=15)
        time.sleep(0.8)
        return True
    if "Unfollow" in confirm_snapshot:
        run_abs('find text Unfollow click', timeout=15)
        time.sleep(0.8)
        return True

    print_colored(f"@{username} 未出现确认按钮，未执行。", "yellow")
    return False


def main() -> None:
    parser = argparse.ArgumentParser(description="根据 following 巡检结果执行 unfollow")
    parser.add_argument("--audit-json", default=str(DEFAULT_AUDIT_JSON))
    parser.add_argument("--include-review", action="store_true", help="把 quiet 也作为候选")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--wait-seconds", type=float, default=1.2)
    parser.add_argument("--apply", action="store_true", help="真的执行 unfollow；默认仅 dry-run")
    args = parser.parse_args()

    audit_path = Path(args.audit_json)
    candidates = load_candidates(audit_path, include_review=args.include_review, limit=args.limit)

    print_colored(f"following 清理候选（{today_str()}）: {len(candidates)}", "green")
    for row in candidates:
        print_colored(f"- @{row['username']} | {row['status']} | {row['reason']}", "cyan")

    if not args.apply:
        print_colored("当前为 dry-run；如需真实 unfollow，请显式传 --apply。", "yellow")
        return

    if not ensure_browser():
        sys.exit(1)

    success = 0
    failed = 0
    for row in candidates:
        if unfollow(row["username"], args.wait_seconds):
            success += 1
        else:
            failed += 1

    print_colored(f"unfollow 完成：success={success} failed={failed}", "green")


if __name__ == "__main__":
    main()
