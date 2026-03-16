# Redbook 内容生产 Agent Team 设计

## Team 结构

### Team Lead
- **角色**：你（人类）
- **职责**：设定目标、优先级决策、最终审核
- **每日时间**：30 分钟（审阅 + 决策）

### Research Agent
- **类型**：general-purpose
- **目标**：每日产出 5 个高分选题（评分 > 7/10）
- **工作流**：
  1. 运行 daily_research（自动化）
  2. 使用 /x-collect 深挖热门话题
  3. Reddit 痛点挖掘（每周 2 次）
  4. 输出：选题评分表 + 推荐理由
- **KPI**：选题采纳率 > 60%

### Content Agent 1 & 2（并行）
- **类型**：general-purpose
- **目标**：每个 agent 每天产出 1 篇可发布文稿
- **工作流**：
  1. 从 Task list 领取已批准选题
  2. 检索素材库（复用优先）
  3. 使用 /x-create 生成文稿
  4. 生成标题（3 个选项）
  5. 输出：文稿 + 标题 + 封面建议
- **KPI**：文稿通过率 > 80%

### Publisher Agent
- **类型**：general-purpose
- **目标**：每日发布 2 篇（X.com + 小红书）
- **工作流**：
  1. 从 Task list 领取已审核文稿
  2. X.com: 使用 /baoyu-post-to-x 创建草稿
  3. 小红书: 使用 /baoyu-xhs-images 生成图文
  4. 记录发布链接和初始数据
  5. 输出：发布报告
- **KPI**：发布成功率 100%

### Analyst Agent
- **类型**：general-purpose
- **目标**：每周产出数据分析报告
- **工作流**：
  1. 分析上周所有内容数据
  2. 识别爆款共性（话题/风格/时间）
  3. 识别低效内容（砍掉）
  4. 更新方法论
  5. 输出：周报 + 优化建议
- **KPI**：优化建议采纳率 > 70%

---

## Task List 设计（目标驱动）

### 每日 Task 模板

```yaml
# 阶段 1：研究（Research Agent）
- [ ] 1.1 运行 daily_research（自动化）
- [ ] 1.2 深挖 3 个热门话题（/x-collect）
- [ ] 1.3 产出选题评分表（含推荐理由）

# 阶段 2：创作（Content Agent 1 & 2 并行）
- [ ] 2.1 深化选题 A（Content 1）| blockedBy: 1.3
- [ ] 2.2 深化选题 B（Content 2）| blockedBy: 1.3
- [ ] 2.3 生成标题 A（Content 1）| blockedBy: 2.1
- [ ] 2.4 生成标题 B（Content 2）| blockedBy: 2.2

# 阶段 3：发布（Publisher Agent 并行）
- [ ] 3.1 发布 A 到 X.com（Publisher）| blockedBy: 2.3
- [ ] 3.2 发布 A 到小红书（Publisher）| blockedBy: 2.3
- [ ] 3.3 发布 B 到 X.com（Publisher）| blockedBy: 2.4
- [ ] 3.4 发布 B 到小红书（Publisher）| blockedBy: 2.4

# 阶段 4：分析（每周五）
- [ ] 4.1 分析上周数据（Analyst）
- [ ] 4.2 产出周报（Analyst）| blockedBy: 4.1
```

---

## 优先级决策（德鲁克：做对的事 > 把事做对）

### 选题评分标准（10 分制）

| 维度 | 权重 | 评分标准 |
|------|------|---------|
| **热度/趋势** | 4 | X 讨论量 > 10k = 4 分 |
| **争议性** | 2 | 有明确对立观点 = 2 分 |
| **高价值** | 3 | 可收藏/实操性强 = 3 分 |
| **账号相关性** | 1 | 符合定位 = 1 分 |

**阈值**：评分 ≥ 7 分才进入创作池

### 砍掉标准（德鲁克：决定不做什么）

- ❌ 评分 < 7 的选题
- ❌ 过去 7 天内已发布的相似话题
- ❌ 研究超过 2 小时仍无清晰方向的选题
- ❌ 发布后 48 小时互动率 < 2% 的内容类型

---

## 反馈循环（持续改进）

### 每日反馈
- Research Agent → Content Agent: 选题质量反馈
- Content Agent → Publisher Agent: 文稿质量反馈
- Publisher Agent → You: 发布数据实时反馈

### 每周复盘（Analyst Agent）
1. **爆款分析**：
   - 共性提取（话题/风格/结构）
   - 更新爆款文稿库
2. **低效分析**：
   - 识别低互动内容类型
   - 更新「砍掉标准」
3. **流程优化**：
   - Agent 效率分析
   - 瓶颈识别 + 优化建议

### 每月复盘（You）
- OKR 达成率
- Agent KPI 回顾
- 下月目标调整

---

## 启动命令

### 创建 Team
```
创建内容生产团队
```

### 每日启动
```
启动每日内容生产流程
```

### 查看进度
```
查看团队任务进度
```

### 周报
```
生成本周数据分析报告
```
