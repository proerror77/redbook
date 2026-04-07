# Session Progress Log

每次会话结束前，在此追加一条记录。格式固定，方便下次会话快速恢复上下文。

---

## [2026-04-07] 会话摘要

**完成了什么：**
- 将仓库 `tools/opencli` 的期望版本从 `1.5.5` 升到 `1.6.8`，并重放 redbook 补丁到全局 `@jackwener/opencli`。
- 修复了 `1.6.8` 升级链路中的两个关键断点：
  - `tools/opencli/lib/runtime.js` 现在能在 `dist/cli-manifest.json` 缺失时补写 manifest，而不是直接 `ENOENT`
  - `tools/opencli/scripts/verify.js` / `tools/opencli/lib/verify_helpers.js` 现在会解析 `doctor` 正文状态，不再把 exit code `0` 误判成桥接健康
- 更新文档：
  - `tools/opencli/README.md` 说明 `doctor` 不能只看退出码
  - `tools/README.md` / `tools/opencli/README.md` 中 `doctor` 用法已对齐新版契约
- 验证结果：
  - `opencli --version` => `1.6.8`
  - `opencli list` 已包含 redbook 关键补丁命令：`boss apply`、`boss chat-list`、`boss chat-thread`、`boss send-message`、`boss send-resume`
  - `node tools/opencli/scripts/verify.js` 现在会在 `doctor` 阶段直接准确报 `Browser Bridge 未连接`

**未完成 / 遗留：**
- 代码升级和补丁重放已经完成，但本机 `opencli Browser Bridge` 还没有连接到主 Chrome。
- 当前 `opencli doctor` 真实状态是：
  - `[OK] Daemon`
  - `[MISSING] Extension`
  - `[FAIL] Connectivity`

**下次会话优先做：**
- 把 Browser Bridge unpacked extension 加载到主 Chrome：
  - `/Users/proerror/.nvm/versions/node/v24.11.1/lib/node_modules/@jackwener/opencli/extension`
- 加载完成后重跑：
  - `node tools/opencli/scripts/verify.js`
- 如果 bridge 连上后还有业务命令 smoke 失败，再继续查 `twitter/xiaohongshu/boss` 的站点级契约漂移。

**需要注意：**
- `opencli 1.6.8` 的 `doctor` 在桥接失败时仍可能返回退出码 `0`，以后不能再把 exit code 当成唯一健康信号。
- 当前阻断不在仓库补丁，而在本机浏览器扩展连接状态。

## [2026-04-07] 会话摘要

**完成了什么：**
- 对 `tools/daily.sh` 的 X 链路做了“深修”，不只修浏览器健康检查，还修了 tweet 提取器对新版 X a11y tree 的兼容性。
- 继续修复 `tools/auto-x/scripts/x_utils.py`：
  - `extract_tweets()` 不再依赖旧版 `- article:`，现已兼容 `- article "..."` / `- 'article "..."'`
  - 新增 article block 提取、头行互动数据解析、header fallback 正文提取
- 扩充回归测试 `tools/auto-x/tests/test_x_utils.py`，覆盖新版 article 结构。
- 真实验证通过：
  - `python3 tools/auto-x/tests/test_x_utils.py`
  - `python3 -m py_compile ...`
  - `search_x.py 'AI tools'` 提取到 `9` 条推文
  - `scrape_timeline.py --scrolls 1` 提取到 `9` 条推文
- 已完整重跑 `bash tools/daily.sh`，并刷新今天的日报产物：
  - `X Pro` 多列分析提取到 `11` 条推文
  - `AI tools` 搜索提取 `4` 条
  - `solopreneur` 搜索提取 `4` 条
  - `crypto alpha` 搜索提取 `11` 条
  - 关注者动态提取 `19` 条
  - 同时追加了 `5` 条 X 选题到 `01-内容生产/选题管理/00-选题记录.md`

**未完成 / 遗留：**
- `X Pro` 报告里各列推文数仍显示为 `0`，说明“按列归属分配 tweet”这层还比较粗。
- 热门趋势页 `trending` 仍然经常抓不到趋势项，后续需要单独检查 `extract_trends()` 是否也落后于页面结构。

**下次会话优先做：**
- 修 `X Pro` 按列统计，让 `Deck 列配置` 不再全部是 `0 条`。
- 单独排查 `trending` 提取器，恢复趋势话题抓取。

**需要注意：**
- 当前 `agent-browser-session` 这层已经不是主要 blocker，下一批问题属于“页面结构适配”而不是“会话失效”。
- `page.goto: net::ERR_ABORTED` 在 X 搜索页偶尔出现，但只要随后 snapshot 正常、提取有结果，就不该再把整轮任务判失败。

## [2026-04-07] 会话摘要

**完成了什么：**
- 深度定位并修复了 `tools/daily.sh` 的 X 研究链路误报“浏览器未连接”问题。
- 确认真实报错不是登录态，而是 `agent-browser-session` 在 `snapshot` 阶段命中 `Frame was detached`。
- 修复了 `tools/auto-x/scripts/x_utils.py`：
  - 新增 `run_abs_result()` 结构化结果
  - 不再依赖旧版 `- document:` 输出判定健康
  - 新增可恢复错误识别与 `kill -> open x.com/home -> 再检查` 的自动恢复逻辑
- 新增回归测试 `tools/auto-x/tests/test_x_utils.py`。
- 验证通过：
  - `python3 tools/auto-x/tests/test_x_utils.py`
  - `python3 -m py_compile tools/auto-x/scripts/x_utils.py tools/auto-x/tests/test_x_utils.py`
  - 真实 `ensure_browser()` 返回 `True`
  - `scrape_timeline.py --scrolls 1` 不再报 `Frame was detached`

**未完成 / 遗留：**
- 轻量 timeline smoke 虽然能跑通，但这次只提取到 `0` 条推文，说明下一层内容解析仍可能需要单独优化。
- 今天的正式 `daily.sh` 还没有在修复后重新跑完整一轮 X 研究部分。

**下次会话优先做：**
- 在修复后的状态下重新跑一次今天的完整 `daily.sh`，确认 `X.com` 部分不再被跳过。
- 如果仍然抓不到推文，再查 `extract_tweets()` 和 X Pro deck 页面结构是否变了。

**需要注意：**
- 这次根因是“健康检查过时 + 会话恢复缺失”，不是“你没登录 X”。
- `agent-browser-session kill` 只应该作为恢复坏 session 的手段，不应在正常链路里被高频调用。

## [2026-04-07] 会话摘要

**完成了什么：**
- 运行了今日全量收集入口 `bash tools/daily.sh`。
- 已生成今天的三份日报：
  - `05-选题研究/X-每日日程-2026-04-07.md`
  - `05-选题研究/HN-每日热点-2026-04-07.md`
  - `05-选题研究/Reddit-每日监控-2026-04-07.md`
- 已确认 `X-每日日程-2026-04-07.md` 中聚合了今天的 `HN + Reddit` 结果。

**未完成 / 遗留：**
- 今天的 `X.com` 原始研究仍未跑通，被脚本按降级路径跳过。

**下次会话优先做：**
- 修复或重连 `agent-browser-session`，恢复 `X.com` 每日研究链路。
- 基于今天的 HN/Reddit 结果挑 1-2 个主题继续深化。

**需要注意：**
- 本轮 `daily.sh` 正常完成，但日志明确提示 `agent-browser-session 未响应`。
- 因此今天这轮收集结论应视为 `HN + Reddit 成功，X 跳过`。

## [2026-04-06] 会话摘要

**完成了什么：**
- 读取最新 `2026-04-06` 每日日报，并围绕“低 token / 本地 AI / 端侧模型”补做一轮深度研究。
- 检索并整理了一手资料，覆盖 `Caveman`、`Gemma 4 model card`、`Google AI Edge Gallery`、`LiteRT-LM`、`Ollama Claude Code`、`LM Studio`、`Anthropic pricing` 等关键证据。
- 新增研究稿 `05-选题研究/2026-04-06-低token-本地AI-端侧模型-深度研究.md`。
- 新建 `wiki/选题/低token-本地AI-端侧模型.md`，并把该主题同步挂到 `wiki/选题/AI工具与效率.md`。

**未完成 / 遗留：**
- 还没有把这份研究继续转成正式发布稿。
- `X.com` 原始研究仍因浏览器会话未连接而被每日脚本跳过，本轮主要基于 `HN + Reddit + 官方资料`。

**下次会话优先做：**
- 基于这份研究直接写一版 `X Thread`，或者拉成公众号长文。
- 如果要做小红书，可把“云 / 本地 / 端侧”整理成 3 层对比图文。

**需要注意：**
- 这个主题的最佳写法不是罗列工具，而是强调“部署位置”如何改变成本、延迟、隐私和产品形态。
- `Gemma 4` / `AI Edge Gallery` 信息变化较快，真正发布前最好再做一次最新校验。

## [2026-04-06] 会话摘要

**完成了什么：**
- 基于“低 token / 本地 AI / 端侧模型”研究稿，完成长文母稿 `01-内容生产/02-制作中的选题/2026-04-06-AI已经从模型战争进入部署战争.md`。
- 文章主论点已收束为“AI 已经从模型战争进入部署战争”，并用 `低 token -> 本地 AI -> 端侧模型` 三层递进完成论证。
- 已同步更新 `wiki/选题/AI工具与效率.md` 与 `wiki/log.md`，把稿件挂回长期选题。

**未完成 / 遗留：**
- 还没有继续改写出 X Thread、公众号定稿或小红书图文版。
- 还没有做封面、标题 AB 版和摘要版。

**下次会话优先做：**
- 先把这篇长文压缩成一版 6-10 条的 X Thread。
- 或继续把这篇扩成更适合公众号发布的正式版，补标题、导语、结尾行动句。

**需要注意：**
- 当前稿子是母稿，论点已经定住，但具体例子仍可按平台裁剪。
- 真正发布前，最好再快速检查一次 `Gemma 4` / `AI Edge Gallery` / `LM Studio` 的最新表述，避免时间敏感细节过时。

## [2026-04-06] 会话摘要

**完成了什么：**
- 把 redbook 从“文档约定流程”升级为带最小运行时的 harness 骨架。
- 新增 `tools/redbook_harness/`，包含 `run state`、`stage gates`、`artifact trace` 和 CLI。
- 新增升级设计文档 `docs/plans/2026-04-06-redbook-harness-upgrade.md`。
- 用当前长文任务创建了一个真实 run，并验证了 artifact 挂载、gate 检查和 stage promote。
- 修复了并发更新同一 run 时的覆盖问题，现已加入 per-run file lock。

**未完成 / 遗留：**
- 还没有做 verifier layer、retry policy、统一 tracing、memory injection。
- 还没有把 `daily.sh`、发布链路和多 Agent 真正接到统一 orchestrator。

**下次会话优先做：**
- 先补 `verifier layer`，至少覆盖研究完成、草稿结构、发布前检查。
- 再考虑把单篇内容任务的创建和推进封装成更高层命令。

**需要注意：**
- 当前 harness 是最小实现，重点是 machine-readable state，不是完整自动编排系统。
- 以后操作同一个内容任务时，优先更新 `tasks/harness/runs/*.json`，不要只改 `tasks/todo.md`。

## [2026-04-06] 会话摘要

**完成了什么：**
- 给 `tools/redbook_harness/` 补上了 `retry / escalation policy`，新增 `tools/redbook_harness/policy.py`。
- 在 run schema 中加入 `incidents`，并新增 `report-incident`、`incident-plan`、`retry-incident`、`escalate-incident`、`resolve-incident` CLI。
- `check-gates` 现在会把当前阶段未解决 incident 视为 blocking issue，不再允许带故障硬推进。
- 验证了两条路径：`tool_transient -> retry -> resolve` 可恢复；`verification_failed -> escalate` 会把 run 打成 `blocked`。

**未完成 / 遗留：**
- 还没有做 `run tracing`，目前 incident 之外的更细粒度 tool trace 还没落盘。
- 还没有做自动定时重试、指数退避或 owner routing。

**下次会话优先做：**
- 补 `run tracing`，把 tool 调用和关键决策挂进 run events / traces。
- 如果继续往自动化走，再考虑给 retry policy 增加 backoff 和 owner routing。

**需要注意：**
- 当前 retry policy 是“给建议 + 拦 gate + 显式恢复”，不是自动恢复执行器。
- 只有 `resolve-incident` 后，当前阶段的 blocking incident 才会从 gate 中消失。

## [2026-04-06] 会话摘要

**完成了什么：**
- 给 `tools/redbook_harness/` 补上了 `verifier layer`，新增 `tools/redbook_harness/verifier.py`。
- 新增 `verify-run` CLI，并把 verifier 接进 `check-gates` / `promote`，让 gate 会检查 artifact 本身是否合格。
- 用真实 run 验证当前研究稿与长文母稿均可通过结构校验。
- 做了反向验证：坏 draft 即使手工勾选 `outline_locked` / `draft_written`，也会被 gate 拦住。

**未完成 / 遗留：**
- 还没有做 `retry / escalation policy`。
- 还没有把 verifier 扩到更细的事实核验、平台适配检查和发布后记录模板。

**下次会话优先做：**
- 补 `retry / escalation policy`，定义哪些失败自动重试、哪些失败直接升级给人。
- 视需要把 verifier 再细化到 `qa_report` / `publish_record` 的格式模板。

**需要注意：**
- 当前 verifier 是结构校验，不是内容质量评分。
- 以后推进阶段前，优先跑 `python3 -m tools.redbook_harness.cli verify-run ...` 或直接看 `check-gates` 的 `verification` 字段。

## [2026-04-06] 会话摘要

**完成了什么：**
- 读取本地 `AGENTS.md`、`tasks/lessons.md`，并对照参考 gist 确认缺失项。
- 在 `AGENTS.md` 顶部新增“工程协作基线”，补入角色定位、决策优先级与提问边界三组原则。
- 修正 `Agent Team` 区域的章节编号错位，并回填 `tasks/todo.md` review 结论。

**未完成 / 遗留：**
- 用户提到“参考下面的建议”，但本轮消息里未看到额外建议文本；当前仅基于 gist 与本地内容完成整合。

**下次会话优先做：**
- 如果用户补充额外建议，再按同样方式把新规则并入 `AGENTS.md`，避免与共享 playbook 冲突。

**需要注意：**
- `AGENTS.md` 的共享 playbook 区块由 `docs/shared/redbook-playbook.md` 同步，不要在该区块内手改后忘记同步。

## 模板

```
## [YYYY-MM-DD] 会话摘要

**完成了什么：**
- 

**未完成 / 遗留：**
- 

**下次会话优先做：**
- 

**需要注意：**
- 
```

---
