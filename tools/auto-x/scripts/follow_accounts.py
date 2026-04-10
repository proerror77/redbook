#!/usr/bin/env python3
"""批量 follow X 账号。"""

from __future__ import annotations

import argparse
import re
import sys
import time

from x_utils import ensure_browser, print_colored, run_abs


def _follow_ref(snapshot: str, username: str) -> str | None:
    patterns = [
        rf'button "关注 @{re.escape(username)}" \[ref=(e\d+)\]',
        rf'button "Follow @{re.escape(username)}" \[ref=(e\d+)\]',
        r'button "关注 [^"]*" \[ref=(e\d+)\]',
        r'button "Follow [^"]*" \[ref=(e\d+)\]',
    ]
    for pattern in patterns:
        match = re.search(pattern, snapshot, flags=re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def _already_following(snapshot: str, username: str) -> bool:
    lowered = snapshot.lower()
    return (
        f"正在关注 @{username}".lower() in lowered
        or f"取消关注 @{username}".lower() in lowered
        or f"following @{username}".lower() in lowered
        or "button \"正在关注" in lowered
        or "button \"取消关注" in lowered
        or "button \"following" in lowered
    )


def follow(username: str, wait_seconds: float) -> tuple[bool, str]:
    run_abs(f'open "https://x.com/{username}"', timeout=40)
    time.sleep(wait_seconds)
    snapshot = run_abs("snapshot -c -d 5", timeout=20)

    if "该页面不存在" in snapshot or "doesn’t exist" in snapshot.lower() or "doesn't exist" in snapshot.lower():
        return False, "页面不存在"

    if _already_following(snapshot, username):
        return True, "已关注"

    ref = _follow_ref(snapshot, username)
    if not ref:
        return False, "未找到关注按钮"

    run_abs(f"click @{ref}", timeout=15)
    time.sleep(0.8)
    confirm = run_abs("snapshot -c -d 5", timeout=20)
    if _already_following(confirm, username):
        return True, "已执行关注"
    return False, "点击后未确认成功"


def main() -> None:
    parser = argparse.ArgumentParser(description="批量 follow X 账号")
    parser.add_argument("usernames", nargs="+")
    parser.add_argument("--wait-seconds", type=float, default=1.2)
    args = parser.parse_args()

    if not ensure_browser():
        sys.exit(1)

    success = 0
    failed = 0
    for username in args.usernames:
        ok, msg = follow(username, args.wait_seconds)
        if ok:
            success += 1
            print_colored(f"@{username}: {msg}", "green")
        else:
            failed += 1
            print_colored(f"@{username}: {msg}", "yellow")

    print_colored(f"follow 完成：success={success} failed={failed}", "green")


if __name__ == "__main__":
    main()
