#!/bin/bash
# 定时检查 BOSS 聊天列表

cd "$(dirname "$0")/.."

LOG_FILE="logs/chatlist_$(date +%Y-%m-%d).log"
mkdir -p logs

OPENCLI_BIN="$(pwd)/../opencli/bin/redbook-opencli.js"

# Quick doctor check
DOCTOR=$(node "$OPENCLI_BIN" doctor 2>&1)
if ! echo "$DOCTOR" | node --input-type=module -e "import { parseDoctorOutput } from '../opencli/lib/verify_helpers.js'; const text = await new Promise((resolve) => { let data=''; process.stdin.on('data', (chunk) => data += chunk); process.stdin.on('end', () => resolve(data)); }); process.exit(parseDoctorOutput(text).healthy ? 0 : 1)" 2>/dev/null; then
  echo "[$(date)] chatlist skipped - extension not connected" >> "$LOG_FILE"
  exit 1
fi

echo "[$(date)] Running chatlist triage..." >> "$LOG_FILE"
node scripts/opencli_chat_triage.js --limit 30 >> "$LOG_FILE" 2>&1
echo "[$(date)] Done (exit $?)" >> "$LOG_FILE"
