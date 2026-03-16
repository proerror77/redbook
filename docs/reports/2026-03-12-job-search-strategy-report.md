# AI Agent 求职策略报表

日期：2026-03-12

关联数据：
- 漏斗报表：[2026-03-12-zhipin-funnel-report.md](/Users/proerror/Documents/redbook/docs/reports/2026-03-12-zhipin-funnel-report.md)
- 会话快照：[chat_sidebar_latest.json](/Users/proerror/Documents/redbook/tools/auto-zhipin/data/chat_sidebar_latest.json)
- 简历提取文本：[resume_extracted_latest.txt](/Users/proerror/Documents/redbook/tools/auto-zhipin/data/resume_extracted_latest.txt)
- 投递台账：[ledger.json](/Users/proerror/Documents/redbook/tools/auto-zhipin/data/ledger.json)

## 一、当前漏斗

基于当前聊天列表和 ledger 去重后统计：

- 去重后已投递：33
- 明确拒绝：5
- 系统已发附件简历：3
- 已读未回：16
- 送达未回：14
- 有回复待跟进：5
- 正向/可继续聊：1
- 账面重复投递风险：0

这说明两个问题已经很清楚：

1. 你的问题不是“投不出去”，而是“高质量会话转化率还不够高”。
2. 当前最值得做的不是继续盲投，而是把 `已读未回`、`送达未回`、`有回复待跟进` 这三层做细。

## 二、优先级排序

### 新增接受方向

除了纯 `AI Agent / RAG / 工作流` 岗位之外，后续也纳入这类机会：

- `AI 相关架构师`
- `技术负责人`
- `平台 / infra 架构`
- `高性能系统 + AI 结合`

但必须满足一个前提：

- 不是纯通用研发管理岗
- 要有明确的 `AI / 平台 / infra / 高性能系统 / 自动化交付` 实质内容
- 最好仍然和你的 `Rust / Python / Agentic Engineering / 工程自动化` 经验能对上

### A 档：最值得继续跟进

- `上海萃普信息技术 / AI智能体开发工程师`
  原因：ToB 智能体交付、RAG/LangGraph、多智能体、Dify/LangChain、企业 API 对接，非常贴你的主线。
- `钱拓网络 / python开发（智能体）`
  原因：JD 直接写多模态大模型、Agent、RAG、知识库增强和 AI 应用落地。
- `上海什风子印科技 / Agent 智能体研发工程师`
  原因：0-1 Agent 产品、浏览器/后端架构、LLM 工程化，匹配你的 Agentic Engineer 叙事。
- `海智在线 / 智能体开发工程师`
  原因：标题直接匹配，适合继续观察是否转为人工回复。
- `驰库能源集团有限公司 / AI应用架构师`
  原因：企业 AI 落地线，适合你的“企业导入 + 工程化 + 工作流”故事。

### B 档：可继续观察，但不宜投入太多时间

- `海卓云智 / 大模型应用工程师`
- `水星家纺 / AIGC智能体&工作流专家`
- `可利邦 / 上海-Python智能体Agent开发工程师`
- `以昌科技 / Agent/Prompt Engineer 智能体开发工程师`
- `灵童机器人 / AI研发工程师（大模型与智能体方向）`

这些岗位方向有交集，但有的偏传统行业，有的偏嵌入式/机器人，有的技术深度与你主线不完全重合。

### C 档：明确沉淀为拒绝，不再重复投

- `随幻科技`
- `蓝岸一凝`
- `上海威廉欧奈尔...`
- `声网`
- `上海雷骥`

规则：
- 明确拒绝后不再重复投同公司同标题。
- 只有后续出现新岗位，且方向明显更贴 `AI Agent / 企业 AI 落地 / RAG`，才重新进入候选池。

## 三、简历诊断

你当前简历最大的优点，是有非常强的个人技术叙事：

- `Agentic Engineer`
- `Rust + Python + Node`
- `AI Agent 工作流`
- `高性能系统 / 低延迟 / 量化系统`
- `多 Agent 协同`
- `工程自动化和自主执行`

但它也有 5 个明显问题，会直接拉低 BOSS 上的回复率。

### 1. 求职意向严重错位

当前 PDF 首页写的是：
- `求职意向：总裁/总经理/CEO`

这会直接导致大量招聘方把你归到“高管转型/泛管理”而不是“能上手做 Agent 工程”的候选人。

建议改成以下其中一个：
- `AI Agent 架构师 / AI应用架构师`
- `智能体系统负责人 / AI Agent Engineering Lead`
- `企业 AI 落地负责人 / RAG & Agent`

### 2. 投资/经营管理信息过重，工程标签被稀释

当前简历里有大量：
- `投融资管理`
- `投前尽调`
- `投后管理`
- `总裁/总经理/CEO`

这些内容不是不能有，但不应该占据主视角。对 AI Agent 招聘方来说，这会让你看起来像“懂业务的老板”，而不是“能把 Agent 系统做出来的人”。

### 3. 企业 AI 落地案例不够靠前

你实际上已经有很强的相关点：
- Agent 工作流系统
- 多 Agent 协同
- 工具调用 / 工作流编排
- 自动化开发链路
- Rust/Python 的工程化能力

但现在这些信息被量化/HFT 叙事包住了。对一般 AI 招聘方来说，第一眼不会自动把你映射到 `企业知识库 / RAG / LangGraph / Dify` 这条线上。

### 4. 技术栈有亮点，但缺少“招聘方熟悉的关键词排布”

你写了很多真实能力，但和 JD 常见关键词的对齐度还不够高。建议明确补足这类词：
- `RAG`
- `LangGraph`
- `LangChain`
- `Dify`
- `工作流编排`
- `工具调用`
- `知识库增强`
- `企业系统 API 对接`
- `Agent observability`
- `Prompt evaluation`

### 5. 需要多版本简历，而不是一份打天下

你至少应该准备 2 版：

- `企业 AI / Agent 落地版`
  面向：AI应用架构师、AI智能体开发、企业 AI 优化、RAG/工作流岗位
- `Quant + Agent 工程版`
  面向：量化、交易基础设施、AI Agent + 交易/策略岗位

现在这份 PDF 更像两条线混在一起，所以很多岗位只能命中一半。

## 四、简历修改建议

最值得先改的，不是细枝末节，而是首页定位。

### 建议你把首页前三屏改成这种结构

1. 标题
- `AI Agent 架构师 / Agentic Engineer`

2. 一句话摘要
- `14 年系统与业务经验，聚焦 AI Agent、RAG、工作流编排与高性能后端，擅长把大模型能力落到企业流程、智能决策和自动化交付场景。`

3. 核心标签
- `Python / Rust / Node.js`
- `AI Agent / Multi-Agent / Tool Use`
- `RAG / LangGraph / LangChain / Dify`
- `工作流编排 / 企业 API 集成`
- `高性能系统 / 实时数据 / DevOps`

4. 项目顺序
- 先放 `AI Agent 工作流系统`
- 再放 `企业级或业务侧 AI 落地案例`
- 最后再放 `量化 / Rust 高频系统`

## 五、提高回复率的策略

### 策略 1：继续投，但只投高匹配 JD

后续只投满足以下至少 2 条的岗位：

- JD 明写 `Agent / 智能体`
- 明写 `RAG / 知识库`
- 明写 `工作流 / 编排`
- 明写 `LangGraph / LangChain / Dify`
- 明写 `企业系统集成 / API 对接`
- 明写 `ToB / 行业解决方案 / 企业落地`

这样会比“标题像 AI”但实际偏机器人/内容运营/训练标注的岗位，回复率高很多。

### 策略 2：把会话分成 4 类管理

- `明确拒绝`
  直接归档，不再重复投
- `已发附件简历`
  等待，不重复触发
- `已读未回 / 送达未回`
  先观察 24-72 小时，不乱追
- `已回复待跟进`
  优先处理

你现在最该花时间的是：
- `宏诺伊曼`
- `中科创达`
- `姚记科技`
- `上海精燧智能科技`
- `连尚网络`

这些都属于“已经有回复信号”，优先级高于继续海投。

### 策略 3：默认招呼语要换

你现在很多会话的默认招呼语还是：
- `你好，看过您的职位，觉得比较适合自己，希望有机会能和你相互进一步了解。谢谢`

这句太泛了，几乎没有你的差异化。

更适合你的版本应该像：

`你好，我这边主要做 AI Agent / RAG / 工作流编排，也有 Rust + Python 的高性能系统经验。看了你的 JD，和我做过的智能体落地、工具调用和自动化交付比较贴，方便继续沟通一下吗？`

### 策略 4：不要重复投递，改成身份级去重

现在已经补了代码，不只按 `jobId` 去重，也会按：
- `company + title`

做身份级去重。

这意味着同一个公司、同一个岗位名称，即使 BOSS 换了一个链接，也不会再重复投一次。

### 策略 5：从“投了多少”切到“回复率”指标

后面建议每轮只看这 4 个数：

- 新投递数
- 有回复数
- 明确拒绝数
- 可继续聊数

真正优化目标是：
- `可继续聊 / 新投递`

而不是单纯累计投递量。

## 六、已完成的流程升级

这轮已经落地的改动：

- 新增漏斗报表脚本：
  [funnel_report.js](/Users/proerror/Documents/redbook/tools/auto-zhipin/scripts/funnel_report.js)
- 新增聊天列表快照：
  [chat_sidebar_latest.json](/Users/proerror/Documents/redbook/tools/auto-zhipin/data/chat_sidebar_latest.json)
- 新增身份级去重：
  [store.js](/Users/proerror/Documents/redbook/tools/auto-zhipin/lib/store.js)
  [scan_jobs.js](/Users/proerror/Documents/redbook/tools/auto-zhipin/scripts/scan_jobs.js)
- 新增去重测试：
  [store_identity.test.js](/Users/proerror/Documents/redbook/tools/auto-zhipin/tests/store_identity.test.js)

## 七、小红书附录

本轮做了公开网页层面的 best-effort 搜索，但没有稳定找到高质量、可直接利用的“小红书 AI Agent 初创招聘帖”公开索引结果。

结论：
- 小红书更适合拿来做 `公司发现 / 创始人观察 / 产品热度信号`
- 不适合作为你当前主投渠道的结构化招聘源

如果要继续用小红书，建议只搜这几类关键词：
- `AI智能体 创业公司`
- `AI Agent 招聘`
- `RAG 创业`
- `Dify 创业公司`
- `大模型应用 创业团队`

使用方式也建议改成：
- 在小红书发现公司名
- 回到 BOSS / 官网 / 微信公众号 / 领英去找正式岗位

而不是直接把小红书当投递入口。

## 八、下一步建议

按优先级，下一步最值的是：

1. 直接重写一版 `企业 AI / Agent 落地版` 简历
2. 把 BOSS 求职意向、标题和默认招呼语一起改掉
3. 对 `已回复待跟进` 的几条会话做定制回复
4. 再继续投新的高匹配岗位

如果继续，我建议下一轮不要先海投。先做：
- 改简历
- 改招呼语
- 清理已回复会话

然后再开始下一批投递。
