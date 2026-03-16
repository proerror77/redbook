#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_PLIST="$ROOT_DIR/tools/auto-x/com.redbook.daily-x.plist"
TARGET_DIR="$HOME/Library/LaunchAgents"
TARGET_PLIST="$TARGET_DIR/com.redbook.daily-x.plist"

if [ ! -f "$SOURCE_PLIST" ]; then
  echo "error: missing source plist: $SOURCE_PLIST" >&2
  exit 1
fi

mkdir -p "$TARGET_DIR"
cp "$SOURCE_PLIST" "$TARGET_PLIST"

launchctl unload "$TARGET_PLIST" >/dev/null 2>&1 || true
launchctl load -w "$TARGET_PLIST"

echo "reloaded launch agent: $TARGET_PLIST"
