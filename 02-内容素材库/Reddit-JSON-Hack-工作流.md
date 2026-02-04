# Reddit JSON Hack - 发现创业机会工作流

## 方法概述

Reddit JSON Hack 是一种通过分析 Reddit 讨论来发现创业机会的方法。核心思路是：
1. 找到目标用户聚集的 Reddit 社区
2. 分析热门讨论中的用户痛点
3. 识别高价值的创业机会

## 为什么有效？

- **真实需求**：Reddit 用户会直接表达他们的问题和需求
- **社区验证**：点赞数反映了痛点的普遍性
- **细分市场**：不同 subreddit 代表不同的细分市场
- **早期信号**：可以发现还未被满足的需求

## 使用步骤

### 1. 找到相关的 Reddit 讨论

根据你的目标领域，找到相关的 subreddit 和热门帖子：

**常见 subreddit：**
- r/SaaS - SaaS 产品讨论
- r/Entrepreneur - 创业者社区
- r/startups - 创业公司
- r/smallbusiness - 小企业主
- r/freelance - 自由职业者
- r/webdev - Web 开发者
- r/marketing - 营销人员

### 2. 运行分析脚本

使用 `reddit_hack.py` 脚本分析讨论：

```bash
# 基本用法
python tools/reddit_hack.py <reddit_url>

# 保存报告到文件
python tools/reddit_hack.py <reddit_url> output.md

# 示例
python tools/reddit_hack.py https://www.reddit.com/r/SaaS/comments/xxx report.md
```

### 3. 分析报告

脚本会生成包含以下内容的报告：
- **统计摘要**：发现的痛点总数、高价值痛点数
- **Top 5 创业机会**：点赞数最高的痛点（> 10 点赞）
- **所有痛点列表**：按点赞数排序的完整列表

### 4. 评估机会

对于每个发现的痛点，评估：
- **市场规模**：有多少人有这个问题？
- **支付意愿**：用户愿意为解决方案付费吗？
- **竞争情况**：现有解决方案如何？
- **实现难度**：你能快速构建 MVP 吗？

## 痛点识别关键词

脚本会自动识别包含以下关键词的评论：

**英文关键词：**
- wish, need, want
- problem, issue
- frustrating, annoying
- difficult, hard, impossible
- missing, lacking
- should have, would be nice
- hate

**中文关键词：**
- 希望、需要、想要
- 问题、困难
- 烦人、缺少

## 实战案例

### 案例 1：发现 SaaS 工具需求

**步骤：**
1. 在 r/SaaS 搜索 "pain points" 或 "frustrating"
2. 找到热门讨论帖
3. 运行脚本分析
4. 发现高频痛点：客户流失分析工具缺失
5. 验证：搜索现有解决方案，发现市场空白
6. 行动：构建 MVP，在 Reddit 发布获取早期用户

### 案例 2：发现开发者工具需求

**步骤：**
1. 在 r/webdev 搜索 "wish there was"
2. 分析讨论中的工具需求
3. 发现痛点：API 文档生成工具不够智能
4. 快速验证：在 Twitter 发起投票
5. 构建原型，回到 Reddit 分享

## 最佳实践

### 选择讨论帖

✅ **好的讨论帖：**
- 标题包含 "pain points", "frustrating", "wish"
- 评论数 > 50
- 发布时间在 3 个月内
- 社区活跃度高

❌ **避免的讨论帖：**
- 纯技术问题讨论
- 政治或争议性话题
- 评论数太少（< 20）
- 过时的讨论（> 1 年）

### 验证痛点

发现痛点后，不要立即开始开发：

1. **二次验证**：在其他平台（Twitter, HN）搜索类似讨论
2. **直接询问**：在 Reddit 回复询问更多细节
3. **竞品分析**：搜索现有解决方案，分析优缺点
4. **快速测试**：创建 landing page 测试需求

### 从痛点到产品

**快速 MVP 路径：**
1. 选择一个高价值痛点（点赞 > 20）
2. 定义最小可行解决方案
3. 2 周内构建 MVP
4. 回到原讨论帖分享解决方案
5. 收集反馈，快速迭代

## 工具配置

### 安装依赖

```bash
cd tools
pip install requests
```

### 脚本参数

```bash
python reddit_hack.py <reddit_url> [output_file]
```

- `reddit_url`：Reddit 讨论帖的 URL
- `output_file`：（可选）保存报告的文件路径

## 注意事项

1. **尊重社区规则**：不要在 Reddit 上过度营销
2. **真诚互动**：先提供价值，再推广产品
3. **持续监控**：定期分析新讨论，发现新机会
4. **数据隐私**：不要收集或存储用户个人信息

## 相关资源

- Reddit API 文档：https://www.reddit.com/dev/api
- 如何在 Reddit 获取早期用户：参考 `案例库/`
- SaaS 选题库：`05-选题研究/热门选题库.md`

## 更新日志

- 2026-02-04：创建工作流文档和 Python 脚本
