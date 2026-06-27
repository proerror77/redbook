#!/bin/bash
# 每日自动投递脚本（含 preflight check）
#
# This legacy entrypoint used keyword search and a large target count. Keep it
# disabled by default so a stale scheduler cannot consume BOSS quota or trigger
# site controls. Prefer the extension/current-page supervised workflow.

cd "$(dirname "$0")/.."

LOG_FILE="logs/daily_apply_$(date +%Y-%m-%d).log"
mkdir -p logs

OPENCLI_BIN="$(pwd)/../opencli/bin/redbook-opencli.js"

echo "=== Daily Apply Started at $(date) ===" >> "$LOG_FILE"

if [ "${BOSS_ENABLE_LIVE_APPLY:-}" != "1" ]; then
  echo "[preflight] Live batch apply disabled. Set BOSS_ENABLE_LIVE_APPLY=1 only for an intentional supervised live run." >> "$LOG_FILE"
  echo "=== Aborted at $(date) ===" >> "$LOG_FILE"
  exit 1
fi

if [ "${BOSS_ALLOW_LEGACY_SEARCH_APPLY:-}" != "1" ]; then
  echo "[preflight] Legacy search apply is disabled. Use trace-supervised current-page/recommendation apply, or set BOSS_ALLOW_LEGACY_SEARCH_APPLY=1 for an explicit fallback run." >> "$LOG_FILE"
  echo "=== Aborted at $(date) ===" >> "$LOG_FILE"
  exit 1
fi

# Preflight 1: OpenCLI doctor
DOCTOR=$(node "$OPENCLI_BIN" doctor 2>&1)
if echo "$DOCTOR" | node --input-type=module -e "import { parseDoctorOutput } from '../opencli/lib/verify_helpers.js'; const text = await new Promise((resolve) => { let data=''; process.stdin.on('data', (chunk) => data += chunk); process.stdin.on('end', () => resolve(data)); }); process.exit(parseDoctorOutput(text).healthy ? 0 : 1)" 2>/dev/null; then
  echo "[preflight] Doctor: PASS" >> "$LOG_FILE"
else
  echo "[preflight] Doctor: FAIL - extension not connected or daemon down" >> "$LOG_FILE"
  echo "$DOCTOR" >> "$LOG_FILE"
  echo "=== Aborted at $(date) ===" >> "$LOG_FILE"
  exit 1
fi

# Preflight 2: BOSS login
LOGIN=$(node "$OPENCLI_BIN" boss chat-list --limit 3 -f json 2>&1)
if echo "$LOGIN" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.exit(Array.isArray(d)?0:1)" 2>/dev/null; then
  echo "[preflight] Login: PASS" >> "$LOG_FILE"
else
  echo "[preflight] Login: FAIL - not logged in to BOSS" >> "$LOG_FILE"
  echo "=== Aborted at $(date) ===" >> "$LOG_FILE"
  exit 1
fi

echo "[preflight] ALL PASS - starting apply" >> "$LOG_FILE"

# 旧搜索 fallback。不要作为默认 live 路线使用。
node scripts/opencli_cdp_apply_until_target.js --target-successes "${BOSS_TARGET_SUCCESSES:-50}" --search-limit "${BOSS_SEARCH_LIMIT:-18}" >> "$LOG_FILE" 2>&1

EXIT_CODE=$?
echo "=== Daily Apply Finished at $(date) with exit code $EXIT_CODE ===" >> "$LOG_FILE"

exit $EXIT_CODE
