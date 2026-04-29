#!/bin/bash
# X.com 每日日程 - 启动脚本
# 使用当前已登录 Chrome/CDP 优先；无 CDP 时落到 agent-browser-session headless adapter
#
# 用法:
#   bash run_daily.sh              # 完整运行
#   bash run_daily.sh --skip-research  # 只看提醒和回顾
#   bash run_daily.sh --keywords "AI agent" "web3"
#   bash run_daily.sh --with-following-audit  # 额外启动关注列表全量巡检

set -euo pipefail

export PATH="/opt/homebrew/bin:$HOME/.local/bin:$PATH"
export AGENT_BROWSER_HEADED="${AGENT_BROWSER_HEADED:-false}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
LOG_DIR="$SCRIPT_DIR/../data/logs"
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/$(date +%Y-%m-%d).log"
FOLLOWING_AUDIT_LOG_FILE="$LOG_DIR/following-audit-$(date +%Y-%m-%d).log"

log() {
    echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========== X.com daily schedule start =========="
log "agent-browser-session: $(agent-browser-session --version 2>/dev/null || echo 'unknown')"
log "browser mode: AGENT_BROWSER_HEADED=${AGENT_BROWSER_HEADED} (default headless; use headed only for login/CAPTCHA/manual confirmation)"

SHOULD_RUN_FOLLOWING_AUDIT="false"
DAILY_ARGS=()
for arg in "$@"; do
    case "$arg" in
        --with-following-audit)
            SHOULD_RUN_FOLLOWING_AUDIT="true"
            ;;
        --skip-research|--skip-x|--skip-following)
            SHOULD_RUN_FOLLOWING_AUDIT="false"
            DAILY_ARGS+=("$arg")
            ;;
        *)
            DAILY_ARGS+=("$arg")
            ;;
    esac
done

# 运行每日日程
log "运行每日日程脚本..."
cd "$SCRIPT_DIR"
PYTHONUNBUFFERED=1 python3 -u daily_schedule.py "${DAILY_ARGS[@]}" 2>&1 | tee -a "$LOG_FILE"

TODAY="$(date +%Y-%m-%d)"
log "运行 LLM Wiki 每日维护周期（ingest + lint）..."
if PYTHONUNBUFFERED=1 python3 -u "$ROOT_DIR/tools/wiki_workflow.py" daily-cycle --date "$TODAY" 2>&1 | tee -a "$LOG_FILE"; then
    log "LLM Wiki 每日维护周期已记录"
else
    log "WARNING: LLM Wiki 每日维护周期失败（不影响日报本身）"
fi

# Claude CLI 执行实际 wiki 内容写入（在 harness 记录层之后）
WIKI_INGEST_RUNNER="$ROOT_DIR/tools/wiki-auto/run_wiki_ingest.sh"
if [ -f "$WIKI_INGEST_RUNNER" ]; then
    log "运行 Claude CLI wiki ingest..."
    if bash "$WIKI_INGEST_RUNNER" "$TODAY" 2>&1 | tee -a "$LOG_FILE"; then
        log "Wiki ingest 完成"
    else
        log "WARNING: Wiki ingest 失败（不影响日报本身）"
    fi
fi

if [ "$SHOULD_RUN_FOLLOWING_AUDIT" = "true" ]; then
    log "后台启动 following 全量巡检..."
    (
        cd "$SCRIPT_DIR"
        PYTHONUNBUFFERED=1 python3 -u audit_following.py \
            --username 0xcybersmile \
            --full-scrape \
            --scroll-times 130 \
            --inactive-days 60 \
            --stale-days 120 \
            2>&1 | tee -a "$FOLLOWING_AUDIT_LOG_FILE"
    ) >/dev/null 2>&1 &
    log "following 巡检已后台启动，日志: $FOLLOWING_AUDIT_LOG_FILE"
else
    log "默认跳过 following 全量巡检；如需运行，请显式传入 --with-following-audit"
fi

log "========== 每日日程结束 =========="
