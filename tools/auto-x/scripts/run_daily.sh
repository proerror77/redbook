#!/bin/bash
# X.com 每日日程 - 启动脚本
# 使用 agent-browser-session（持久 profile，无需手动连接）
#
# 用法:
#   bash run_daily.sh              # 完整运行
#   bash run_daily.sh --skip-research  # 只看提醒和回顾
#   bash run_daily.sh --keywords "AI agent" "web3"

set -euo pipefail

export PATH="/opt/homebrew/bin:$HOME/.local/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$SCRIPT_DIR/../data/logs"
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/$(date +%Y-%m-%d).log"

log() {
    echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========== X.com 每日日程启动 =========="
log "使用 agent-browser-session $(agent-browser-session --version 2>/dev/null || echo '未知版本')"

# 运行每日日程
log "运行每日日程脚本..."
cd "$SCRIPT_DIR"
PYTHONUNBUFFERED=1 python3 -u daily_schedule.py "$@" 2>&1 | tee -a "$LOG_FILE"

log "========== 每日日程结束 =========="
