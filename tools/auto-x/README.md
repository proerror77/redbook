# X/Twitter 自动化工具

基于 actionbook（Chrome CDP）的 X/Twitter 研究与数据分析工具集。

## Browser Mode Position

- Standard: [docs/standards/browser-modes.md](/Users/proerror/Documents/redbook/docs/standards/browser-modes.md)
- Current status: legacy / compatibility path
- `actionbook` / `agent-browser` / `agent-browser-session` are historical browser stacks retained for compatibility. They are no longer the recommended foundation for new browser-facing work in this repo.

## 推荐入口（唯一正确路径）

定时/手动都使用同一个入口：
```bash
bash tools/daily.sh
```

- 输出：`05-选题研究/X-每日日程-{日期}.md`
- 推荐选题只保存在日报内；用户或 agent 明确选中后再写入 `01-内容生产/选题管理/00-选题记录.md`

其余脚本主要作为内部模块或调试工具，不建议作为日常入口。

## 功能

### 1. 发布推文
使用 `publish_x.sh` 辅助发布推文到 X.com

### 2. 内容搜索与分析
使用 `search_x.py` 搜索热门话题，自动提取推文数据，识别用户痛点

### 3. 关注列表抓取
使用 `scrape_following.py` 抓取关注列表，输出 JSON + Markdown 报告

### 4. 关注者话题分析
使用 `analyze_following.py` 分析关注者的推文话题，发现热门方向

### 5. 热门趋势抓取
使用 `trending_topics.py` 抓取 X.com Explore 页面的趋势话题

### 6. 每日研究主流程
使用 `daily_research.py` 一键执行所有研究任务，生成综合报告

## 安装

确保已安装 actionbook：
```bash
# 检查是否已安装
actionbook --version
```

**前置条件**：使用前需要启动 Chrome 调试模式并连接 actionbook：
```bash
# 1. 启动 Chrome
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.local/share/chrome-debug-profile" \
  --no-first-run &

# 2. 连接 actionbook
actionbook browser connect 9222
```

## 使用方法

### 发布推文

```bash
bash tools/auto-x/scripts/publish_x.sh "推文内容" [图片1] [图片2]
```

示例：
```bash
# 纯文本推文
bash tools/auto-x/scripts/publish_x.sh "这是一条测试推文"

# 带图片的推文
bash tools/auto-x/scripts/publish_x.sh "分享一些图片" image1.png image2.png
```

脚本会：
1. 自动打开 X.com 创作页面
2. 将推文内容复制到剪贴板
3. 提示你手动完成发布步骤

### 搜索话题

```bash
python tools/auto-x/scripts/search_x.py "搜索关键词" [输出文件]
```

示例：
```bash
# 搜索 AI 工具相关话题（自动提取数据并生成报告）
python tools/auto-x/scripts/search_x.py "AI tools"

# 搜索并保存到指定文件
python tools/auto-x/scripts/search_x.py "productivity" results.md
```

脚本会自动：
1. 打开搜索页面并滚动收集数据
2. 提取推文（作者、内容、点赞、转发）
3. 识别用户痛点
4. 生成结构化 Markdown 报告

### 抓取关注列表

```bash
python tools/auto-x/scripts/scrape_following.py [用户名] [滚动次数]
```

示例：
```bash
# 抓取默认用户 (0xcybersmile) 的关注列表
python tools/auto-x/scripts/scrape_following.py

# 抓取指定用户，滚动 10 次
python tools/auto-x/scripts/scrape_following.py elonmusk 10
```

输出：
- `tools/auto-x/data/following.json` - 结构化数据
- `05-选题研究/X-关注列表-{用户名}-{日期}.md` - Markdown 报告

### 分析关注者话题

```bash
python tools/auto-x/scripts/analyze_following.py [采样数量] [following.json路径]
```

示例：
```bash
# 分析前 10 个关注者
python tools/auto-x/scripts/analyze_following.py

# 分析前 20 个关注者
python tools/auto-x/scripts/analyze_following.py 20
```

需要先运行 `scrape_following.py` 生成 `following.json`。

### 热门趋势

```bash
python tools/auto-x/scripts/trending_topics.py [Top N]
```

示例：
```bash
# 获取 Top 5 趋势话题
python tools/auto-x/scripts/trending_topics.py

# 获取 Top 10
python tools/auto-x/scripts/trending_topics.py 10
```

### 每日研究（一键执行）

```bash
python tools/auto-x/scripts/daily_research.py [选项]
```

选项：
- `--skip-trending` - 跳过热门趋势
- `--skip-search` - 跳过关键词搜索
- `--skip-following` - 跳过关注者分析
- `--keywords KW1 KW2` - 自定义搜索关键词

示例：
```bash
# 完整每日研究
python tools/auto-x/scripts/daily_research.py

# 只做趋势和搜索，跳过关注者分析
python tools/auto-x/scripts/daily_research.py --skip-following

# 自定义关键词
python tools/auto-x/scripts/daily_research.py --keywords "AI agent" "web3"
```

## 工作流集成

### 发布流程
1. 准备好推文内容和图片
2. 运行发布脚本
3. 在浏览器中完成发布
4. 记录数据到统计表

### 内容研究流程
1. 运行每日自动化入口: `bash tools/daily.sh`
2. 查看生成的报告: `05-选题研究/X-每日日程-{日期}.md`
3. 筛选有价值的选题
4. 使用「记录选题」保存灵感

## 注意事项

- 首次使用需要在浏览器中登录 X.com
- actionbook 会复用本地 Chrome profile 保存登录状态
- 推文内容会自动复制到剪贴板（macOS）
- 图片需要手动上传
- 所有研究脚本的数据提取依赖 actionbook snapshot 的 accessibility tree 解析，实际效果可能因页面结构变化而需要调整

## 与其他工具对比

- **baoyu-post-to-x**: API 方式，更自动化但需要配置
- **auto-x**: 浏览器方式，更灵活但需要手动操作

## 文件结构

```
tools/auto-x/
├── scripts/
│   ├── x_utils.py            # 共享工具模块
│   ├── publish_x.sh          # 发布推文
│   ├── search_x.py           # 搜索话题 + 数据提取
│   ├── scrape_following.py   # 抓取关注列表
│   ├── analyze_following.py  # 分析关注者话题
│   ├── trending_topics.py    # 热门趋势抓取
│   └── daily_research.py     # 每日研究主流程
├── data/
│   ├── following.json        # 关注列表缓存
│   └── daily/                # 每日报告存档
├── templates/
└── README.md
```
