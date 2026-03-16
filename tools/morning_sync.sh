#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TODAY="$(TZ=Asia/Shanghai date +%Y-%m-%d)"

cd "$ROOT_DIR"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "error: tracked changes are pending. commit/stash them before morning sync." >&2
  git status --short
  exit 1
fi

git fetch origin main
git pull --ff-only origin main

echo "synced origin/main"
echo "today's reports:"

for report in \
  "05-选题研究/X-每日日程-${TODAY}.md" \
  "05-选题研究/HN-每日热点-${TODAY}.md" \
  "05-选题研究/Reddit-每日监控-${TODAY}.md"
do
  if [ -f "$report" ]; then
    echo "  ✓ $report"
  else
    echo "  - missing: $report"
  fi
done
