# Research Agent 每日工作流（改进版）

## 优先级排序（德鲁克：有效性优先）

### 🥇 Priority 1: Timeline 分析（最重要）
**目标**：发现你的 following 今天在讨论什么

**步骤**：
1. **打开 Timeline**（Home feed）
2. **滚动 20-30 屏**（约 30 次滚动）
3. **提取关键信息**：
   - 高互动推文（❤️ > 50 或 🔁 > 10）
   - 重复出现的话题（≥ 3 人讨论）
   - 有争议的观点（评论 > 点赞）
4. **输出**：Timeline 热点清单

**工具**：
```bash
# 使用 actionbook 抓取 Timeline（默认 30 次滚动）
python3 tools/auto-x/scripts/scrape_timeline.py
```

**产出**：`05-选题研究/X-Timeline-{日期}.md`

---

### 🥈 Priority 2: Following 最新推文分析
**目标**：深入分析关注者的最新内容

**步骤**：
1. **从 following.json 中采样 20 个账号**（高质量 + 活跃）
2. **抓取每个账号的最近 5 条推文**
3. **话题聚类**：
   - 识别共同讨论的话题
   - 提取关键词频率
   - 发现新兴趋势
4. **输出**：话题聚类报告

**工具**：
```bash
# 已有工具，但需要增强
python3 tools/auto-x/scripts/analyze_following.py --sample 20 --recent
```

**产出**：`05-选题研究/X-关注者话题分析-{日期}.md`

---

### 🥉 Priority 3: Trending 参考
**目标**：全网热点作为补充

**步骤**：
1. 抓取 Trending 话题
2. 筛选与账号定位相关的话题
3. 交叉验证（是否在 Timeline 中也有讨论）

**工具**：
```bash
python3 tools/auto-x/scripts/trending_topics.py
```

---

### 🏅 Priority 4: 关键词搜索
**目标**：特定领域的深度挖掘

**步骤**：
1. 搜索预设关键词（AI tools, solopreneur, crypto alpha）
2. 按互动量排序
3. 提取高价值推文

**工具**：
```bash
python3 tools/auto-x/scripts/search_x.py "AI tools"
```

---

## 综合输出

### 每日选题报告格式

```markdown
# X.com 每日研究 - {日期}

## 🔥 Timeline 热点（Priority 1）

### 热点 1: {话题名称}
- **热度**：5 人讨论，总互动 500+
- **代表推文**：
  - @user1: 内容摘要（❤️ 120, 🔁 30）
  - @user2: 内容摘要（❤️ 80, 🔁  20）
- **痛点/争议点**：XXX
- **选题建议**：✅ 推荐（评分 8/10）

### 热点 2: ...

---

## 📊 Following 话题聚类（Priority 2）

### 话题 A: {话题名称}
- **讨论人数**：8 人
- **关键词**：XXX, YYY, ZZZ
- **代表观点**：
  - 观点 1（支持 60%）
  - 观点 2（反对 40%）
- **选题建议**：✅ 推荐（评分 7/10）

---

## 🌐 Trending 参考（Priority 3）
（仅列出与账号定位相关的话题）

---

## 🔍 关键词深挖（Priority 4）
（按需执行，不是每日必做）

---

## 📋 今日推荐选题（Top 5）

1. **{选题名}**（评分 9/10）
   - 来源：Timeline 热点 1
   - 推荐理由：XXX
   - 预期效果：高互动

2. ...
```

---

## 实现路径

### 立即可做（使用现有工具）

**方案 A**：手动查看 Timeline（暂时）
1. 你每天花 5 分钟浏览 Timeline
2. 截图或记录 3-5 个热门话题
3. 发给我，我帮你分析

**方案 B**：增强 daily_research.py
1. 在 `daily_research.py` 开头增加 Timeline 抓取
2. 调整优先级顺序
3. 输出格式改为上述结构

### 需要开发（可选）

**新脚本**：`scrape_timeline.py`
- 功能：抓取 Timeline 前 N 条推文
- 输入：滚动次数（默认 3 次）
- 输出：推文列表 + 热点识别

**actionbook 命令**：
```bash
# 打开 Timeline
actionbook browser open "https://x.com/home"

# 滚动 3 次
actionbook browser eval "window.scrollBy(0, 800)"
actionbook browser eval "window.scrollBy(0, 800)"
actionbook browser eval "window.scrollBy(0, 800)"

# 抓取快照
actionbook browser snapshot
```

---

## 下一步行动

### Option 1: 立即改进（推荐）
我帮你：
1. 更新 `daily_research.py`，增加 Timeline 优先级
2. 调整输出格式
3. 明天 7:00 AM 自动运行新版本

### Option 2: 手动 + 自动结合
- 你每天早上花 5 分钟看 Timeline（截图）
- 我分析截图 + 运行 daily_research
- 综合产出选题建议

### Option 3: 开发新功能
- 我写 `scrape_timeline.py` 脚本
- 完全自动化 Timeline 分析
- 需要 1-2 小时开发 + 测试

---

你想选哪个？或者有其他想法？
