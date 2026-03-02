#!/bin/bash
# Canonical daily entrypoint for Redbook.
# - Manual:  bash tools/daily.sh
# - Scheduled (launchd): point ProgramArguments here
#
# This delegates to auto-x's run_daily.sh, which manages headless Chrome/actionbook
# and runs the daily report generator.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

AUTO_X_RUNNER="$ROOT_DIR/tools/auto-x/scripts/run_daily.sh"

if [ ! -f "$AUTO_X_RUNNER" ]; then
  echo "error: missing runner: $AUTO_X_RUNNER" >&2
  exit 1
fi

exec /bin/bash "$AUTO_X_RUNNER" "$@"

