# Reddit 监控使用指南

## 功能概述

监控多个 subreddits 的热门帖子，自动分析创业机会、用户痛点、技术趋势，生成结构化报告。

## 核心优势

### 1. 无需浏览器
- 使用 Reddit JSON API，无需 actionbook/浏览器
- 可独立运行，不依赖 X.com 研究工具
- 更稳定、更快速

### 2. 痛点挖掘专家
- **自动识别痛点关键词**: wish, need, problem, frustrating, difficult...
- **高价值问题过滤**: Question/Help 类型自动标注痛点 🔴
- **社区验证**: 点赞数和评论数反映真实需求强度
- **Show/Launch 项目**: 发现新产品和创业灵感

### 3. 自动分类
- **AI/ML**: AI、GPT、LLM、机器学习相关
- **SaaS/Startup**: 产品、MVP、创业、发布
- **Development**: 编程、框架、库、工具
- **Marketing/Growth**: 营销、增长、SEO、流量
- **Question/Help**: 用户问题和痛点（重点关注）
- **Show/Launch**: 产品展示和发布（创业机会）

### 4. 自动集成
- 集成到每日自动化入口（`bash tools/daily.sh`）
- 作为「每日研究」中的一部分写入 `05-选题研究/X-每日日程-{日期}.md`

## 快速开始

### 独立运行

```bash
# 基础用法（默认监控 SaaS, Entrepreneur, startups, webdev）
python3 tools/auto-x/scripts/scrape_reddit.py

# 自定义 subreddits
python3 tools/auto-x/scripts/scrape_reddit.py --subreddits SaaS Entrepreneur startups

# 指定每个 subreddit 的帖子数量
python3 tools/auto-x/scripts/scrape_reddit.py --limit 50

# 自定义输出路径
python3 tools/auto-x/scripts/scrape_reddit.py --output my_report.md
```

### 集成到每日自动化（推荐）

```bash
# 完整研究（包含 Reddit）
bash tools/daily.sh

# 仅运行 Reddit（跳过 X.com 分析）
bash tools/daily.sh \
  --skip-timeline --skip-trending --skip-search --skip-following --skip-hn

# 自定义监控的 subreddits
bash tools/daily.sh \
  --subreddits SaaS Entrepreneur startups webdev MachineLearning

# 跳过 Reddit
bash tools/daily.sh --skip-reddit
```

## 参数说明

### scrape_reddit.py

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--subreddits` | 监控的 subreddit 列表 | `SaaS Entrepreneur startups webdev` |
| `--limit` | 每个 subreddit 的帖子数量 | 25 |
| `--output` | 输出文件路径 | `05-选题研究/Reddit-每日监控-{日期}.md` |

### tools/daily.sh（内部调用 daily_schedule.py）

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--skip-reddit` | 跳过 Reddit 监控 | False（默认运行）|
| `--reddit-limit` | 每个 subreddit 帖子数量 | 25 |
| `--subreddits` | 监控的 subreddits | `SaaS Entrepreneur startups webdev` |

## 报告内容

### 1. 统计摘要
- 总帖子数
- 高互动帖子（评论 > 50 或点赞 > 100）
- Show/Launch 数量（创业项目）
- Question/Help 数量（用户痛点）
- AI/ML 相关帖子数

### 2. Subreddit 分布
监控覆盖的社区分布统计

### 3. 类别分布
自动分类统计：
- **AI/ML**: AI/GPT/LLM 相关
- **SaaS/Startup**: 产品/创业相关
- **Development**: 开发工具和技术
- **Marketing/Growth**: 营销增长
- **Question/Help**: 问题求助（痛点挖掘）
- **Show/Launch**: 产品展示（创业灵感）
- **Other**: 其他

### 4. 高互动帖子（深度讨论）
- 评论数 > 50 或点赞 > 100
- 提供帖子链接 + 内容摘要
- 显示标签（flair）

### 5. Show/Launch（创业项目）
- 产品展示和发布
- 适合学习产品创意
- 观察市场反馈

### 6. Question/Help（用户痛点）
- **🔴 痛点标注**: 自动识别包含痛点关键词的问题
- 按点赞数排序
- 显示问题描述
- 适合发现真实需求

### 7. AI/ML 技术趋势
- AI 相关讨论
- 新工具、新技术
- 行业观察

## 推荐监控的 Subreddits

### 创业/商业类
- **r/SaaS**: SaaS 产品讨论（痛点丰富）
- **r/Entrepreneur**: 创业经验分享
- **r/startups**: 创业公司讨论
- **r/SideProject**: 副业项目展示

### 技术类
- **r/webdev**: Web 开发
- **r/programming**: 编程通用
- **r/MachineLearning**: 机器学习
- **r/artificial**: AI 讨论
- **r/learnprogramming**: 编程学习（痛点多）

### 营销类
- **r/marketing**: 营销讨论
- **r/GrowthHacking**: 增长黑客
- **r/SEO**: SEO 讨论

## 使用场景

### 1. 痛点挖掘
- 从 Question/Help 中找用户痛点
- 🔴 痛点标注自动识别高价值问题
- 评论数反映问题普遍性

### 2. 创业灵感
- Show/Launch 产品案例学习
- 社区反馈评估市场
- 发现未被满足的需求

### 3. 技术趋势
- AI/ML 最新讨论
- 开发工具和框架热度
- 技术痛点和解决方案

### 4. 内容选题
- 高互动帖子 = 热点话题
- Question 类型适合写教程
- Show 类型适合写评测

## 工作流集成

### 每日研究流程

```
HN 分析（技术深度）
    ↓
Reddit 监控（痛点挖掘）
    ↓
X Pro 多列分析
    ↓
X 热门趋势
    ↓
关键词搜索
    ↓
关注者分析
    ↓
汇总报告 + 选题建议
```

### 三大平台对比

| 平台 | 特点 | 适合发现 | 用户群体 |
|------|------|----------|----------|
| **HN** | 技术深度、创业视角 | 技术趋势、开发者痛点 | 硅谷技术圈 |
| **Reddit** | 社区讨论、痛点丰富 | 用户需求、产品创意 | 全球创业者/开发者 |
| **X.com** | 实时热点、社交属性 | 社会话题、快速响应 | 中英双语社交 |

## 痛点识别逻辑

### 关键词列表
```python
pain_keywords = [
    'wish', 'need', 'want', 'problem', 'issue', 'frustrating',
    'annoying', 'difficult', 'hard', 'impossible', 'missing',
    'lacking', 'should have', 'would be nice', 'hate',
    'struggle', 'challenging', 'pain', 'bottleneck',
]
```

### 识别规则
1. 标题或正文包含痛点关键词
2. 标注 🔴 痛点标记
3. 优先显示高点赞问题

## 注意事项

### 1. API 限制
- Reddit JSON API 无官方限制，但建议合理使用
- 默认每个 subreddit 25 条已足够
- 避免频繁请求同一 URL

### 2. 数据格式
- 使用 `.json` 后缀获取 JSON 数据
- 自动添加 User-Agent 避免被限制

### 3. 内容过滤
- 评论太短（< 20 字符）会被过滤
- 正文和评论限制长度避免报告过长

### 4. 时区
- Reddit 时间戳是 UTC
- 报告中显示本地转换后的时间

## 示例报告

```markdown
# Reddit 每日监控 - 2026-02-15

- 生成时间: 2026-02-15 09:08:54
- 监控帖子数: 100 条

---

## 📊 统计摘要

- **总帖子数**: 100 条
- **高互动帖子**: 15 条
- **Show/Launch**: 3 条
- **Question/Help**: 22 条
- **AI/ML 相关**: 8 条

---

## ❓ Question/Help（用户痛点）

### Drop your SaaS, I'll give you marketing advice, for free. 🔴 痛点

- **来源**: r/SaaS
- **链接**: https://www.reddit.com/...
- **点赞**: 89 | **评论**: 513

**问题描述**: Most SaaS founders struggle with marketing...

---
```

## 现有工具整合

### reddit_hack.py（单帖子分析）
- 功能：深度分析单个帖子的所有评论
- 用法：`python tools/reddit_hack.py <post_url>`
- 适合：已发现目标帖子，需要深入挖掘

### scrape_reddit.py（热门监控）
- 功能：批量监控多个 subreddits
- 用法：`python tools/auto-x/scripts/scrape_reddit.py`
- 适合：每日自动发现热门话题

## 下一步

1. **测试运行**: `python3 tools/auto-x/scripts/scrape_reddit.py`
2. **集成每日**: 添加到 `daily_research.py` 默认流程
3. **定时任务**: 配置 launchd 每日自动运行

## 常见问题

**Q: Reddit API 需要认证吗？**
A: 不需要。使用 JSON API（添加 `.json` 后缀）无需认证。

**Q: 为什么不用 PRAW 库？**
A: JSON API 更简单、无需配置、无认证限制。PRAW 适合复杂操作。

**Q: 痛点识别准确吗？**
A: 基于关键词匹配，准确率约 70-80%。需人工筛选最终价值。

**Q: 能否监控中文 subreddits？**
A: 可以，但 Reddit 中文社区较小，建议以英文社区为主。

**Q: 评论数据能否获取？**
A: 当前版本仅获取 top comments。深度分析用 `reddit_hack.py`。
