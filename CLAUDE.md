# Redbook 内容生产系统

## 项目概述
这是一个系统化的内容生产工作流，用于管理多平台（小红书、抖音、X.com、公众号）的内容创作。

## 目录结构
```
01-内容生产/          # 内容生产流水线
  ├── 选题管理/       # 选题记录和管理
  ├── 01-待深化的选题/ # 已确定要做的选题
  ├── 02-制作中的选题/ # 正在制作的内容
  └── 03-已发布的选题/ # 已发布归档

02-内容素材库/        # 可复用素材
  ├── 核心概念库/     # 理论框架
  ├── 金句库/         # 高质量表达
  ├── 爆款文稿库/     # 已验证的内容
  └── 案例库/         # 案例素材

03-方法论沉淀/        # 数据驱动的方法论
04-内容数据统计/      # 发布数据记录
05-选题研究/          # 选题分析
06-业务运营/          # 商业数据
```

<!-- 内容领域见 .rules -->

## AI 工作流指令

### 「记录选题」
当用户说「记录选题」或提供一个想法时：
1. 将想法添加到 `01-内容生产/选题管理/00-选题记录.md` 的「待处理选题」部分
2. 格式：`- [ ] 选题想法 | 来源/灵感 | 日期`

### 「深化选题」
当用户说「深化选题 [选题名]」时：
1. **检索素材库**（关键步骤）
   - 搜索 `02-内容素材库/核心概念库/` 查找相关理论框架
   - 搜索 `02-内容素材库/金句库/` 查找高质量表达
   - 搜索 `01-内容生产/03-已发布的选题/` 查找相关文稿
2. **建议复用**：如果找到相关内容，先询问是否复用
3. **生成文稿**：基于素材库内容生成新文稿
4. **保存**：将文稿保存到 `01-内容生产/01-待深化的选题/`

### 「生成标题」
当用户说「生成标题」或「生成小红书标题」时：
1. 读取 `03-方法论沉淀/标题方法论.md` 获取标题公式
2. 基于当前文稿内容，生成 3 个标题选项
3. 说明每个标题的逻辑和预期效果
4. 同时提供封面文字建议

### 「优化开头」
当用户说「优化开头」时：
1. 读取 `03-方法论沉淀/短视频开头方法论.md`
2. 分析当前开头的问题
3. 提供 2-3 个优化版本
4. 说明每个版本的钩子类型

### 「检索素材」
当用户说「检索素材 [关键词]」时：
1. 搜索 `02-内容素材库/` 下所有子目录
2. 列出相关的概念、金句、案例
3. 建议如何在当前内容中使用

### 「发现创业机会」
当用户说「发现创业机会」或「分析 Reddit 讨论」时：
1. **选择目标社区**
   - 根据内容领域选择相关的 subreddit
   - 常见选择：r/SaaS, r/Entrepreneur, r/startups, r/webdev
2. **运行分析脚本**
   ```bash
   python tools/reddit_hack.py <reddit_url> [output_file]
   ```
3. **分析报告内容**
   - 统计摘要：痛点总数、高价值痛点数
   - Top 5 创业机会：点赞数 > 10 的痛点
   - 完整痛点列表：按点赞数排序
4. **评估机会**
   - 市场规模：有多少人有这个问题？
   - 支付意愿：用户愿意付费吗？
   - 竞争情况：现有解决方案如何？
   - 实现难度：能快速构建 MVP 吗？
5. **转化为选题**：如果发现有价值的痛点，使用「记录选题」保存

**详细工作流**：参考 `02-内容素材库/Reddit-JSON-Hack-工作流.md`

### 「记录数据」
当用户说「记录数据」并提供发布数据时：
1. 将数据添加到 `04-内容数据统计/数据统计表.md`
2. 如果是爆款，询问是否添加到爆款文稿库
3. 提醒更新方法论（如果有新发现）

### 「发布归档」
当用户说「发布归档 [文稿名]」时：
1. 将文稿从 `02-制作中的选题/` 移动到 `03-已发布的选题/`
2. 在文稿末尾添加发布信息（日期、平台）
3. 提醒记录数据

### 「生成小红书图文」
当用户说「生成小红书图文」或「制作小红书卡片」时：
1. **推荐方式**：调用 `/baoyu-xhs-images` skill
   - 支持 10 种视觉风格 x 8 种布局
   - 自动分析内容、生成大纲、渲染图片
2. **备选方式**：使用 agent-browser 本地渲染
   ```bash
   bash tools/auto-redbook/scripts/render_simple.sh [文件名] [输出目录]
   ```

### 「发布到小红书」
当用户说「发布到小红书」时：
1. **确认图片已生成**：检查是否有 cover.png 和卡片图片
2. **发布笔记**（使用 agent-browser）
   - 使用命令：`bash tools/auto-redbook/scripts/publish_xhs.sh "标题" "描述" cover.png card_1.png`
   - 脚本会自动加载登录状态并打开创作页面
   - 需要手动上传图片和点击发布
3. **记录数据**：发布后提醒用户记录数据到统计表

**注意**：首次使用需要先获取登录 cookies（已完成）

### 「发布到 X.com」
当用户说「发布到 X.com」或「发布推文」时：
1. **准备内容**：确认推文文本和图片（如有）
2. **使用 skill 发布**：调用 `/baoyu-post-to-x` skill
   - 支持文本、图片、视频、长文章
   - 自动通过 Chrome CDP 发布，无需手动操作
3. **记录数据**：发布后提醒用户记录数据到统计表

### 「搜索 X 话题」
当用户说「搜索 X 话题」或「研究 X 讨论」时：
1. **确定搜索关键词**：根据内容领域选择相关话题
2. **运行搜索脚本**
   ```bash
   python tools/auto-x/scripts/search_x.py "关键词" [输出文件]
   ```
3. **自动分析**
   - 脚本会自动提取推文数据（作者、内容、点赞、转发）
   - 按互动量排序，生成 Top 10 热门推文
   - 识别用户痛点（基于关键词匹配）
   - 生成结构化 Markdown 报告
4. **转化为选题**：如果发现有价值的话题，使用「记录选题」保存

**详细说明**：参考 `tools/auto-x/README.md`

### 「抓取 X 关注列表」
当用户说「抓取 X 关注列表」时：
1. **运行抓取脚本**
   ```bash
   python tools/auto-x/scripts/scrape_following.py [用户名] [滚动次数]
   ```
   - 默认用户名: 0xcybersmile
   - 默认滚动 5 次
2. **输出结果**
   - JSON 数据: `tools/auto-x/data/following.json`
   - Markdown 报告: `05-选题研究/X-关注列表-{用户名}-{日期}.md`
3. **后续操作**：可使用「分析 X 关注者」进一步分析

### 「分析 X 关注者」
当用户说「分析 X 关注者」时：
1. **运行分析脚本**
   ```bash
   python tools/auto-x/scripts/analyze_following.py [采样数量] [following.json路径]
   ```
   - 默认采样 10 个账号
   - 需要先运行「抓取 X 关注列表」生成 following.json
2. **分析内容**
   - 抓取每个关注者的最近推文
   - 关键词频率分析（AI、Crypto、创业、效率、编程）
   - 话题分类统计
3. **输出报告**: `05-选题研究/X-关注者话题分析-{日期}.md`

### 「X 热门趋势」
当用户说「X 热门趋势」时：
1. **运行趋势抓取脚本**
   ```bash
   python tools/auto-x/scripts/trending_topics.py [Top N]
   ```
   - 默认获取 Top 5 趋势话题的讨论
2. **分析内容**
   - 抓取 X.com Explore/Trending 页面
   - 提取趋势话题名称、分类、讨论量
   - 对 Top N 话题获取代表性推文
3. **输出报告**: `05-选题研究/X-每日热点-{日期}.md`

### 「X 每日研究」
当用户说「X 每日研究」时：
1. **运行每日研究主流程**
   ```bash
   python tools/auto-x/scripts/daily_research.py [--skip-trending] [--skip-search] [--skip-following] [--keywords KW1 KW2]
   ```
   - 默认搜索关键词: AI tools, solopreneur, crypto alpha
2. **执行步骤**
   - Step 1: 抓取热门趋势
   - Step 2: 搜索领域关键词
   - Step 3: 分析关注者动态（需要 following.json）
3. **输出结果**
   - 综合报告: `05-选题研究/X-每日研究-{日期}.md`
   - 存档: `tools/auto-x/data/daily/{日期}.md`
   - 自动追加选题到 `01-内容生产/选题管理/00-选题记录.md`

**前置条件**：需要启动 Chrome 调试模式并连接 agent-browser：
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.local/share/chrome-debug-profile" \
  --no-first-run &
agent-browser connect 9222
```

<!-- 写作风格、核心提醒、Git 规范、可用 Skills 见 .rules -->

## 工具配置

### 小红书自动发布工具
位置：`tools/auto-redbook/`

**首次使用需要配置**：
1. 安装 Python 依赖：`pip install -r tools/auto-redbook/requirements.txt`
2. 启动 Chrome 调试模式并连接 agent-browser（参考上方前置条件）
3. 配置小红书 Cookie（可选，仅发布功能需要）：
   - 在 `tools/auto-redbook/` 目录创建 `.env` 文件
   - 添加：`XHS_COOKIE=your_cookie_here`
   - Cookie 获取：登录小红书网页版，F12 查看请求头

**常用命令**：
```bash
# 生成图文卡片（agent-browser 方式）
bash tools/auto-redbook/scripts/render_simple.sh content.md output/

# 发布到小红书
python tools/auto-redbook/scripts/publish_xhs.py --title "标题" --desc "描述" --images cover.png card_1.png
```
