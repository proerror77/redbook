#!/bin/bash

# X/Twitter 自动发布脚本
# 使用 agent-browser 打开 X.com 并辅助发布推文

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查参数
if [ $# -lt 1 ]; then
    echo -e "${RED}用法: $0 <推文内容> [图片1] [图片2] ...${NC}"
    echo "示例: $0 \"这是一条推文\" image1.png image2.png"
    exit 1
fi

TWEET_CONTENT="$1"
shift
IMAGES=("$@")

echo -e "${GREEN}=== X/Twitter 发布助手 ===${NC}"
echo -e "推文内容: ${YELLOW}${TWEET_CONTENT}${NC}"
echo -e "图片数量: ${YELLOW}${#IMAGES[@]}${NC}"

# 检查图片文件是否存在
for img in "${IMAGES[@]}"; do
    if [ ! -f "$img" ]; then
        echo -e "${RED}错误: 图片文件不存在: $img${NC}"
        exit 1
    fi
    echo -e "  - $img"
done

echo ""
echo -e "${YELLOW}正在打开 X.com...${NC}"

# 打开 X.com 创作页面
agent-browser open "https://x.com/compose/post"

echo ""
echo -e "${GREEN}浏览器已打开！${NC}"
echo ""
echo -e "${YELLOW}请手动完成以下步骤：${NC}"
echo "1. 如果未登录，请先登录 X.com"
echo "2. 在推文输入框中粘贴内容："
echo -e "   ${YELLOW}${TWEET_CONTENT}${NC}"
echo "3. 如果有图片，点击图片按钮上传："
for img in "${IMAGES[@]}"; do
    echo "   - $(basename "$img")"
done
echo "4. 检查预览效果"
echo "5. 点击「发布」按钮"
echo ""
echo -e "${GREEN}提示：${NC}推文内容已复制到剪贴板（如果支持）"

# 尝试复制到剪贴板（macOS）
if command -v pbcopy &> /dev/null; then
    echo "$TWEET_CONTENT" | pbcopy
    echo -e "${GREEN}✓ 内容已复制到剪贴板${NC}"
fi

echo ""
echo -e "${YELLOW}完成后按 Ctrl+C 退出${NC}"

# 保持浏览器打开
read -r -d '' _ </dev/tty
