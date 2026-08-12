#!/bin/bash
# BOSS 求职引擎 supervisor：常驻 gate 服务器 + 消息分拣 + 日报
# 仅工作日运行，投递时段由 gate server 内部控制
# 由 launchd StartInterval 900（每 15 分钟）调用
cd "$(dirname "$0")/.."

LOG_FILE="logs/supervisor_$(date +%Y-%m-%d).log"
mkdir -p logs

# 1. 启动 gate 服务器（若未运行）
if ! pgrep -f "userscript_gate_server.js" >/dev/null; then
  nohup node scripts/userscript_gate_server.js >> "$LOG_FILE" 2>&1 &
  echo "[$(date)] gate server started (pid $!)" >> "$LOG_FILE"
fi

# 2. 消息分拣轮询（每 15 分钟一次，由 launchd StartInterval 控制）
#    chat_monitor_feishu.js 由 Task 5/4 提供，若存在则执行
if [ -f scripts/chat_monitor_feishu.js ]; then
  node scripts/chat_monitor_feishu.js --once >> "$LOG_FILE" 2>&1
fi

# 3. 日报 day-change guard
#    launchd plist 只有 StartInterval 900（无日历任务），因此由此处守卫实现"每日最多一次"。
#    标记文件 logs/last_daily_report_date 存储上次运行日期（YYYY-MM-DD）。
#    缺失时视作"今天已运行"并写入今日日期（即首次运行即触发一次，随后跳过直到次日）。
MARKER="logs/last_daily_report_date"
TODAY="$(date +%Y-%m-%d)"
if [ ! -f "$MARKER" ]; then
  # 初始化：写入今日，本次触发一次日报
  echo "$TODAY" > "$MARKER"
  LAST_DATE=""
else
  LAST_DATE="$(cat "$MARKER")"
fi

if [ "$LAST_DATE" != "$TODAY" ]; then
  echo "[$(date)] running daily report for $TODAY" >> "$LOG_FILE"
  node scripts/daily_report_feishu.js >> "$LOG_FILE" 2>&1
  echo "$TODAY" > "$MARKER"
  echo "[$(date)] daily report done" >> "$LOG_FILE"
fi
