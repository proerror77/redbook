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
TODAY="$(TZ=Asia/Shanghai date +%Y-%m-%d)"

if [ ! -f "$AUTO_X_RUNNER" ]; then
  echo "error: missing runner: $AUTO_X_RUNNER" >&2
  exit 1
fi

/bin/bash "$AUTO_X_RUNNER" "$@"

if command -v bun >/dev/null 2>&1 && [ -f "$ROOT_DIR/tools/social_loop.ts" ]; then
  if bun "$ROOT_DIR/tools/social_loop.ts" record-collection --date "$TODAY"; then
    echo "🔁 Social Loop Engineer 状态已记录：docs/reports/social-loop-${TODAY}.md"
  else
    echo "⚠️ Social Loop Engineer 状态记录失败；请检查 daily evidence 和 tools/redbookctl social-loop status" >&2
  fi
fi

echo ""
echo "✅ 每日日程已生成：05-选题研究/X-每日日程-${TODAY}.md"
if [ -s "$ROOT_DIR/05-选题研究/X-timeline-fresh-following-${TODAY}.md" ]; then
  echo "🧾 X following 新鲜样本已生成：05-选题研究/X-timeline-fresh-following-${TODAY}.md（目标100条，按今天过滤）"
else
  echo "⚠️ X following 新鲜样本缺失：05-选题研究/X-timeline-fresh-following-${TODAY}.md（Lane A 不得用旧帖冒充今天选题）"
fi
if [ -s "$ROOT_DIR/05-选题研究/X-timeline-sample-${TODAY}.md" ]; then
  echo "🧾 X home/for-you 补充样本：05-选题研究/X-timeline-sample-${TODAY}.md（目标100条，仅作补充）"
else
  echo "⚠️ X home/for-you 补充样本缺失：05-选题研究/X-timeline-sample-${TODAY}.md（不影响 fresh following 主证据）"
fi
if [ -s "$ROOT_DIR/05-选题研究/X-互动队列-${TODAY}.md" ]; then
  echo "💬 X互动队列已生成：05-选题研究/X-互动队列-${TODAY}.md（从原始样本筛20条候选，不自动发布）"
else
  echo "⚠️ X互动队列缺失：05-选题研究/X-互动队列-${TODAY}.md"
fi
echo "📌 Wiki daily-cycle 已自动记录；内容写回状态见 tools/auto-x/data/logs/${TODAY}.log"
