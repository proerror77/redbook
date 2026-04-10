#!/bin/bash

LOG_FILE=$(ls -t /tmp/boss-apply-*.log 2>/dev/null | head -1)

if [ -z "$LOG_FILE" ]; then
  echo "❌ 未找到投递日志文件"
  exit 1
fi

echo "📊 BOSS直聘投递进度"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 日志文件: $LOG_FILE"
echo ""

SUCCESS_COUNT=$(grep -c '"message":"apply_success"' "$LOG_FILE")
SKIP_COUNT=$(grep -c '"message":"apply_skip"' "$LOG_FILE")
FAIL_COUNT=$(grep -c '"message":"apply_failed"' "$LOG_FILE")
SEARCH_COUNT=$(grep -c '"message":"search_done"' "$LOG_FILE")

echo "✅ 成功投递: $SUCCESS_COUNT"
echo "⏭️  跳过: $SKIP_COUNT"
echo "❌ 失败: $FAIL_COUNT"
echo "🔍 搜索完成: $SEARCH_COUNT 次"
echo ""

# 最近5条成功投递
echo "📝 最近成功投递:"
grep '"message":"apply_success"' "$LOG_FILE" | tail -5 | while read line; do
  COMPANY=$(echo "$line" | grep -o '"company":"[^"]*"' | cut -d'"' -f4)
  TITLE=$(echo "$line" | grep -o '"title":"[^"]*"' | cut -d'"' -f4)
  echo "  • $COMPANY - $TITLE"
done

echo ""
echo "⏱️  最后更新: $(date)"
