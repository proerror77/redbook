#!/bin/bash
# Canonical daily entrypoint for Redbook.
# - Manual:  bash tools/daily.sh
# - Scheduled (launchd): point ProgramArguments here
#
# This delegates to auto-x's run_daily.sh, which runs the daily report generator
# and records the wiki maintenance cycle.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

AUTO_X_RUNNER="$ROOT_DIR/tools/auto-x/scripts/run_daily.sh"

if [ ! -f "$AUTO_X_RUNNER" ]; then
  echo "error: missing runner: $AUTO_X_RUNNER" >&2
  exit 1
fi

/bin/bash "$AUTO_X_RUNNER" "$@"

TODAY="$(date +%Y-%m-%d)"

echo ""
echo "✅ 每日日程已生成：05-选题研究/X-每日日程-${TODAY}.md"
echo "📌 Wiki daily-cycle 已自动记录；内容写回状态见 tools/auto-x/data/logs/${TODAY}.log"
