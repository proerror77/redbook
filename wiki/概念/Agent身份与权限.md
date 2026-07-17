# Agent 身份与权限

> 来源：docs/reports/grok-research-2026-07-17.md | 最后更新：2026-07-17

## 核心痛点

- agent 可能跨邮箱、浏览器、代码、CRM 等入口读取上下文，但企业常说不清它代表谁、能看什么、能做什么。
- 共享 agent 如果没有角色控制、最小权限和可撤销动作，个人提效会直接变成组织级风险。
- 只记录最终结果而不记录身份、调用工具和执行轨迹，出错后无法审计或追责。

## 高价值角度

- 把 agent 当作需要身份、权限和责任归属的工作主体，而不是聊天窗口里的匿名能力。
- 用“访问范围 × 行动能力 × 审批要求 × 审计证据”评估企业 agent，而不是只看模型效果。
- 管理者的第一问不是“它能不能做”，而是“它以谁的身份做、出了事谁能暂停”。

## 今日信号（2026-07-17）

- Google Gemini Enterprise Agent Platform 公开列出 Agent Identity、Registry、Gateway 和执行轨迹；官方文档说明 Agent Identity 支持细粒度权限，Agent Gateway 配合 Model Armor 做运行时策略与威胁防护。[来源](https://cloud.google.com/blog/products/ai-machine-learning/introducing-gemini-enterprise-agent-platform)
- OpenAI Workspace Agents 允许企业管理员控制构建/分享权限，并通过 Compliance API 查看 agent 配置、更新和运行记录、挂起 agent。[来源](https://openai.com/index/introducing-workspace-agents-in-chatgpt/)

## 相关页面

- [[AI Agent企业导入与协作]] — 企业导入、协作与 workflow 主线
- [[Agent自治等级]] — 行动能力与治理强度的匹配
- [[Agent记忆治理]] — 记忆的访问、保留、删除和审计
