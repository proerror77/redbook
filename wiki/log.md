# Wiki 操作日志

> Append-only。格式：`## [日期] 操作类型 | 描述`
> 操作类型：ingest | query | lint | migrate

---

## [2026-04-09] query | X following 全量巡检与清理

来源：用户要求不要只看 6-8 个 watchlist，而是每天早上全量轮巡 `@0xcybersmile` 的 following，查看有没有新动态，并把失效/长期不活跃账号列入 unfollow 清理流程

触及页面：6个
- `tools/auto-x/scripts/audit_following.py` — 新增 following 全量巡检脚本
- `tools/auto-x/scripts/unfollow_from_audit.py` — 新增 unfollow dry-run / apply 脚本
- `tools/auto-x/scripts/run_daily.sh` — 将 following 巡检接入晨间自动任务
- `tools/auto-x/data/following_audit_latest.json` — 持续落盘审计结果
- `05-选题研究/X-following-巡检-2026-04-09.md` — 当前 following 巡检报告
- `tasks/harness/runs/20260409-014049-x-following-全量巡检与清理-2026-04-09-2764e3.json` — 本轮维护 run

关键洞察：
- `watchlist 研究` 和 `following 维护` 是两种不同任务：前者追求信噪比，后者追求覆盖率和账户卫生。
- unfollow 不该直接对“安静账号”动手，必须先分成 `强候选`（失效/冻结/长期停更）和 `待复核` 两层。
- 这类任务的正确形态不是一次性报告，而是“晨间自动巡检 + 中途持续落盘 + 用户确认后执行清理”。

## [2026-04-09] query | 基于完整 following 筛选 X 重点跟踪账号

来源：用户要求抓取 `@0xcybersmile` 的完整 following，并判断哪些账号值得长期跟踪，再查看其 timeline

触及页面：4个
- `tools/auto-x/data/following.json` — 刷新完整 following 缓存，当前批次 `scraped_at=2026-04-09`
- `05-选题研究/X-关注列表-0xcybersmile-2026-04-09.md` — 完整 following 原始清单
- `05-选题研究/X-following-重点跟踪-2026-04-09.md` — 重点跟踪账号与 timeline 摘要
- `tasks/harness/runs/20260408-235457-x-following-深度跟踪-2026-04-09-ae8032.json` — 本轮 following 研究 run

关键洞察：
- 真正有价值的不是“抓全 following”，而是把 `1407` 个账号压缩成一个高信噪比 watchlist。
- 对当前内容方向，最值得看的不是泛热门账号，而是三类源：官方开发者信号、方法论翻译者、把 AI 做成产品的 builder。
- 当前最优的核心跟踪名单是：`@OpenAIDevs`、`@claudeai`、`@turingou`、`@shannholmberg`、`@EverMind`、`@alin_zone`；如果要补商业化视角，再加 `@KevinNaughtonJr` 和 `@IndieDevHailey`。

## [2026-04-09] ingest | 修复今日外部情报链路的 source-specific 故障

来源：用户要求排查“为什么对外连不上”，而 `2026-04-09` 日报里同时出现 X 跳过、HN 空结果、Reddit 空结果

触及页面：6个
- `tools/auto-x/scripts/scrape_hackernews.py` — 为 Firebase API 增加 Algolia fallback
- `tools/auto-x/scripts/scrape_reddit.py` — 为 Reddit 官方匿名 JSON 增加 PullPush fallback
- `tools/auto-x/tests/test_external_source_fallbacks.py` — 新增外部源 fallback 回归测试
- `05-选题研究/X-每日日程-2026-04-09.md` — 今日研究总报告
- `docs/reports/wiki-ingest-2026-04-09.md` — 今日 ingest summary artifact
- `docs/reports/wiki-lint-2026-04-09.md` — 今日 lint report

关键洞察：
- 这次不是“整机外网断开”，而是 3 条链路分别坏在浏览器会话、HN Firebase SSL EOF、Reddit 官方匿名 JSON 403。
- 对外部源抓取器，最小正确修法不是继续空跑，而是给每个 source 提供独立 fallback，并把失败归因写清楚。
- LLM Wiki 的 `2026-04-09` ingest / lint gate 已经是绿的；真正需要修的是日报上游 source，而不是 wiki runtime 本身。

## [2026-04-08] ingest | 修复 LLM Wiki verifier 契约并补齐今日运行证据

来源：用户追问“LLM / Wiki / workflow 是否正确运行”，需要以当天真实 gate 状态而不是历史 run 存在性来回答

触及页面：7个
- `tools/redbook_harness/verifier.py` — 为 `wiki-query-*`、`wiki-lint-*`、`wiki-ingest-*` 增加专用 verifier 契约
- `tools/wiki_workflow.py` — 修正 query / lint 报告格式，并新增 ingest summary artifact 生成
- `tools/redbook_harness/tests/test_verifier.py` — 新增 verifier 回归测试
- `tools/redbook_harness/tests/test_wiki_workflow.py` — 新增 daily ingest summary 回归测试
- `docs/reports/wiki-ingest-2026-04-08.md` — 今日 ingest summary artifact
- `docs/reports/wiki-lint-2026-04-08.md` — 重新生成并通过 gate 的 lint 报告
- `docs/reports/wiki-query-内容创作-2026-04-08.md` — 重新生成并通过 gate 的 query 报告

关键洞察：
- `run 存在` 不等于 `workflow 已经正确运行`，最终判断必须以 `check-gates` 的 `ready` 为准。
- 对运营型 report 使用单一“长篇研究稿” verifier 会制造假红，必须按 report subtype 做契约校验。
- ingest 最稳的收口方式不是直接验证原始日报文件，而是生成一份专用 summary artifact，再让 gate 验这份汇总产物。

## [2026-04-07] ingest | 把 LLM Wiki workflow 补到最小完整状态

来源：继续把“是否完整”从口头判断收敛成可验证状态

触及页面：6个
- `tools/wiki_workflow.py` — 新增 `daily-cycle --date ...` 与 `query --attach-run-id ...`
- `tools/auto-x/scripts/run_daily.sh` — 日报完成后改为自动调用 `daily-cycle`
- `docs/reports/wiki-query-本地-ai-2026-04-07.md` — 首份挂接到内容 run 的 query 报告
- `tasks/harness/runs/20260407-134516-llm-wiki-query-本地-ai-2026-04-07-4eac53.json` — 首条带内容挂接的 query run
- `tasks/harness/runs/20260406-131247-ai-已经从模型战争进入部署战争-7d8fbc.json` — 已附加 query report artifact
- `docs/reports/2026-04-07-llm-wiki-workflow-gap.md` — 将 gap 报告更新为“最小完整 workflow”

关键洞察：
- `query` 天然是按主题触发，不该伪装成日报自动任务；正确做法是让它能附着到内容 run
- `daily` 侧真正该自动化的是 `ingest + lint`，因为这是知识库维护的固定周期动作
- 到这一步，LLM Wiki 已具备最小完整闭环：日报有自动维护，创作前有显式 query，三类动作都有 run / report / log 证据

## [2026-04-07] query | 为 LLM Wiki 增加显式 query 入口并完成首次查询

来源：继续把 LLM Wiki workflow 从 ingest 扩到 query / lint

触及页面：3个
- `tools/wiki_workflow.py` — 新增 `query --topic ... --date ...` 入口
- `docs/reports/wiki-query-内容创作-2026-04-07.md` — 首份显式 query 报告
- `tasks/harness/runs/20260407-065343-llm-wiki-query-内容创作-2026-04-07-064648.json` — 首条 query run

关键洞察：
- query 不能只说“我查了 wiki”，需要留下结构化命中结果
- 用主题关键词直接产出 query report，比只返回聊天摘要更适合后续挂接到内容 run
- 首次 query 已证明 `内容创作与增长`、`系统化创作`、`内容生产 Agent 思维` 等页面能被稳定命中

## [2026-04-07] lint | 为 LLM Wiki 增加显式 lint 入口并修复索引陈旧

来源：继续把 LLM Wiki workflow 从 ingest 扩到 query / lint

触及页面：5个
- `tools/wiki_workflow.py` — 新增 `lint --date ...` 入口
- `docs/reports/wiki-lint-2026-04-07.md` — 首份显式 lint 报告
- `tasks/harness/runs/20260407-065343-llm-wiki-lint-2026-04-07-d9dee3.json` — 首条 lint run
- `wiki/index.md` — 修复缺页、日期和页面总数
- `wiki/overview.md` — 修复过期快照日期

关键洞察：
- lint 不应该只报问题，还应该推动最小闭环修复
- 当前 wiki 的主要风险不是内容矛盾，而是索引和概览页容易落后于真实页面
- 跑完修复后，当前 lint 已经是全绿状态：缺页 0、悬挂引用 0、孤立页面 0、index 陈旧项 0、overview 陈旧 0

## [2026-04-07] ingest | 为每日研究接入显式 LLM Wiki ingest 启动器

来源：将 `LLM Wiki` 从“只有规则”推进到“每日研究后自动创建 ingest run”

触及页面：3个
- `tools/wiki_workflow.py` — 新增日报型 wiki ingest 启动器
- `tools/auto-x/scripts/run_daily.sh` — 日报完成后自动触发 `start-daily-ingest`
- `tasks/harness/runs/20260407-051553-llm-wiki-ingest-2026-04-07-90316a.json` — 首条自动化日报 ingest run

关键洞察：
- 仅靠 `wiki/log.md` 不能证明 workflow 启动过，必须把启动动作落到 harness run
- 最小正确做法不是立刻自动改写 wiki 页面，而是先让每日研究完成后留下显式 ingest run
- 这条入口现在已经幂等：同一天重复执行会复用同一条日报型 ingest run，而不是重复创建

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
