#!/usr/bin/env python3
from __future__ import annotations

import argparse
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


FREEZE_END = datetime(2026, 4, 25, 9, 51, 36, tzinfo=ZoneInfo("Asia/Shanghai"))
MANUAL_PACK = Path(
    "/Users/proerror/Documents/redbook/docs/reports/2026-04-18-xiaohongshu-manual-publish-freeze.md"
)
DEFAULT_PIPELINE = Path("/Users/proerror/.codex/skills/xiaohongshu-skills/scripts/publish_pipeline.py")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Guard Xiaohongshu auto-publish during platform risk window"
    )
    parser.add_argument(
        "--allow-after-freeze",
        action="store_true",
        help="Require the freeze window to be over before forwarding to publish_pipeline.py",
    )
    args, rest = parser.parse_known_args()

    now = datetime.now(ZoneInfo("Asia/Shanghai"))
    if now < FREEZE_END:
        print(
            "[xhs-guard] Auto-publish blocked: account is in Xiaohongshu risk window until "
            f"{FREEZE_END.strftime('%Y-%m-%d %H:%M:%S %Z')}"
        )
        print(f"[xhs-guard] Use the manual publish pack instead: {MANUAL_PACK}")
        return 2

    if args.allow_after_freeze and not DEFAULT_PIPELINE.exists():
        print(f"[xhs-guard] Missing pipeline: {DEFAULT_PIPELINE}", file=sys.stderr)
        return 1

    forwarded = [str(DEFAULT_PIPELINE), *rest]
    print("[xhs-guard] Freeze window cleared, forwarding to publish_pipeline.py")
    result = subprocess.run([sys.executable, *forwarded], check=False)
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
