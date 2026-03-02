# Hacker News 监控使用指南

## 功能概述

监控 Hacker News 首页热门帖子，自动分析技术趋势、创业机会、痛点讨论，生成结构化报告。

## 核心优势

### 1. 无需浏览器
- 使用 HN Official API，无需 actionbook/浏览器
- 可独立运行，不依赖 X.com 研究工具
- 更稳定、更快速

### 2. 深度分析
- **技术趋势**: 自动分类 AI/ML、Crypto/Web3、Dev Tools、Startup
- **创业机会**: 识别 Show HN（产品展示）、Ask HN（问题讨论）
- **痛点挖掘**: 提取 Top 评论，发现用户真实需求
- **热度评估**: 点赞数、评论数、互动深度

### 3. 自动集成
- 集成到每日自动化入口（`bash tools/daily.sh`）
- 作为「每日研究」中的一部分写入 `05-选题研究/X-每日日程-{日期}.md`

## 快速开始

### 独立运行

```bash
# 基础用法（默认 30 条）
python3 tools/auto-x/scripts/scrape_hackernews.py

# 指定帖子数量
python3 tools/auto-x/scripts/scrape_hackernews.py --limit 50

# 指定每个帖子的评论数
python3 tools/auto-x/scripts/scrape_hackernews.py --comments 5

# 自定义输出路径
python3 tools/auto-x/scripts/scrape_hackernews.py --output my_report.md
```

### 集成到每日自动化（推荐）

```bash
# 完整研究（包含 HN）
bash tools/daily.sh

# 仅运行 HN（跳过 X.com + Reddit）
bash tools/daily.sh \
  --skip-timeline --skip-trending --skip-search --skip-following --skip-reddit

# 自定义 HN 帖子数量
bash tools/daily.sh --hn-limit 50

# 跳过 HN
bash tools/daily.sh --skip-hn
```

## 参数说明

### scrape_hackernews.py

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--limit` | 抓取帖子数量 | 30 |
| `--comments` | 每个帖子的评论数 | 3 |
| `--output` | 输出文件路径 | `05-选题研究/HN-每日热点-{日期}.md` |

### tools/daily.sh（内部调用 daily_schedule.py）

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--skip-hn` | 跳过 HN 分析 | False（默认运行）|
| `--hn-limit` | HN 帖子数量 | 30 |

## 报告内容

### 1. 统计摘要
- 总帖子数
- 高互动帖子（评论 > 50）
- Show HN / Ask HN 数量
- AI/ML 相关帖子数

### 2. 类别分布
自动分类：
- **Show HN**: 产品/项目展示
- **Ask HN**: 问题讨论
- **Tell HN**: 分享
- **AI/ML**: AI/GPT/LLM 相关
- **Crypto/Web3**: 区块链相关
- **Startup**: 创业/融资相关
- **Dev Tools**: 开发工具
- **Other**: 其他

### 3. 高互动帖子（深度讨论）
- 评论数 > 50 的帖子
- 提供原文链接 + 讨论链接
- 展示 Top 2 评论摘要

### 4. Show HN（创业项目）
- 展示产品/项目
- 适合发现新工具、新创意
- 评估市场反馈

### 5. Ask HN（热门问题）
- 用户提问和讨论
- 识别痛点和需求
- 提供代表性回答

### 6. AI/ML 技术趋势
- AI 相关技术讨论
- 新模型、新工具发布
- 行业趋势观察

## 使用场景

### 1. 选题发现
- 从高互动帖子中找热点话题
- 从 Ask HN 中发现用户痛点
- 从 Show HN 中学习产品创意

### 2. 技术趋势
- 跟踪 AI/ML 最新进展
- 发现新兴技术方向
- 了解开发者关注点

### 3. 创业灵感
- Show HN 产品分析
- 评论区需求挖掘
- 市场反馈评估

## 工作流集成

### 每日研究流程

```
HN 分析（无需浏览器）
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

### 优点

1. **并行运行**: HN 不依赖浏览器，可先执行
2. **互补性强**: HN 偏技术/创业，X.com 偏社交/热点
3. **选题更全**: 技术 + 社交 双重覆盖

## 注意事项

### 1. API 限制
- HN API 无官方限制，但建议合理使用
- 默认 30 条已足够日常监控

### 2. 评论解析
- 评论是 HTML 格式，已自动清理标签
- 长评论会截断（保留前 200/300 字符）

### 3. 时区
- HN 时间戳是 UTC，报告中会显示原始时间戳
- 日期使用本地时区（中国：UTC+8）

## 示例报告

```markdown
# Hacker News 每日热点 - 2026-02-14

- 生成时间: 2026-02-14 10:30:15
- 分析帖子数: 30 条

---

## 📊 统计摘要

- **总帖子数**: 30 条
- **高互动帖子**: 8 条（评论 > 50）
- **Show HN**: 3 条
- **Ask HN**: 2 条
- **AI/ML 相关**: 5 条

---

## 🏷 类别分布

- **AI/ML**: 5 条
- **Dev Tools**: 8 条
- **Startup**: 3 条
- **Show HN**: 3 条
- **Ask HN**: 2 条
- **Other**: 9 条

---

## 🔥 高互动帖子（深度讨论）

### 1. Claude 4.5 Extended Thinking is now available

- **作者**: anthropic_user
- **点赞**: 456 | **评论**: 128
- **类别**: AI/ML
- **链接**: https://www.anthropic.com/...
- **讨论**: https://news.ycombinator.com/item?id=...

**热门评论**:

1. @user1: This is a game changer for reasoning tasks...

2. @user2: Tested it on complex math problems, accuracy improved significantly...

---
```

## 下一步

1. **测试运行**: `python3 tools/auto-x/scripts/scrape_hackernews.py`
2. **集成每日**: 添加到 `daily_research.py` 默认流程
3. **定时任务**: 配置 launchd 每日自动运行

## 常见问题

**Q: HN API 会不会被限制？**
A: HN API 无官方限制，但建议每次不超过 50 条帖子。

**Q: 为什么不用网页抓取？**
A: API 更稳定、数据结构化，无需维护解析逻辑。

**Q: 能否抓取特定时间段的帖子？**
A: 当前版本仅支持实时 Top Stories，历史数据需要使用 HN Algolia API。

**Q: 评论数量能否增加？**
A: 可通过 `--comments` 参数调整，但会增加 API 请求次数，建议 3-5 条。
