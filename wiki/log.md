# Wiki 操作日志

> Append-only。格式：`## [日期] 操作类型 | 描述`
> 操作类型：ingest | query | lint | migrate

---

## [2026-04-07] query | 审计 LLM Wiki workflow 是否有真实启动痕迹

来源：用户指出“已经形成 LLM Wiki workflow，但没有看到它真正启动过”

触及页面：4个
- `CLAUDE.md` — 确认存在 `Wiki Schema（LLM 知识库维护规范）`
- `tasks/harness/runs/` — 确认此前没有任何一个独立的 LLM Wiki run
- `tasks/todo.md` — 新增“把 LLM Wiki 从规范补成显式工作流”任务
- `docs/reports/2026-04-07-llm-wiki-workflow-gap.md` — 固化缺口与修复方案

关键洞察：
- 当前系统有 LLM Wiki 的规则层和结果层，但没有运行层证据
- `wiki/log.md` 里的 ingest/query 记录不能替代 workflow 启动痕迹
- 本轮已补出第一条显式 run：`20260407-050729-llm-wiki-ingest-显式化-a7fdd7`

## [2026-04-07] ingest | 发布“爆款研究观众”与“Galileo-0”到 X.com / 小红书

来源：`01-内容生产/03-已发布的选题/2026-04-07-为什么产不出稳定爆款.md`、`01-内容生产/03-已发布的选题/2026-04-07-Galileo-0-AI视频瑕疵检测.md`

触及页面：8个
- `01-内容生产/03-已发布的选题/2026-04-07-为什么产不出稳定爆款.md` — 回填小红书 / X.com 发布信息
- `01-内容生产/03-已发布的选题/2026-04-07-Galileo-0-AI视频瑕疵检测.md` — 回填小红书 / X.com 发布信息
- `01-内容生产/03-已发布的选题/2026-04-07-x-article-爆款研究观众.md` — 回填 X.com 发布信息
- `01-内容生产/03-已发布的选题/2026-04-07-x-article-Galileo-0.md` — 回填 X.com 发布信息
- `wiki/选题/AI工具与效率.md` — 记录 Galileo-0 这条已发布内容和“AI 质检基础设施”角度
- `wiki/选题/内容创作与增长.md` — 新建页面，沉淀“选题 vs 观众”框架
- `tasks/lessons.md` — 新增“已授权自动发布后不要再次确认”的规则
- `tasks/progress.md` — 记录本轮发布闭环

关键洞察：
- 小红书发布链路真正的坑不只是登录态，`publish_pipeline.py` 默认也只会把内容填到草稿页；必须显式带 `--auto-publish`，或额外补一次 `click-publish`
- “选题 vs 观众”适合做内容创作类长期主题，强在反常识切口和可执行信号
- Galileo-0 这类工具内容，最稳的写法不是“新工具介绍”，而是把它提升为“AI 质检基础设施”的行业信号

## [2026-04-07] ingest | 修复 opencli Browser Bridge 悬空扩展路径

来源：`opencli 1.6.8` 已升级，但 `doctor` 长期显示 `[MISSING] Extension`

触及页面：6个
- `tools/opencli/lib/runtime.js` — 新增 Browser Bridge 下载、解压、缓存目录和 package `extension` symlink 修复逻辑
- `tools/opencli/scripts/install.js` — 安装时自动确保 Browser Bridge 扩展目录真实存在
- `tools/opencli/README.md` — 更新 Browser Bridge 的真实来源和恢复方式
- `tasks/lessons.md` — 记录 npm 包不带扩展、Chrome profile 路径悬空的教训
- `tasks/todo.md` — 更新 opencli 升级任务的 review 结论为“真实 verify 通过”
- `tasks/progress.md` — 记录本轮 bridge 修复与独立 Chrome bridge 实例

关键洞察：
- `opencli 1.6.8` 的 npm 包并不自带 Browser Bridge，扩展必须从 GitHub Releases 单独下载 `opencli-extension.zip`
- Chrome profile 里旧的 unpacked extension 记录仍指向 `packageDir/extension`；只要这个路径悬空，`doctor` 就会永远卡在 `[MISSING] Extension`
- 最稳的修法不是反复重装 npm 包，而是补齐扩展资产，并把 `packageDir/extension` 修成稳定可用的 symlink

## [2026-04-07] ingest | 升级 opencli 到 1.6.8 并修正 doctor/verify 契约

来源：将 `tools/opencli` 从旧版仓库 pin 升级到 `@jackwener/opencli 1.6.8`

触及页面：5个
- `tools/opencli/lib/runtime.js` — 将版本 pin 升到 `1.6.8`，并修复 manifest 缺失时的 patch 行为
- `tools/opencli/scripts/verify.js` — 不再只看 `doctor` exit code，改为校验正文状态
- `tools/opencli/lib/verify_helpers.js` — 新增 doctor 状态解析与失败原因归一化
- `tools/opencli/README.md` — 补充 `doctor` 在 `1.6.8` 下的真实验收规则
- `tasks/lessons.md` — 回填 `doctor` exit code 假阳性与 manifest 缺失的升级教训

关键洞察：
- `opencli 1.6.8` 的 `doctor` 失败不一定体现为非零退出码，桥接验收必须看正文里的 `Daemon / Extension / Connectivity`
- clean `1.6.8` 包默认没有 `dist/cli-manifest.json`，仓库 patch 代码必须改成“缺失则补写”，不能假设 manifest 先存在
- 这次升级后，代码侧已经完成；剩余唯一 blocker 是本机 Browser Bridge extension 尚未连接到主 Chrome

## [2026-04-07] ingest | 修复 X 收集链路的浏览器健康检查

来源：排查 `agent-browser-session` 在 `daily.sh` 中反复报 `Frame was detached`

触及页面：2个
- `tools/auto-x/scripts/x_utils.py` — 重写浏览器健康检查与自动恢复逻辑
- `tools/auto-x/tests/test_x_utils.py` — 新增回归测试，覆盖新版 snapshot 判定和 detached-frame 恢复

关键洞察：
- 问题不在 X 登录态，而在 `agent-browser-session` 的 session/target 偶发卡到坏 frame
- `ensure_browser()` 之前依赖旧版 `snapshot` 形态 `- document:`，对新版输出过于脆弱，连健康页面也可能误判为失败
- 正确修法不是简单重试 `snapshot`，而是区分可恢复错误，并在必要时重建 session 后回到 `https://x.com/home`

## [2026-04-07] ingest | 修复 X tweet 解析器并重跑今日日报

来源：浏览器恢复后，`daily.sh` 的 X 页面虽然能打开，但 `extract_tweets()` 仍持续返回 `0`

触及页面：5个
- `tools/auto-x/scripts/x_utils.py` — 兼容新版 `- article "..."` / `- 'article "..."'` 节点，补 article block 提取与头行解析
- `tools/auto-x/tests/test_x_utils.py` — 新增新版 article 结构回归测试
- `05-选题研究/X-每日日程-2026-04-07.md` — 重跑后恢复真实 X 研究结果
- `05-选题研究/HN-每日热点-2026-04-07.md` — 同步刷新当天 HN 数据
- `05-选题研究/Reddit-每日监控-2026-04-07.md` — 同步刷新当天 Reddit 数据

关键洞察：
- 新版 X a11y tree 的 tweet 节点已经不是旧代码假设的 `- article:`，而是带引号的 `article` 头行
- 对这类页面，真正稳定的做法不是先 split 掉头部，而是保留 article 头行再解析作者、互动数和 fallback 正文
- 修完 parser 后，正式 `daily.sh` 已恢复 X 结果，且本轮成功向 `01-内容生产/选题管理/00-选题记录.md` 追加了 5 条 X 选题

## [2026-04-07] query | 每日收集：HN / Reddit 成功，X 跳过

来源：`bash tools/daily.sh`

触及页面：3个
- `05-选题研究/X-每日日程-2026-04-07.md` — 今日日报总表，包含发布提醒、数据回顾、HN/Reddit 聚合结果
- `05-选题研究/HN-每日热点-2026-04-07.md` — 今日 HN 热点分析
- `05-选题研究/Reddit-每日监控-2026-04-07.md` — 今日 Reddit 热门与痛点监控

关键洞察：
- 今日 `daily.sh` 已成功完成 HN 与 Reddit 采集，并输出 3 份 `2026-04-07` 报告
- `X.com` 研究链路仍因 `agent-browser-session` 未响应被自动跳过
- 今天 HN 的高热 AI 讨论集中在 `Claude Code` 工程可用性争议与 `vibe coding` 反思；Reddit 侧高热痛点集中在 AI 爬虫、AI slop、增长与本地搜索转化

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
