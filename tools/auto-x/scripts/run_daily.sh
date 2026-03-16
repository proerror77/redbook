#!/bin/bash
# X.com 每日日程 - 启动脚本
# 自动处理 Chrome 和 actionbook 的启动，然后运行每日日程
#
# 逻辑：
#   - 如果有头 Chrome 在运行，启动独立 headless Chrome + 转移 cookies
#   - 如果没有 Chrome 运行，启动 headless Chrome（用已有 profile）
#   - 运行完毕后自动关闭 headless Chrome
#
# 用法:
#   bash run_daily.sh              # 完整运行
#   bash run_daily.sh --skip-research  # 只看提醒和回顾
#   bash run_daily.sh --keywords "AI agent" "web3"

set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$SCRIPT_DIR/../data/logs"
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/$(date +%Y-%m-%d).log"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CHROME_PROFILE="$HOME/.local/share/chrome-debug-profile"
HEADLESS_PROFILE="$HOME/.local/share/chrome-headless-profile"
HEADED_PORT=9222
HEADLESS_PORT=9223
HEADLESS_PID=""
SKIP_X=0

for arg in "$@"; do
    if [ "$arg" = "--skip-x" ]; then
        SKIP_X=1
        break
    fi
done

log() {
    echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

cleanup_headless() {
    if [ -n "$HEADLESS_PID" ]; then
        log "关闭 headless Chrome (PID: $HEADLESS_PID)..."
        kill "$HEADLESS_PID" 2>/dev/null || true
        wait "$HEADLESS_PID" 2>/dev/null || true
    fi
}

start_headless() {
    local profile="$1"
    if ! lsof -i :$HEADLESS_PORT >/dev/null 2>&1; then
        log "启动 headless Chrome (port $HEADLESS_PORT)..."
        "$CHROME" \
            --headless=new \
            --remote-debugging-port=$HEADLESS_PORT \
            --user-data-dir="$profile" \
            --no-first-run \
            --disable-gpu \
            >/dev/null 2>&1 &
        HEADLESS_PID=$!
        trap cleanup_headless EXIT
        sleep 3
        log "headless Chrome 已启动 (PID: $HEADLESS_PID)"
    else
        log "headless Chrome 已在运行 (port $HEADLESS_PORT)"
    fi
    actionbook --cdp $HEADLESS_PORT browser connect $HEADLESS_PORT 2>/dev/null || true
    sleep 1
}

log "========== X.com 每日日程启动 =========="

if [ "$SKIP_X" -eq 1 ]; then
    log "检测到 --skip-x，跳过 Chrome/actionbook，使用无浏览器模式"
else
    if lsof -i :$HEADED_PORT >/dev/null 2>&1; then
        # 有头 Chrome 在运行 → 启动独立 headless + 转移 cookies
        log "检测到有头 Chrome (port $HEADED_PORT)"
        mkdir -p "$HEADLESS_PROFILE"
        start_headless "$HEADLESS_PROFILE"

        # 转移 X.com cookies
        log "转移 cookies..."
        python3 "$SCRIPT_DIR/transfer_cookies.py" $HEADED_PORT $HEADLESS_PORT 2>&1 | tee -a "$LOG_FILE"

        # 让 actionbook 默认连接 headless
        actionbook browser connect $HEADLESS_PORT 2>/dev/null || true
        log "actionbook 已连接 (headless, port $HEADLESS_PORT)"
    else
        # 没有 Chrome → 用已有 profile 启动 headless（有登录态）
        log "未检测到 Chrome，使用已有 profile 启动 headless"
        start_headless "$CHROME_PROFILE"
        log "actionbook 已连接 (headless, port $HEADLESS_PORT)"
    fi
fi

# 运行每日日程
log "运行每日日程脚本..."
cd "$SCRIPT_DIR"
# NOTE: stdout is piped into tee, so Python will block-buffer by default.
# Use unbuffered mode so users can see real-time progress in terminal/log.
PYTHONUNBUFFERED=1 python3 -u daily_schedule.py "$@" 2>&1 | tee -a "$LOG_FILE"

log "========== 每日日程结束 =========="
