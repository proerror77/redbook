# Wiki 操作日志

> Append-only。格式：`## [日期] 操作类型 | 描述`
> 操作类型：ingest | query | lint | migrate

## [2026-04-17] ingest | 别再闭门写代码了-先聊用户再写产品 发布

触及页面：2个
- `wiki/选题/创业与一人公司.md` — 新增已产出内容条目
- `wiki/素材/金句库.md` — 提炼 3 条金句

关键洞察：
- Reddit「害怕想法被偷」（92赞/210评）是强共鸣素材，可复用于创业类选题
- 「结论前置」型 Hook（rileybrown 风格）适合反常识观点类内容

---

## [2026-04-17] migrate | 素材库迁移至 wiki/素材/
触及页面：4个（金句库、案例库、框架库、index.md）
关键更新：废弃独立素材库，统一进 wiki 知识底座

---

## [2026-04-16] query | AI工具正在从聊天框变成真正能交付结果的工具 多平台发布收尾

来源：`01-内容生产/03-已发布的选题/2026-04-15-AI工具正在从聊天框变成真正能交付结果的工具-X长帖.md` + `01-内容生产/03-已发布的选题/2026-04-16-AI工具正在从聊天框变成真正能交付结果的工具-小红书图文稿.md` + `xhs-images/ai-tool-workflow-shift/*`

触及页面：4个
- `01-内容生产/03-已发布的选题/2026-04-15-AI工具正在从聊天框变成真正能交付结果的工具-X长帖.md` — 补齐 X / 小红书双平台发布状态
- `01-内容生产/03-已发布的选题/2026-04-16-AI工具正在从聊天框变成真正能交付结果的工具-小红书图文稿.md` — 记录图组与已发布状态
- `tasks/progress.md` — 记录小红书发布完成与 note id 待补
- `xhs-images/ai-tool-workflow-shift/` — 保存 7 张实际发布图组

关键洞察：
- 这条内容在 X 上更适合“引用 Claude Code 视频的单篇长帖”，在小红书上更适合“用户体感先行的 7 页图文”。
- 当前多平台已完成，剩余只是一项运营收尾：补抓小红书 `note id`。

---

## [2026-04-15] ingest | 社交媒体趋势研究与选题筛选

来源：`Hacker News` + `Product Hunt` + `Reddit(r/Entrepreneur,r/SaaS,r/startups)` + `05-选题研究/X-每日日程-2026-04-12.md` + `wiki/选题/*`

触及页面：6个
- `05-选题研究/社交媒体趋势-2026-04-15.md` — 今日社媒趋势研究报告
- `wiki/选题/AI工具与效率.md` — 补充今日 `agent / workflow / guardrails / local private AI` 信号
- `wiki/选题/内容创作与增长.md` — 补充今日内容形态判断：结果更近、成本更真、案例更具体
- `wiki/index.md` — 更新相关页面最后更新时间
- `tasks/todo.md` — 记录本轮趋势研究任务与 review 结论
- `tasks/progress.md` — 记录本轮研究摘要

关键洞察：
- 今天社媒真正放大的不是“AI 新闻”，而是 `agent 接管工作流`
- AI 工具内容继续从“能力展示”切到“ROI、成本、可控性”
- 创业内容今天更吃现金流、定价、需求验证，不吃空泛愿景

---

## [2026-04-13] query | 小红书笔记导出数据复盘与方法论沉淀

来源：`/Users/proerror/Downloads/笔记列表明细表.xlsx` + `04-内容数据统计/数据统计表.md` + 最近 `2026-04-07` 至 `2026-04-12` 已发布小红书稿件

触及页面：6个
- `wiki/方法论/标题创作.md` — 新增小红书标题规则、高转化案例与低表现案例提醒
- `wiki/方法论/爆款规律.md` — 新增 7 条样本的点击漏斗复盘
- `wiki/选题/内容创作与增长.md` — 回写最近一轮小红书偏弱的原因
- `wiki/index.md` — 更新相关页面最后更新时间
- `tasks/todo.md` — 将这轮复盘补成已完成的知识沉淀动作
- `tasks/progress.md` — 记录这轮数据复盘已进入 wiki

关键洞察：
- 这轮样本的主瓶颈是点击，不是简单的“内容没人看完”。
- 小红书第一击更吃“具体问题 + 明确结果”，不吃“行业评论式判断”。
- 抽象词如 `Prompt`、`Harness`、`工作流`、`工程化` 不适合做小红书主标题第一钩子。
- 标题、封面、正文前两屏一旦承诺不一致，点击和承接会一起掉。
- 账号短期同时打多类人群时，平台标签会漂，分发会更不稳定。

---

## [2026-04-10] ingest | X 每日日程 + HN 热点 + Reddit 监控

触及页面：5 个
- `wiki/选题/AI工具与效率.md` — 补充今日信号：LangChain Deep Agents Deploy、OpenAI Codex 插件、ChatGPT $100/月套餐、DHH 态度转变、Claude Code 成本优化讨论
- `wiki/选题/内容创作与增长.md` — 补充今日信号：emilkowalski 判断力角度、Thariq 内容资产化
- `wiki/选题/创业与一人公司.md` — 补充今日信号：Reddit 加法陷阱、复利习惯
- `wiki/选题/独立开发者.md` — 补充今日信号：AI 重度用户≠高产悖论、Claude Code 成本优化
- `wiki/index.md` + `wiki/overview.md` — lint 修复：补录孤立页面 X-长文与Thread写作架构、更新日期

关键洞察：
- AI Agent 基础设施竞争加剧：LangChain 推出 Deep Agents Deploy 直接对标 Claude Managed Agents，开源 vs 托管的路线分化开始明显
- AI 工具祛魅：开发者社区出现"AI 重度用户≠高产"的反思，这是高价值选题切入点
- 成本意识觉醒：用户开始主动从 Claude Code 迁移到 Zed+OpenRouter，多模型路由成为新趋势

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

## [2026-04-12] ingest | 补发《用 AI 越多，大脑越废？》到 X.com

来源：`01-内容生产/03-已发布的选题/2026-04-11-用AI越多大脑越废.md`

触及页面：7个
- `01-内容生产/03-已发布的选题/2026-04-11-用AI越多大脑越废.md` — 回填 X.com 发布信息并归档
- `01-内容生产/03-已发布的选题/2026-04-11-用AI越多大脑越废-article.md` — 记录 article 尝试稿未采用的原因
- `wiki/选题/AI认知萎缩与依赖.md` — 追加已发布内容链接
- `tasks/todo.md` — 新增本轮排障 / 补发任务与 review 结论
- `tasks/progress.md` — 记录这次漏发排查与补发闭环
- `tasks/lessons.md` — 记录“不要锚定单一 X 脚本”的新规则
- `x-to-markdown/0xcybersmile/2043151115399942583.md` — 保存发布后回查证据

关键洞察：
- 这次真正失败的不是文稿，而是发布载体判断：`x-thread.ts` 在当前 X compose 页面上踩中了隐藏 editor / 失效 addButton 假设
- `compose/articles` 的官方流程仍要求 `Articles -> Write`，但当前账号实际页面只有导航，没有 `Write` / editor，说明 article 入口与脚本假设暂时对不上
- 过去仓库里标成“X.com 长文”的成功样例，实际至少有一部分是 `tweet` 形态的单条长帖；当正文长度合适时，改走 `x-browser.ts` 才是当前最稳路径

## [2026-04-12] ingest | 发布《团队 AI 化后真正缺的不是 Prompt，是 Harness Engineering》

来源：`01-内容生产/03-已发布的选题/2026-04-12-团队AI化后真正缺的不是Prompt，是Harness Engineering.md`

触及页面：7个
- `01-内容生产/03-已发布的选题/2026-04-12-团队AI化后真正缺的不是Prompt，是Harness Engineering.md` — 回填 X / 小红书发布信息并归档
- `01-内容生产/01-待深化的选题/团队AI化后真正缺的不是Prompt，是Harness Engineering.md` — 保存今日市场信号版 brief
- `tasks/todo.md` — 记录本轮发布任务与 review 结论
- `tasks/progress.md` — 追加本轮发布闭环
- `tasks/lessons.md` — 记录 X 图文粘贴链路失效、需改浏览器原生上传的规则
- `wiki/log.md` — 回填本轮 ingest 记录
- `x-to-markdown/0xcybersmile/2043201922392633769.md` — 保存 X 侧公开证据

关键洞察：
- 这个题今天成立，不是因为“AI 写代码会变差”这种单点情绪，而是因为 Reddit、HN、X 三条信号都在指向同一个底层问题：团队已经 AI 化了，但没有把 harness / eval / verification 结构补上
- X 图文帖在当前机器上，最不稳的不是正文，而是图片挂载；脚本日志显示成功不代表最终公开帖一定带图
- 小红书这边复用现成图组比重新生图更稳，只要视觉判断和主题足够接近，就能更快完成真实发布

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

## [2026-04-09] query | X 爆文结构升级

来源：X 站内高互动样本 + 当前在制文稿对照

触及页面：2个
- `wiki/方法论/X-长文与Thread写作架构.md` — 新建 X 长文 / Thread 的写作骨架与检查清单
- `wiki/方法论/爆款规律.md` — 回写这轮新增的 X 长文 / Thread 结构规律

关键洞察：
- 高传播观点帖的关键不是“观点更猛”，而是先打断旧认知，再立刻给具体场景
- 高书签工具帖的关键不是“功能更多”，而是先给结果，再给流程，再补部署门槛与成本
- X Article 不适合顺叙型写法，最稳的骨架是：现象 -> 证据 -> 规则变化 -> 读者站位

## [2026-04-09] query | 批量迁移剩余 X 稿件到新骨架

来源：基于 `X-长文与Thread写作架构` 对在制稿件做第二轮迁移

触及页面：6个
- `01-内容生产/02-制作中的选题/2026-03-25-LiteLLM供应链投毒/X-主帖.md`
- `01-内容生产/02-制作中的选题/2026-03-25-GPT-5.4前沿数学/X-主帖.md`
- `01-内容生产/02-制作中的选题/2026-03-31-Claude-Code-NPM源码泄露/X-主帖.md`
- `01-内容生产/02-制作中的选题/2026-03-10-AgentHub/X-主帖.md`
- `01-内容生产/02-制作中的选题/2026-04-05-从在业务里工作到在业务上工作.md`
- `01-内容生产/02-制作中的选题/2026-02-16-OpenClaw加入OpenAI/推文草稿.md`

关键洞察：
- 热点评论帖最容易犯的错是“先讲背景”，修法是第一句直接给判断。
- 工具分析帖的书签价值来自“门槛信息”，不来自功能堆叠。
- 多版本草稿会拖慢后续执行；对内容生产系统来说，推荐终稿比保留 3 套平级版本更有价值。

## [2026-04-10] query | 内容工作流防同质化审计

来源：用户提供关于平台审核池、AI 辅助比例、同质化与情绪密度的经验，要求检查 redbook 工作流是否会犯同样问题

触及页面：4个
- `docs/shared/redbook-playbook.md` — 新增 `AI 辅助安全线`、`情绪密度检查`、`发布前内容风控（强制）`
- `03-方法论沉淀/X-长文与Thread写作架构.md` — 新增 `情绪密度` 与 `去模板化` 检查项
- `AGENTS.md` — 通过 shared playbook sync 同步更新
- `CLAUDE.md` — 通过 shared playbook sync 同步更新

关键洞察：
- redbook 原有流程偏“素材检索、结构 QA、发布清单”，缺的不是更多创作动作，而是内容风控门
- 平台高风险通常不是单一 AI 痕迹，而是 `AI 味重 + 同质化高 + 情绪密度低` 的组合
- 最小正确修法不是禁止 AI，而是把 AI 限定在初稿层，并把人工素材嵌入和发布前四检显式化

## [2026-04-09] query | 放弃“部署战争”长文主线

来源：用户明确反馈 `AI 已经从模型战争，进入部署战争` 这篇“写得很不好”，不想继续要这篇

触及页面：3个
- `01-内容生产/选题管理/已放弃选题/2026-04-06-AI已经从模型战争进入部署战争.md` — 从制作中移出，改为废弃归档
- `wiki/选题/AI工具与效率.md` — 移除“制作中内容”身份，改记为已放弃
- `wiki/选题/低token-本地AI-端侧模型.md` — 去掉原先那句直接沿用“部署战争”标题的建议

关键洞察：
- “模型战争 / 部署战争”这种大词判断，如果没有先落到具体用户痛点，很容易显得自说自话。
- 同一个研究主题可以保留，但切口必须换；用户否掉的往往不是研究方向本身，而是表达框架。

## [2026-04-12] ingest | 发布《团队 AI 化后真正缺的不是 Prompt，是 Harness Engineering》

来源：`01-内容生产/03-已发布的选题/2026-04-12-团队AI化后真正缺的不是Prompt，是Harness Engineering.md`

触及页面：8个
- `01-内容生产/01-待深化的选题/团队AI化后真正缺的不是Prompt，是Harness Engineering.md` — 保存今日市场信号版 brief
- `01-内容生产/03-已发布的选题/2026-04-12-团队AI化后真正缺的不是Prompt，是Harness Engineering.md` — 回填 X / 小红书发布信息并归档
- `tasks/todo.md` — 回填本轮发布任务与 review 结论
- `tasks/progress.md` — 追加本轮真实发布闭环
- `tasks/lessons.md` — 记录 X 图文粘贴链路失效、需切浏览器原生上传的规则
- `wiki/log.md` — 记录本轮 ingest 证据
- `docs/reports/2026-04-12-harness-engineering-publish-record.md` — 保存双平台发布记录
- `x-to-markdown/0xcybersmile/2043201922392633769.md` — 保存 X 侧公开证据

关键洞察：
- 这条内容今天成立，不是因为单一热点，而是因为 Reddit、HN、X 三条信号都指向同一个底层问题：团队已经 AI 化了，但没有把 harness / eval / verification 结构补上。
- X 图文帖在当前机器上，真正不稳的是图片挂载；脚本显示“提交成功”不代表最终公开帖一定带图。
- 小红书复用已有图组比重新生图更稳，只要主题判断一致，就能更快完成真实发布并拿到后台记录。

## [2026-04-17] ingest | Opus 4.7 发布速评 + 工作流升级

触及页面：3个
- `wiki/选题/AI工具与效率.md` — 新增 Opus 4.7 速评发布记录
- `wiki/素材/` — 新建金句库/案例库/框架库（从 02-内容素材库 迁移）
- `wiki/index.md` — 新增素材目录区块

关键更新：
- Opus 4.7 agentic coding +10.9%，visual reasoning +13%，Mythos Preview 神秘出现
- 工作流升级为三条路径，wiki 成为唯一知识底座，素材库已归档

## [2026-04-17] query | X 发帖文案与今日小红书候选盘点

来源：`https://x.com/i/status/2044882275100250444` + `tasks/progress.md` + `01-内容生产/02-制作中的选题/` + `wiki/log.md`

触及页面：3个
- `tasks/todo.md` — 回填本轮任务的执行状态与 review 结论
- `tasks/progress.md` — 记录本轮 X 草稿已就绪与小红书候选优先级
- `wiki/log.md` — 记录本次 query 证据

关键洞察：
- 这条 X 原帖本身几乎没有论证，价值在于“flow 很顺”的体感，因此跟帖/转述文案更适合极简、强体感，而不是写成长解释。
- 对今天的小红书发布，最佳选题和最低成本选题不是同一个：前者是 `别再闭门写代码了，先聊用户，再写产品`，后者是 `AI办公进入代做时代`。

## [2026-04-17] ingest | 改回 skill 链路处理 X 发布与小红书待发准备

来源：`/Users/proerror/Documents/redbook/.agents/skills/baoyu-post-to-x/SKILL.md` + `~/.codex/skills/xiaohongshu-skills/SKILL.md` + `01-内容生产/02-制作中的选题/2026-04-08-AI办公进入代做时代/*`

触及页面：4个
- `tasks/todo.md` — 回填 X 已发布、小红书待确认的状态
- `tasks/progress.md` — 记录这轮 skill 发布结果
- `wiki/log.md` — 记录本轮 ingest
- `01-内容生产/02-制作中的选题/2026-04-17-别再闭门写代码了-先聊用户再写产品-小红书图文稿.md` — 新增最该发选题的小红书版

关键洞察：
- 对 X / 小红书这种站点写操作，仓库里已经有明确 skill 主链，不该再用 computer use 临时接管。
- 今天的小红书如果追求“先发出去”，`AI办公进入代做时代` 是最短路径，因为文案、标题文件和 5 张最终图片都已存在。

## [2026-04-17] query | 小红书后台核实旧稿已发，并准备含 Codex 例子的 V2

来源：`python scripts/cdp_publish.py content-data`（创作者后台） + `01-内容生产/02-制作中的选题/2026-04-08-AI办公进入代做时代/*`

触及页面：4个
- `tasks/progress.md` — 追加后台核实结果与 V2 准备状态
- `wiki/log.md` — 记录本轮 query 证据
- `小红书-图文稿-v2.md` — 新增加入 `GPT Codex APP / computer use` 例子的升级版稿件
- `xhs-title-v2.txt` / `xhs-content-v2.txt` — 新增可直接发布的 V2 输入文件

关键洞察：
- `AI办公进入代做时代` 不是待发稿，而是已经发过且拿到真实数据的旧稿。
- 这次更合理的动作不是“补发旧稿”，而是发一个加入 `computer use` 新例子的 V2。

## [2026-04-17] ingest | GPT Codex APP 新闻稿图组就绪

来源：`xhs-images/gpt-codex-computer-use/*` + `2026-04-17-GPT-Codex-APP-computer-use-小红书图文稿.md`

触及页面：5个
- `xhs-images/gpt-codex-computer-use/analysis.md` — 完成内容分析
- `xhs-images/gpt-codex-computer-use/outline*.md` — 完成三套策略与最终方案
- `xhs-images/gpt-codex-computer-use/prompts/*` — 完成 5 张图的 prompt
- `xhs-images/gpt-codex-computer-use/*.png` — 完成 5 张可发布图卡
- `2026-04-17-GPT-Codex-APP-computer-use-xhs-title.txt` / `...-xhs-content.txt` — 完成发布输入文件

关键洞察：
- 这条内容更适合“新闻 + 判断”的小红书结构，而不是继续复用旧稿的长判断框架。
- 外部 AI 出图后端当前不稳定，但这种 `notion 风` 信息卡完全可以 repo-native 生成，不必卡在外部额度。

## [2026-04-17] ingest | Tuzi 文档路径验证完成，正式图组生成完毕

来源：Tuzi Apifox 文档 + `xhs-images/gpt-codex-computer-use/tuzi/*`

触及页面：4个
- `baoyu-image-gen/scripts/providers/tuzi.ts` — 修复 Tuzi 旧模型别名兼容
- `tasks/progress.md` — 记录 Tuzi 主链打通与 5 张图完成
- `wiki/log.md` — 记录本轮 ingest
- `xhs-images/gpt-codex-computer-use/tuzi/*.png` — 5 张正式图组

关键洞察：
- 这次不是余额问题，而是调用路径与环境模型配置不一致。
- 一旦按文档切回 `images/generations + gemini-3.1-flash-image-preview`，Tuzi 主链是能稳定产图的。

## [2026-04-17] ingest | GPT Codex 小红书新闻稿已提交审核

来源：`publish_pipeline.py --auto-publish` + 创作者后台 `content-data`

触及页面：3个
- `tasks/todo.md` — 将本轮状态更新为已发布、待补数据
- `tasks/progress.md` — 记录发布日志与验证缺口
- `wiki/log.md` — 记录本轮 ingest

关键洞察：
- 标题长度确实是这次发布链路里的真实阻塞点，缩成 `AI 开始接手桌面工作了` 后，真实点击发布按钮可以进入成功页。
- 最终强证据来自 `笔记管理`：新标题已出现，状态为 `审核中`，并已补到 `note id = 69e1eaf1000000002102c31c`。这比脚本 stdout 或统计面板更可靠。

## [2026-04-18] ingest | Claude Design 双平台执行结果

来源：`baoyu-post-to-x` + 小红书发布 skill + 平台侧回查

触及页面：3个
- `tasks/progress.md` — 记录这轮双平台执行的最终状态
- `wiki/log.md` — 记录本轮 ingest
- `Claude Design` 相关内容稿 / 图组 — 保持为可重试资产

关键洞察：
- X 端这条 `Claude Design` quote-post 已成功发出。
- 小红书端这条内容不是“延迟未刷新”，而是平台端没有真正接收提交；重复点击并不能解决，需要回到页面校验和平台限制去排查。

## [2026-04-20] ingest | Vercel 托管平台安全风险转评已发出

来源：`baoyu-post-to-x/scripts/x-browser.ts` + `https://vercel.com/kb/bulletin/vercel-april-2026-security-incident`

触及页面：3个
- `01-内容生产/02-制作中的选题/2026-04-20-Vercel-托管平台安全风险-X转评.txt` — 最终发布文案
- `tasks/progress.md` — 记录本轮发布与验证结果
- `wiki/log.md` — 记录本轮 ingest

关键洞察：
- 这条内容延续了既有判断：AI 工作流真正脆弱的，往往不是模型，而是模型外面那圈默认信任的基础设施。
- 本轮发布强证据不是脚本 stdout，而是个人主页顶部已出现新帖，状态链接为 `https://x.com/0xcybersmile/status/2046049866112233653`。

## [2026-04-20] ingest | “中转站不是产品”X 单条帖已发出

来源：`baoyu-post-to-x/scripts/x-browser.ts` + `@gkxspace` / `@li9292` 当日讨论串

触及页面：3个
- `01-内容生产/02-制作中的选题/2026-04-20-中转站不是产品-X草稿.md` — 发布所用终稿版本
- `tasks/progress.md` — 记录本轮发布与验证结果
- `wiki/log.md` — 记录本轮 ingest

关键洞察：
- 这条内容的可写性不是凭感觉判断，而是来自真实讨论热度：`@gkxspace` 主帖已形成“中转站 vs 产品”的争议串，`@li9292` 又补了一层中转层风险。
- 本轮发布强证据是个人主页顶部已出现新帖，状态链接为 `https://x.com/0xcybersmile/status/2046134846070968695`。

## [2026-04-21] ingest | Kimi K2.6 长链路 Agent X 长帖已发出

来源：`05-选题研究/Kimi-K2.6-选题研究-2026-04-21.md` + `baoyu-post-to-x/scripts/x-browser.ts`

触及页面：3个
- `01-内容生产/02-制作中的选题/2026-04-21-Kimi-K2.6-长链路-agent-X长帖.md` — 发布所用终稿与状态链接
- `tasks/progress.md` — 记录本轮发布与配图/链接判断
- `wiki/log.md` — 记录本轮 ingest

关键洞察：
- Kimi K2.6 更值得写的不是 benchmark 排名，而是长链路、长时间运行与 Agent Swarm 将 AI 编程竞争从 `chat` 推向 `run`。
- 本轮发布强证据是个人主页顶部已出现新帖，状态链接为 `https://x.com/0xcybersmile/status/2046453935163195457`。
- 当前主帖未配图、未放链接；更适合把 Kimi 官方新闻链接放在第一条回复，而不是塞进主帖。
- 已补官方链接回复，回复链接为 `https://x.com/0xcybersmile/status/2046553016028078209`。

## [2026-04-21] ingest | Cloudflare Agent Cloud runtime X 长帖已发出

来源：Cloudflare 官方 `Project Think` / `Browser Run` / `Registrar API` / `AI Gateway` / OpenAI Agent Cloud 资料 + `baoyu-post-to-x/scripts/x-browser.ts`

触及页面：3个
- `01-内容生产/02-制作中的选题/2026-04-21-Cloudflare-Agent-Cloud-runtime-X长帖.md` — 发布所用终稿与状态链接
- `tasks/progress.md` — 记录本轮发布、审稿与验证结果
- `wiki/log.md` — 记录本轮 ingest

关键洞察：
- Cloudflare 这轮不是单点 agent 功能，而是在补一整套 agent production runtime：持久执行、记忆、浏览器、人类接管、沙箱、模型网关、域名注册和 OpenAI sandbox 集成。
- 本轮按用户要求将官方 `Project Think` 链接放进主帖主体。
- 本轮发布强证据是个人主页顶部已出现新帖，状态链接为 `https://x.com/0xcybersmile/status/2046579124765139445`。

## [2026-04-22] ingest | GPT Image 2 vs Nano Banana X 长帖已发出

来源：`05-选题研究/选题建议-2026-04-22.md` + OpenAI 官方发布页 + Google Nano Banana Pro 资料 + `baoyu-post-to-x/scripts/x-browser.ts`

触及页面：3个
- `01-内容生产/02-制作中的选题/2026-04-22-GPT-Image-2-vs-Nano-Banana-X长帖.md` — 发布所用终稿与状态链接
- `tasks/progress.md` — 记录本轮发布、审稿与验证结果
- `wiki/log.md` — 记录本轮 ingest

关键洞察：
- 这条内容不比较“谁画图更好”，而是比较 OpenAI 和 Google 谁更接近视觉工作流入口。
- OpenAI 路线偏 `ChatGPT / Codex / agent workflow`；Google 路线偏 `Google Photos / Personal Intelligence / Workspace / Ads`。
- 本轮发布强证据是个人主页顶部已出现新帖，状态链接为 `https://x.com/0xcybersmile/status/2046749045771903444`。

## [2026-04-22] ingest | SpaceX / Cursor 合作新闻 X 转评已发出

来源：SpaceX 官方 X 原帖 + Reuters / TechCrunch / Cursor 官方合作说明

触及页面：3个
- `01-内容生产/02-制作中的选题/2026-04-22-SpaceX-Cursor-X转评.md` — 发布所用中文转述、短评与状态链接
- `tasks/progress.md` — 记录本轮发布、审稿与验证结果
- `wiki/log.md` — 记录本轮 ingest

关键洞察：
- 这条新闻最值得写的不是 `$60B` 本身，而是 Cursor 和 xAI / SpaceX 的互补：Cursor 补模型和算力，xAI 补专业工程师工作流入口。
- AI coding 竞争正在从 IDE 体验升级成 `入口 + 算力 + 模型 + 真实工程数据` 的整合战。
- 本轮发布强证据是个人主页顶部已出现新帖，状态链接为 `https://x.com/0xcybersmile/status/2046752723664818287`。

## [2026-04-23] ingest | Polymarket 天气传感器 X 短文已发出

来源：`05-选题研究/选题建议-2026-04-23.md` + Bitcoin.com / GNcrypto 新闻核验 + `baoyu-post-to-x/scripts/x-browser.ts`

触及页面：3个
- `01-内容生产/02-制作中的选题/2026-04-23-Polymarket-天气传感器-X短文.md` — 发布所用短文与状态链接
- `tasks/progress.md` — 记录本轮发布、审稿与验证结果
- `wiki/log.md` — 记录本轮 ingest

关键洞察：
- 这条内容的传播点不是“吹风机很荒诞”，而是预测市场的结算 oracle 如果绑定单一物理传感器，传感器本身就会变成金融攻击面。
- 本轮按用户要求给主帖配新闻链接。
- 本轮发布强证据是个人主页顶部已出现新帖，状态链接为 `https://x.com/0xcybersmile/status/2047135340281176398`。

## [2026-04-24] ingest | “Agent 进入执行层”X 长帖已发出

来源：`05-选题研究/选题建议-2026-04-24.md` + `baoyu-post-to-x/scripts/x-browser.ts`

触及页面：3个
- `01-内容生产/02-制作中的选题/2026-04-24-Agent-进入执行层-X长帖.md` — 发布所用长帖与状态链接
- `tasks/progress.md` — 记录本轮发布、审稿与验证结果
- `wiki/log.md` — 记录本轮 ingest

关键洞察：
- 这条内容把 OpenAI Codex Auto-review、Claude Managed Agents Memory、腾讯 Cube Sandbox 收束成一个更强的判断：agent 正在从工具层进入执行层。
- 重点不是“更聪明”，而是能不能在更长流程里自己 review、自己记忆、自己跑完。
- 本轮发布强证据是个人主页顶部已出现新帖，状态链接为 `https://x.com/0xcybersmile/status/2047473284732838313`。

## [2026-04-27] query | Agent 入口从聊天框进入工作流

来源：`05-选题研究/X-Timeline-2026-04-28-continued-051251.md` + `wiki/选题/AI工具与效率.md` + `wiki/素材/金句库.md`

触及页面：4个
- `05-选题研究/X-Timeline-2026-04-28-continued-051251.md` — 今日 Timeline 研究报告与选题判断
- `wiki/选题/AI工具与效率.md` — 账号主线与 AI 工具 ROI / workflow 相关素材
- `wiki/素材/金句库.md` — “聊天框 vs 工作流”“回答 vs 交付”等表达锚点
- `01-内容生产/02-制作中的选题/2026-04-28-Agent-入口从聊天框进入工作流/X长帖.md` — 本轮草稿产物

关键洞察：
- 今天值得写的不是单个工具，而是 Agent 入口迁移：从聊天框进入邮箱、浏览器、IDE、本地代码图谱和后台任务队列。
- “聊天框解决回答，工作流解决交付”可以作为本文核心表达。
- 本轮只完成到发布候选，尚未发布；需要用户明确确认后再进入 X 发布和状态 URL 验证。

## [2026-04-27] ingest | gpt-realtime-1.5 voice control X 短评已发出

来源：OpenAI `realtime-voice-component` GitHub + OpenAI `gpt-realtime-1.5` model docs + `baoyu-post-to-x/scripts/x-browser.ts`

触及页面：4个
- `05-选题研究/gpt-realtime-voice-control-2026-04-28.md` — 来源核对与选题判断
- `01-内容生产/02-制作中的选题/2026-04-28-gpt-realtime-voice-control-短评/X短评.md` — 发布所用短评与审稿
- `01-内容生产/02-制作中的选题/2026-04-28-gpt-realtime-voice-control-短评/发布记录.md` — 状态 URL 和可见性证据
- `tasks/progress.md` — 本轮发布验证摘要

关键洞察：
- `realtime-voice-component` 不应被写成正式 production UI kit；它更像 OpenAI 给出的 React/browser voice controls 参考实现。
- 这条更值得写的判断是：语音正在从聊天入口变成 App 状态控制层，核心是窄工具、状态所有权和可见变化。
- 本轮发布强证据是个人主页顶部已出现新帖，状态链接为 `https://x.com/0xcybersmile/status/2048880394821660814`。

## [2026-04-28] ingest | X 每日选题分流与账号主线修正

来源：用户对账号主线和每日资讯结构的明确要求

触及页面：5个
- `wiki/方法论/X每日选题分流与知识沉淀.md` — 新增每日选题分流规则、AI/Crypto 时事边界和 LLM Wiki 沉淀流程
- `wiki/选题/AI Agent企业导入与协作.md` — 新增账号主线选题页
- `wiki/选题/Crypto与AI时事评论.md` — 新增 Crypto / AI x Crypto 轻量时事评论边界
- `wiki/选题/AI工具与效率.md` — 补充账号定位修正和相关页面
- `wiki/index.md` / `wiki/overview.md` — 更新索引和知识库状态

关键洞察：
- `@0xcybersmile` 的主线应稳定围绕 AI Agent、企业导入、协作方式、workflow 和小技巧。
- AI 与 Crypto 资讯需要保留，但不能变成泛资讯搬运；AI 时事要回到 agent / workflow / 企业导入，Crypto 时事要回到 oracle / 权限 / 自动化 / 结算 / 风控。
- 每日 LLM Wiki 的价值不是存新闻，而是把每天的新信号沉淀成长期选题页、方法论页、框架和案例。
