AI 工作流的"运行时"和"定义"正在分家。

Anthropic 最近在 GitHub 上发布了 claude-for-legal——10 个法律业务领域的 AI 工作流插件，近百个命名 agent，从合同审查到诉讼准备到合规监控全包。

大部分人看到的是"法律 AI 工具"。我看到的是另一件事：同一套插件，三种运行时。

每个 skill、每个 agent、每个 practice profile，可以原封不动跑在 Claude Code（个人终端）、Claude Cowork（团队协作）和 Managed Agents API（企业 headless）上。README 原话："Same system prompt, same skills — you choose where it runs."

这件事暴露了三层架构：

运行时层不再绑定工作流。工作流层（skills + agents + practice profile）全部开源，markdown 和 JSON，零构建，定义一次到处跑。定制层（practice profile + connectors + 编排）是你自己的，不共享。

关键是中间那层：开源、可复用、跨运行时。

今天你看到的是 claude-for-legal。明天就是 for-healthcare、for-finance、for-education。每个垂直行业的 AI 工作流，都可以抽成公共层 + 私有定制。法律是第一个——因为它最复杂，合规最多、文档最密、出错代价最大。它跑通了，别的都能跑通。

几个信号在同时指向这件事：Anthropic 据传 $900B 估值融资。Claude Code 高频迭代 agent 能力。有人已经把整个 Hermes agent 部署在 VPS 单文件夹里，SSH 就能调度。

过去的 OS 管理 CPU 和内存。未来的 AI 工作流 OS 管理 skills、agents 和 practice profiles。运行基底可以是你的笔记本，也可以是企业集群。

Anthropic 刚刚把第一份公开蓝图放在了 GitHub 上。Apache 2.0。

github.com/anthropics/claude-for-legal