# Session Progress Log

每次会话结束前，在此追加一条记录。格式固定，方便下次会话快速恢复上下文。

---

## [2026-04-07] 会话摘要

**完成了什么：**
- 通过 SSH 登录了 `networkworker@192.168.1.41`，确认远端主机可正常访问，系统版本为 macOS `26.3`。
- 核查了远端代理链路：
  - `/Applications/Shadowrocket.app` 已安装
  - `Shadowrocket` 网络服务初始为 `Disconnected`
  - 我已通过 `scutil --nc start "Shadowrocket"` 成功拉起连接
  - 当前 `scutil --proxy` 显示系统 HTTP / HTTPS 代理为 `127.0.0.1:1082`
  - `MacPacket` 已监听 `127.0.0.1:1082`、`192.168.1.41:1082`
- 核查了远端 Terminal / Shell：
  - SSH 会话和 `zsh -lic` 交互 shell 中都没有 `http_proxy` / `https_proxy` / `all_proxy` / `no_proxy`
  - 用户目录下未发现 `.zshrc` / `.zprofile` / `.zshenv` 等代理注入配置
- 做了实际网络验证：
  - 连接前：`curl -I https://www.google.com` 超时，`curl https://api.ipify.org` 连接失败，说明这台机器直连外网不可用
  - 连接后：`curl -x http://127.0.0.1:1082 -I http://example.com` 返回 `HTTP/1.1 200 OK`
  - 但对 HTTPS 目标的 CONNECT 测试返回 `503`，说明 Shadowrocket 当前规则或出站节点对部分 HTTPS 目标还存在额外问题
- 额外做了最小修复尝试：远程执行 `open -a /Applications/Shadowrocket.app`，确认应用能启动，并已代为把系统 VPN 服务拉起到连接态。

**未完成 / 遗留：**
- 还没有把 `http_proxy` / `https_proxy` 永久写入远端 shell 配置。
- Shadowrocket 当前对部分 HTTPS CONNECT 请求返回 `503`，还需要继续检查规则、节点或出站策略。

**下次会话优先做：**
- 先决定是否要把命令行永久指向 `http://127.0.0.1:1082`。
- 如果要永久化，再给 `~/.zprofile` 或 `~/.zshrc` 写入 `http_proxy` / `https_proxy`。
- 继续排查 Shadowrocket 为什么对部分 HTTPS CONNECT 返回 `503`。

**需要注意：**
- 这次问题分两层：
  - 第一层是 Shadowrocket 原本没有连接，我已代为连上
  - 第二层是 Terminal 仍然没有 `*_proxy`，所以命令行默认不会使用 `127.0.0.1:1082`
- 即使手动指向 `127.0.0.1:1082`，当前某些 HTTPS 目标仍会返回 `503`，不能直接假设代理链路已经完全健康。

## [2026-04-07] 会话摘要

**完成了什么：**
- 把 LLM Wiki workflow 从“显式但分散”补到了“最小完整”：
  - `tools/wiki_workflow.py` 新增 `daily-cycle --date ...`
  - `tools/wiki_workflow.py query` 新增 `--attach-run-id`
  - `tools/auto-x/scripts/run_daily.sh` 改为自动执行 `daily-cycle = ingest + lint`
- 已完成真实验证：
  - `python3 tools/wiki_workflow.py daily-cycle --date 2026-04-07`
  - 复用当日 ingest run：`20260407-051553-llm-wiki-ingest-2026-04-07-90316a`
  - 复用当日 lint run：`20260407-065343-llm-wiki-lint-2026-04-07-d9dee3`
  - 新建 attached query run：`20260407-134516-llm-wiki-query-本地-ai-2026-04-07-4eac53`
- 已把 query 结果真实挂到内容 run：
  - 内容 run：`20260406-131247-ai-已经从模型战争进入部署战争-7d8fbc`
  - 新增 artifact：`docs/reports/wiki-query-本地-ai-2026-04-07.md`
- 已更新 `docs/reports/2026-04-07-llm-wiki-workflow-gap.md`、`wiki/log.md`、`wiki/overview.md`，把结论改成当前真实状态。

**未完成 / 遗留：**
- 还没有把 `query --attach-run-id` 自动接进 `x-create` 或其他内容创作快捷入口。
- 还没有做自动 wiki 页面改写；当前 workflow 负责运行痕迹、报告和挂接，不负责强制自动写回。

**下次会话优先做：**
- 把内容创作入口补一个“先 query 再起草”的封装命令，避免每次手敲 `--attach-run-id`。
- 视需要再决定是否让 lint 在周日之外增加发布后自动触发。

**需要注意：**
- 如果把“完整”限定为 `ingest/query/lint` 三类 workflow 都有显式入口、真实 run、自动/半自动接线点，那么现在已经完整。
- 如果把“完整”定义成“wiki 页面内容也自动改写”，那还是下一层能力，不属于这次补齐的最小 workflow 范围。

## [2026-04-07] 会话摘要

**完成了什么：**
- 把 LLM Wiki workflow 从只有 `ingest`，补到了 `query` / `lint`：
  - `python3 tools/wiki_workflow.py query --topic '内容创作' --date 2026-04-07`
  - `python3 tools/wiki_workflow.py lint --date 2026-04-07`
- 已完成真实 run 验证：
  - query run：`20260407-065343-llm-wiki-query-内容创作-2026-04-07-064648`
  - lint run：`20260407-065343-llm-wiki-lint-2026-04-07-d9dee3`
- `query` 会输出显式检索报告：
  - `docs/reports/wiki-query-内容创作-2026-04-07.md`
- `lint` 会输出显式健康检查报告：
  - `docs/reports/wiki-lint-2026-04-07.md`
- 本轮还用 lint 结果闭环修复了 wiki 元数据：
  - `wiki/index.md` 已补齐 `低 token、本地 AI、端侧模型` 和 `内容创作与增长`
  - `wiki/index.md` 的页面计数和日期已刷新
  - `wiki/overview.md` 已更新到 2026-04-07

**未完成 / 遗留：**
- 现在 `query` / `lint` 还是手动触发，还没有挂到内容创作主链路里自动执行。
- 还没有把 `query` 命中的页面自动作为后续草稿 run 的输入 artifact。

**下次会话优先做：**
- 把内容创作前的 `wiki query` 自动挂到对应内容 run。
- 再决定是否要让 lint 在周日或发布后自动执行一次。

**需要注意：**
- 现在 LLM Wiki 已经有三类显式 workflow：
  - ingest：日报后自动触发
  - query：按主题显式检索并留 run
  - lint：显式健康检查并留 run
- 这三类 workflow 已经都能给出 run / report / log 三级证据。

## [2026-04-07] 会话摘要

**完成了什么：**
- 已通过 SSH 登录内网 Mac Studio：`networkworker@192.168.1.41`。
- 已确认目标机基础条件足够跑大模型：
  - `Apple M4 Max`
  - `64GB RAM`
  - 可用磁盘约 `802GiB`
- 目标机原本未安装 `ollama`；本轮已通过“本机下载 `Ollama-darwin.zip` + `scp` 传输 + 远端安装”完成 `Ollama.app 0.20.3` 安装。
- 已拉起 `Ollama.app`，并确认本地 API `http://127.0.0.1:11434/api/version` 返回 `0.20.3`。
- 已启动 `gemma4:31b` 的后台下载任务，日志写入 `/tmp/gemma4-31b.pull.log`；当前缓存体积约 `117M ~/.ollama/models`。

**未完成 / 遗留：**
- `gemma4:31b` 还没下载完，当前目标机到 registry 的速度较慢，估算仍需较长时间。
- 因为模型未完成落盘，本轮还不能把 `ollama list` 里的最终可用状态勾成完成。

**下次会话优先做：**
- 先检查 `/tmp/gemma4-31b.pull.log` 最新进度和 `pgrep -af "ollama pull gemma4:31b"`。
- 下载结束后运行 `/usr/local/bin/ollama list | grep gemma4:31b` 做最终验收。

**需要注意：**
- 这台 Mac Studio 远端直连 `ollama.com` 下载 app 包时出现过 `curl: (16) Error in the HTTP2 framing layer`，本轮已改用“本机下载后 `scp`”绕过。
- 模型下载已经切到后台；即使当前 SSH 会话结束，后台任务仍会继续。

## [2026-04-07] 会话摘要

**完成了什么：**
- 把 LLM Wiki 的“显式 run”从手工补建推进到了自动启动：
  - 新增脚本 `tools/wiki_workflow.py`
  - 新增命令 `start-daily-ingest --date YYYY-MM-DD`
  - `tools/auto-x/scripts/run_daily.sh` 现会在日报完成后自动调用
- 已完成真实验证：
  - 首次自动日报 run：`20260407-051553-llm-wiki-ingest-2026-04-07-90316a`
  - 自动挂接了 3 份 source artifact：
    - `05-选题研究/X-每日日程-2026-04-07.md`
    - `05-选题研究/HN-每日热点-2026-04-07.md`
    - `05-选题研究/Reddit-每日监控-2026-04-07.md`
  - 自动置位 `materials_queried` 和 `research_complete`
- 还验证了幂等性：同一天重复执行不会创建第二条同 topic/source 的日报型 ingest run。

**未完成 / 遗留：**
- 目前自动化只覆盖 `ingest` 的启动痕迹，还没有覆盖 `query` / `lint`。
- 现在只是把每日研究挂进显式 run，还没有自动更新具体 wiki 页面内容。

**下次会话优先做：**
- 给 `query` / `lint` 也补独立入口和 run 模板。
- 再决定是否要把“日报后更新哪些 wiki 页面”也自动化，而不是只创建 ingest run。

**需要注意：**
- `wiki/log.md` 仍然是结果日志，不是运行层主证据；主证据现在是 harness run。
- 现在存在两类 run：
  - 审计 run：用来确认系统缺口
  - 日报 run：用来记录每日 ingest 是否真的启动

## [2026-04-07] 会话摘要

**完成了什么：**
- 复核了 redbook 里 LLM Wiki 的真实状态，确认之前只有：
  - 规则层：`CLAUDE.md` 的 `Wiki Schema`
  - skill 约束：`x-collect` / `x-create`
  - 结果层：`wiki/log.md` 的零散 ingest/query 记录
- 但确实没有任何一条独立的 LLM Wiki harness run，所以“workflow 没有真正启动痕迹”这个判断成立。
- 已补最小运行痕迹：
  - 新增报告 `docs/reports/2026-04-07-llm-wiki-workflow-gap.md`
  - 新建 run `20260407-050729-llm-wiki-ingest-显式化-a7fdd7`
  - 已挂接 `research_report` artifact，并把 `materials_queried` / `research_complete` 置为完成
- 已把这次纠偏写入 `tasks/lessons.md`，避免以后再把“顺手更新 wiki”误当成“wiki workflow 已运行”。

**未完成 / 遗留：**
- 还没有把 `query` / `lint` 也显式化成独立 run 模板。
- 还没有把每日研究后的 wiki ingest 自动接入 `daily.sh` 或统一 orchestrator。

**下次会话优先做：**
- 给 LLM Wiki 补最小 artifact/check 约定，至少覆盖 ingest/query/lint 三类 run。
- 决定是把它接进 `daily.sh`，还是做成单独的 `wiki-ingest` 命令。

**需要注意：**
- 以后回答“workflow 跑没跑过”时，必须给出 run / artifact / log 三级证据。
- `wiki/log.md` 只能证明结果被写回，不能单独证明 workflow 曾经启动。

## [2026-04-07] 会话摘要

**完成了什么：**
- 生成并整理了两组小红书图文素材：
  - `xhs-images/baokuan-audience/`
  - `xhs-images/galileo-0/`
- 写完并发布了两篇 X.com 长文：
  - `为什么你产不出稳定的爆款？`
  - `Galileo-0：AI视频哪里穿帮，现在能精确到秒`
- 修复了小红书发布链路中的两个实际卡点：
  - `9222` 端口复用导致的 Chrome / CDP 混线
  - `publish_pipeline.py` 默认只填表不点发布
- 最终已自动发布两篇小红书图文，并通过创作者后台 `content-data` 二次确认它们已进入内容列表：
  - `爆款不是选题决定的，你研究错了方向`
  - `AI视频哪里穿帮，现在能精确到秒`
- 已回填文稿发布信息、wiki 页面、todo 与 lessons。

**未完成 / 遗留：**
- 两篇 X.com 长文的公开链接还没有回填到文稿里。
- 小红书两篇内容目前只有初始入库记录，曝光/互动数据还需要后续补录。

**下次会话优先做：**
- 补回两篇 X.com 长文链接和两篇小红书内容的首轮数据。
- 根据前 24 小时表现，决定是否把这两篇扩成公众号版或二次分发素材。

**需要注意：**
- 小红书发布脚本如果不带 `--auto-publish`，默认只会填表到 `READY_TO_PUBLISH`，不会自动点击发布。
- 用户已经明确授权“直接发布”时，登录恢复和按钮补点都应该在同一轮内自行完成，不要再次停下来确认。

## [2026-04-07] 会话摘要

**完成了什么：**
- 为 redbook 新增了一个本地 `Page Agent` 试点控制台：`tools/page-agent-console/`。
- 实现了零依赖 Node 服务端 `server.mjs`，负责：
  - 汇总 `tasks/todo.md` / `tasks/progress.md`
  - 列出最新 harness runs
  - 预览 `05-选题研究/` 最新报告
  - 包装最小 harness 动作：`new-run`、`show-run`、`set-check`
- 实现了本地页面：
  - `public/index.html`
  - `public/app.js`
  - `public/styles.css`
- 页面已接入 `Page Agent Extension` 调用入口，支持填写 token / base URL / model / API key，并附带 redbook 专用 `systemInstruction`。
- 已完成真实验证：
  - `node --check tools/page-agent-console/server.mjs`
  - `node --check tools/page-agent-console/public/app.js`
  - `curl http://127.0.0.1:4318/api/dashboard`
  - `curl -X POST /api/runs`
  - `curl -X POST /api/runs/<run_id>/checks`
  - Chrome DevTools 打开 `http://127.0.0.1:4318/` 后，页面数据、run 详情和 gate report 均正常渲染
- 本轮新增真实试点 run：
  - `20260407-044025-page-agent-工作台试点-8f7d20`

**未完成 / 遗留：**
- 当前仍要求用户手动安装 `Page Agent Extension` 并提供 auth token / 模型配置。
- 后端没有鉴权，只适合 localhost 试点。
- 还没有接 `add-artifact`、`promote`、`incident`、`verify-run` 这些更完整的 harness 流程。
- 还没有把这套控制台挂到现有 `/x-collect` 或发布工具链上。

**下次会话优先做：**
- 把 `run detail` 扩到 artifact 和 incident 视图。
- 加一个“从研究报告创建 run”的快捷动作，减少手工录入。
- 如果试点体验成立，再考虑把它升级成真正的内部运营台，而不是单页 demo。

**需要注意：**
- 这次试点验证的是“工作台代理层”，不是“浏览器自动发布替代品”。
- 现有 `/baoyu-post-to-x`、`/baoyu-xhs-images`、`/baoyu-post-to-wechat` 仍然应该保留为生产主链路。

## [2026-04-07] 会话摘要

**完成了什么：**
- 继续把 `tools/opencli` 从“代码升级完成但扩展没连上”推进到“真实可用”。
- 确认 `opencli 1.6.8` 的 npm 包本身不带 `extension/`，而 Chrome profile 里旧的 unpacked extension 记录却仍指向 `/.../node_modules/@jackwener/opencli/extension`，导致 Browser Bridge 永远显示未连接。
- 已从 GitHub Releases 下载 `opencli-extension.zip` 到：
  - `tools/opencli/data/browser-bridge/opencli-extension-v1.6.8`
- 已修复安装链路：
  - `tools/opencli/lib/runtime.js` 新增 Browser Bridge 资产下载、解压和 symlink 修复逻辑
  - `tools/opencli/scripts/install.js` 现在会自动确保 `extension` 路径真实存在
- 已修复运行环境：
  - 把全局包里的 `extension` 路径修成指向仓库缓存目录的 symlink
  - 启动使用登录态副本 profile 的独立 Chrome bridge 实例
- 真实验证通过：
  - `opencli doctor` => `[OK] Daemon` / `[OK] Extension: connected (v1.6.8)` / `[OK] Connectivity`
  - `node tools/opencli/scripts/verify.js` 全量通过

**未完成 / 遗留：**
- 当前可用 bridge 来自独立 Chrome clone profile；主 Chrome 自己还没重启过，所以它那边的旧扩展记录是否已自动恢复，暂时没再单独验证。
- 仓库里缓存了下载下来的 Browser Bridge 资产和 clone profile 运行目录，但本轮没有把这些运行时文件纳入 git。

**下次会话优先做：**
- 如果你希望完全回到主 Chrome 单实例模式，可以在合适的时候重启一次主 Chrome，再跑 `opencli doctor` 确认它直接接上主浏览器。
- 如需长期保留当前 workaround，可再补一个显式的 `launch_bridge_browser` 脚本，把 clone profile 启动流程固化。

**需要注意：**
- 这次真正的根因不是“扩展没开”，而是 Chrome 记着一个已经失效的 unpacked extension 路径。
- 以后只要看到 `doctor` 长期 `[MISSING] Extension`，第一检查项应该是 `packageDir/extension` 是否真实存在，而不是先怀疑登录态。

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

## [2026-04-07] 会话摘要

**完成了什么：**
- 给 `tools/auto-zhipin` 补了 current-tab 投递入口 `tools/auto-zhipin/scripts/opencli_apply_current_tab.js`。
- 新增 `npm run boss:apply-current`，默认直接接管当前聚焦的 BOSS 页，不再依赖 `boss apply --url` 先跳详情页再按 URL 选卡。
- 同时补了 `--probe true`，可以先无副作用地读取当前页岗位信息，再决定是否真正执行 `立即沟通`。
- 更新了 `tools/auto-zhipin/README.md`，把 current-tab 路径提升成当前推荐用法。

**未完成 / 遗留：**
- 还没有在真实 BOSS 页上跑通一次 `boss:apply-current`。
- 当前机器的 Chrome CDP 没连上，`--probe true` 返回 `connect ECONNREFUSED 127.0.0.1:9222`。

**下次会话优先做：**
- 先恢复带 `--remote-debugging-port=9222` 的 Chrome 会话。
- 然后执行 `npm run boss:apply-current -- --probe true`，确认脚本能看到当前 BOSS 页。
- 如果 probe 正常，再执行 `npm run boss:apply-current` 或 `--dry-run true`。

**需要注意：**
- 这次实现刻意绕开了 `goto(url) + selectJobCard(url)`，因为这正是 BOSS 当前页场景里最容易导致 `job_card_not_found` 的环节。
- 用户当前要的是“直接自动化”，不是额外宿主页；后续 BOSS 主线不要再绕回 Page Agent 控制台。

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
