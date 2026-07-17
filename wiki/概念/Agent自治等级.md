# Agent 自治等级

> 来源：docs/reports/grok-research-2026-07-17.md | 最后更新：2026-07-17

## 核心痛点

- 对所有 agent 使用同一套治理，会在低风险任务上制造摩擦，在高风险任务上留下缺口。
- 只看“能否自动执行”而不看访问范围、审批、监控和回滚，容易把 PoC 直接推向生产。
- 自治等级没有明确记录时，管理者无法判断谁应批准、谁应负责、何时停损。

## 高价值角度

按 agent 的行动能力和访问范围分四级管理：

| 等级 | 行为 | 对应控制 |
| --- | --- | --- |
| Observe | 只读、检索、监控 | 访问范围、日志 |
| Advise | 建议、草稿、排序 | 人工执行、结果复核 |
| Act with Approval | 逐项等待人批准后行动 | 审批、动作审计、拒绝路径 |
| Act Autonomously | 在护栏内自主行动 | 持续监控、阈值熔断、快速回滚、责任归属 |

## 今日信号（2026-07-17）

- Gartner 认为统一治理会导致企业 agent 失败，并提出以上四级自治模型；Level 4 需要持续监控、强制护栏、快速回滚、阈值熔断和明确 ownership。[来源](https://www.gartner.com/en/newsroom/press-releases/2026-05-26-gartner-says-applying-uniform-governance-across-ai-agents-will-lead-to-enterprise-ai-agent-failure)
- 今日研究将这个模型与 Google 的身份/网关能力、OpenAI 的审批/Compliance API 以及 Snowflake 的治理清单连接起来：自治分级必须落到产品控制和运营证据上，而不是停在概念图。[Snowflake 治理指南](https://www.snowflake.com/en/artificial-intelligence/ai-governance/)

## 相关页面

- [[AI Agent企业导入与协作]] — 企业导入前的权限、审批和回滚问题
- [[Agent身份与权限]] — agent 代表谁以及能访问什么
- [[Agent记忆治理]] — 记忆如何影响后续行动
- [[框架库]] — 可复用的自治等级与控制匹配框架
