# 深化选题：团队 AI 化后真正缺的不是 Prompt，是 Harness Engineering

## 选题判断

这是今天最值得做的一条判断题。

如果只写成：

- AI 写代码让质量变差
- 团队 all-in AI codegen 后 PR 很难 review
- AI agent 榜单不可信

都不够深。

真正把这些现象串起来的底层问题是：

**团队已经 AI 化了，但工作流还是按旧的软件工程方式在跑。**

以前的软件团队默认很多东西可以靠人脑补：

- 上下文可以靠人自己理解
- 边界可以靠 senior 口头兜底
- review 可以在最后一层统一抓出来
- 失败了可以靠经验回滚

但 AI 工作流不是这样。

AI 一旦被接进研发、写作、调研、执行链路，问题就会从“模型好不好”变成：

- 任务怎么切
- 中间产物怎么验
- 哪一步能自动过，哪一步必须人工过
- 出错后怎么定位、怎么回滚、怎么留痕

这不是 prompt engineering。

这是 **Harness engineering**。

---

## 一句话结论

**团队 AI 化后，真正决定上限的，不是谁更会写 prompt，而是谁先把工作流变成一个可验证、可追溯、可审计的 harness。**

---

## 热点依据

### 外部热度

#### 1. Reddit：团队 all-in AI code generation 后，问题不是“慢”，而是“开始失真”

- 来源：`05-选题研究/Reddit-每日监控-2026-04-12.md`
- 高热讨论：
  - `I audited 6 months of PRs after my team went all-in on AI code generation. The code got worse in ways none of us predicted.`
  - 热度：`1025↑ / 297评`
- 这个信号说明：
  - 团队已经接受 AI 能提升速度
  - 但速度之后，开始暴露“质量退化的形状”问题
  - 问题不是单条代码错，而是系统层面开始失真

#### 2. HN：AI agent benchmark 正在失真

- 来源：`05-选题研究/HN-每日热点-2026-04-12.md`
- 高热讨论：
  - `How We Broke Top AI Agent Benchmarks: And What Comes Next`
  - 热度：`264↑ / 73评`
- 关键评论指向：
  - `We achieved near-perfect scores on all of them without solving a single task.`
  - `Evaluating AI models has always relied largely on trust.`
- 这个信号说明：
  - 只要没有可靠的 eval harness
  - “高分”可以和“真能力”彻底脱钩

#### 3. HN：OpenAI 开始往基础设施层收口

- 来源：`05-选题研究/HN-每日热点-2026-04-12.md`
- 高热讨论：
  - `Cirrus Labs to join OpenAI`
  - 热度：`241↑ / 120评`
- 这个信号说明：
  - 竞争已经不只是模型能力
  - 开始往 CI / infra / engineering surface 走
  - AI 工程的主战场正在从“生成结果”转向“系统怎么组织”

### 内部热度

- 来源：`05-选题研究/X-每日日程-2026-04-12.md`
- 关注圈高频关键词：
  - `ai`
  - `claude`
  - `agent`
- 今日关注者信号不是“哪个模型更强”，而是：
  - agent 工作流
  - 信息消费效率
  - AI 工程和工作流结构

---

## 研究来源

- `05-选题研究/Reddit-每日监控-2026-04-12.md`
- `05-选题研究/HN-每日热点-2026-04-12.md`
- `05-选题研究/X-每日日程-2026-04-12.md`
- `tools/redbook_harness/config.py`
- `tasks/harness/README.md`
- `AGENTS.md` 中的 Harness Runtime 与 Verification 规范

---

## 核心判断

### 判断 1

团队用了 AI 后，最先崩的往往不是模型，而是协作结构。

因为过去团队默认“人会自己补上下文”，而 AI 不会。

### 判断 2

AI 工作流的关键问题，不在“生成了什么”，而在“中间怎么被验证”。

没有 artifact、没有 gate、没有 verifier，速度越快，失真越快。

### 判断 3

Prompt engineering 解决的是单步输出问题。

Harness engineering 解决的是：

- 多步任务怎么串
- 哪一步能自动继续
- 哪一步必须停下来验
- 出错后怎么知道错在哪一层

### 判断 4

未来团队的分水岭不是：

- 谁更会用模型
- 谁能接更多 agent

而是：

- 谁先把 AI 工作流工程化
- 谁先建立 AI 专属的 review / verification / rollback 体系

---

## 不要写偏的地方

### 不要写成

- AI 不行
- 以后别用 AI 写代码
- 团队用了 AI 就会变差
- Prompt 不重要了

### 应该写成

- AI 已经进入团队了，所以旧的软件工程组织方式不够用了
- 不是不要 AI，而是必须补上 harness
- 不是模型问题，而是结构问题

---

## 可复用表达

- Prompt engineering 解决的是一句话怎么问，harness engineering 解决的是整条链路怎么跑。
- 没有 harness 的 AI 团队，速度越快，失真越快。
- 以前管理的是人，现在还要管理 agent、workflow、artifact 和 gate。
- AI 一旦进入生产，不可验证比不够聪明更危险。
- 真正的升级不是“更会生成”，而是“更能被验证”。
- 团队 AI 化以后，最值钱的能力不是提示词，而是工作流编排与验证设计。

---

## 标题备选

### 偏判断型

1. 团队 AI 化后，真正缺的不是 prompt，是 Harness Engineering
2. AI 团队为什么越做越乱？因为还在用旧的软件工程方式
3. 团队用了 AI，最该补的不是模型，而是 harness

### 偏冲突型

1. 团队 all-in AI 后，问题不是代码变差，而是结构没跟上
2. AI 写代码不是最大风险，没有 harness 才是
3. 你以为团队缺 prompt，其实缺的是一套能约束 AI 的系统

### 偏行业判断型

1. AI 工程的下一个主战场，不是模型，是 Harness Engineering
2. Agent 时代的软件工程，最先过时的是旧的协作结构
3. Benchmark 会失真，PR 会失真，流程也会失真：问题都指向 harness

---

## X 单条长帖结构

### 开头

团队用了 AI 以后，最先出问题的，往往不是模型。

而是你还在用旧的软件工程方式，管理新的 AI 工作流。

### 中段

- 代码生成速度上去了，但 review 开始失真
- benchmark 分数更高了，但 eval 不可信
- agent 接得更多了，但没人知道哪一步该停、哪一步该验

### 判断

问题不是 prompt engineering 不够。

问题是团队没有补上 Harness engineering：

- 任务边界
- artifact 契约
- verifier
- gate
- rollback
- 审计

### 结尾

团队 AI 化以后，真正决定上限的，不是谁更会写 prompt。

而是谁先把工作流变成一个可验证、可追溯、可审计的 harness。

---

## 小红书图文结构

### 封面

- 主标题：`团队 AI 化后最缺的不是 Prompt`
- 副标题：`而是 Harness Engineering`

### 5 页建议

1. 现象页
   - 团队用了 AI
   - 速度先涨
   - 然后质量开始失真

2. 误区页
   - 不是模型不够强
   - 不是大家 prompt 不会写
   - 是旧协作方式不够了

3. 定义页
   - 什么是 Harness engineering
   - 任务、artifact、verifier、gate、rollback

4. 代价页
   - 没有 harness：速度越快，失真越快
   - 有 harness：AI 才能从“辅助”变成“可托付”

5. 结论页
   - AI 团队的真正分水岭
   - 不在模型，在结构

---

## 公众号长文提纲

1. 为什么今天很多团队用了 AI，效率反而越来越假
2. Prompt engineering 为什么不够了
3. 什么叫 Harness engineering
4. 为什么 AI 工作流必须有 artifact / gate / verifier
5. 团队应该怎么从“工具使用”升级到“工作流工程”
6. 最后的判断：AI 时代真正值钱的是结构能力

---

## 现在就可以写的版本

如果今天就要发，最稳的是：

1. 先发 X 单条长帖，抢判断权
2. 再发小红书图文，把抽象判断翻成更具体的卡片结构
3. 公众号长文留到后面做“完整版方法论”

这题最强的地方在于：

- 它不是新闻复述
- 它不是情绪发泄
- 它是把 3 个分散的市场信号，收成一个更高维的判断

这正是你最适合写的内容。
