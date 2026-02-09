#!/bin/bash
# X.com 每日日程 - 启动脚本
# 自动处理 Chrome 和 agent-browser 的启动，然后运行每日日程
#
# 用法:
#   bash run_daily.sh              # 完整运行
#   bash run_daily.sh --skip-research  # 只看提醒和回顾
#   bash run_daily.sh --keywords "AI agent" "web3"

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$SCRIPT_DIR/../data/logs"
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/$(date +%Y-%m-%d).log"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CHROME_PROFILE="$HOME/.local/share/chrome-debug-profile"
DEBUG_PORT=9222

log() {
    echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========== X.com 每日日程启动 =========="

# 1. 检查并启动 Chrome
if ! lsof -i :$DEBUG_PORT >/dev/null 2>&1; then
    log "启动 Chrome (debug port $DEBUG_PORT)..."
    "$CHROME" \
        --remote-debugging-port=$DEBUG_PORT \
        --user-data-dir="$CHROME_PROFILE" \
        --no-first-run \
        >/dev/null 2>&1 &
    sleep 3
    log "Chrome 已启动"
else
    log "Chrome 已在运行 (port $DEBUG_PORT)"
fi

# 2. 连接 agent-browser
log "连接 agent-browser..."
if command -v agent-browser >/dev/null 2>&1; then
    agent-browser connect $DEBUG_PORT 2>/dev/null || true
    sleep 1
    log "agent-browser 已连接"
else
    log "警告: agent-browser 未安装，研究功能将跳过"
fi

# 3. 运行每日日程
log "运行每日日程脚本..."
cd "$SCRIPT_DIR"
python3 daily_schedule.py "$@" 2>&1 | tee -a "$LOG_FILE"

log "========== 每日日程结束 =========="
