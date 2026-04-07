#!/bin/bash
# Redbook Session Init
# 每次会话开始时运行，快速建立上下文

echo "=== Redbook Session Init ==="
echo "日期: $(date '+%Y-%m-%d %H:%M')"
echo ""

echo "--- 最新研究报告 ---"
ls -t 05-选题研究/ 2>/dev/null | head -5

echo ""
echo "--- 制作中的选题 ---"
ls "01-内容生产/02-制作中的选题/" 2>/dev/null || echo "(空)"

echo ""
echo "--- 待处理任务 ---"
grep -n '\[ \]' 任务清单.md 2>/dev/null | head -8 || echo "(无待处理)"

echo ""
echo "--- Wiki 最近更新 ---"
tail -5 wiki/log.md 2>/dev/null || echo "(无记录)"

echo ""
echo "=== Init 完成，可以开始工作 ==="
