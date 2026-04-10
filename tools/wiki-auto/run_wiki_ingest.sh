#!/bin/bash
# tools/wiki-auto/run_wiki_ingest.sh
# 调用 Claude CLI 执行实际 wiki 内容写入。
# 在 wiki_workflow.py daily-cycle（harness 记录层）之后运行。
#
# 用法：
#   bash tools/wiki-auto/run_wiki_ingest.sh           # 今天
#   bash tools/wiki-auto/run_wiki_ingest.sh 2026-04-07  # 指定日期

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TODAY="${1:-$(date +%Y-%m-%d)}"
PROMPT_FILE="$ROOT_DIR/tools/wiki-auto/ingest-prompt.md"
LOG_DIR="$ROOT_DIR/tools/auto-x/data/logs"
LOG_FILE="$LOG_DIR/${TODAY}-wiki-ingest.log"

mkdir -p "$LOG_DIR"

log() {
    echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 检查 prompt 文件
if [ ! -f "$PROMPT_FILE" ]; then
    log "ERROR: prompt file not found: $PROMPT_FILE"
    exit 1
fi

# 检查今天是否有研究报告
REPORT_COUNT=$(ls "$ROOT_DIR/05-选题研究/"*"${TODAY}"* 2>/dev/null | wc -l | tr -d ' ')
if [ "$REPORT_COUNT" -eq 0 ]; then
    log "No research reports for $TODAY, skipping wiki ingest"
    exit 0
fi

log "Found $REPORT_COUNT research report(s) for $TODAY, starting wiki ingest..."

# 替换 prompt 中的 {DATE} 占位符
PROMPT="$(sed "s/{DATE}/$TODAY/g" "$PROMPT_FILE")"

# 调用 claude CLI 执行 ingest
# --print: 非交互模式，输出到 stdout
# --model: 用 sonnet 省成本（ingest 不需要 opus）
# --max-turns: 防止无限循环
# --allowedTools: 只允许文件读写，不允许执行 bash
claude --print \
    --model claude-sonnet-4-6 \
    --max-turns 20 \
    --allowedTools "Read,Write,Edit,Glob,Grep" \
    -p "$PROMPT" \
    2>&1 | tee -a "$LOG_FILE"

EXIT_CODE=${PIPESTATUS[0]}

if [ "$EXIT_CODE" -eq 0 ]; then
    log "Wiki ingest completed successfully"
else
    log "WARNING: Wiki ingest exited with code $EXIT_CODE"
fi

exit "$EXIT_CODE"
