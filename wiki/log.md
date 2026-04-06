# Wiki 操作日志

> Append-only。格式：`## [日期] 操作类型 | 描述`
> 操作类型：ingest | query | lint | migrate

---

## [2026-04-06] query | 深入研究：低 token / 本地 AI / 端侧模型

来源：`05-选题研究/X-每日日程-2026-04-06.md`、`HN-每日热点-2026-04-06.md`、`Reddit-每日监控-2026-04-06.md` + 官方文档

触及页面：2个
- `wiki/选题/低token-本地AI-端侧模型.md` — 新建页面，沉淀三层趋势：低 token、本地 AI、端侧模型
- `wiki/选题/AI工具与效率.md` — 新增 2026-04-06 今日信号，并挂接长期跟踪主题

关键洞察：
- AI 工具竞争开始从“谁更强”转向“谁更省、谁更快、谁离用户更近”
- `Caveman`、`Ollama/LM Studio + Claude Code`、`Gemma 4 + AI Edge Gallery` 不是散点新闻，而是一条连续的部署优化路线
- 未来更合理的 AI 系统分层是：云端做最复杂任务，本地做高频降本任务，端侧做实时与隐私敏感任务

## [2026-04-06] query | 长文母稿：AI 已经从模型战争进入部署战争

来源：`05-选题研究/2026-04-06-低token-本地AI-端侧模型-深度研究.md`

触及页面：1个
- `wiki/选题/AI工具与效率.md` — 新增长文母稿记录，作为该主题下的制作中内容

关键洞察：
- 这篇内容的最佳写法不是工具盘点，而是把 `Caveman`、`本地 Claude Code`、`Gemma 4 on-device agent` 收束成同一个判断
- 最强结论是“AI 已经从模型战争进入部署战争”
- 未来内容可继续拆成三篇：`token 成本`、`本地 AI`、`端侧 agent`

## [2026-04-06] ingest | redbook 最小 Harness Runtime

来源：基于现有 `Agent Team` 与 `工作流程图` 升级运行时骨架

触及页面：1个
- `AGENTS.md` — 新增 `Harness Runtime（最小实现）` 说明，明确 machine-readable run 的使用方式

关键洞察：
- redbook 当前最缺的不是更多 Agent 角色，而是最小运行时：`run state`、`stage gates`、`artifact trace`
- 把 `tasks/todo.md` 保留为人类可读任务板，同时补一个 `tasks/harness/runs/*.json` 作为机器可读状态，是最小但正确的升级路径
- 多 Agent 系统只要开始共享同一个 run，就必须处理并发写入；本轮已用 per-run file lock 解决第一层覆盖问题

## [2026-04-06] ingest | redbook Harness Verifier Layer

来源：基于最小 harness runtime 继续补齐 `verifier layer`

触及页面：2个
- `AGENTS.md` — 更新 Harness Runtime 使用说明，要求推进前先看 `verify-run` / `check-gates`
- `docs/plans/2026-04-06-redbook-harness-upgrade.md` — 将 `verifier layer` 从“待做”移动到“已实现”

关键洞察：
- 只有 `artifact exists + check=true` 的 gate 仍然太弱，用户或 agent 可以手工把状态“勾过去”
- verifier 最先该做的是结构检查，不是主观评分：标题、关键 section、长度、checklist 这些足够先拦住明显坏稿
- 把 verifier 接进 `check-gates` 与 `promote` 后，系统才真正开始具备“阶段推进受运行时约束”的味道

## [2026-04-06] ingest | redbook Harness Retry Policy

来源：基于 verifier 继续补齐 `retry / escalation policy`

触及页面：2个
- `AGENTS.md` — 新增 incident 记录与 `retry / escalate` 入口说明
- `docs/plans/2026-04-06-redbook-harness-upgrade.md` — 将 `retry / escalation policy` 从“待做”移动到“已实现”

关键洞察：
- 只有 verifier 还不够，系统仍然缺“失败后怎么办”这一层运行时语义
- 最小正确做法不是立刻自动恢复，而是先把失败显式化：incident、recommended action、retry budget、blocking stage
- 只要当前阶段还有未解决 incident，gate 就不该继续放行；否则 harness 仍然会被人为绕过

## [2026-04-05] query | x-create: 两篇长文发布后回写

来源：今日发布的两篇 X 长文

触及页面：3个
- `wiki/选题/AI工具与效率.md` — 新增已发布内容记录 + "消费 vs 积累"框架
- `wiki/选题/创业与一人公司.md` — 新增已发布内容记录 + "在业务里 vs 在业务上"框架
- `wiki/方法论/爆款规律.md` — 新增两篇文章，提炼对比框架、外部信号开头、结尾金句三个规律

关键洞察：
- 对比框架（两个对立状态 + 读者自我归类 + 结尾反问）是可复用的写作模式
- 用 HN/Reddit 真实数据做钩子比自己声称"这很重要"更有说服力



来源：`05-选题研究/X-每日日程-2026-04-05.md` + `Reddit-每日监控-2026-04-05.md`

触及页面：3个
- `wiki/选题/AI工具与效率.md` — 新增 HN 热点：OpenClaw 封禁争议、LLM Wiki 上榜、自蒸馏代码生成
- `wiki/选题/创业与一人公司.md` — 新增 Reddit 痛点：solo founder 草根创业、从执行到管理的转变
- `wiki/选题/独立开发者.md` — 新建页面，来自 Reddit solo dev 高热讨论

关键洞察：Reddit 独立创业者的核心焦虑"从在业务里工作到在业务上工作"与 AI 工具/系统化创作定位高度契合，是强选题角度。



从现有目录迁移内容，建立 wiki 结构。

迁移来源：
- `02-内容素材库/核心概念库/` → `wiki/概念/`
- `03-方法论沉淀/` → `wiki/方法论/`
- `02-内容素材库/核心概念库/写作风格拆解-@karminski3.md` → `wiki/创作者/@karminski3.md`

新建选题页：
- `wiki/选题/AI工具与效率.md`（从多份 X 每日研究提炼）
- `wiki/选题/创业与一人公司.md`

触及页面：8
