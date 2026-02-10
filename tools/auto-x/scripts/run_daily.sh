#!/bin/bash
# X.com 每日日程 - 启动脚本
# 自动处理 Chrome 和 actionbook 的启动，然后运行每日日程
#
# 逻辑：
#   - 如果有头 Chrome 已在运行（9222），直接用它
#   - 如果没有 Chrome 运行，启动 headless Chrome（9223）
#   - 定时任务（7:00）通常没有有头 Chrome，会自动 headless
#
# 用法:
#   bash run_daily.sh              # 完整运行
#   bash run_daily.sh --skip-research  # 只看提醒和回顾
#   bash run_daily.sh --keywords "AI agent" "web3"

set -e

export PATH="$HOME/.local/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$SCRIPT_DIR/../data/logs"
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/$(date +%Y-%m-%d).log"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CHROME_PROFILE="$HOME/.local/share/chrome-debug-profile"
HEADED_PORT=9222
HEADLESS_PORT=9223

log() {
    echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

cleanup_headless() {
    if [ -n "$HEADLESS_PID" ]; then
        log "关闭 headless Chrome (PID: $HEADLESS_PID)..."
        kill "$HEADLESS_PID" 2>/dev/null || true
    fi
}

log "========== X.com 每日日程启动 =========="

# 检测是否有有头 Chrome 在运行
if lsof -i :$HEADED_PORT >/dev/null 2>&1; then
    # 有头 Chrome 已在运行，直接连接
    log "检测到有头 Chrome (port $HEADED_PORT)，直接使用"
    actionbook browser connect $HEADED_PORT 2>/dev/null || true
    sleep 1
    log "actionbook 已连接 (headed)"
else
    # 没有 Chrome 运行，启动 headless
    log "未检测到 Chrome，启动 headless 模式"
    log "启动 headless Chrome (port $HEADLESS_PORT)..."
    "$CHROME" \
        --headless=new \
        --remote-debugging-port=$HEADLESS_PORT \
        --user-data-dir="$CHROME_PROFILE" \
        --no-first-run \
        --disable-gpu \
        >/dev/null 2>&1 &
    HEADLESS_PID=$!
    trap cleanup_headless EXIT
    sleep 3
    log "headless Chrome 已启动 (PID: $HEADLESS_PID)"

    actionbook browser connect $HEADLESS_PORT 2>/dev/null || true
    sleep 1
    log "actionbook 已连接 (headless)"
fi

# 运行每日日程
log "运行每日日程脚本..."
cd "$SCRIPT_DIR"
python3 daily_schedule.py "$@" 2>&1 | tee -a "$LOG_FILE"

log "========== 每日日程结束 =========="
