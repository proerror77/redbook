---
name: x-collect
description: Collect and research materials for X (Twitter) content creation using multi-round web search strategy. Use when user wants to gather trending topics, research subjects for X posts, or mentions "collect materials", "research topic", "find content for X", "x-collect". Performs 4-round deep research mimicking human research workflow.
---

# X Collect

Collect trending topics and research materials for X content creation using a systematic 4-round web search strategy.

## Prerequisites

- WebSearch tool available
- Internet connection

## Workflow

### Input

User provides:
- **Topic** (required): The subject to research (e.g., "AI Agent最新进展", "Claude 4 发布")
- **Language** (optional): Output language, defaults to Chinese (zh-CN)

### 4-Round Search Strategy

Simulate human research thinking process with progressive depth:

**Round 1: Official Sources (权威信息)**
```
Search: "{topic} 官方文档"
Search: "{topic} GitHub"
Search: "{topic} official announcement"
```
Goal: Get authoritative first-hand information

**Round 2: Technical Analysis (技术解析)**
```
Search: "{topic} 详细介绍"
Search: "{topic} 教程 tutorial"
Search: "{topic} how it works"
```
Goal: Understand technical details and mechanisms

**Round 3: Comparison & Reviews (对比评测)**
```
Search: "{topic} vs {competitor}"
Search: "{topic} 评测 review"
Search: "{topic} pros cons"
```
Goal: Get different perspectives and comparisons

**Round 4: Supplementary Verification (补充验证)**
```
# Analyze gaps from previous rounds
missing_info = analyze_gaps(previous_results)
Search: "{missing_info}"
Search: "{topic} 最新 latest 2024 2025"
```
Goal: Fill information gaps and get latest updates

### Output Format

Generate structured material document:

```markdown
# {Topic} 素材收集报告

## 收集时间
{timestamp}

## 核心信息
- **官方定义**: ...
- **关键特性**: ...
- **最新动态**: ...

## 素材列表

### 素材 1
- **标题**: ...
- **来源**: {url}
- **摘要**: 2-3句话概括
- **关键点**:
  - 要点1
  - 要点2
- **潜在选题角度**: ...
- **推荐推文类型**: [高价值干货/犀利观点/热点评论/故事洞察/技术解析]

### 素材 2
...

## 热度分析
- **当前热度**: 高/中/低
- **趋势**: 上升/稳定/下降
- **讨论焦点**: ...

## 争议点
- 争议1: ...
- 争议2: ...

## 下一步建议
使用 `/x-filter` 对素材进行打分筛选
```

## Execution Steps

1. **Receive topic** from user
2. **Check wiki first**: Read `wiki/index.md` → find if a matching 选题 page exists in `wiki/选题/`
3. **Execute Round 1** searches (official sources)
4. **Execute Round 2** searches (technical analysis)
5. **Execute Round 3** searches (comparisons)
6. **Analyze gaps** from rounds 1-3
7. **Execute Round 4** searches (fill gaps)
8. **Synthesize results** into structured format
9. **Wiki ingest**: Update or create the relevant `wiki/选题/{topic}.md` page; append to `wiki/log.md`
10. **Report summary** to user

## Wiki Ingest (Step 9)

After synthesizing results:

1. Read `wiki/index.md` to find matching 选题 page
2. If page exists → update it: add new angles, update 热度, note contradictions with existing content
3. If no page → create `wiki/选题/{topic}.md`:
   ```markdown
   # {Topic}

   > 来源：x-collect {date} | 最后更新：{date}

   ## 核心痛点
   ## 高价值角度
   ## 持续关注的信号源
   ## 相关页面
   ```
4. Update `wiki/index.md` entry (add row or update 最后更新 date)
5. Append to `wiki/log.md`:
   ```
   ## [{date}] ingest | x-collect: {topic}
   触及页面：wiki/选题/{topic}.md
   关键更新：{one-line summary}
   ```

## Example

User: `/x-collect Claude MCP协议`

Expected behavior:
1. Check wiki/index.md → no existing MCP page
2. Search "Claude MCP协议 官方文档"
3. Search "MCP Model Context Protocol GitHub"
4. Search "MCP协议 详细介绍"
5. Search "MCP协议 教程"
6. Search "MCP vs function calling"
7. Search "MCP协议 评测"
8. Identify gaps: need more about security, adoption rate
9. Search "MCP协议 安全性"
10. Search "MCP协议 最新 2025"
11. Generate structured material report
12. Create wiki/选题/MCP协议.md + update wiki/index.md + append wiki/log.md

## Integration

After collection, suggest:
```
素材收集完成！共找到 X 条相关素材。
Wiki 已更新：wiki/选题/{topic}.md

下一步：运行 /x-filter 对素材进行打分筛选，≥7分的选题将进入创作池。
```

## Tips

- For trending topics, prioritize recency (2024-2025)
- For technical topics, prioritize official docs and GitHub
- For controversial topics, collect multiple perspectives
- Always note the source URL for credibility
