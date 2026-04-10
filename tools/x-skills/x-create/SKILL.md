---
name: x-create
description: Create viral X (Twitter) posts including short tweets, threads, and replies. Use when user wants to write X content, create posts, or mentions "create tweet", "write thread", "x-create", "写推文", "创作推文". Supports 5 post styles with customizable templates. First-time users go through onboarding to set up profile.
---

# X Create

Create viral X posts (short tweets, threads, replies) based on user's persona and post patterns.

## First-Time Setup

**Check user profile before creating content:**

1. Read `references/user-profile.md`
2. If `initialized: false` or file doesn't exist → Run onboarding
3. If `initialized: true` → Proceed to content creation

### Onboarding Questions

Ask user these questions using AskUserQuestion tool:

1. **账号定位（领域）**: 你的X账号主要分享什么内容？
   - Options: AI/科技, 创业/商业, 个人成长, 投资理财, Other

2. **目标受众**: 你的目标读者是谁？
   - Options: 中文用户, 英文用户, 双语用户

3. **人设风格**: 你希望塑造什么样的人设？
   - Options: 专业严肃, 轻松幽默, 犀利观点, 温暖亲和, Other

After collecting answers, update `references/user-profile.md` with `initialized: true`.

## Post Types

### 5 Categories

| Type | Style | Use When |
|------|-------|----------|
| **高价值干货** | 信息密度高，可收藏 | 教程、工具推荐、方法论 |
| **犀利观点** | 有态度有立场 | 行业评论、反常识观点 |
| **热点评论** | 快速反应 | 新闻评论、事件点评 |
| **故事洞察** | 个人经历+洞察 | 案例分析、经验复盘 |
| **技术解析** | 深度技术 | 原理讲解、源码分析 |

### Output Formats

1. **短推文** (≤280 characters) - Single tweet
2. **Thread** (多条串联) - 3-10 tweets connected
3. **评论回复** - For replying to trending posts

## Creation Workflow

### Step 1: Load Context

```
1. Read references/user-profile.md → Get persona, style
2. Read wiki/index.md → Find relevant pages for this topic
3. Read relevant wiki pages (选题/{topic}.md, 概念/*.md, 创作者/*.md)
4. Check assets/templates/{type}/ → Look for user reference posts
5. If no references → Use default patterns from references/post-patterns.md
```

**Wiki query priority**:
- `wiki/选题/` — topic angles, pain points, existing coverage
- `wiki/概念/` — theoretical frameworks to reference
- `wiki/创作者/` — style patterns from tracked creators
- `wiki/方法论/` — title and opening hook patterns

### Step 2: Determine Format

Based on content length and complexity:
- **Short tweet**: Single insight, quick take, one-liner
- **Thread**: Multi-point analysis, step-by-step, detailed breakdown
- **Reply**: Designed to respond to specific post/topic

### Step 3: Apply Pattern

Read `references/post-patterns.md` for the specific post type pattern.

### Step 4: Generate Content

Create content following:
1. User's persona style
2. Post type pattern
3. Reference examples (if available)

## Output Format

```markdown
# 推文创作

## 选题
{topic}

## 推文类型
{short_tweet/thread/reply}

## 风格
{post_style}

---

## 正文

{For short tweet: single tweet content}

{For thread:}
### 1/N
{first tweet}

### 2/N
{second tweet}

...

### N/N
{final tweet with call to action}

---

## 发布建议
- 最佳发布时间: {suggestion}
- 配图建议: {image suggestion if applicable}
- 预期互动: {engagement prediction}

下一步：运行 /x-publish 发布到草稿箱
```

## Template Priority

1. **User templates first**: Check `assets/templates/{type}/`
2. **Default patterns**: Use `references/post-patterns.md`

Example:
```
Creating 高价值干货 post:
1. Check assets/templates/high-value/
2. If files exist → Learn style from examples
3. If empty → Use default pattern from post-patterns.md
```

## Resources

### references/user-profile.md
User customization info (shared across all x-skills)

### references/post-patterns.md
Default viral post patterns for 5 categories

### assets/templates/
User-provided reference posts organized by type:
- `high-value/` - 高价值干货类参考
- `sharp-opinion/` - 犀利观点类参考
- `trending-comment/` - 热点评论类参考
- `story-insight/` - 故事洞察类参考
- `tech-analysis/` - 技术解析类参考

## Example

User: `/x-create Claude 4.5 Opus发布 --type thread`

1. Read user-profile.md → persona: 专业严肃、犀利观点
2. Check assets/templates/tech-analysis/ → empty
3. Read post-patterns.md → Get tech-analysis pattern
4. Generate thread:

```
### 1/5
Claude 4.5 Opus 发布了，这可能是2025年最重要的AI模型发布。

为什么？因为它第一次真正实现了"思考后行动"。

一个线程，讲清楚它的核心突破👇

### 2/5
传统大模型：输入→输出
Claude 4.5：输入→思考→验证→输出

这个"思考"不是噱头，是真正的extended thinking...

### 3/5
实测几个场景：
1. 代码重构：准确率从78%→94%
2. 数学推理：复杂证明成功率翻倍
3. 长文档分析：关键信息遗漏降低60%

### 4/5
但也有代价：
- 延迟增加2-3倍
- API成本是GPT-4的3倍
- 需要更精准的prompt

适合：复杂任务、高价值场景
不适合：简单问答、实时交互

### 5/5
我的判断：
Claude 4.5不是要取代GPT-4，而是开辟了一个新赛道——需要"慢思考"的场景。

这可能才是AGI的正确方向。

你觉得呢？
```

## Integration

After creation, suggest:
```
推文创作完成！

- 类型: {thread/short/reply}
- 字数: {word_count}
- 预计阅读: {read_time}

下一步：运行 /x-publish 发布到X草稿箱
```

## Wiki Feedback (Optional)

If the creation process produced a valuable new angle, comparison, or insight not already in the wiki:
- Update `wiki/选题/{topic}.md` with the new angle
- Append to `wiki/log.md`:
  ```
  ## [{date}] query | x-create: {topic}
  新增洞察：{one-line summary}
  ```

This keeps the wiki compounding — good analysis doesn't disappear into chat history.
