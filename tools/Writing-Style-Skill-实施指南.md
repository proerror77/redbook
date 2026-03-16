# Writing Style Skill 实施指南

## 快速开始（3 步骤）

### Step 1: 准备你的写作样本

从已发布内容中选择 **3-5 篇最能代表你风格的文章**：

```bash
# 创建样本目录
mkdir -p ~/.claude/skills/writing-style/references/sample-articles

# 复制你的原创文章
# 示例：
cp 01-内容生产/03-已发布的选题/AI时代CEO最重要的能力.md \
   ~/.claude/skills/writing-style/references/sample-articles/sample-1.md
```

**选择标准**：
- ✅ 你最满意的文章
- ✅ 获得读者好评的内容
- ✅ 最能代表你个人风格的写作
- ✅ 覆盖不同主题（AI、创业、方法论等）

**推荐组合**：
- 1 篇长文（1000+ 字）- 展示完整风格
- 2 篇中文（500-800 字）- 核心风格要点
- 2 篇短推文/线程 - 语气和节奏

---

### Step 2: 使用 Claude 分析你的风格

使用以下 prompt 让 Claude 分析：

```markdown
# 任务：分析我的写作风格，生成 Writing Style Skill

## 我的原创样本

### 样本 1: [文章标题]
[粘贴文章全文]

### 样本 2: [文章标题]
[粘贴文章全文]

### 样本 3: [文章标题]
[粘贴文章全文]

---

## 分析要求

请基于这些样本，生成一个 **Writing Style Skill 定义文件**，包含以下 4 个部分：

### 1. 角色与读者
- 我是谁（基于样本推断）
- 目标读者是谁
- 写作目标是什么

### 2. 风格要点（3-5 条）
每条包含：
- 核心原则
- ❌ AI 味写法示例
- ✅ 我的风格示例（从样本中提取）
- 要点说明

**重点识别**：
- 句子长度和节奏
- 开头和结尾习惯
- 常用表达方式
- 论证逻辑结构
- 数据/案例使用方式

### 3. 禁止清单
基于样本，列出：
- 我从不使用的词汇和句式
- AI 味词汇及我的替换方案
- 套话黑名单

### 4. 参考资料
- 我常用的术语和表达
- 我的独特比喻和案例模式
- 语气示例库

---

## 输出格式

请按照 `style-definition.md` 的格式输出完整内容。

**特别注意**：
- 所有"我的风格"示例必须从我的样本中提取，不要编造
- 如果样本中没有明确体现某个特征，就不要写
- 保持真实性，而非追求完美
```

---

### Step 3: 创建 Skill 文件结构

基于 Claude 的分析结果，创建以下文件：

```bash
# 创建目录结构
mkdir -p ~/.claude/skills/writing-style/references

# 保存风格定义
# 将 Claude 生成的内容保存到：
~/.claude/skills/writing-style/references/style-definition.md

# 创建 SKILL.md（主入口）
cat > ~/.claude/skills/writing-style/SKILL.md << 'EOF'
# Writing Style

个人写作风格 Skill，解决 AI 生成内容的同质化问题。

## 使用方式

```bash
# 1. 基于你的风格生成内容
/writing-style create <主题>

# 2. 润色现有内容
/writing-style polish <文件路径>

# 3. 翻译并保持风格
/writing-style translate <英文内容>
```

## 工作原理

1. 读取你的个人风格定义（`references/style-definition.md`）
2. 基于 4 部分风格规则生成内容：
   - 角色与读者
   - 风格要点（3-5 条核心原则）
   - 禁止清单（AI 味词汇黑名单）
   - 参考资料（术语库、案例模式）

## 迭代更新

### 方法 1: 手动迭代
1. 使用 Skill 生成内容
2. 手动编辑到满意
3. 对比两个版本，提取修改模式
4. 更新 `style-definition.md`

### 方法 2: AI 辅助迭代
```bash
/writing-style update-from-edit <原始版本> <修改后版本>
```

## 集成其他 Skills

- `/x-create` + Writing Style → 个性化推文
- `/baoyu-xhs-images` + Writing Style → 有风格的小红书文案
- 每日研究选题 + Writing Style → 深化文稿

## 参考资料

- 设计方案：`tools/Writing-Style-Skill-设计方案.md`
- 样本文章：`references/sample-articles/`
- 迭代记录：`references/iteration-log.md`

---

*基于 @dotey 《别再用提示词去 AI 味了，方向就是错的》*
EOF
```

---

## 迭代工作流

### 首次使用

```bash
# 1. 生成一篇内容测试风格
/writing-style create "AI 架构能力的重要性"

# 2. Claude 基于你的 style-definition.md 生成初稿

# 3. 你手动编辑到满意

# 4. 保存两个版本对比
```

### 提取改进模式

```markdown
## 对比分析 Prompt

我使用 Writing Style Skill 生成了一篇内容，然后手动修改。
请分析我的修改模式，更新 style-definition.md。

### AI 生成版本
[粘贴 AI 初稿]

### 我修改后的版本
[粘贴你的修改]

---

请识别：
1. 我删除了哪些表达？→ 添加到"禁止清单"
2. 我改变了哪些句式？→ 添加到"风格要点"
3. 我增加了哪些元素？→ 添加到"参考资料"

输出：
- 修改模式总结
- 更新后的 style-definition.md 相关部分
```

---

## 与现有工具集成

### 方案 1: 修改 `/x-create` Skill

在 `~/.claude/skills/x-create/references/user-profile.md` 中添加：

```markdown
## 写作风格

**风格来源**：详见 Writing Style Skill
`~/.claude/skills/writing-style/references/style-definition.md`

**核心特征**（快速参考）：
- 短句 + 节奏感（句长 < 20 字）
- 数据 > 形容词
- 口语化，避免套话
- 有态度，不中立
- 案例驱动

**创作时**：
1. 先读取 Writing Style Skill
2. 按照风格要点生成
3. 检查禁止清单
4. 使用参考资料中的表达
```

### 方案 2: 创建组合 Skill

```bash
# 新建：~/.claude/skills/x-create-styled/SKILL.md

# X Create + Writing Style（组合 Skill）

结合 x-create 的推文创作能力 + 个人 Writing Style。

## 使用

```bash
/x-create-styled <话题>
```

## 工作流

1. 调用 `/x-create` 生成内容大纲
2. 调用 `/writing-style` 应用个人风格
3. 输出符合你风格的推文
```

---

## 测试清单

初始化完成后，通过以下测试验证 Skill 质量：

### ✅ 测试 1: 生成 vs 原创对比

```bash
# 1. 选择一个你写过的话题
# 2. 用 Skill 重新生成
# 3. 对比两个版本

期望：
- 语气相似度 > 70%
- 核心表达方式一致
- 读者感觉不出是 AI 写的
```

### ✅ 测试 2: 禁止清单检查

```bash
# 生成 3 篇内容，检查是否出现：
- "综上所述"
- "随着...的发展"
- "在此背景下"

期望：0 次出现
```

### ✅ 测试 3: 风格要点验证

```bash
# 检查生成的内容是否遵循：
- 短句原则（平均句长 < 20 字）
- 数据 > 形容词
- 口语化表达

期望：80% 以上符合
```

---

## 常见问题

### Q1: 样本文章不够怎么办？

A: 最少 3 篇即可启动，后续持续添加：
```bash
# 每发布一篇满意的内容
cp new-article.md ~/.claude/skills/writing-style/references/sample-articles/sample-N.md

# 重新分析（每积累 3-5 篇新样本）
/writing-style re-analyze
```

### Q2: 生成的内容还是有 AI 味怎么办？

A: 这是正常的，需要迭代：
1. 第 1-3 次：60-70% 满意度
2. 第 4-7 次：70-85% 满意度
3. 第 8-10 次：85-95% 满意度

**关键**：每次手动修改后，提取模式更新 Skill。

### Q3: 我的风格会变化怎么办？

A: 每 3-6 个月重新分析一次：
```bash
# 选择最近 3 个月的满意文章
# 重新运行 Step 2 分析流程
# 对比新旧风格定义，决定是否更新
```

---

## 进阶功能

### 功能 1: 多场景风格

如果你在不同平台风格不同：

```bash
~/.claude/skills/writing-style/references/
├── style-x.md          # X.com 推文风格
├── style-xhs.md        # 小红书风格
├── style-article.md    # 长文风格
└── style-definition.md # 默认风格
```

### 功能 2: 风格强度控制

在 Skill 调用时指定强度：

```bash
/writing-style create <话题> --strength light   # 轻度风格（保守）
/writing-style create <话题> --strength medium  # 中度风格（推荐）
/writing-style create <话题> --strength strong  # 强烈风格（激进）
```

---

## 下一步

1. ✅ **准备样本**：从你的已发布内容中选择 3-5 篇
2. 📝 **分析风格**：使用 Step 2 的 prompt 让 Claude 分析
3. 💾 **创建文件**：按 Step 3 创建 Skill 文件结构
4. 🧪 **测试迭代**：生成 1-2 篇内容，手动修改，提取模式
5. 🔄 **持续优化**：每次使用后更新 style-definition.md

---

*预期时间：初始化 1-2 小时，迭代到稳定约 10 次使用（1-2 周）*
