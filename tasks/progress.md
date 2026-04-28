# Session Progress Log

每次会话结束前，在此追加一条记录。格式固定，方便下次会话快速恢复上下文。

---

## [2026-04-17] 会话摘要：路径1完整流程测试

**完成了什么：**
- 从早报选题「别再闭门写代码了，先聊用户再写产品」
- 完整走完路径1：wiki query → 爆款对标 → 写稿 → x-mastery-mentor 四层审稿 → 发布
- 审稿通过（算法层/Hook层/内容层/CTA层全部合格）
- 发布到 X.com

**未完成 / 遗留：**
- 无 URL 返回，需手动确认发布状态
- 小红书版本未制作

**下次会话优先做：**
- 制作小红书版本（/baoyu-xhs-images）
- 补录发布数据

---

## [2026-04-14] 会话摘要：关注一批 X AI 博主

**完成了什么：**
- 使用当前已登录的 Chrome / X 会话执行关注动作，没有切换到新的浏览器上下文。
- 已确认当前执行账号为 `@0xcybersmile`。
- 本轮成功补关注 4 个账号：
  - `@Pluvio9yte`
  - `@Zesee`
  - `@AshlynHe1129`
  - `@skaas777`
- 本轮检查时已经处于关注状态 4 个账号：
  - `@yaohui12138`
  - `@AI_Jasonyu`
  - `@servasyy_ai`
  - `@nftbanker`
- 执行过程中未出现 `速度限制 / rate limit` 横幅，也没有遇到账号不存在的情况。

**未完成 / 遗留：**
- 本轮只处理了用户点名的 8 个 AI 博主，没有继续扩展到资讯源作者或推文作者本人。

**下次会话优先做：**
- 如果用户要继续扩关注列表，沿用当前登录会话，按慢速批量模式继续执行。

**需要注意：**
- 当前仓库 worktree 仍有大量既有未提交改动；这次只追加了任务日志，没有做提交收口。

## [2026-04-15] 会话摘要：安装 video-wrapper skill

**完成了什么：**
- 检查了用户提供的 GitHub 仓库 `op7418/Video-Wrapper-Skills`，确认它是一个根级 `SKILL.md` 的可安装 skill 仓库。
- 使用系统安装脚本将其安装到：
  - `/Users/proerror/.codex/skills/video-wrapper`
- 补齐了该 skill 的本地运行依赖：
  - 在 skill 目录创建 `venv`
  - 安装 `moviepy / pillow / numpy / pysrt / playwright`
  - 执行 `playwright install chromium`
- 做了 3 层验证：
  - `SKILL.md` 元数据可读
  - `video_processor` 与 `content_analyzer` 可正常 import
  - `check_browser_renderer_available = True`
  - Playwright Chromium 可无头启动并成功渲染最小页面

**未完成 / 遗留：**
- 这轮只完成了安装与依赖准备，没有在真实视频文件上跑一次完整渲染链。
- 该 skill 的“AI 分析”部分本质上仍依赖交互式 LLM 审核，不是仓库内自带的自动模型调用。

**下次会话优先做：**
- 如果要真正投入使用，先拿一段访谈视频 + `.srt` 做一轮端到端试跑，验证模板效果、时序和输出耗时。

**需要注意：**
- 新安装的 skill 需要重启 Codex 才会被新会话稳定发现。
- 这次项目内只更新了任务记录，skill 本体安装在 `~/.codex/skills/`，不在当前仓库版本控制内。

## [2026-04-15] 会话摘要：调研今天 Social Media 正在流行什么

**完成了什么：**
- 先复盘了 `tasks/lessons.md`、`wiki/index.md`、`wiki/选题/*` 与最近 `05-选题研究/` 里的 X / HN / Reddit 研究，确认当前账号近期最稳的受众方向仍是 `agent / AI 工具 ROI / 具体工作流`。
- 建立了新的 harness run：
  - `20260415-012459-2026-04-15-social-media-trends-a7d853`
- 结合今天公开可见的 HN、Product Hunt、Reddit 榜单，生成研究报告：
  - [社交媒体趋势-2026-04-15.md](/Users/proerror/Documents/redbook/05-选题研究/社交媒体趋势-2026-04-15.md)
- 将今日可复用信号回写到：
  - [AI工具与效率.md](/Users/proerror/Documents/redbook/wiki/选题/AI工具与效率.md)
  - [内容创作与增长.md](/Users/proerror/Documents/redbook/wiki/选题/内容创作与增长.md)
- 同步更新了：
  - [wiki/index.md](/Users/proerror/Documents/redbook/wiki/index.md)
  - [wiki/log.md](/Users/proerror/Documents/redbook/wiki/log.md)
  - [tasks/todo.md](/Users/proerror/Documents/redbook/tasks/todo.md)

**未完成 / 遗留：**
- 这轮只做到趋势筛选和选题判断，还没有继续进入某个具体选题的提纲或初稿。

**下次会话优先做：**
- 从今天的 A 级题里挑 1 条直接进入写作：
  - `AI 工具正在从聊天框，变成真正能交付结果的工具`
  - `你以为自己在用 AI 提效，其实你只是多订了几个会员`
  - `100K ARR 没你想的那么爽，真正难的是利润、定价和增长`

**需要注意：**
- 今天高热的是“结果更近、成本更真、案例更具体”，不建议退回到泛新闻搬运。

## [2026-04-15] 会话摘要：安装 x-mentor skill

**完成了什么：**
- 检查了用户给出的 GitHub 仓库 `alchaincyf/x-mentor-skill`，确认它是一个根级 skill 仓库，根目录直接带有：
  - `SKILL.md`
  - `references/`
  - `examples/`
- 本地检查发现之前没有独立的 `~/.codex/skills/x-mentor` 安装位。
- 先尝试使用系统 `skill-installer` 脚本安装，但脚本在临时目录阶段连续出现冲突错误，随后改为手动安装。
- 最终已安装到：
  - `~/.codex/skills/x-mentor`
- 已验证：
  - `SKILL.md` 可读
  - `references/` 与 `examples/` 结构完整
  - skill 内部的名称实际是 `x-mastery-mentor`
- 已顺手清理安装目录里不应保留的：
  - `.git`
  - `.DS_Store`

**未完成 / 遗留：**
- 这轮只完成了本机 skill 安装，没有实际拿一个 X 选题去跑该 skill 的完整写作链。

**下次会话优先做：**
- 直接拿一条 X 选题调用 `/x-mastery-mentor` 做一次审稿或写作验证，确认新安装版本是否优于当前内置版本。

**需要注意：**
- redbook 现有工作流文档入口本来就写的是 `/x-mastery-mentor`，不需要改 `AGENTS.md / CLAUDE.md`。
- 要让新安装的 skill 在新会话里稳定被发现，通常需要重启 Codex。

## [2026-04-15] 会话摘要：把今天的优先选题跑成 X Thread

**完成了什么：**
- 选用了今天趋势研究里优先级最高的题：
  - `AI工具正在从聊天框变成真正能交付结果的工具`
- 建立了新的 harness run：
  - `20260415-013904-ai工具正在从聊天框变成真正能交付结果的工具-a858e6`
- 按 `x-mastery-mentor` 的场景 B/A 规则完成了一轮完整执行：
  - 先锁定题目和目标受众
  - 生成 3 个 hook 版本
  - 选择推荐版本
  - 给出发布时间建议和风险提醒
  - 产出完整 Thread 草稿
- 已保存草稿到：
  - [AI工具正在从聊天框变成真正能交付结果的工具-X-thread.md](/Users/proerror/Documents/redbook/01-内容生产/01-待深化的选题/AI工具正在从聊天框变成真正能交付结果的工具-X-thread.md)
- 草稿内已包含：
  - 选题判断
  - 3 个 hook
  - x-mastery-mentor 审稿结论
  - 8 条 X Thread 正文
  - 备用短推文版
  - 发布清单
- 已把该题追加到：
  - [AI工具与效率.md](/Users/proerror/Documents/redbook/wiki/选题/AI工具与效率.md)

**未完成 / 遗留：**
- 这轮只做到 draft，没有继续进入最终发布。

**下次会话优先做：**
- 对这条 Thread 再做一轮精修，或直接走 `/baoyu-post-to-x` 草稿发布链。

**需要注意：**
- 这版更适合 X Thread，不适合原封不动搬到小红书；小红书要把第一钩子改成更具体的工作场景。

## [2026-04-15] 会话摘要：将 X Thread 压成更口语的终稿

**完成了什么：**
- 基于 `x-mastery-mentor` 的二次审稿逻辑，把 `AI工具正在从聊天框变成真正能交付结果的工具` 再压了一轮。
- 本轮重点不是删字，而是把内容改得更像真实会发在 X 上的 thread：
  - 第一条更像口语判断，而不是研究摘要
  - 第 3-6 条减少解释腔，保留推进感
  - 第 7-8 条把 CTA 收得更自然，更容易触发回复
- 已将终稿直接覆盖回：
  - [AI工具正在从聊天框变成真正能交付结果的工具-X-thread.md](/Users/proerror/Documents/redbook/01-内容生产/01-待深化的选题/AI工具正在从聊天框变成真正能交付结果的工具-X-thread.md)

**未完成 / 遗留：**
- 这轮仍未进入发布，仅完成“更适合发 X 的口语终稿”。

**下次会话优先做：**
- 如果确认内容不再改，直接走 `/baoyu-post-to-x` 做发帖草稿。

**需要注意：**
- 这版已经更接近 X 的真实语感，后续再改时，优先动第一条和 CTA，不要再把中段写回“说明文”。

## [2026-04-15] 会话摘要：改成适合认证账号的单篇长帖

**完成了什么：**
- 用户明确纠正：当前 X 账号有认证，支持长帖，不希望把内容拆得过碎。
- 已将该稿的主发布方案从 `thread` 改成 `单篇长帖`。
- 已把原文件里的主成稿区改为：
  - `最终发布版（单篇长帖）`
- 同时保留了 `Thread 备用版` 说明，避免完全丢掉另一种载体可能性。
- 已将这条偏好写入：
  - [tasks/lessons.md](/Users/proerror/Documents/redbook/tasks/lessons.md)

**未完成 / 遗留：**
- 这轮仍未正式走发布，只是把载体策略改对了。

**下次会话优先做：**
- 直接用这版单篇长帖去走 `/baoyu-post-to-x`。

**需要注意：**
- 对这个账号，今后做 X 稿时不要先入为主拆 thread；优先判断单篇长帖是否更完整。

## [2026-04-15] 会话摘要：x-mastery-mentor 终审 + X 发布预览

**完成了什么：**
- 按用户要求，继续走了 `X/Twitter运营全栈 x-mentor-skill` 的终审逻辑。
- 最终判断：
  - 这条内容对当前账号更适合 `单篇长帖`
  - 不适合默认拆成多条 thread
  - 当前最主要的质量点已经不是方向问题，而是载体选择和语感
- 已将终稿整理为单篇长帖主方案，并保留 thread 作为备用版本。
- 之后用 `/baoyu-post-to-x` 的 `x-browser.ts` 走了一次 **preview 模式**：
  - 成功打开 X compose 页面
  - 成功把单篇长帖填入编辑器
  - 未带 `--submit`，没有自动发出
- 预览日志关键信息：
  - `[x-browser] Typing text...`
  - `[x-browser] Post composed (preview mode). Add --submit to post.`

**未完成 / 遗留：**
- 这轮只做到预览草稿，还没有正式发出。

**下次会话优先做：**
- 如果内容确认不再改，直接用同一条长帖走 `--submit` 正式发布。

**需要注意：**
- 用户级 `baoyu-post-to-x` 配置里存在 `auto_submit: true`，但这次已显式走 preview，未误发。

## [2026-04-15] 会话摘要：引用 Claude Code 视频推文正式发布 + 准备小红书版

**完成了什么：**
- 按用户要求，没有只发纯文字，而是采用了用户提供的 `Claude Code` 视频推文作为引用对象：
  - `https://x.com/claudeai/status/2044131493966909862`
- 使用 `/baoyu-post-to-x` 的 `x-quote.ts` 直接完成正式发布：
  - 已成功打开原推文
  - 已选择 Quote
  - 已填入单篇长帖内容
  - 已提交成功
- 发布日志关键结果：
  - `[x-quote] Typing comment...`
  - `[x-quote] Submitting quote post...`
  - `[x-quote] Quote post submitted!`
- 同时已准备好小红书版本文稿：
  - [AI工具正在从聊天框变成真正能交付结果的工具-小红书版.md](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/AI工具正在从聊天框变成真正能交付结果的工具-小红书版.md)
- 因为这组内容现在是“X 已发，小红书待发”，已将相关稿件从 `01-待深化的选题/` 移动到：
  - `01-内容生产/02-制作中的选题/`

**未完成 / 遗留：**
- 小红书目前只完成文稿准备，还没有出图和发布。

**下次会话优先做：**
- 用小红书版文稿继续做封面和发布图文。

**需要注意：**
- 这轮 X 已正式发出；后续如果要补查链接或数据，需要回 X 主页或通知页确认。

## [2026-04-15] 会话摘要：把小红书版拆成可发布图文稿

**完成了什么：**
- 在已有小红书文稿基础上，继续拆成了标准的“小红书图文稿”格式：
  - [AI工具正在从聊天框变成真正能交付结果的工具-小红书图文稿.md](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/AI工具正在从聊天框变成真正能交付结果的工具-小红书图文稿.md)
- 这份图文稿已经包含：
  - 标题
  - 封面文案
  - 完整正文
  - 图片结构（7 页）
  - 每页卡片文案
  - 出图建议（`notion + balanced`）
  - 发布清单
- 当前状态已经从“有一篇小红书文稿”变成“可以直接接图文生成链”。

**未完成 / 遗留：**
- 这轮还没有真正生成图片，也还没有发布到小红书。

**下次会话优先做：**
- 直接用这份图文稿走 `/baoyu-xhs-images` 生成图组，或按这份卡片文案手动出图。

**需要注意：**
- 第一屏必须先打用户体感：`它开始替你干活了`，不要先露出 `agent / workflow` 这种抽象词。

## [2026-04-15] 会话摘要：用 Tuzi 正式生成小红书图组

**完成了什么：**
- 按用户要求，生图链路改为只走 Tuzi。
- 先核对了 Tuzi 文档，并确认 `baoyu-image-gen` 里的 `tuzi` provider 实现与文档不一致；已修正 provider 为文档模式。
- 同时验证了仓库里历史成功链路：`v1beta/models/gemini-3-pro-image-preview:generateContent`。
- 最终按这条链路顺序生成出了整组小红书图片，共 `7` 张：
  - [01-cover-ai-tool-workflow-shift.png](/Users/proerror/Documents/redbook/xhs-images/ai-tool-workflow-shift/01-cover-ai-tool-workflow-shift.png)
  - [02-change-ai-tool-workflow-shift.png](/Users/proerror/Documents/redbook/xhs-images/ai-tool-workflow-shift/02-change-ai-tool-workflow-shift.png)
  - [03-signal-ai-tool-workflow-shift.png](/Users/proerror/Documents/redbook/xhs-images/ai-tool-workflow-shift/03-signal-ai-tool-workflow-shift.png)
  - [04-core-ai-tool-workflow-shift.png](/Users/proerror/Documents/redbook/xhs-images/ai-tool-workflow-shift/04-core-ai-tool-workflow-shift.png)
  - [05-value-ai-tool-workflow-shift.png](/Users/proerror/Documents/redbook/xhs-images/ai-tool-workflow-shift/05-value-ai-tool-workflow-shift.png)
  - [06-product-ai-tool-workflow-shift.png](/Users/proerror/Documents/redbook/xhs-images/ai-tool-workflow-shift/06-product-ai-tool-workflow-shift.png)
  - [07-ending-ai-tool-workflow-shift.png](/Users/proerror/Documents/redbook/xhs-images/ai-tool-workflow-shift/07-ending-ai-tool-workflow-shift.png)
- 已把图组路径回写到：
  - [AI工具正在从聊天框变成真正能交付结果的工具-小红书图文稿.md](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/AI工具正在从聊天框变成真正能交付结果的工具-小红书图文稿.md)

**未完成 / 遗留：**
- 图组已经生成，但还没有正式发布到小红书。

**下次会话优先做：**
- 直接用这 7 张图 + 现成标题正文走小红书发布链。

**需要注意：**
- 这轮验证下来，Tuzi 在这台机器上真正稳定的图片链路是 `v1beta + gemini-3-pro-image-preview`，不是最初错误实现里的 chat / image generations 组合。

## [2026-04-16] 会话摘要：正式发布小红书图文

**完成了什么：**
- 重新确认了小红书创作者中心登录态，已登录。
- 使用现成的标题、正文和 7 张本地图，走发布脚本正式提交。
- 发布脚本关键结果：
  - `FILL_STATUS: READY_TO_PUBLISH`
  - `PUBLISH_STATUS: PUBLISHED`
- 说明：
  - 标题、正文、图片上传、话题选择、点击发布都已经完成
  - 发布动作已经成功

**未完成 / 遗留：**
- 发布后回查 `note id / 内容数据` 的脚本调用不稳定，这轮没有拿到结构化 `note id`。

**下次会话优先做：**
- 回小红书内容列表补抓 `note id` 与基础数据。

**需要注意：**
- 当前应把这条内容视为“已发布但 note id 待补”的状态，而不是待发布。

## [2026-04-13] 会话摘要：interactive-browser 原型验证

**完成了什么：**
- 在不依赖 Playwright 的前提下，新增了一个最小 `interactive-browser` 原型：
  - [chrome-cdp.mjs](/Users/proerror/Documents/redbook/tools/browser-core/interactive/chrome-cdp.mjs)
  - [smoke.mjs](/Users/proerror/Documents/redbook/tools/browser-core/interactive/smoke.mjs)
  - [README.md](/Users/proerror/Documents/redbook/tools/browser-core/interactive/README.md)
- 原型只做 4 件事：
  - 连接真实 Chrome CDP
  - 枚举 page targets
  - 读取只读页面元信息
  - 按 URL / title 规则选出最优页签
- 已在当前真实 Chrome 的小红书页签上完成 smoke：
  - 成功识别当前聚焦的小红书创作页
  - 成功读取 `hasFocus / visibilityState / readyState / bodyPreview`
- 已补第二个真实业务域的只读验证：
  - `node tools/browser-core/interactive/boss-probe.mjs` 成功导航到 BOSS 聊天页并读取 `pageTitle / readyState / loginExpired / securityCheck`
- 已补到新的分叉证据：
  - raw CDP 能看到并进入 BOSS 登录页
  - 现有 `boss:apply-current -- --probe true` 的 Playwright `connectOverCDP` 会话却仍看不到同一张 BOSS 页签
- 用户补充了更强的新证据：
  - 未登录的 BOSS 页在自动化上下文里会在首页/前页之间来回跳转
  - 因此当前不仅“未验证通过”，连“登录升级态”本身都不稳定
- 本轮又补了一层结构化证据：
  - 对同一个 BOSS target 连续采样 10 秒，确认它会在 chat、`/web/user/`、空 URL 之间振荡
- 又补了一条路径对比结论：
  - 直接进 `chat` 入口更不稳定
  - 后续如果继续验证登录升级态，应优先从首页入口开始
- 已结合 `geekgeekrun` 仓库实现补了一层外部参照：
  - 其登录助手明确从 `/web/user/` 开始
  - 登录与业务自动化明确分离
  - 登录成功后以 cookies / 网络事件为判据，再进入后续业务流
- 已把这一思路落成 `boss-login-helper` 原型，并完成 5 秒 smoke：
  - 首页入口稳定落在 `https://www.zhipin.com/shanghai/?seoRefer=index`
  - `/web/user/` 入口稳定停在登录页
  - 相比之下，`chat` 入口仍然更不稳定
- 用户又补了一条更强的一手证据：
  - `OpenCLI / BB-browser` 这类外部 CDP 附加浏览器方案，亲测会被 Boss 检测并强制回退/关闭页面
  - 因此 Boss 主链后续不应再把远程附加浏览器当候选路线
- 已输出验证报告：
  - [2026-04-13-interactive-browser-prototype.md](/Users/proerror/Documents/redbook/docs/reports/2026-04-13-interactive-browser-prototype.md)
- 已尝试过一版极窄的 BOSS probe 连接层替换，但因为验证不稳定，已经回滚，未保留在生产脚本里。

**未完成 / 遗留：**
- 这轮只验证了“真实 Chrome + 只读 probe”，还没有验证点击、输入、上传等动作能力。
- 因为 `127.0.0.1:9222` 当前仍没有活跃的 BOSS 页签，所以没把这个原型接到 `opencli_apply_current_tab.js` 上。

**下次会话优先做：**
- 先拿这个原型去跑 BOSS current-tab 的真实只读 probe。
- 再验证最小动作链（点击 / 输入）后，才决定是否替换现有业务脚本的连接层。

**需要注意：**
- 按当前规则，原型虽然成功，但还不足以直接替换生产主链。
- 这轮最重要的结果是：`interactive-browser` 可以先走原生 Chrome CDP，不需要默认依赖 Playwright。

## [2026-04-13] 会话摘要：浏览器统一 Phase 0

**完成了什么：**
- 把“浏览器统一”从盘点和草案推进到了第一批实际落地。
- 已新增仓库内唯一标准文档：
  - [browser-modes.md](/Users/proerror/Documents/redbook/docs/standards/browser-modes.md)
- 已将关键业务入口挂到统一标准：
  - X 发布 skill
  - URL to Markdown skill
  - 微信发布 skill
  - BOSS `zhipin` skill
  - `tools/opencli/README.md`
  - `tools/auto-x/README.md`
  - 两份小红书全局 skill
- 已修正 gstack 相关明显漂移：
  - `browse` skill 关键路径从旧 `~/.claude` 改到当前 `~/.codex`
  - `setup-browser-cookies` skill 关键路径从旧 `~/.claude` 改到当前 `~/.codex`
  - `connect-chrome` 已重写成路由型 skill，不再宣传不存在的 `browse connect/disconnect`
- 已根据新偏好“尽量不要使用 Playwright”调整口径：
  - 标准文档中将 Playwright 降级为 fallback
  - 统一草案中把 QA / render 的默认建议改为优先非 Playwright 路径
  - 烟测报告中把 `gstack browse` 和 `Playwright MCP` 明确标注为可用但不默认
- 已根据新偏好“默认无头，只有登录/验证码/人工验证才临时有头”调整执行策略：
  - 标准文档新增 `默认执行姿态` 章节
  - 统一草案明确 `headless` 为默认，`headed` 只作为升级态
  - `connect-chrome` 路由文档也同步改成 headless-first 说明

**未完成 / 遗留：**
- 这轮还没有开始迁移业务脚本到底层 shared browser core。
- `agent-browser-session` 仍是 legacy 状态，但还没从旧链路里拔掉。
- `connect-chrome` 现在是正确的路由文档，但还没有新的 headed runtime 替代实现。

**下次会话优先做：**
- 进入 Phase 1：开始抽共享 `interactive-browser` core。
- 优先从 BOSS / XHS 两条最接近 current-tab 模型的业务线开始。

**需要注意：**
- 这轮统一的重点是“先统一默认分层和默认叙事”，不是一次性重写所有浏览器代码。

## [2026-04-13] 会话摘要：浏览器方案烟测

**完成了什么：**
- 对当前主要浏览器方案做了一轮最小可用性验证，不再只靠文档推断。
- 已输出烟测报告：
  - [2026-04-13-browser-stack-smoke-test.md](/Users/proerror/Documents/redbook/docs/reports/2026-04-13-browser-stack-smoke-test.md)
- 本轮确认可用的主链：
  - `Chrome DevTools MCP`
  - `Playwright MCP` 标准模式（SSE 监听成功）
  - `gstack browse`
  - `opencli Browser Bridge`
  - `XHS current-tab CDP`
- 本轮确认的主要问题：
  - `connect-chrome` 文档要求的 `browse connect/disconnect` 在真实 binary 中不存在，属于文档/实现漂移
  - `agent-browser-session` 当前恢复失败，旧 `auto-x` 研究链不稳定
  - `render_xhs.py` 缺 Python 依赖，旧 Python render 栈不完整
  - `BOSS current-tab` 的 probe 机制可用，但当前会话里没有激活的 BOSS 页，所以只做到了基础探测

**未完成 / 遗留：**
- X 发布、微信 browser 发布、URL to Markdown 这轮只做了命令面 smoke，没有做真实业务写操作，避免副作用。
- `setup-browser-cookies` 没做完整交互测试，因为它需要人工在浏览器里选域名。

**下次会话优先做：**
- 优先修 `connect-chrome` 的文档/实现漂移。
- 决定是否冻结 `agent-browser-session` 为 legacy。
- 决定 `opencli bridge` 在统一方案里是长期兼容层还是过渡层。

**需要注意：**
- 这轮最大的价值不是“全部跑绿”，而是把“真可用主链”和“历史残留兼容层”区分清楚了。

## [2026-04-13] 会话摘要：切换 gws 默认 OAuth client 到独立 GCP 项目

**完成了什么：**
- 确认 `gws` 本地默认 OAuth client 之前仍指向旧项目 `neural-engine-337808`，虽然已经创建了新项目 `gws-proerror-gmail-auth`，但并没有真正接成默认 client。
- 在新项目里补齐了 Google Auth Platform 配置：
  - 创建品牌信息
  - 受众设为 `External / Testing`
  - 新增测试用户 `proerror@gmail.com`
  - 创建 Desktop OAuth client：`951380678194-906lnsdg4vk0me65ltkv4o1stk85p5nk.apps.googleusercontent.com`
- 备份了旧本地配置到：`~/.config/gws/backup-20260413-124354/`
- 将 `~/.config/gws/client_secret.json` 与 `~/.config/gws/client_secret.installed.json` 切到新项目 client。
- 清理了旧 `credentials.enc` / `token_cache.json`，随后使用新 client 重新完成了 `gws auth login -s gmail`。
- 已通过两层验证：
  - `gws auth status` 当前返回 `project_id: gws-proerror-gmail-auth`
  - `gws gmail users labels list --params '{"userId":"me"}'` 成功返回真实 Gmail labels

**未完成 / 遗留：**
- 当前认证链路为了避开 macOS 钥匙串交互，仍使用 `GOOGLE_WORKSPACE_CLI_KEYRING_BACKEND=file`。
- 如果后续想恢复 OS keyring 模式，需要单独验证本机钥匙串权限与 `gws` 的 keyring backend 是否稳定。

**下次会话优先做：**
- 如需把 `gws` 用得更顺手，可以把 `GOOGLE_WORKSPACE_CLI_KEYRING_BACKEND=file` 固化到 shell 环境，避免每次手动带 env。
- 如果接下来要扩展到 Drive / Sheets / Calendar，可以直接在当前新项目上继续新增 scopes，不必再回旧项目。

**需要注意：**
- 现在真正的默认 OAuth client 已经是新项目，不要再把 `~/.config/gws/client_secret*.json` 回滚到旧备份，除非你明确要迁回 `neural-engine-337808`。

## [2026-04-13] 会话摘要：浏览器统一架构草案

**完成了什么：**
- 在浏览器方案盘点的基础上，继续往前收敛成一份目标架构草案，而不是停留在“现状很乱”。
- 已输出方案文档：
  - [2026-04-13-browser-unification-proposal.md](/Users/proerror/Documents/redbook/docs/plans/2026-04-13-browser-unification-proposal.md)
- 草案核心不是“所有东西统一成一个工具”，而是明确只允许 3 种浏览器执行模式：
  - `interactive-browser`
  - `qa-browser`
  - `render-browser`
- 已明确建议：
  - 真实 Chrome + current-tab / named-profile + CDP 作为生产交互底座
  - gstack `browse` 作为 QA/headless 底座
  - Playwright/Chromium headless 作为静态渲染底座
- 已将 `opencli Browser Bridge`、`agent-browser`、`Playwright MCP --extension` 重新定位为兼容层 / fallback，而不是默认主入口。

**未完成 / 遗留：**
- 这仍是架构草案，不是最终拍板版。
- 还没有开始把任何业务 skill 迁到新的分层。

**下次会话优先做：**
- 让你拍板 3 个问题：
  - `interactive-browser` 是否正式定为真实 Chrome + current-tab / named-profile + CDP
  - `opencli Browser Bridge` 是长期兼容层还是只保留到 BOSS 迁完
  - `agent-browser` 系列是否立即冻结为 legacy

**需要注意：**
- 真正要统一的不是“浏览器程序名”，而是“默认分层、默认入口、默认登录态策略”。

## [2026-04-13] 会话摘要：浏览器方案盘点

**完成了什么：**
- 对当前 redbook 里的浏览器相关方案做了一轮分层盘点，不急着合并，先把地图画清楚。
- 已覆盖的层包括：
  - 通用 MCP 控制层：`Playwright MCP`、`Chrome DevTools MCP`
  - gstack 层：`browse`、`connect-chrome`、`setup-browser-cookies`
  - 仓库内桥接层：`tools/opencli` Browser Bridge
  - 站点专用业务层：X、小红书、微信、BOSS
  - 试验层：`page-agent-console`
- 已输出盘点文档：
  - [2026-04-13-browser-stack-inventory.md](/Users/proerror/Documents/redbook/docs/reports/2026-04-13-browser-stack-inventory.md)

**未完成 / 遗留：**
- 这轮只做盘点，没有开始收敛，也没有改动各业务 skill 的实现。
- 文档里给了“初步方向”，但还没做最终架构决策。

**下次会话优先做：**
- 先定 3 个问题：
  - 默认浏览器底座是谁
  - 默认登录态复用策略是谁
  - 业务 skill 以后还能不能各自私带一套浏览器启动逻辑

**需要注意：**
- 现在真正的混乱不在于“有很多浏览器工具”，而在于“职责层级没有统一命名和优先级”。

## [2026-04-13] 会话摘要：修复 Playwright MCP 扩展桥接拦截页

**完成了什么：**
- 复盘了 `.omx` 状态、`tasks/lessons.md` 和当前运行中的 MCP 进程，确认这不是页面本身或 token 的问题，而是启动模式选错了。
- 确认当前仓库 `.mcp.json` 把 Playwright MCP 配成了 `npx -y @playwright/mcp@latest --extension`，这会强制走 Chrome 扩展桥接模式。
- 确认当前主 Chrome `Default` profile 里并没有对应的 Playwright 扩展目录；Chrome 只保留了扩展签名残留，所以打开 `chrome-extension://mmlmfjhmonkocbjadbfplnigmagldckm/connect.html?...` 时会直接报 `ERR_BLOCKED_BY_CLIENT`。
- 同时确认当前会话里确实有一个 `playwright-mcp --extension` 进程在跑，并监听 `127.0.0.1:50535`，说明报错页正是这份仓库配置拉起的。
- 已将项目根目录 `.mcp.json` 改回 `@playwright/mcp` README 推荐的标准配置：只保留 `npx -y @playwright/mcp@latest`，移除了 `--extension` 和无效的 `PLAYWRIGHT_MCP_EXTENSION_TOKEN`。

**未完成 / 遗留：**
- 我只修了仓库内 `.mcp.json`。你用户级 `~/.codex/mcp.json` 里目前仍有同样的 `--extension` 配置；在别的仓库或无项目配置场景下，仍可能继续弹同样的拦截页。
- 当前已经跑起来的旧 `playwright-mcp --extension` 进程不会自动自杀；要让新配置生效，需要重启使用这份 `.mcp.json` 的客户端会话或重载 MCP server。

**下次会话优先做：**
- 如果你希望全局也彻底消掉这个问题，可以把 `~/.codex/mcp.json` 同样改成标准模式，或在明确需要桥接真实 Chrome 时再单独安装 Playwright MCP Bridge 扩展。
- 如果你确实需要扩展桥接而不是普通 Playwright 浏览器，再补一条“安装并验证 Playwright MCP Bridge 扩展”的显式流程，避免再次出现“配置要求扩展，但 profile 里没有扩展”的半配置状态。

**需要注意：**
- 这次真正的根因不是网页被广告拦截，也不是本地 `ws://127.0.0.1:50535/...` 不通，而是 `.mcp.json` 要求了一个本机并不存在的扩展桥接模式。
- 对 `@playwright/mcp`，默认应先用官方标准配置；只有在明确要接入已安装的 Chrome 扩展桥时，才加 `--extension`。

## [2026-04-11] 会话补记：修复 Claude Code MCP 配置与失效插件

**完成了什么：**
- 修复了项目根目录的 `.mcp.json`，把旧的 `mcp.playwright` 结构改成当前 Claude Code 可解析的顶层 `mcpServers` 结构。
- 保留了原有 `PLAYWRIGHT_MCP_EXTENSION_TOKEN`，仅做 schema 迁移，没有改动 token 值。
- 定位出 `context-engineering-marketplace` 的插件错误不是 marketplace 缺失，而是插件已从旧名 `agent-architecture` 收敛为新名 `context-engineering`。
- 已同步修复 3 处用户级状态：
  - `~/.claude/plugins/installed_plugins.json`
  - `~/.claude/plugins/cache/context-engineering-marketplace/...`
  - `~/.claude/settings.json`
- 已备份旧安装记录到 `~/.claude/plugins/backups/20260411-210526/installed_plugins.json`。
- 已用 `claude doctor` 复验；新的输出里不再出现 `.mcp.json` parse error，也不再出现 `agent-architecture@context-engineering-marketplace` 的 plugin error。

**未完成 / 遗留：**
- 这次修的是当前配置与安装记录，不会自动清理历史 debug 日志里旧的 `agent-architecture` 文本；那些只是历史记录。
- 如果你当前已经开着 Claude Code 旧会话窗口，界面上的旧错误提示可能要在下一次打开 `/doctor` 或重启会话后才完全刷新。

**下次会话优先做：**
- 如果还要继续整理 Claude Code 环境，可以顺手检查 `~/.claude/settings.json` 里的其他已启用插件是否都和各自 marketplace 当前名称一致。

**需要注意：**
- 当前仓库里还有大量与你这次修复无关的未提交内容改动；后续提交 git 时要继续保持只提交本次修复相关文件。

## [2026-04-12] 会话摘要

**完成了什么：**
- 确认昨天漏发的对象是 [2026-04-11-用AI越多大脑越废.md](/Users/proerror/Documents/redbook/01-内容生产/03-已发布的选题/2026-04-11-用AI越多大脑越废.md)；仓库里没有任何对应的发布记录、已发布归档或 harness 发布证据。
- 真实复现了 `x-thread.ts` 的失败：`Textarea 1 not found after clicking add button`，并确认当前 X compose 页面存在重复的 `tweetTextarea_0`，旧脚本会打到隐藏 editor。
- 进一步核对了历史成功路径：过去真正稳定跑通的是 `x-browser.ts` 和 `x-article.ts`；并用 `$baoyu-danger-x-to-markdown` 反查公开链接，确认仓库里部分标成“X.com 长文”的内容，实际公开形态是单条长帖 `tweet`。
- 发现当前账号下 `https://x.com/compose/articles` 页面只有侧边导航，没有 `Write` / editor，因此这次没有继续硬走 article。
- 修正了 [x-browser.ts](/Users/proerror/Documents/redbook/.agents/skills/baoyu-post-to-x/scripts/x-browser.ts) 的 editor 选择逻辑，改为只点击可见编辑器。
- 最终将这篇内容作为 X.com 单条长帖补发成功，主页回查到最新公开链接：`https://x.com/0xcybersmile/status/2043151115399942583`。
- 已用 `$baoyu-danger-x-to-markdown` 将新帖回拉成 markdown 证据：`x-to-markdown/0xcybersmile/2043151115399942583.md`。
- 已将主稿和 article 尝试稿移动到 `01-内容生产/03-已发布的选题/`，并回填发布信息、wiki 页面和任务板。

**未完成 / 遗留：**
- `x-thread.ts` 本轮只完成了根因定位，没有做到稳定验证，不建议当前继续把它当成生产主链路。
- `x-article.ts` 当前依赖的 `compose/articles -> Write` 流程，在你这次账号状态下没有跑通；后续若要继续用 article，需要单独再核对入口变化或账号权限状态。

**下次会话优先做：**
- 如果你还想把这条内容扩成真正的 X Article，再单独排查 `compose/articles` 当前为什么没有 `Write` / editor。
- 如果要继续做 X 长内容，优先先判断“单条长帖是否足够”，不要默认走 thread / article。

**需要注意：**
- 对 X 发布，先确认历史公开产物的真实形态，再决定用哪个脚本。
- `x-browser.ts` / `x-thread.ts` 这类 compose 脚本都要警惕“隐藏 editor”问题，不能只用第一个 `tweetTextarea_0`。

## [2026-04-12] 会话摘要

**完成了什么：**
- 基于今天的正式研究产物，沉淀并发布了新题《团队 AI 化后真正缺的不是 Prompt，是 Harness Engineering》。
- 新增待深化 brief：
  - `01-内容生产/01-待深化的选题/团队AI化后真正缺的不是Prompt，是Harness Engineering.md`
- 直接产出并发布了跨平台版本：
  - X.com 带图单条长帖：`https://x.com/0xcybersmile/status/2043201922392633769`
  - 小红书图文：标题 `团队AI化后，真正缺的不是Prompt`，笔记 ID `69db30e700000000230132e5`
- 小红书复用了现成图组：
  - `xhs-images/ai-architecture-skill/01-cover-ai-architecture.png`
  - `.../02-content-pain-point.png`
  - `.../03-content-insight.png`
  - `.../04-content-comparison.png`
  - `.../05-content-method.png`
  - `.../06-ending-ai-architecture.png`
- 已将主稿归档到：
  - `01-内容生产/03-已发布的选题/2026-04-12-团队AI化后真正缺的不是Prompt，是Harness Engineering.md`
- 已用 `x-to-markdown` 保存 X 侧公开证据：
  - `x-to-markdown/0xcybersmile/2043201922392633769.md`

**未完成 / 遗留：**
- `x-browser.ts` 的图片粘贴链路在当前机器上仍不可靠；本轮最终是靠浏览器原生文件上传修正的。
- 小红书这边刚发布，后台数据里只有标题 / 发布时间 / note id，曝光和互动还没形成有效样本。

**下次会话优先做：**
- 观察这条小红书和 X 的首轮数据，决定是否再拆公众号版。
- 如果还要继续做 X 图文，优先修正或替换 `x-browser.ts` 的图片上传方式。

**需要注意：**
- 对图文帖，不能只信“脚本显示提交成功”；必须回查主页确认最终公开形态。
- 当前机器上，X 图文更稳的做法是直接用浏览器文件上传，不要依赖系统粘贴权限。

## [2026-04-10] 会话补记：内容工作流防同质化审计

**完成了什么：**
- 把用户提供的经验当成“工作流审计标准”，不是当成待发布稿件。
- 审计后确认：redbook 现有流程已经覆盖 `素材库检索`、`QA`、`发布清单`，但确实缺少 4 个关键门：
  - `AI 辅助安全线`
  - `同质化检查`
  - `情绪密度检查`
  - `发布前内容风控（四检）`
- 已更新：
  - `docs/shared/redbook-playbook.md`
  - `03-方法论沉淀/X-长文与Thread写作架构.md`
- 已通过 `python3 tools/sync_redbook_playbook.py` 同步更新：
  - `AGENTS.md`
  - `CLAUDE.md`

**未完成 / 遗留：**
- 当前只是把规则补进流程，还没有把“同质化检测 / 暗限流检测”做成自动工具链。
- `dbskill` 里现成可直接接入的是 `/dbs-ai-check`，但“最近 7 天热门内容对比”仍主要靠人工审查。

**下次会话优先做：**
- 如果你要，我下一步可以继续把这 4 道门具体落成一个可复用的“发布前检查模板”文件，或者做成 harness 的 `publish_checklist` 标准模板。

**需要注意：**
- 这次结论不是“AI 不能多用”，而是“AI 不能直接产成稿”。
- 平台真正高风险的往往不是单纯 AI 痕迹，而是 `AI 味重 + 同质化高 + 情绪密度低` 同时出现。

## [2026-04-09] 会话补记：X 长文与 Thread 爆文架构升级

**完成了什么：**
- 使用当前登录态的 X 会话筛了 `AI 工具/产品分析` 与 `AI 观点判断` 两类高互动样本，并完成结构拆解。
- 新增研究报告：`05-选题研究/X-爆文结构拆解-2026-04-09.md`。
- 新增方法论文档：`03-方法论沉淀/X-长文与Thread写作架构.md`。
- 新增 wiki 方法页：`wiki/方法论/X-长文与Thread写作架构.md`，并更新了 `wiki/方法论/爆款规律.md`。
- 已按新架构改写 3 篇代表性文稿：
  - `01-内容生产/01-待深化的选题/GPT-5.4发布后-普通人真正该关心什么.md`
  - `01-内容生产/01-待深化的选题/AI工具越来越强-真正值钱的还是数据不是软件-X-thread.md`
  - `01-内容生产/02-制作中的选题/2026-04-05-OpenClaw封禁你问错了问题.md`
- 已把 `research_report` 与 `draft` artifact 挂到 harness run `20260409-093747-x爆文结构升级-95a2d5`，并验证 research gate 通过。

**未完成 / 遗留：**
- 这轮只改了 3 篇代表性文稿，其他在制 X 稿件还没有全面迁移到新骨架。
- 还没有补真实发布数据回流，所以 `爆款规律` 里新增的结构判断，当前仍属于“样本拆解 + 编辑经验”层，不是发布后数据闭环。

**下次会话优先做：**
- 把同类结构迁移到其余在制 `X Thread / X Article` 草稿。
- 挑一篇按新骨架发布后，回收真实数据，继续修正 `wiki/方法论/爆款规律.md`。

**需要注意：**
- 今后写 X 内容，不要从背景讲起，要从判断讲起。
- 对工具帖，必须补“摩擦信息”：成本、部署门槛、限制条件。
- 对观点帖，必须尽早给场景，不然会像空洞立场输出。

## [2026-04-09] 会话补记：批量迁移剩余 X 稿件

**完成了什么：**
- 在第一轮代表性改稿之后，又继续把 6 篇剩余的在制 X 稿件迁到新骨架。
- 已改写的文件包括：
  - `01-内容生产/02-制作中的选题/2026-03-25-LiteLLM供应链投毒/X-主帖.md`
  - `01-内容生产/02-制作中的选题/2026-03-25-GPT-5.4前沿数学/X-主帖.md`
  - `01-内容生产/02-制作中的选题/2026-03-31-Claude-Code-NPM源码泄露/X-主帖.md`
  - `01-内容生产/02-制作中的选题/2026-03-10-AgentHub/X-主帖.md`
  - `01-内容生产/02-制作中的选题/2026-04-05-从在业务里工作到在业务上工作.md`
  - `01-内容生产/02-制作中的选题/2026-02-16-OpenClaw加入OpenAI/推文草稿.md`
- 这轮改动把“单帖热点评论”和“工具分析帖”也统一拉回了新方法论：先给判断，再给场景，再补后果或门槛。

**未完成 / 遗留：**
- 仍有少量“主文稿内嵌 X 发布段落”的混合文件还没拆出来单独迁移，比如 `2026-04-06-AI已经从模型战争进入部署战争.md` 这类长稿尾部的 X 发布段。
- 这轮没有做发布动作，只做了结构升级。

**下次会话优先做：**
- 继续清理混合型长稿里残留的旧 X 发布结构。
- 从这批稿件里挑 1-2 篇先发，拿真实互动数据回校 `wiki/方法论/爆款规律.md`。

**需要注意：**
- 老稿里常见的问题不是“信息少”，而是“第一句不够狠”。
- 多版本草稿文件后续应优先收口到“推荐终稿”，不要继续放任多个平级版本并列。

## [2026-04-09] 会话补记：放弃“部署战争”长文

**完成了什么：**
- 用户明确否掉了 `AI 已经从模型战争，进入部署战争` 这篇长文，认为它写得不好，不再继续推进。
- 已将文件从 `02-制作中的选题/` 移到 `01-内容生产/选题管理/已放弃选题/`：
  - `01-内容生产/选题管理/已放弃选题/2026-04-06-AI已经从模型战争进入部署战争.md`
- 已把相关 wiki 引用从“制作中 / 推荐写法”改为“已放弃 / 如果重写要换切口”。

**未完成 / 遗留：**
- 历史 run、历史日报、历史进展里仍会保留这篇稿子的过去运行记录；这些是历史痕迹，不再代表当前主线。

**下次会话优先做：**
- 如果还想继续做“低 token / 本地 AI / 端侧模型”这个主题，应该彻底换标题和入口，不要继续救“部署战争”这套表达。

**需要注意：**
- 用户已经明确否掉这篇，后续不要再把它当成待发布或待改写母稿。

## [2026-04-09] 会话补记：X following 巡检续跑

**完成了什么：**
- 重新核对了 `audit_following.py` 的断点续跑状态，确认 today following 当前为 `1410` 个账号，已有审计结果 `100` 条。
- 发现全量巡检的真实瓶颈是 X 资料页导航普遍命中 `page.goto: Timeout 10000ms exceeded`，不是脚本崩溃；脚本会在超时后继续分类并进入下一个账号。
- 已重新用 `--resume --save-every 1 --wait-seconds 0.9` 接上巡检，避免像上一轮那样在中断时丢掉本批进度。
- 已修正 `tools/auto-x/scripts/audit_following.py` 的单账号巡检流程：
  - `open` 超时统一按软超时处理，不再额外做无效的 `get url` 重试
  - `snapshot` 失败会返回 `error`，避免误记成普通 `no_recent_articles`
  - 浏览器子命令超时已收紧，减少单账号卡住时间
- 当前已确认继续落盘到第 `109` 条；`100 -> 109` 这 9 个账号的进度已安全写回 JSON / Markdown。

**未完成 / 遗留：**
- 受限于 X 资料页导航速度，剩余 `1301` 个账号仍需持续长跑，当前尚未形成完整 unfollow 候选面板。

**下次会话优先做：**
- 继续观察 [X-following-巡检-2026-04-09.md](/Users/proerror/Documents/redbook/05-选题研究/X-following-巡检-2026-04-09.md) 与 [following_audit_latest.json](/Users/proerror/Documents/redbook/tools/auto-x/data/following_audit_latest.json) 的增长。
- 当 `inactive / not_found / suspended / no_posts` 候选数量稳定后，整理第一批 unfollow 清单给用户确认。

**需要注意：**
- 当前这条巡检链路更适合长跑，不适合在交互会话里等它一次性扫完。
- `save_every=1` 已经生效，后续即使手动中断，也不会再回退整批进度。

## [2026-04-09] 会话补记：X following 收尾补关注

**完成了什么：**
- 复核了上一轮因 X 限速未确认的两个账号：`@aiDotEngineer`、`@agrimsingh`。
- 在真实资料页逐个验证按钮状态，两者进入页面时都仍显示 `关注 @用户名`，说明此前并未成功关注。
- 已在当前登录会话内重新执行单次关注，并通过页面回读确认状态切换为 `正在关注 @aiDotEngineer` 与 `正在关注 @agrimsingh`。
- 本轮没有继续做批量关系操作，也没有执行任何 unfollow 删除动作。

**未完成 / 遗留：**
- `X following` 全量巡检主任务仍未跑完整，当前 `following_audit_latest.json` 只覆盖前 `100` 个账号。
- 首轮 unfollow 仍需等待更完整的巡检结果后，再按 `inactive / not_found / suspended / no_posts` 生成候选清单并做二次确认。

**下次会话优先做：**
- 继续把全量巡检跑完，更新 [X-following-巡检-2026-04-09.md](/Users/proerror/Documents/redbook/05-选题研究/X-following-巡检-2026-04-09.md)。
- 在候选清单稳定后，再执行首轮 unfollow 清理确认。

**需要注意：**
- X 关系操作要坚持“小批量、单次确认、页面回读”原则；不要因为剩余数量少就恢复连续点击。
- 对 follow 成功与否，必须以资料页按钮切换到 `正在关注/取消关注` 为准，不能只看 click 返回成功。

## [2026-04-10] 会话补记：X KOL 推荐名单慢速补关注

**完成了什么：**
- 根据用户提供的 KOL 推荐截图，继续补 follow 剩余账号。
- 先复用昨晚的限速经验，确认浏览器会话正常后改成 `2 个一批`、`--wait-seconds 2.5` 的慢速策略。
- 本轮明确成功补 follow 的账号有：
  - `@dhh`
  - `@karisaari`
  - `@trq212`
  - `@lennysan`
  - `@leerob`
  - `@ctatedev`
  - `@shipgford`
  - `@shadcn`
  - `@emilkowalski`
  - `@joshpuckett`
  - `@jakubkrehel`
  - `@raphaelsalaja`
  - `@nandafyi`
  - `@benjitaylor`
  - `@mengto`
  - `@jayneildalal`
  - `@jh3yy`
  - `@gergelyorosz`
  - `@theo`
- 用户截图提供了更强证据：X 明确弹出“抱歉，你受到速度限制。请稍等片刻，然后再试一次。” 蓝色横幅，因此后续执行全部按 rate limit 处理。

**未完成 / 遗留：**
- 仍未确认成功的账号有：
  - `@ThePrimeagen`
  - `@Rasmic`
  - `@atmoio`
  - `@jamwt`
  - `@jamesacowling`
  - `@glcst`
  - `@samlambert`

**下次会话优先做：**
- 再隔一段时间后，仅针对上述 7 个失败账号继续慢速补 follow。

**需要注意：**
- 当用户截图已经明确给出 rate limit 横幅时，不要再拿“按钮回读失败”去和它对冲。
- X 的 follow 失败账号要留到下一轮窗口处理，不要在同一轮里二次点击。

## [2026-04-10] 会话补记：X KOL 推荐名单补关注收尾

**完成了什么：**
- 继续对上一轮剩余失败账号做慢速补 follow，仍保持 `2 个一批`。
- 本轮新增确认成功的账号有：
  - `@Rasmic`
  - `@glcst`

**未完成 / 遗留：**
- 仍未收口的账号有：
  - `@ThePrimeagen`
  - `@atmoio`
  - `@jamwt`
  - `@jamesacowling`
  - `@samlambert`
- 这些账号本轮的失败类型更偏 `未找到关注按钮` 或 `点击后未确认成功`，不像第一批那样稳定，因此不继续追点。

**下次会话优先做：**
- 如果还要继续补这 5 个，建议先单独进入资料页人工看一眼按钮状态，再决定是否点。

**需要注意：**
- `未找到关注按钮` 不一定等于没关注，有可能是页面状态、资料页布局或会话波动问题。
- 对这种少量尾部账号，人工复核优先级高于继续批量脚本重试。

## [2026-04-09] 会话补记：X following 全量巡检与清理

**完成了什么：**
- 为 `@0xcybersmile` 的 following 维护任务新增了全量巡检脚本 [audit_following.py](/Users/proerror/Documents/redbook/tools/auto-x/scripts/audit_following.py)。
- 新增了默认 `dry-run` 的清理脚本 [unfollow_from_audit.py](/Users/proerror/Documents/redbook/tools/auto-x/scripts/unfollow_from_audit.py)，用于在确认后执行 unfollow。
- 新增回归测试 [test_audit_following.py](/Users/proerror/Documents/redbook/tools/auto-x/tests/test_audit_following.py)，覆盖 `not_found / suspended / active / inactive / pinned` 等关键判定。
- 已把 following 巡检接入 [run_daily.sh](/Users/proerror/Documents/redbook/tools/auto-x/scripts/run_daily.sh)，早上自动任务会在日报之后后台启动 following 审计。
- 已完成 `limit=5` 的真机 smoke test，并开始了 today 的全量巡检。

**当前结果：**
- 当前 following 全量巡检已重新抓取到 `1407` 个最新 following，并开始逐个审计主页 timeline。
- 当前已落盘的首批结果在：
  - [X-following-巡检-2026-04-09.md](/Users/proerror/Documents/redbook/05-选题研究/X-following-巡检-2026-04-09.md)
  - [following_audit_latest.json](/Users/proerror/Documents/redbook/tools/auto-x/data/following_audit_latest.json)
- 截至首批 `25` 个账号，已出现 `1` 个强 unfollow 候选：`@edendotso`，最近一条可见动态距今 `290` 天。
- 另有若干 `no_recent_articles` 账号已被列入“待人工复核”，暂不直接 unfollow。
- 在继续处理用户“补 follow AI Agent 相关博主”的请求时，已新增批量 follow 脚本 [follow_accounts.py](/Users/proerror/Documents/redbook/tools/auto-x/scripts/follow_accounts.py)。
- 本轮已实际补 follow 成功的账号包括：
  - `@perplexity_ai`
  - `@jerryjliu0`
  - `@swyx`
  - `@dkundel`
  - `@PaulSolt`
  - `@yoheinakajima`
  - `@mckaywrigley`
  - `@SherryYanJiang`
  - `@mervenoyann`
  - `@LlamaIndex`
  - `@OpenRouterAI`
  - `@dustingor`
- 对当前 `inactive` 强候选执行 unfollow 时，实际发现 `@edendotso` 和 `@me` 当前都已经不是“已关注”状态，因此没有发生删除动作。
- 在继续补 follow 时，`@aiDotEngineer` 页面明确出现了 `关注 @aiDotEngineer` 按钮，但点击后触发了 X 的 `速度限制` 提示，因此本轮未继续强行操作。

**未完成 / 遗留：**
- 全量巡检仍在运行，需要等待它继续落盘，形成完整候选清单。
- 在全量清单完成后，需要按项目规则向用户做一次 unfollow 二次确认，再执行首轮清理。
- 仍有少量待补关注账号因为页面超时或按钮未确认成功，需要单独复核，例如 `@aiDotEngineer`、`@latentspacepod`、`@agrimsingh`、`@ivanleomk`、`@aimuggle`。
- 其中 `@latentspacepod`、`@ivanleomk`、`@aimuggle` 已在后续复核时成功关注；当前真正剩余待补的是 `@aiDotEngineer` 和 `@agrimsingh`，但需要等待 X 速度限制解除。

**下次会话优先做：**
- 继续观察 [following_audit_latest.json](/Users/proerror/Documents/redbook/tools/auto-x/data/following_audit_latest.json) 与 [X-following-巡检-2026-04-09.md](/Users/proerror/Documents/redbook/05-选题研究/X-following-巡检-2026-04-09.md) 的更新，直到全量巡检结束。
- 以 `inactive / not_found / suspended / no_posts` 为第一批候选，向用户做 unfollow 二次确认。

**需要注意：**
- “精选几个值得跟踪的账号”和“每天全量巡检 following 并做清理”是两种不同任务，不能混在一起回答。
- unfollow 属于关系清理动作，必须先给候选清单，再执行二次确认。

## [2026-04-09] 会话补记：X following 深度跟踪

**完成了什么：**
- 基于用户提供的 `https://x.com/0xcybersmile/following`，先验证 following 页在当前登录态下可读，然后重新抓取完整 following。
- 使用 [scrape_following.py](/Users/proerror/Documents/redbook/tools/auto-x/scripts/scrape_following.py) 实际滚动 `130` 次，抓到当日 following `1407` 个账号。
- `tools/auto-x/data/following.json` 已更新；由于该文件会合并历史缓存，因此总量为 `1495`，其中本轮最新账号以 `scraped_at=2026-04-09` 为准。
- 已生成 following 原始清单：
  - [X-关注列表-0xcybersmile-2026-04-09.md](/Users/proerror/Documents/redbook/05-选题研究/X-关注列表-0xcybersmile-2026-04-09.md)
- 已进一步产出重点跟踪研究稿：
  - [X-following-重点跟踪-2026-04-09.md](/Users/proerror/Documents/redbook/05-选题研究/X-following-重点跟踪-2026-04-09.md)
- 结合候选账号的真实 timeline，最终收口出三层跟踪名单：
  - 第一梯队：`@OpenAIDevs`、`@claudeai`、`@turingou`、`@shannholmberg`
  - 第二梯队：`@EverMind`、`@KevinNaughtonJr`、`@IndieDevHailey`、`@alin_zone`
  - 第三梯队：`@droid`、`@OpenAI`
- 已把研究稿挂到 harness run `20260408-235457-x-following-深度跟踪-2026-04-09-ae8032`，并将 `materials_queried` / `research_complete` / `lessons_reviewed` 置为 `true`；`check-gates` 当前为 `ready: true`。

**未完成 / 遗留：**
- `following.json` 的 `display_name` / `bio` 解析质量仍有噪声，因为当前 `extract_users()` 是从 accessibility tree 粗提取，容易把按钮文案混进字段。
- 本轮已经足够做 watchlist 筛选，但如果要做更精细的自动分类，最好单独修 `extract_users()`。

**下次会话优先做：**
- 如果要把这套研究变成日更流程，可以直接基于第一梯队和第二梯队生成一份“重点账号 timeline 日报”。
- 如果要提升账号分类质量，优先修 `tools/auto-x/scripts/x_utils.py` 里的 `extract_users()`，让 following 元数据更干净。

**需要注意：**
- `following.json` 不能直接拿总量做“当前关注数”，必须先按 `scraped_at` 过滤。
- 对 X 研究任务，真正有价值的不是“抓全了 1407 个”，而是收口成少量高信噪比 watchlist。

## [2026-04-09] 会话摘要

**完成了什么：**
- 对“为什么对外连不上”做了分层排查，确认不是整机外网故障：`curl https://example.com` 正常，真正有问题的是 3 条外部情报链路各自的接入方式。
- 恢复了 X 浏览器会话：`agent-browser-session kill` 后重新 `open https://x.com/home`，`snapshot -c -d 2` 已能稳定返回主页结构。
- 修复了 HN 抓取：
  - 在 [scrape_hackernews.py](/Users/proerror/Documents/redbook/tools/auto-x/scripts/scrape_hackernews.py) 中为 Firebase API 增加统一请求封装
  - 当 `topstories.json` 或 `item/{id}.json` 命中 `SSLEOFError` 时，自动降级到 Algolia `search?tags=front_page` 与 `items/{id}`
- 修复了 Reddit 抓取：
  - 在 [scrape_reddit.py](/Users/proerror/Documents/redbook/tools/auto-x/scripts/scrape_reddit.py) 中保留官方 JSON 为首选
  - 当官方匿名 JSON 返回 403 Blocked 时，自动降级到 `api.pullpush.io` 的只读 submission 搜索接口
- 新增回归测试 [test_external_source_fallbacks.py](/Users/proerror/Documents/redbook/tools/auto-x/tests/test_external_source_fallbacks.py)，覆盖：
  - HN top stories -> Algolia fallback
  - HN item -> Algolia item fallback
  - Reddit official JSON -> PullPush fallback
- 已真实验证：
  - `python3 -m unittest tools/auto-x/tests/test_external_source_fallbacks.py` -> `OK`
  - `python3 tools/auto-x/scripts/scrape_hackernews.py --limit 5 --comments 1 --output /tmp/hn-test.md` 成功，且报告不再是“未获取到 HN Stories”
  - `python3 tools/auto-x/scripts/scrape_reddit.py --subreddits SaaS Entrepreneur --limit 5 --output /tmp/reddit-test.md` 成功，且报告包含 `r/SaaS` / `r/Entrepreneur` 正文
- 已完成 `bash tools/daily.sh` 全量重跑，`2026-04-09` 的 3 份正式报告已重新落盘：
  - `05-选题研究/X-每日日程-2026-04-09.md`
  - `05-选题研究/HN-每日热点-2026-04-09.md`
  - `05-选题研究/Reddit-每日监控-2026-04-09.md`
- 已核实新的 `X-每日日程-2026-04-09.md` 中不再出现“未获取到 HN / Reddit”占位语，而是直接内嵌 HN 与 Reddit 正文 section。
- 已复核 `2026-04-09` 的 wiki 维护 run：
  - ingest `20260408-232756-llm-wiki-ingest-2026-04-09-46fdb6` -> `ready: true`
  - lint `20260408-232756-llm-wiki-lint-2026-04-09-41d58a` -> `ready: true`

**未完成 / 遗留：**
- Reddit 现在依赖 PullPush 作为公开只读 fallback，不是 Reddit 官方 API；如果以后要更稳定，需要补官方 OAuth 凭据。

**下次会话优先做：**
- 如果要彻底去掉第三方依赖，再补 Reddit 官方 OAuth 读链路。
- 如果 HN Firebase 后续仍频繁 EOF，可再给 HN fallback 增加来源标记和统计，方便长期观测。

**需要注意：**
- 以后看到“未获取到 HN/Reddit”时，先分层判断：浏览器会话、站点策略、TLS EOF，不能再笼统归因为“外网不通”。
- Reddit 当前的根因不是网络断，而是匿名 JSON 被站点策略封锁；HN 当前的根因也不是完全断网，而是 Firebase 端点与本机 SSL 组合偶发 EOF。

## [2026-04-08] 会话摘要

**完成了什么：**
- 复盘了 `tasks/lessons.md` 和当前项目规则后，把用户给的两个 URL 解释为“用 Accademia 的 `BlackList-01.yaml` 接入 RioLU 订阅”。
- 实际检查了模板仓库结构，确认关键接入点是 `proxy-providers.SUB-Provider-01.url`，而不是手填 `proxies`。
- 在仓库内生成了本地配置文件：
  - `tmp/clash-configs/BlackList-01-riolu.yaml`
- 已把其中的示例订阅地址替换为用户给的 RioLU 订阅链接。
- 用 `yq` 验证了 YAML 结构和关键字段：
  - `proxy-providers.SUB-Provider-01.url`
  - `proxy-providers.SUB-Provider-01.path`
- 额外对 RioLU 订阅源做了真实连通性检查，当前返回 `HTTP/2 502 Bad Gateway`。

**未完成 / 遗留：**
- 没有验证到真实节点内容，因为上游订阅源当前直接返回 `502`。
- 没有继续做机场命名 filter 适配，因为在拿不到订阅内容前，这一步会变成盲改。

**下次会话优先做：**
- 等 RioLU 订阅源恢复后，重新抓取一次实际订阅内容。
- 如果导入后出现“策略组没识别节点”，再根据真实节点命名补 filter，而不是提前猜。

**需要注意：**
- 当前能确认的是“模板接线正确、文件结构正常”。
- 当前不能确认的是“订阅源本身可用”；如果客户端拉取失败，优先怀疑上游订阅服务而不是这份模板文件。

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

## [2026-04-08] 会话摘要

**完成了什么：**
- 围绕“AI办公进入代做时代”整理了 X 与小红书发布素材，并保存到 `01-内容生产/02-制作中的选题/2026-04-08-AI办公进入代做时代/`。
- 重写了配图提示词，并改造 `scripts/generate_tuzi_cards.py`，让额度耗尽时也能生成统一风格的抽象编辑风卡片。
- 核实 Tuzi Nano Banana key 返回 `insufficient_user_quota`，本地 `GOOGLE_API_KEY` 也触发 Gemini image `429 RESOURCE_EXHAUSTED`。
- 在小红书后台删除了之前那条难看的版本后，重新上传新图并发布；`笔记管理` 已出现新条目，标题为 `AI办公进入代做时代，别再卷提示词了`，时间为 `2026-04-08 14:53`。

**未完成 / 遗留：**
- X.com 这一轮没有重新补发图片版，之前的 X 发布状态仍不够干净。
- 小红书这次发布页里多上传过一张重复封面，最终成稿大概率是 6 张而不是严格 5 张；如果要极致一致，需要再开编辑页清理。

**下次会话优先做：**
- 重新检查 X.com 这条内容的最终公开形态，必要时重发带图版。
- 如果用户继续优化小红书视觉，优先换成一把有余额的图像 key，再把当前抽象卡片替换成真实模型生成图。

**需要注意：**
- 这次用户明确指出“图片太丑”，说明公开发布前必须先人工验图，不要因为发布链路通了就直接发。
- 走外部图像 API 时，要先核实额度；`list models` 可用并不代表 `generate image` 还有余额。

## [2026-04-08] 会话补记：Nano Banana 修正

**完成了什么：**
- 重新阅读并实际执行了项目里的 `baoyu-image-gen` skill，而不是继续用自写图像脚本。
- 确认正确链路为：`baoyu-image-gen/scripts/main.ts -> provider tuzi -> model nano-banana-2`。
- 用这条链路重新生成了 5 张真实 Nano Banana 原图，并重做最终卡片。
- 删除了 `14:53` 那条错误版本的小红书笔记，再次发布；后台新条目时间为 `2026-04-08 15:51`。
- 继续进入已发布笔记编辑页核对，确认之前的 `6/18` 不是纯显示噪音，而是第 6 张重复封面；已删掉该重复图并成功保存，编辑页现为 `5/18`，预览为 `5/5`。

**未完成 / 遗留：**
- X.com 这条内容仍未补做 Nano Banana 图片版。

**下次会话优先做：**
- 重新检查 X.com 的最终公开形态，必要时按同样 skill 链路补带图版。

**需要注意：**
- 用户明确指定 skill / 模型时，必须实际调用该 skill 的原生入口，不能只“参考实现”。
- 对外发布前，必须先确认成图来源是真模型输出，不是 fallback 或本地兜底图。

## [2026-04-08] 会话补记：X Article 修正

**完成了什么：**
- 用户指出这条 X 内容不该发普通帖，而应发长文；已停止继续沿用普通帖流。
- 新建了 [X-长文稿.md](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/2026-04-08-AI办公进入代做时代/X-长文稿.md)，并改走 `baoyu-post-to-x/scripts/x-article.ts`。
- 已在真实 X 页面完成最终发布确认，而不是只看脚本日志；公开状态对应 `status/2041799152431198524`，文章链接为 `https://x.com/0xcybersmile/article/2041799152431198524`。

**未完成 / 遗留：**
- 之前误走普通帖链路留下的普通帖仍在账号里，尚未删除，因为这属于破坏性操作，需用户明确决定是否清理。

**下次会话优先做：**
- 如果用户确认清理，删除这次误发的普通帖，并检查是否保留 2 小时前那条文本短帖。

**需要注意：**
- X 发布前要先做“载体判断”：短帖、thread、article 不能混用。
- `x-article.ts` 的 `Article published!` 不能直接视为验收完成，必须回到真实页面核对是否公开。

## [2026-04-08] 会话补记：清理 X 误发短帖

**完成了什么：**
- 按用户明确授权，清理了本轮误走普通帖链路留下的 X 短帖。
- 已核实图片误帖 `status/2041797643446403115` 打开后直接显示“该页面不存在”，说明该误帖已不再公开。
- 已进入文字误帖 `status/2041755363465425191` 的真实详情页，打开“更多 -> 删除”，并在确认框执行最终删除。
- 删除后收到站内提示 `你的 帖子 已删除`，随后回查该链接，页面返回“唔...该页面不存在。请尝试搜索别的内容。”
- 同时复查长文链接 `https://x.com/0xcybersmile/article/2041799152431198524`，确认公开页仍正常可访问，标题与正文完整。

**未完成 / 遗留：**
- 本轮没有再追加新的 X 配图或二次分发动作，仅完成错误短帖清理。

**下次会话优先做：**
- 如果还要继续做分发，可基于现有长文再拆 thread 或补评论区导流，但不要再混用普通帖与长文主载体。

**需要注意：**
- 清理类操作属于破坏性动作，今后仍需在用户明确授权后再执行。
- 删除完成后不能只看 toast，必须回查原链接是否已经失效，并同时确认正确内容仍然在线。

## [2026-04-08] 会话补记：修复 LLM Wiki verifier 契约

**完成了什么：**
- 先核实了当前状态：`LLM Wiki` 的 workflow 入口和历史 run 是存在的，但今天的 `2026-04-08` 运行证据并不完整。
- 发现 research stage 的 verifier 契约过于单一，误把 `wiki-query`、`wiki-lint` 和原始日报文件都按“长篇研究报告”标准校验，导致 gate 假红。
- 已新增回归测试：
  - `tools/redbook_harness/tests/test_verifier.py`
  - `tools/redbook_harness/tests/test_wiki_workflow.py`
- 已修正 `tools/redbook_harness/verifier.py`，为 `wiki-query-*`、`wiki-lint-*`、`wiki-ingest-*` 三类运营型 research report 增加专用校验规则。
- 已修正 `tools/wiki_workflow.py`：
  - `query` 报告补齐 `研究来源` 与 `一句话结论`
  - `lint` 报告补齐 `结论` 与 `来源`
  - `ensure_daily_ingest_run()` 现在会生成 `docs/reports/wiki-ingest-2026-04-08.md` 作为 ingest summary artifact
- 已补跑 `bash tools/daily.sh --skip-x`，生成 `05-选题研究/X-每日日程-2026-04-08.md`，并重跑今日 `daily-cycle`
- 已 fresh 验证：
  - `20260408-144257-llm-wiki-ingest-2026-04-08-3f52b3` -> `ready: true`
  - `20260408-144257-llm-wiki-lint-2026-04-08-3a53f9` -> `ready: true`
  - `20260408-150954-llm-wiki-query-内容创作-2026-04-08-3b9a36` -> `ready: true`
  - `python3 -m unittest ...test_wiki_workflow.py ...test_verifier.py ...test_x_utils.py` -> `9 tests OK`

**未完成 / 遗留：**
- `bash tools/daily.sh --skip-x` 这次只成功产出了 `X-每日日程-2026-04-08.md`；Hacker News 与 Reddit 在外部抓取时分别命中 SSL EOF 和 403 Blocked，今天没有落出独立 `HN/Reddit` 报告。
- `tools/wiki-auto/run_wiki_ingest.sh` 在本轮收尾时仍因 `Invalid API key · Please run /login` 失败，所以 Claude CLI 的 wiki 内容写回没有完成。

**下次会话优先做：**
- 如果要把今天的日报链路补到更完整，先修 HN/Reddit 抓取稳定性，再重跑 `tools/daily.sh`。
- 单独处理 `tools/wiki-auto/run_wiki_ingest.sh` 的登录态，让自动 wiki 写回恢复可用。

**需要注意：**
- 以后判断 LLM Wiki 是否“运行正常”，不能只看 run 文件存在，必须看 `check-gates` 是否真的 `ready: true`。
- ingest 不该直接拿原始日报文件去过 verifier，应该由 summary artifact 收口；否则任何外部抓取降级都会把 research gate 误判成失败。

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

## [2026-04-12] 会话摘要

**完成了什么：**
- 将《团队 AI 化后真正缺的不是 Prompt，是 Harness Engineering》从今日研究 brief 直接推进到了真实发布。
- X 最终公开的是带图单条长帖：
  - `https://x.com/0xcybersmile/status/2043201922392633769`
- X 公开证据已落盘：
  - `x-to-markdown/0xcybersmile/2043201922392633769.md`
- 本轮先后误发了两条纯文字版 X 帖，均已删除；最终保留的是带图版本。
- 小红书已真实发布，后台 `content-data` 返回最新记录：
  - 标题：`团队AI化后，真正缺的不是Prompt`
  - 发布时间：`2026-04-12 13:43`
  - 笔记 ID：`69db30e700000000230132e5`
- 小红书复用了既有图组：
  - `xhs-images/ai-architecture-skill/01-cover-ai-architecture.png`
  - `xhs-images/ai-architecture-skill/02-content-pain-point.png`
  - `xhs-images/ai-architecture-skill/03-content-insight.png`
  - `xhs-images/ai-architecture-skill/04-content-comparison.png`
  - `xhs-images/ai-architecture-skill/05-content-method.png`
  - `xhs-images/ai-architecture-skill/06-ending-ai-architecture.png`
- 已将主稿归档到：
  - `01-内容生产/03-已发布的选题/2026-04-12-团队AI化后真正缺的不是Prompt，是Harness Engineering.md`

**未完成 / 遗留：**
- `x-browser.ts` 的图片粘贴链路在当前机器上仍不可靠；本轮最终是靠浏览器原生文件上传修正的。
- 小红书列表页偶尔半加载，做发布验证时不能只看页面列表，最好结合 `content-data`。

**下次会话优先做：**
- 观察这条 X 和小红书的首轮数据，再决定是否扩成公众号版。
- 如果还要继续做 X 图文，优先修正图片上传方式，不要再依赖系统粘贴权限。

**需要注意：**
- 图文帖的“发布成功”必须按最终公开形态定义，不是按脚本日志定义。
- 小红书这边优先复用当前已登录浏览器，比独立脚本起新的浏览器更稳。

## [2026-04-13] 会话摘要

**完成了什么：**
- 深度整理了当前 work tree，把内容资产、研究稿、wiki/tasks 沉淀、浏览器统一方案文档纳入同一批次 tracking / staging。
- 完成了 `AGENTS.md` 与 `CLAUDE.md` 的逐字同步，并补上 `Wiki Schema` 与入口约束缺口。
- 收紧了 `.gitignore`，隐藏明确的运行时噪音：
  - `tasks/harness/locks/`
  - `session.tw_session`
  - `x-to-markdown/`
  - `tools/auto-x/data/twikit_cookies.json`
  - `tools/auto-x/data/following_audit_latest.json`
  - `tools/auto-x/scripts/test_twikit.py`
  - `tools/post_thread.py`
- 清掉了空壳 lock / session 文件。
- 补了整理说明：`docs/reports/2026-04-13-worktree-organize-plan.md`
- 继续第二轮整理后，当前状态已收口到：
  - `unstaged = 0`
  - `untracked = 0`

**未完成 / 遗留：**
- 当前还没有替你做 commit；只是把 work tree 整成了可提交的一批 staged 改动。
- staged 批次里仍然混有“内容资产”和“浏览器统一方案”两大主题；如果你要极致干净，后续可以再拆成两三个 commit。

**下次会话优先做：**
- 按主题拆 staged 批次，形成更干净的提交序列。
- 决定是否把 `04-内容数据统计/数据统计表.md` 和浏览器统一方案放在同一批里。

**需要注意：**
- 内容稿本身应该进入 Git tracking；运行时痕迹不应该。
- 以后新增入口级约束时，默认要求 `AGENTS.md` 和 `CLAUDE.md` 同步修改。

## [2026-04-13] 会话摘要

**完成了什么：**
- 继续完成了 work tree 的第二轮和第三轮整理。
- 当前仓库状态已经收口到：
  - `unstaged = 0`
  - `untracked = 0`
- 把应该进 Git 的内容资产、研究稿、wiki/tasks 沉淀、浏览器统一方案文档全部纳入 tracking / staging。
- 把剩余 staged 改动按主题切成 3 个批次，并输出清单：
  - `docs/reports/2026-04-13-commit-batches.md`

**未完成 / 遗留：**
- 还没有替你执行 commit；当前只是把 staged 批次整理干净了。
- `tasks/harness/locks/20260406-131247-ai-已经从模型战争进入部署战争-7d8fbc.lock` 作为历史已跟踪文件的删除仍在 staged 批次里。

**下次会话优先做：**
- 如果你要提交，我下一步可以直接按 `A / B / C` 三个批次帮你拆提交。

**需要注意：**
- 现在不是“所有东西都一锅端 commit”，而是已经具备清晰的按主题提交条件。

## [2026-04-13] 会话摘要

**完成了什么：**
- 读取并整理了 `/Users/proerror/Downloads/笔记列表明细表.xlsx`。
- 已确认该文件是小红书笔记明细导出，包含 1 个 sheet、7 条图文数据，时间范围为 `2026-04-07` 到 `2026-04-12`。
- 已将导出数据写入 `04-内容数据统计/数据统计表.md` 的「小红书数据」区块。
- 已做一轮快速汇总：
  - 总曝光 `4258`
  - 总观看量 `513`
  - 总点赞 `15`
  - 总收藏 `13`
  - 总评论 `2`
  - 总涨粉 `3`
- 当前样本中表现最好的是：
  - 曝光/观看最高：`AI基础设施战争开打，24小时内出现替代品`
  - 收藏最高：`AI视频哪里穿帮，现在能精确到秒`

**未完成 / 遗留：**
- 这次只完成了导入和初步读数，还没进一步沉淀成方法论或选题复盘。
- Excel 原文件仍在 `Downloads/`，本轮没有移动或归档原始导出。

**下次会话优先做：**
- 基于这 7 条数据补一版小红书选题/标题复盘，提炼什么题材更容易拿到曝光和收藏。
- 如果后续会持续导入同类表，可以把 Excel -> `数据统计表.md` 做成一个小脚本。

**需要注意：**
- 这份导出首行是平台说明文字，不是表头；后续做自动导入时要固定跳过第 1 行。
- 当前统计表主列采用 `观看量` 作为「播放/阅读」，其它指标统一放进备注。

## [2026-04-13] 会话摘要：小红书数据复盘沉淀进 wiki

**完成了什么：**
- 已将这轮“小红书为什么数据偏弱”的判断沉淀进知识库，而不是只停留在聊天里。
- 已更新：
  - `wiki/方法论/标题创作.md`
  - `wiki/方法论/爆款规律.md`
  - `wiki/选题/内容创作与增长.md`
  - `wiki/index.md`
  - `wiki/log.md`
- 已固化的核心规则：
  - 小红书第一钩子优先写“具体问题 + 明确结果”，不要先写抽象概念
  - 标题、封面、正文前两屏必须承诺一致
  - 当前样本的主瓶颈是点击，不是单纯留存
  - 账号同时打多类人群时，平台标签会漂

**未完成 / 遗留：**
- 这轮只完成了规则沉淀，还没有把这些规则反向应用到旧稿改写或新选题筛选。

**下次会话优先做：**
- 用这套规则重写 1 到 2 条最近偏弱的小红书标题和封面承诺。
- 把“该继续做的题”和“该停掉的题”明确列成选题白名单 / 黑名单。

**需要注意：**
- 以后看到“小红书数据差”，默认先查点击承诺是否一致，不要直接把问题归因成限流。

## [2026-04-15] 会话摘要：小红书点击优化闭环

**完成了什么：**
- 已把“小红书数据偏弱”的结论从 wiki 落到内容、流程和工具三层。
- 内容层：
  - 已为 `01-内容生产/03-已发布的选题/2026-04-12-团队AI化后真正缺的不是Prompt，是Harness Engineering.md` 补上「小红书二次发布版（2026-04-15）」
  - 已重写 `01-内容生产/02-制作中的选题/2026-04-08-AI办公进入代做时代/小红书-图文稿.md` 的主标题、封面承诺和开头
  - 已同步更新对应封面 prompt：`prompts/01-cover.md`
- 流程层：
  - 已在 `docs/shared/redbook-playbook.md` 新增“点击承诺一致性检查”
  - 已运行 `python3 tools/sync_redbook_playbook.py`，把规则同步到 `AGENTS.md` 和 `CLAUDE.md`
- 工具层：
  - 先写了 failing test：`tools/redbook_harness/tests/test_import_xhs_note_stats.py`
  - 再实现脚本：`tools/import_xhs_note_stats.py`
  - 已在真实 Excel `/Users/proerror/Downloads/笔记列表明细表.xlsx` 上跑通
  - 已生成实际复盘模板：`docs/reports/xhs-note-review-template-2026-04-15.md`

**未完成 / 遗留：**
- 这轮只完成了标题/封面承诺层的优化，还没把旧图组重新渲染出来。
- 还没有把“点击承诺一致性检查”接进 harness verifier；当前先落在共享 playbook。

**下次会话优先做：**
- 基于这次改写，重做 `AI办公进入代做时代` 与 `团队AI化后...` 的小红书封面图。
- 如果后续要把流程再收紧，可以把“点击承诺一致性检查”接进 publish checklist artifact 或 verifier。

**需要注意：**
- 对小红书，抽象概念可以留在正文里解释，但不要再做第一钩子。
- 以后导入新 Excel，优先用 `python3 tools/import_xhs_note_stats.py --xlsx <path>` 生成统计表和复盘模板，再决定是否回写 wiki。

## [2026-04-15] 会话摘要：安装并接入 document-illustrator skill

**完成了什么：**
- 已使用 skill-installer 官方脚本将 `op7418/Document-illustrator-skill` 安装到：
  - `~/.codex/skills/document-illustrator`
- 已补齐该 skill 运行依赖：
  - `google-genai`
  - `Pillow`
  - `python-dotenv`
- 已完成入口验证：
  - `python3 /Users/proerror/.codex/skills/document-illustrator/scripts/generate_single_image.py --help`
  - Python import 检查通过：`google.genai`、`PIL`、`dotenv`
- 已把该 skill 接入 redbook 工作流：
  - `docs/shared/redbook-playbook.md`
  - `AGENTS.md`
  - `CLAUDE.md`
  - `.rules`
- 已新增的工作流约束包括：
  - “生成文档配图”成为标准内容创作节点
  - 发布清单新增“文稿配图 / 封面图”项
  - 公众号链路和长文链路默认可接 `/document-illustrator`
  - Definition of Done 新增“需要配图的内容必须完成对应配图方案”

**未完成 / 遗留：**
- 尚未配置 `GEMINI_API_KEY`，因此目前只验证到“脚本可启动”，还没有做真实出图。
- 新装到 `~/.codex/skills` 的 skill 需要重启 Codex，后续新会话才会稳定发现。

**下次会话优先做：**
- 在 `~/.codex/skills/document-illustrator/.env` 或 shell 环境中配置 `GEMINI_API_KEY`。
- 拿一篇 `01-内容生产/02-制作中的选题/` 下的主稿做一次真实配图 smoke test，确认 `images/` 输出与工作流衔接正常。

**需要注意：**
- 当前仓库里已有一份 workspace-local 的 `document-illustrator` 模板；这次新增的是 Codex 全局安装版，主要作用是让后续新会话能直接发现。
- 真实配图会调用外部 Gemini API，成本和成功率要按 API 配额来评估。

---

## 2026-04-14

### 完成
- 安装 nuwa-skill + x-mastery-mentor skill
- 对 @0xcybersmile 做了完整账号诊断（报告在 `.claude/skills/x-mastery-mentor/user-data/0xcybersmile/`）
- 更新 CLAUDE.md：X 发布流程加入 x-mastery-mentor 四层审稿关卡
- 「AI办公代做时代」改写成10条Thread（待发布）
- 其余3条帖子加了CTA（待手动更新）
- 在 @intuitiveml 的 AI-First 文章下发了高质量英文回复

### 遗留
- 手动删除「这跟@dontbesilent系统一样」那条碎片帖
- 把「AI办公代做时代」Thread发到X（替换原帖）
- 另外3条帖子手动加CTA

### 下次优先
- 固定发帖时间（工作日9-11点）
- 继续找AI赛道大号评论区留高质量回复
- 「AI大脑萎缩」Thread版本可以考虑发

## [2026-04-17] 会话摘要：工作流升级 + Opus 4.7 速评发布

**完成了什么：**
- 发布 Opus 4.7 基准数据分析长帖到 X.com（含基准图）
- 修复 x-browser.ts 图片上传 bug（DOM.setFileInputFiles 替代剪贴板）
- 设计并实施三条路径工作流（路径0每日研究/路径1计划内容/路径2热点速评）
- 迁移 02-内容素材库 → wiki/素材/（金句库/案例库/框架库）
- 更新 CLAUDE.md：三条路径架构、wiki 唯一知识底座、QA 改为自检清单
- 创建早报模板（05-选题研究/早报模板.md）
- 更新 daily.sh 输出格式和 wiki ingest 提醒

**未完成 / 遗留：**
- daily.sh 的 timeline 爆款抓取功能尚未实现（目前只有 HN/Reddit）
- 对标账号定期抓取功能尚未实现

**下次会话优先做：**
- 升级 daily.sh：加入 X timeline 爆款抓取 + 对标账号动态
- 用新工作流跑一次完整的计划内容（从早报选题到发布沉淀）

## [2026-04-17] 会话摘要：BOSS 工作流切回 Playwright CLI

**完成了什么：**
- 将 `tools/auto-zhipin` 的 BOSS 主链从 current-tab / CDP 偏置改回 `Playwright CLI + 持久化 profile`
- 新增登录入口：
  - [playwright_login.js](/Users/proerror/Documents/redbook/tools/auto-zhipin/scripts/playwright_login.js)
- 新增 Playwright profile 版扫描 / 监看 / 投递脚本：
  - [chrome_collect_queue.js](/Users/proerror/Documents/redbook/tools/auto-zhipin/scripts/chrome_collect_queue.js)
  - [chrome_monitor_queue.js](/Users/proerror/Documents/redbook/tools/auto-zhipin/scripts/chrome_monitor_queue.js)
  - [boss_apply_playwright.js](/Users/proerror/Documents/redbook/tools/auto-zhipin/scripts/boss_apply_playwright.js)
- 更新了：
  - [package.json](/Users/proerror/Documents/redbook/tools/auto-zhipin/package.json)
  - [README.md](/Users/proerror/Documents/redbook/tools/auto-zhipin/README.md)
  - [bootstrap_auth.js](/Users/proerror/Documents/redbook/tools/auto-zhipin/scripts/bootstrap_auth.js)
- 已实际执行 `node scripts/playwright_login.js --detached true`，打开 BOSS AI Agent 搜索页，并把登录态写入：
  - `/Users/proerror/Documents/redbook/tools/auto-zhipin/.auth/profile`

**未完成 / 遗留：**
- 这轮还没有继续清理 `tests/_legacy/*` 的历史漂移问题，所以 `npm test` 仍会被旧测试引用挡住。
- 还没有执行真实岗位的 `boss:apply -- --dry-run true` 预检，等你登录完成后再接。

**下次会话优先做：**
- 你完成登录后，先跑一次：
  - `cd /Users/proerror/Documents/redbook/tools/auto-zhipin && npm run chrome:collect`
- 然后对目标岗位执行：
  - `npm run boss:apply -- --url <job_url> --dry-run true`
- 预检通过后再正式 apply。

## [2026-04-17] 会话摘要：X 发帖草稿 + 今日小红书候选盘点

**完成了什么：**
- 针对用户给出的 X 链接 `https://x.com/i/status/2044882275100250444` 做了公开内容确认，原帖正文仅为 `this flow`，重点是极简 demo 感。
- 用多代理并行完成两件事：
  - 产出 3 个中文 X 单帖候选，并选出推荐版本
  - 盘点今天最适合发布的小红书候选内容
- 已在当前登录的 `@0xcybersmile` X 账号中打开 compose，并将推荐文案填入发帖框，当前停在最终点击前。
- 已确认今日最值得做的小红书方向：
  - 最该发：`别再闭门写代码了，先聊用户，再写产品`
  - 最省力能发：`AI办公进入代做时代`

**未完成 / 遗留：**
- X 发帖最后一步未执行；这属于对外代表性发布动作，需在点击前拿到用户确认。
- 小红书稿件本轮只做了候选排序，还没有继续改写成最终可发版本。

**下次会话优先做：**
- 若用户确认，立即点掉当前 X 草稿的 `发帖`。
- 优先把 `别再闭门写代码了，先聊用户，再写产品` 改成小红书图文版；如果追求最低成本，直接补齐 `AI办公进入代做时代` 的配图并发出。

## [2026-04-17] 会话摘要：按 skill 流程发布 X + 小红书待发准备

**完成了什么：**
- 已停止使用 computer use 作为 X / 小红书发布主链，改回 skill 工作流。
- X 端按仓库流程走完：
  - `/x-mastery-mentor` 最小审稿
  - `/baoyu-post-to-x` preview
  - `/baoyu-post-to-x` submit
- `baoyu-post-to-x` 的提交结果为：
  - `[x-browser] Post submitted!`
- 小红书端已完成发布前准备：
  - 确认 `AI办公进入代做时代` 这条已有完整图文稿、`xhs-title.txt / xhs-content.txt` 和 5 张最终图片
  - 新增“最该发”版本图文稿：
    - [2026-04-17-别再闭门写代码了-先聊用户再写产品-小红书图文稿.md](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/2026-04-17-别再闭门写代码了-先聊用户再写产品-小红书图文稿.md)
  - 用小红书发布 skill 做了 `check-login`，当前账号已登录可发

**未完成 / 遗留：**
- 小红书还没正式发出。按 workflow，这一步要在最终采用的标题、正文和图片确定后做动作前确认。

**下次会话优先做：**
- 若用户要今天最省力直接发：用现成素材发布 `AI办公进入代做时代`
- 若用户要今天最值得发：继续用新稿生成图，再走小红书发布 skill

## [2026-04-17] 会话摘要：核实小红书旧稿已发 + 准备含 Codex 例子的 V2

**完成了什么：**
- 用小红书 skill 的 `content-data` 抓到了创作者后台一手数据，而不是只依赖仓库记录。
- 已确认旧稿 `AI办公进入代做时代，别再卷提示词了` 确实发过，后台记录为：
  - 发布时间：`2026-04-08 15:51`
  - 曝光：`514`
  - 观看：`36`
  - 封面点击率：`6.80%`
  - 评论：`1`
  - 收藏：`1`
  - `_id`：`69d608f600000000210384f5`
- 已新增包含 `GPT Codex APP / computer use` 例子的 V2 文案文件：
  - [小红书-图文稿-v2.md](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/2026-04-08-AI办公进入代做时代/小红书-图文稿-v2.md)
  - [xhs-title-v2.txt](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/2026-04-08-AI办公进入代做时代/xhs-title-v2.txt)
  - [xhs-content-v2.txt](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/2026-04-08-AI办公进入代做时代/xhs-content-v2.txt)

**未完成 / 遗留：**
- V2 还没有正式发。因为旧稿已经发过，V2 属于新的公开发布动作，需要用户在动作前确认。

**下次会话优先做：**
- 如果用户确认发 V2，就直接用现成 5 张图先走一版 skill 发布，再看是否需要补更贴近 `computer use` 的新版图组。

## [2026-04-17] 会话摘要：切到“小红书发新闻 + 夹判断”的新方向

**完成了什么：**
- 已确认 `AI办公进入代做时代` 旧稿发过且数据一般，因此不再重复发布。
- 按新的方向，已新建一条“新闻型 + 个人判断”的小红书正式稿：
  - [2026-04-17-GPT-Codex-APP-computer-use-小红书图文稿.md](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/2026-04-17-GPT-Codex-APP-computer-use-小红书图文稿.md)
- 这条新稿的结构已经固定为：
  - 新闻事实：`GPT Codex APP` 的 `computer use`
  - 你的判断：AI 工具开始从聊天层走向执行层

**未完成 / 遗留：**
- 这条新稿还没生成图，也还没走小红书发布 skill。

**下次会话优先做：**
- 直接给这条新闻稿做一版 5 页图文图组，然后按小红书 skill 发出去。

## [2026-04-17] 会话摘要：GPT Codex APP 新闻稿图组已生成，待走小红书 skill 发布

**完成了什么：**
- 用小红书创作者后台 `content-data` 再次核实：`AI办公进入代做时代，别再卷提示词了` 旧稿确实已发，后台数据为：
  - 发布时间：`2026-04-08 15:51`
  - 曝光：`514`
  - 观看：`36`
  - 封面点击率：`6.80%`
  - 评论：`1`
  - 收藏：`1`
- 为新方向 `GPT Codex APP / computer use` 完成整套发布素材：
  - 正式文稿：[2026-04-17-GPT-Codex-APP-computer-use-小红书图文稿.md](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/2026-04-17-GPT-Codex-APP-computer-use-小红书图文稿.md)
  - 发布输入文件：
    - [2026-04-17-GPT-Codex-APP-computer-use-xhs-title.txt](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/2026-04-17-GPT-Codex-APP-computer-use-xhs-title.txt)
    - [2026-04-17-GPT-Codex-APP-computer-use-xhs-content.txt](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/2026-04-17-GPT-Codex-APP-computer-use-xhs-content.txt)
  - `xhs-images/gpt-codex-computer-use/` 下的 `analysis / outline / prompts`
  - 5 张实际生成的图卡：
    - `01-cover-codex-update.png`
    - `02-content-what-changed.png`
    - `03-content-execution-layer.png`
    - `04-content-user-experience.png`
    - `05-ending-workflow-judgment.png`
- 额外验证到外部 AI 出图后端当前不可依赖：
  - Tuzi：`Invalid Token`
  - Google：`429 quota exceeded`
  - 已改用本地脚本生成 `notion` 风信息卡，绕开外部额度问题

**未完成 / 遗留：**
- 这条新闻稿还没有正式发布到小红书。

**下次会话优先做：**
- 若用户确认，直接用小红书发布 skill 发这 5 张图和对应正文。

## [2026-04-17] 会话摘要：Tuzi 图片接口文档核对与最小修正

**完成了什么：**
- 已按用户提供的 Tuzi 文档核对出正确图片接口：
  - `POST https://api.tu-zi.com/v1/images/generations`
  - 模型：`gemini-3.1-flash-image-preview`
- 验证结论：
  - 之前失败不是“Tuzi 没余额”，而是我前面走错了 Gemini/Tuzi 路径
  - 用你提供的 key 走正确接口，已经成功拿到图片响应
- 已修正 `baoyu-image-gen` 的 Tuzi provider 兼容：
  - [providers/tuzi.ts](/Users/proerror/Documents/redbook/.agents/skills/baoyu-image-gen/scripts/providers/tuzi.ts)
  - 新增对 `data[0].url` 中“直接返回 base64 图像数据”的兼容解析
- 已用修正后的 provider 直调真实 prompt，成功生成图片文件：
  - [01-cover-codex-update-provider.png](/Users/proerror/Documents/redbook/xhs-images/gpt-codex-computer-use/01-cover-codex-update-provider.png)

**未完成 / 遗留：**
- `baoyu-image-gen/scripts/main.ts` 这一层 CLI 包装还存在不一致现象：provider 直调成功，但通过 `main.ts` 同 prompt 仍返回 `No image data in response`。

**下次会话优先做：**
- 如果要彻底收口 Tuzi 工作流，继续修 `main.ts` / CLI 这一层，确保不只能直调 provider，也能从统一入口稳定生成。

## [2026-04-17] 会话摘要：Tuzi 主链收口，GPT Codex 小红书图组已就绪

**完成了什么：**
- 继续沿着 Tuzi 文档主链收口问题，确认真正的关键不是余额，而是：
  - 当前环境里的 `TUZI_IMAGE_MODEL=nano-banana-2`
  - 而文档实测可用模型是 `gemini-3.1-flash-image-preview`
- 已在 `baoyu-image-gen` 的 Tuzi provider 中加入模型别名兼容：
  - `nano-banana-2 -> gemini-3.1-flash-image-preview`
- 用修正后的主链 + 用户提供的新 key，成功通过 `main.ts` 连续生成 5 张正式图：
  - [01-cover-codex-update.png](/Users/proerror/Documents/redbook/xhs-images/gpt-codex-computer-use/tuzi/01-cover-codex-update.png)
  - [02-content-what-changed.png](/Users/proerror/Documents/redbook/xhs-images/gpt-codex-computer-use/tuzi/02-content-what-changed.png)
  - [03-content-execution-layer.png](/Users/proerror/Documents/redbook/xhs-images/gpt-codex-computer-use/tuzi/03-content-execution-layer.png)
  - [04-content-user-experience.png](/Users/proerror/Documents/redbook/xhs-images/gpt-codex-computer-use/tuzi/04-content-user-experience.png)
  - [05-ending-workflow-judgment.png](/Users/proerror/Documents/redbook/xhs-images/gpt-codex-computer-use/tuzi/05-ending-workflow-judgment.png)

**未完成 / 遗留：**
- 小红书新闻稿还没有正式发出。素材已经齐了，只差最终发布动作。

**下次会话优先做：**
- 若用户确认，直接用小红书发布 skill 发这 5 张 Tuzi 图组和对应正文。

## [2026-04-17] 会话摘要：小红书新闻稿已提交并进入审核中

**完成了什么：**
- 根据用户指出的标题超限截图，将标题压短为：
  - `AI 开始接手桌面工作了`
- 重新走小红书 skill 的一体化发布链：
  - `publish_pipeline.py --auto-publish`
- 本轮发布日志关键结果：
  - `FILL_STATUS: READY_TO_PUBLISH`
  - `PUBLISH_STATUS: PUBLISHED`
- 使用的素材为：
  - 标题文件：[2026-04-17-GPT-Codex-APP-computer-use-xhs-title.txt](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/2026-04-17-GPT-Codex-APP-computer-use-xhs-title.txt)
  - 正文文件：[2026-04-17-GPT-Codex-APP-computer-use-xhs-content.txt](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/2026-04-17-GPT-Codex-APP-computer-use-xhs-content.txt)
  - 5 张 Tuzi 图组：`xhs-images/gpt-codex-computer-use/tuzi/*.png`

**验证结果：**
- 发布脚本层：最初返回过 `PUBLISHED`，但不能单独作为成功标准
- 直接在发布页抓真实 `发布` 按钮后，页面跳转到 `publish/success`，正文明确出现 `发布成功`
- 随后进入 `笔记管理` 页面，确认出现新条目：
  - 标题：`AI 开始接手桌面工作了`
  - 时间：`2026年04月17日 16:10`
  - 状态：`审核中`
- 已从 `笔记管理` 条目属性中补抓到：
  - `note id`: `69e1eaf1000000002102c31c`
- `content-data` 仍未刷新出这条新笔记，因此当前还没拿到统计面板数据和 `note id`

**未完成 / 遗留：**
- `content-data` 还未刷新出这条新笔记，因此曝光/点击等数据待补
- 小红书 skill 的自动发布验收标准仍然偏弱：需要 `笔记管理/审核中/已发布` 这类平台态证据才能算真正成功

**下次会话优先做：**
- 稍后回查 `content-data`，补抓这条新闻稿的首轮数据
- 修小红书 skill 的最终发布验收逻辑，不再把脚本返回值当成成功标准

## [2026-04-18] 会话摘要：重跑 today research，并产出 fresh 选题 shortlist

**完成了什么：**
- 确认昨天给你的选题“显得旧”并不是错觉，而是因为当时只有 `2026-04-17` 的完整研究稿可用。
- 直接重跑了 `2026-04-18` 的 today research：
  - `X-每日日程-2026-04-18.md`
  - `HN-每日热点-2026-04-18.md`
  - `Reddit-每日监控-2026-04-18.md`
- 顺手把 auto-x 的一个关键问题修了：
  - 当 `X Pro / 搜索 / trending` 命中登录墙或不存在页时，现在会快速跳过，不再继续滚动 30 次后产出 `0 条推文 / 0 个话题`
- 基于 fresh 的 `HN + Reddit + 已有关注者话题`，输出了今天的选题 shortlist：
  - [选题建议-2026-04-18.md](/Users/proerror/Documents/redbook/05-选题研究/选题建议-2026-04-18.md)

**今天最值得做的 3 个题：**
- `AI agent 不是越来越便宜，而是越来越像团队成本`
- `经典 SaaS 真的快到头了吗？下一代是 dashboard 还是 agents`
- `Claude Design 不是 Figma 替代品，它更像“表达意图的中间层”`

**未完成 / 遗留：**
- 今天的 X fresh signal 仍然不可靠，因为 `agent-browser-session` 没拿到你的真实已登录 X 会话；现在只是从“假成功”修到了“快速跳过无效页”。

**下次会话优先做：**
- 如果要继续提升 daily 质量，下一步是把 `X Pro / search / trending` 改成使用当前真实登录 Chrome 会话，或者显式切到你当前登录的 X timeline 做 research。

## [2026-04-18] 会话摘要：修复 auto-x 的 X 登录会话问题

**完成了什么：**
- 已定位到 `X Pro 多列分析 0 条推文 / 0 个话题` 的根因：
  - 之前 `agent-browser-session` 默认起的是匿名浏览器上下文
  - 打开 `pro.x.com/i/decks/...` 时实际命中了未登录/不存在页
  - 所以后续的“滚动 30 次”只是对错误页面做空操作
- 已在 [x_utils.py](/Users/proerror/Documents/redbook/tools/auto-x/scripts/x_utils.py) 做主链修复：
  - `auto-x` 现在会优先检测并复用本机当前 Chrome 的 `CDP 9222` 会话
  - 只有连不上当前 Chrome 时，才退回旧的 `agent-browser-session` 独立会话
  - 恢复逻辑也已调整：如果走当前 Chrome CDP，不再直接 `kill` 浏览器
- 已补充无效 X 页检测并在以下脚本里接入：
  - [daily_research.py](/Users/proerror/Documents/redbook/tools/auto-x/scripts/daily_research.py)
  - [trending_topics.py](/Users/proerror/Documents/redbook/tools/auto-x/scripts/trending_topics.py)
  - [search_x.py](/Users/proerror/Documents/redbook/tools/auto-x/scripts/search_x.py)
  - 命中登录墙 / 不存在页时，现在会快速跳过，而不是继续产出假的 0/0 结果

**验证结果：**
- `agent-browser-session --cdp 9222` 已能直接连接到你当前已登录的 X 会话
- `scrape_timeline.py --scrolls 2` 实测结果：
  - 成功提取 `25` 条推文
  - 成功识别 `2` 个热门话题
  - 成功发现 `4` 条高互动推文
  - 已保存到 [X-Timeline-2026-04-18.md](/Users/proerror/Documents/redbook/05-选题研究/X-Timeline-2026-04-18.md)
- `search_x.py 'AI tools'` 也已恢复到非零结果：
  - 成功提取 `12` 条推文
  - 成功识别 `1` 条痛点推文
  - 已保存到 [X-搜索-AI tools-2026-04-18.md](/Users/proerror/Documents/redbook/05-选题研究/X-搜索-AI%20tools-2026-04-18.md)
- `trending_topics.py 3` 已恢复到非零结果：
  - 成功识别 `32` 个趋势话题
  - 已保存到 [X-每日热点-2026-04-18.md](/Users/proerror/Documents/redbook/05-选题研究/X-每日热点-2026-04-18.md)
- `X-每日日程-2026-04-18.md` 已刷新为包含非零 X 研究结果的版本：
  - `Deck 列数 = 6`
  - `抓取推文数 = 27`
  - `识别话题 = 2`
  - 搜索 `AI tools / solopreneur` 已有非零结果
- 进一步贴近真实 daily 的验证中：
  - `daily_schedule.py --skip-hn --skip-reddit --skip-following`
  - 当前已经成功识别出 `6` 列，不再是“未识别到任何列”

**未完成 / 遗留：**
- `trending_topics.py` 虽然已恢复到非零，但输出文本仍有少量描述噪音（如末尾 `更多`），后续可继续精修 parser
- `daily_schedule.py` 的长滚动验证仍在后台继续跑

**下次会话优先做：**
- 精修 `trending_topics.py` 的中文结构清洗，减少趋势条目里的残余噪音

## [2026-04-18] 会话摘要：对比 Playwright CLI 与当前 auto-x 主链

**完成了什么：**
- 用你当前已登录的 Chrome 会话做了两种底座对比：
  - `agent-browser-session --cdp 9222`
  - `Playwright connectOverCDP('http://127.0.0.1:9222')`
- 结论不是“Playwright 一定更好”，而是：
  - 对当前这个 X 研究任务，`agent-browser-session + CDP 9222 + 固定 tabname` 更稳
  - Playwright over CDP 能连上已登录会话，但在 `search` 这种导航场景里也会出现 `ERR_ABORTED` / 页面落回别的 tab 的现象
- 用 Playwright 的最小探针结果：
  - `home`：能读到已登录主页
  - `trending`：能读到真实趋势页内容
  - `search`：`goto` 出现 `ERR_ABORTED`，最终页面并不稳定落在搜索结果页

**为什么当前主链更合适：**
- 现在 `auto-x` 已经具备：
  - 优先复用当前 Chrome 已登录会话
  - 固定 `tabname`
  - timeline/search/trending 三条链路都跑出非零结果
- 如果硬切 Playwright CLI，不但没有明显收益，还得额外处理 tab 选择、导航落点和结果解析适配

**当前建议：**
- 保留 `agent-browser-session + CDP 9222` 作为 X 研究主链
- 把 Playwright CLI 保留为对照探针 / fallback，而不是立即替换主链

## [2026-04-18] 会话摘要：Claude Design 双平台发布执行结果

**完成了什么：**
- X 端：
  - 已按 `baoyu-post-to-x` 的 `x-quote.ts` 重新提交一次，且这次使用了文件中的真实换行文本，不再出现字面量 `\\n`
  - 脚本返回：`[x-quote] Quote post submitted!`
  - 账号页回查已命中 Claude Design 文案，说明 X 端已发出
- 小红书端：
  - 已准备好标题、正文和 5 张图卡
  - 多次将页面填到 `READY_TO_PUBLISH`
  - 已精确定位真实 `发布` 按钮，并分别尝试：
    - skill 内部 `--auto-publish`
    - CDP 真点击
    - `JS click()`
    - 长等待后再次点击

**验证结果：**
- X：成功
- 小红书：失败，且已做 fresh verification
  - 发布页始终停留在 `publish/publish`
  - 未进入 success 页
  - `笔记管理` 中没有 `Claude Design 真正替代的，不是设计师`
  - 已额外排除一个干扰项：页面上的 `请先输入并搜索地点` 浮层不是根因，关闭后再点发布仍无效
  - 已进一步确认：点击真实 `发布` 按钮后，前端没有发出任何发布相关 API 请求（Network 捕获为空），说明当前是前端直接拦截 / no-op，不是接口层报错

**未完成 / 遗留：**
- 小红书这条 `Claude Design` 图文尚未成功发布
- 当前结论是：平台端没有真正接收这次提交，不是“后台刷新慢”

**下次会话优先做：**
- 针对小红书发布页做更细的提交流程排查（例如表单校验 / 处理完成信号 / 平台文案限制），而不是继续重复点击

## [2026-04-18] 会话摘要：将 Claude Design 小红书切换为人工发布

**完成了什么：**
- 在 harness run `20260418-041458-claude-design-不是-figma-替代品-而是表达意图的中间层-a0f730` 中记录了正式 incident：
  - `tool_transient`
  - 摘要：`小红书账号因平台风控处于自动化受限窗口，Claude Design 图文改为人工手动发布`
- 已确认：
  - `X` 端 Claude Design 这条已成功发出
  - `小红书` 端本周内不再继续自动化重试
- 已保留并核对最新手动发布包：
  - 标题文件
  - 正文文件
  - 5 张图卡
  - 话题标签
  - 暂停窗口说明

**未完成 / 遗留：**
- Claude Design 的小红书仍需要人工手动发布

**下次会话优先做：**
- 用户手动发布后，自动化只负责补抓 `note id / 审核状态 / 首轮数据`

## [2026-04-18] 会话摘要：建立小红书自动化暂停窗口与手动发布包

**完成了什么：**
- 根据账号处罚截图，明确把小红书自动化发布暂停到：
  - `2026-04-25 09:51:36 CST`
- 新增手动发布说明：
  - [2026-04-18-xiaohongshu-manual-publish-freeze.md](/Users/proerror/Documents/redbook/docs/reports/2026-04-18-xiaohongshu-manual-publish-freeze.md)
- 该文档已经把 `Claude Design` 这条内容需要的标题、正文、图组和话题全部整理成了手动发布包
- 同时把 `Claude Design` 这条 X run 在 harness 里补到闭环：
  - `published = true`
  - `progress_updated = true`
  - `wiki_logged = true`
  - `lessons_reviewed = true`

**未完成 / 遗留：**
- 小红书这条 `Claude Design` 仍需人工手动发
- 自动化恢复要等处罚窗口结束后再做低风险试发验证

**下次会话优先做：**
- 如果用户确认要发小红书，就按手动发布包执行
- 等处罚窗口结束后，再设计一次小红书自动化恢复测试

## [2026-04-18] 会话摘要：为小红书自动化增加仓库内保护层

**完成了什么：**
- 新增仓库内 guard：
  - [xhs_publish_guard.py](/Users/proerror/Documents/redbook/tools/safety/xhs_publish_guard.py)
- 作用：
  - 在 `2026-04-25 09:51:36 CST` 前，阻止自动化小红书发布
  - 并明确提示去看手动发布包：
    - [2026-04-18-xiaohongshu-manual-publish-freeze.md](/Users/proerror/Documents/redbook/docs/reports/2026-04-18-xiaohongshu-manual-publish-freeze.md)
- 已做最小验证：
  - `python3 tools/safety/xhs_publish_guard.py --allow-after-freeze --title 'test'`
  - 返回正确拦截结果

**意义：**
- 这周内即使误执行发布脚本，也会先被仓库 guard 拦住
- 不再完全依赖人工记忆“这几天不要自动发小红书”

## [2026-04-19] 会话摘要：转评 Android 官方 Agent/CLI 更新到 X

**完成了什么：**
- 已确认 Android 官方对应 X 帖存在：
  - `https://x.com/AndroidDev/status/2044834011277668674`
- 已按“新闻转发 + 个人判断”的结构写好中文转评：
  - [2026-04-19-Android-CLI-agent-X转评.txt](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/2026-04-19-Android-CLI-agent-X转评.txt)
- 已通过 `baoyu-post-to-x` 的 `x-quote.ts` 正式发出

**验证结果：**
- 发布脚本返回：`[x-quote] Quote post submitted!`

## [2026-04-19] 会话摘要：安装命理相关 skills

**完成了什么：**
- 已安装以下 skills 到 `~/.codex/skills/`：
  - `numerologist-bazi`（来自 `FANzR-arch/Numerologist_skills/bazi`）
  - `qimen-dunjia`（来自 `FANzR-arch/Numerologist_skills/qimen-dunjia`）
  - `ziwei-doushu`（来自 `FANzR-arch/Numerologist_skills/ziwei-doushu`）
  - `bazi-skill`（来自 `jinchenma94/bazi-skill`）
- 已确认每个目录都存在 `SKILL.md`
- 已继续处理 name 冲突：
  - `numerologist-bazi` 保留为 `name: bazi`
  - `bazi-skill` 改成 `name: bazi-guided`
- 已再次验证内部 name 唯一：
  - `bazi`
  - `bazi-guided`
  - `qimen-dunjia`
  - `ziwei-doushu`

**需要注意：**
- 需要重启 Codex，新的 skills 才会在后续会话里稳定被发现

## [2026-04-20] 会话摘要：发布 Vercel 托管平台安全风险转评

**完成了什么：**
- 基于今天的 `Vercel April 2026 security incident` 新闻，按既有口径将判断收束为：
  - 核心不是“又一家平台出事”
  - 而是 AI 工具链、托管平台与默认推荐栈正在把行业收敛到同一套脆弱基础设施上
- 已将最终文案保存到：
  - [2026-04-20-Vercel-托管平台安全风险-X转评.txt](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/2026-04-20-Vercel-托管平台安全风险-X转评.txt)
- 已使用 `baoyu-post-to-x` skill 完成 preview 与正式提交
- 已在个人主页确认新帖出现在顶部，状态链接为：
  - `https://x.com/0xcybersmile/status/2046049866112233653`

**未完成 / 遗留：**
- 暂未补录后续互动数据（回复 / 转帖 / 喜欢 / 点击）

**下次会话优先做：**
- 观察这条内容的互动表现，判断“供应链 / blast radius / 默认工具链”这组表达是否值得继续放大

**需要注意：**
- 本次 `x-browser.ts --submit` 第一次因 `Chrome debug port not ready` 失败，第二次重试成功
- 发布证据不能只看 skill stdout；已额外在个人主页顶部核对成功落帖

## [2026-04-20] 会话摘要：筛出“中转站不是产品”作为下一条 X 候选

**完成了什么：**
- 再次查看当前登录态 X Pro `关注` timeline 与相关状态页，确认今天最值得继续写的不是泛 AI 新闻，而是中文圈正在发酵的：
  - `中转站 vs 产品`
- 已核到主证据：
  - `@gkxspace` 原帖 `19 回复 / 30 喜欢 / 19 书签 / 1万+查看`
  - `@li9292` 用“中转层风险”补强了第二层讨论
- 已将可发版本保存到：
  - [2026-04-20-中转站不是产品-X草稿.md](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/2026-04-20-中转站不是产品-X草稿.md)

**未完成 / 遗留：**
- 这条目前只完成草稿，尚未正式发布

**下次会话优先做：**
- 从主版本和两个备选里选一版，继续压短或直接走 X 发布链

**需要注意：**
- 这条题最稳的切法不是抽象聊“商业模式”，而是明确一句：
  - `很多人以为自己在做 AI 产品，其实只是在做模型套利`

## [2026-04-20] 会话摘要：发布“中转站不是产品”X 单条帖

**完成了什么：**
- 已从 [2026-04-20-中转站不是产品-X草稿.md](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/2026-04-20-中转站不是产品-X草稿.md) 中选用“终稿推荐（更贴近最近发文节奏）”版本
- 已使用 `baoyu-post-to-x` 先做 preview，再正式 submit
- 已在个人主页顶部确认新帖出现，状态链接为：
  - `https://x.com/0xcybersmile/status/2046134846070968695`

**未完成 / 遗留：**
- 暂未补录这条内容的后续互动数据

**下次会话优先做：**
- 观察这条帖子的回复质量，判断“模型套利 vs 真产品”是否值得展开成 thread 或长文

**需要注意：**
- 本次 `x-browser.ts --submit` 第一次同样撞到 `Chrome debug port not ready`
- 在清理 `x-browser-profile` 残留后，第二次重试成功
- 成功证据仍以“主页顶帖 + 状态页链接”为准，不只看脚本 stdout

## [2026-04-21] 会话摘要：手动补跑今日 daily 工作流

**完成了什么：**
- 已手动执行 `bash tools/daily.sh` 生成 2026-04-21 的 HN / Reddit / 总报告。
- 首次运行时 Chrome CDP 9222 没有可用页面，X 研究被跳过；随后用 CDP 打开 `https://x.com/home` 并确认 `agent-browser-session` snapshot 可读到已登录主页。
- 已重新执行 `bash tools/daily.sh --skip-following`，补上 X 公共趋势和关键词搜索：
  - `AI tools`：提取 6 条推文
  - `solopreneur`：提取 7 条推文
  - `crypto alpha`：提取 7 条推文
- 已生成 / 覆盖今日研究文件：
  - [X-每日日程-2026-04-21.md](/Users/proerror/Documents/redbook/05-选题研究/X-每日日程-2026-04-21.md)
  - [HN-每日热点-2026-04-21.md](/Users/proerror/Documents/redbook/05-选题研究/HN-每日热点-2026-04-21.md)
  - [Reddit-每日监控-2026-04-21.md](/Users/proerror/Documents/redbook/05-选题研究/Reddit-每日监控-2026-04-21.md)
- Harness 已记录今日 wiki ingest / lint run：
  - `20260421-040831-llm-wiki-ingest-2026-04-21-d3b53c`
  - `20260421-040831-llm-wiki-lint-2026-04-21-6ed44e`

**未完成 / 遗留：**
- X Pro deck 仍不可用，报告里显示“命中登录墙或不存在页，已跳过多列分析”。
- Claude CLI wiki ingest 仍失败：`Invalid API key · Please run /login`；harness 记录已创建，但真实 wiki 内容写入未完成。
- `com.redbook.daily-x` 当前不在 `launchctl list` 中，说明自动定时任务还需要重新加载或排查。

**下次会话优先做：**
- 修复 / reload `com.redbook.daily-x` launch agent，避免明天继续漏跑。
- 修复 Claude CLI 登录态后重跑 wiki ingest。
- 今日最值得写的选题优先看 `Kimi K2.6 / Qwen3.6 / 开源 coding model 价格战`，其次是 `AI slop 让社区开始反自推广` 和 `Vercel 事件后的环境变量安全`。

## [2026-04-21] 会话摘要：研究 Kimi K2.6 选题

**完成了什么：**
- 已核对 Kimi 官方发布页、Kimi API Platform、Kimi Code、Hugging Face 许可和本地 2026-04-21 日报。
- 已确认 Kimi K2.6 的可写重点不是“国产模型追上闭源”，而是：
  - coding agent 底层模型正在商品化
  - 开放权重模型正在压缩 AI 编程产品的模型层溢价
  - 真正护城河会转向 repo 上下文、权限边界、测试验证、团队协作和交付闭环
- 已保存研究文件：
  - [Kimi-K2.6-选题研究-2026-04-21.md](/Users/proerror/Documents/redbook/05-选题研究/Kimi-K2.6-选题研究-2026-04-21.md)

**未完成 / 遗留：**
- 尚未实测 Kimi Code CLI 或 API。
- 尚未展开 K2.6 license 与 Cursor / Kimi K2.5 争议链。

**下次会话优先做：**
- 如果要发布，优先走 X 单帖：`Kimi K2.6 真正打中的，不是 Claude，而是“只会包模型的 AI 产品”`。

## [2026-04-21] 会话摘要：发布 Kimi K2.6 长链路 Agent X 长帖

**完成了什么：**
- 已按用户要求将 Kimi K2.6 文案重写为强调：
  - 长链路
  - 长时间运行
  - Agent Swarm / Agent One
  - 从 chat 到 run、从 prompt 到 workflow
- 已保存终稿：
  - [2026-04-21-Kimi-K2.6-长链路-agent-X长帖.md](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/2026-04-21-Kimi-K2.6-长链路-agent-X长帖.md)
- 已用 `baoyu-post-to-x` 完成 preview 和 submit。
- 已在个人主页顶帖确认发布成功，状态链接：
  - https://x.com/0xcybersmile/status/2046453935163195457

**配图 / 链接判断：**
- 当前已发版本为纯文字长帖，无配图、无主帖外链。
- 更适合补官方新闻链接作为第一条回复，而不是给主帖配图；主帖本身靠观点和结构传播，链接放回复更稳。

**未完成 / 遗留：**
- 尚未补发官方链接回复。

## [2026-04-21] 会话摘要：补救 Kimi K2.6 官方链接回复

**完成了什么：**
- 用户指出 Kimi K2.6 长帖未经过完整 `x-mastery-mentor` 审稿；已承认流程缺口，并补做 post-hoc 四层审稿。
- 已将失误写入 `tasks/lessons.md`，规则为：X 正式 submit 前必须先输出算法层 / Hook 层 / 内容层 / CTA 层审稿结论。
- 已在原帖下补发第一条回复，放官方发布链接和阅读重点：
  - https://x.com/0xcybersmile/status/2046553016028078209
- 已回查原帖状态页，确认原帖显示 `1 回复`，回复内容可见：
  - `官方发布和案例在这里：`
  - `https://www.kimi.com/blog/kimi-k2-6`
  - `重点看 long-horizon coding 和 Agent Swarm 两部分。`

**未完成 / 遗留：**
- 这次主帖已经发布，无法在不删帖重发的情况下修正主帖 Hook。

## [2026-04-21] 会话摘要：发布 Cloudflare Agent Cloud runtime X 长帖

**完成了什么：**
- 根据 Cloudflare 官方资料，将 Leo 截图背后的事实整理为一条 X 长帖，主线是 `Agent Cloud / Project Think / Browser Run / AI Gateway / Registrar API / OpenAI Sandbox` 正在补齐 agent production runtime。
- 按用户要求，主帖主体包含官方 Project Think 链接：
  - https://blog.cloudflare.com/project-think/
- 发布前已补做 `x-mastery-mentor` 四层审稿：
  - 算法层：有主帖外链，触达有风险，但用户明确要求主体带链接，可接受
  - Hook 层：通过
  - 内容层：通过
  - CTA 层：偏弱但可接受
- 已保存终稿：
  - [2026-04-21-Cloudflare-Agent-Cloud-runtime-X长帖.md](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/2026-04-21-Cloudflare-Agent-Cloud-runtime-X长帖.md)
- 已用 `baoyu-post-to-x` preview + submit 发布，并在主页顶部确认新帖出现，状态链接：
  - https://x.com/0xcybersmile/status/2046579124765139445

**需要注意：**
- 本轮发布环境处于沙盒限制状态，`npx -y bun` 因 npm registry 网络不可达失败；改用本机已安装 `/Users/proerror/.bun/bin/bun` 并申请沙盒外权限完成。

## [2026-04-22] 会话摘要：查看今日 X timeline 并筛选题

**完成了什么：**
- 已按用户要求先查看当前登录态 X timeline / X Pro，而不是复用旧日报。
- 已生成今日 timeline 报告：
  - [X-Pro-2026-04-22.md](/Users/proerror/Documents/redbook/05-选题研究/X-Pro-2026-04-22.md)
  - [X-Timeline-2026-04-22.md](/Users/proerror/Documents/redbook/05-选题研究/X-Timeline-2026-04-22.md)
- 已确认今天高频关键词为 `GPT / AI / code`，高互动大帖里政治 / 国际关系噪音较多，不适合直接跟。
- 已查 OpenAI 官方发布和 Release Notes，确认 `ChatGPT Images 2.0 / ImageGen 2.0` 是今天最值得接账号主线的热点。
- 已保存今日选题建议：
  - [选题建议-2026-04-22.md](/Users/proerror/Documents/redbook/05-选题研究/选题建议-2026-04-22.md)

**推荐优先级：**
1. `GPT Image 2 + Codex：视觉工作流开始 agent 化`
2. `OpenAI Images 2.0 Thinking：图像模型开始做视觉研究和规划`
3. `Linus / Elon：工程现实主义反打 hype`

**未完成 / 遗留：**
- 尚未进入写稿 / 发布链路。

## [2026-04-22] 会话摘要：补充 GPT Image 2 vs Nano Banana 对比角度

**完成了什么：**
- 已按用户建议补查 Google `Nano Banana Pro / Gemini 3 Pro Image` 和近期 `Nano Banana + Gemini Personal Intelligence / Google Photos` 相关资料。
- 已将今天首选题从单独写 `GPT Image 2 + Codex` 扩展为：
  - `GPT Image 2 vs Nano Banana：谁先吃掉视觉工作流`
- 已更新：
  - [选题建议-2026-04-22.md](/Users/proerror/Documents/redbook/05-选题研究/选题建议-2026-04-22.md)

**当前判断：**
- OpenAI 更像在做 `ChatGPT / Codex / agent workflow` 里的视觉生产链。
- Google 更像在做 `Google Photos / Personal Intelligence / Workspace / Ads` 里的个性化和分发层。
- 真正值得写的不是“谁画得更好”，而是“图像模型竞争正在从画质竞争变成工作流入口竞争”。

## [2026-04-22] 会话摘要：发布 GPT Image 2 vs Nano Banana X 长帖

**完成了什么：**
- 已将今日首选题写成 X 长帖，主线为：
  - `GPT Image 2 和 Nano Banana 的竞争，不是“谁画图更好”，而是谁先吃掉视觉工作流`
- 已按 `x-mastery-mentor` 做发布前四层审稿：
  - 算法层：主帖带 OpenAI 官方链接，有触达风险但符合本轮主体带链接要求
  - Hook 层：通过
  - 内容层：通过
  - CTA 层：偏弱但可接受
- 已保存终稿：
  - [2026-04-22-GPT-Image-2-vs-Nano-Banana-X长帖.md](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/2026-04-22-GPT-Image-2-vs-Nano-Banana-X长帖.md)
- 已用 `baoyu-post-to-x` preview + submit 发布，并在主页顶部确认新帖出现，状态链接：
  - https://x.com/0xcybersmile/status/2046749045771903444

**需要注意：**
- 主帖包含 OpenAI 官方链接与预览卡片；没有另配图片。

## [2026-04-22] 会话摘要：转评 SpaceX / Cursor 合作新闻

**完成了什么：**
- 已核实 SpaceX 官方原帖：
  - https://x.com/SpaceX/status/2046713419978453374
- 已按用户要求做中文转述 + 短评，不写长评论。
- 已按 `x-mastery-mentor` 做发布前四层审稿：
  - 算法层：quote post，无额外外链，通过
  - Hook 层：通过
  - 内容层：通过
  - CTA 层：弱，但符合短评要求
- 已保存发布稿：
  - [2026-04-22-SpaceX-Cursor-X转评.md](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/2026-04-22-SpaceX-Cursor-X转评.md)
- 已用 `baoyu-post-to-x` quote preview + submit 发布，并在主页顶部确认新帖出现，状态链接：
  - https://x.com/0xcybersmile/status/2046752723664818287

## [2026-04-23] 会话摘要：查看今日 X timeline 并筛选题

**完成了什么：**
- 已按用户要求先查看当前登录态 X timeline / X Pro。
- 已生成今日 timeline 报告：
  - [X-Pro-2026-04-23.md](/Users/proerror/Documents/redbook/05-选题研究/X-Pro-2026-04-23.md)
  - [X-Timeline-2026-04-23.md](/Users/proerror/Documents/redbook/05-选题研究/X-Timeline-2026-04-23.md)
- 已确认今天高频关键词为 `AI / agent / GPT / Claude / code`。
- 已补查官方资料：
  - OpenAI `workspace agents in ChatGPT`
  - Claude Code `/ultrareview`
- 已保存今日选题建议：
  - [选题建议-2026-04-23.md](/Users/proerror/Documents/redbook/05-选题研究/选题建议-2026-04-23.md)

**推荐优先级：**
1. `Agent 开始从个人助手，变成团队里的共享工位`
2. `Claude Code / Ultrareview：代码审查开始云端多 agent 化`
3. `Polymarket 气象市场被机场吹风机打穿：预测市场真正脆弱的是 oracle`
4. `GPT Image 2 / Nano Banana 延续讨论`

**未完成 / 遗留：**
- 尚未进入写稿 / 发布链路。

## [2026-04-23] 会话摘要：起草 Polymarket 天气传感器 X 短文

**完成了什么：**
- 已按用户要求写第三个选题：`Polymarket 气象市场被机场吹风机打穿`。
- 已核对新闻事实：Météo France 投诉、CDG 传感器两次异常、约 3.4 万美元 payout、Polymarket 改用 Le Bourget 数据源。
- 已保存两版短文：
  - [2026-04-23-Polymarket-天气传感器-X短文.md](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/2026-04-23-Polymarket-天气传感器-X短文.md)

**当前建议：**
- 优先用版本 A，更有活人感。
- 这条最好带新闻链接或 quote 来源，否则“吹风机赚 3.4 万美元”容易像段子。

**未完成 / 遗留：**
- 尚未发布。

## [2026-04-23] 会话摘要：发布 Polymarket 天气传感器 X 短文

**完成了什么：**
- 已按用户要求给 Polymarket 天气传感器短文配新闻链接并发布。
- 发布前已做 `x-mastery-mentor` 四层审稿：
  - 算法层：主帖带新闻链接，有触达风险，但这条太像段子，必须有可信来源
  - Hook 层：通过
  - 内容层：通过
  - CTA 层：弱但短评可接受
- 已使用版本 A，并把 Bitcoin.com 新闻链接放进主帖主体。
- 已用 `baoyu-post-to-x` preview + submit 发布，并在主页顶部确认新帖出现，状态链接：
  - https://x.com/0xcybersmile/status/2047135340281176398

**需要注意：**
- 当前可见数据：1 喜欢、2 次观看（刚发布后截图时点）。

## [2026-04-23] 会话摘要：建立 X 半自动互动工作流

**完成了什么：**
- 已建立 X 互动工作流文档：
  - [2026-04-23-x-engagement-workflow.md](/Users/proerror/Documents/redbook/docs/reports/2026-04-23-x-engagement-workflow.md)
- 已新增半自动互动队列脚本：
  - [build_engagement_queue.py](/Users/proerror/Documents/redbook/tools/auto-x/scripts/build_engagement_queue.py)
- 脚本行为：
  - 搜索 AI agent / coding agent / Claude Code / Codex / Cursor AI 等关键词
  - 按账号主线、互动量、评论空间和风险打分
  - 生成候选帖和 2-3 条“活人感”评论草稿
  - 输出 markdown + json
  - 不自动发布评论
- 已试跑：
  - `python3 tools/auto-x/scripts/build_engagement_queue.py --query 'AI agent' --limit 3 --scrolls 1 --min-score 35`
- 已生成队列：
  - [X-互动队列-2026-04-23.md](/Users/proerror/Documents/redbook/05-选题研究/X-互动队列-2026-04-23.md)
  - [X-互动队列-2026-04-23.json](/Users/proerror/Documents/redbook/05-选题研究/X-互动队列-2026-04-23.json)

**当前策略：**
- 每天 2-3 轮，每轮筛 3-5 个高价值帖子。
- 默认人工确认后评论，不自动发。
- 评论结构优先：一句态度 + 一句反直觉判断 + 一句为什么。

## [2026-04-24] 会话摘要：起草“Agent 进入执行层”X 长帖

**完成了什么：**
- 基于今日 timeline / X Pro 信号，选择第 1 个主题：
  - `Codex Auto-review + Claude Managed Agents Memory：agent 正在进入更长流程的执行层`
- 已按 `x-mastery-mentor` 产出 3 个 hook 和 1 版推荐终稿。
- 已保存草稿：
  - [2026-04-24-Agent-进入执行层-X长帖.md](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/2026-04-24-Agent-进入执行层-X长帖.md)

**当前建议：**
- 优先用 Hook 1：
  - `Agent 现在卷的已经不是“更聪明”了。`
  - `而是能不能在更长流程里自己 review、自己记忆、自己跑完。`

**未完成 / 遗留：**
- 尚未发布。

## [2026-04-24] 会话摘要：补写 Claude 工具链扩散与企业 AI 导入两篇 X 稿

**完成了什么：**
- 已补写第 2 个题：
  - [2026-04-24-Claude-工具链扩散-X长帖.md](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/2026-04-24-Claude-工具链扩散-X长帖.md)
- 已补写第 3 个题：
  - [2026-04-24-企业AI导入-X长帖.md](/Users/proerror/Documents/redbook/01-内容生产/02-制作中的选题/2026-04-24-企业AI导入-X长帖.md)
- 两篇都已做 `x-mastery-mentor` 发布前四层审稿，并保持“活人感”判断式写法。

**当前状态：**
- 这两篇已写完，但尚未发布。

## [2026-04-24] 会话摘要：发布“Agent 进入执行层”X 长帖

**完成了什么：**
- 已按用户要求直接发布第 1 个题。
- 已使用推荐 Hook：
  - `Agent 现在卷的已经不是“更聪明”了。`
  - `而是能不能在更长流程里自己 review、自己记忆、自己跑完。`
- 发布前已按 `x-mastery-mentor` 四层审稿：
  - 算法层：通过（无外链）
  - Hook 层：通过
  - 内容层：通过
  - CTA 层：弱但可接受
- 已用 `baoyu-post-to-x` preview + submit 发布。
- 已在主页顶部确认新帖出现，状态链接：
  - https://x.com/0xcybersmile/status/2047473284732838313

## [2026-04-23] 会话摘要：测试 X 高互动帖评论工作流

**完成了什么：**
- 已按用户要求跑一次真实评论测试。
- 目标帖：
  - OpenAI workspace agents 原帖
  - https://x.com/OpenAI/status/2047008987665809771
- 使用评论：
  - `这点其实说明 agent 正在从“个人工具”变成“工作流角色”。`
  - `关键不只是模型更聪明，而是它有没有权限、记忆、上下文和交付边界。`
- 已通过现有已登录 X tab + CDP 提交，未再新开 Chrome / 新 profile。
- 已在页面内验证评论出现，评论链接：
  - https://x.com/0xcybersmile/status/2047202941564834001

**需要注意：**
- 本次验证说明评论工作流可行，但后续仍应保持人工确认，不自动批量发。
- 浏览器策略已按用户反馈修正：复用现有页面，不新开空白页抢焦点。

## [2026-04-22] 会话摘要：修正发布 Skill 浏览器默认执行姿态

**完成了什么：**
- 已检查 `docs/standards/browser-modes.md`、X 发布 skill 和小红书发布 skill 的浏览器启动逻辑。
- 已把 X 常规帖、视频帖、转评、长线程、长文脚本改为默认 `headless`，并新增 `--headed` / `--headless` 显式开关。
- 已把小红书 `publish_pipeline.py` 与 `cdp_publish.py` 改为默认后台运行，登录 / 重新登录 / 切账号仍强制有头。
- 已修复 `x-article.ts` 导入 `md-to-html.ts` 时被对方 CLI 抢先执行的问题。
- 已更新 `tasks/todo.md` 记录本次修正与验证结果。

**验证：**
- X 脚本 help smoke：`x-browser.ts`、`x-video.ts`、`x-quote.ts`、`x-article.ts`、`md-to-html.ts`。
- `x-thread.ts` 无参数用法检查。
- 小红书脚本 `py_compile` 通过。
- 直接检查 X / XHS 默认解析结果均为 headless。

**遗留：**
- X Article 如果正文里有内文图片，目前仍依赖系统剪贴板粘贴，默认 headless 下会明确要求改用 `--headed`；后续可以继续把这段替换成纯 CDP/DOM 上传插入。

## [2026-04-22] 会话摘要：Obscura 浏览器方案隔离测试

**完成了什么：**
- 已下载 `h4ckf0r0day/obscura` v0.1.0 macOS arm64 release 到 `tmp/obscura-test/`。
- 已完成 CLI smoke：
  - `obscura --help` 正常
  - `obscura fetch https://example.com --eval 'document.title'` 返回 `Example Domain`
  - `obscura fetch https://news.ycombinator.com --dump links --quiet` 可抽取 HN 链接
- 已用独立端口 `9333` 启动 CDP server，避免影响真实 Chrome 的 `9222`。
- 已用 raw CDP 验证：
  - `Browser.getVersion` 可用
  - `Target.createTarget` / `Target.attachToTarget` 可用
  - `Runtime.evaluate` 可用
  - `Page.enable` / `DOM.enable` / `Network.enable` 基础调用可用

**关键失败项：**
- `Input.insertText` 返回 `Unknown Input method: insertText`
- `DOM.setFileInputFiles` 返回 `Unknown DOM method: setFileInputFiles`
- `Network.getResponseBody` 返回 `Unknown Network method: getResponseBody`
- `Page.captureScreenshot` 返回 `Unknown Page method: captureScreenshot`
- `Browser.close` 没有关闭 server，测试进程已手动 Ctrl-C 停止

**结论：**
- Obscura 可作为无登录网页抓取 / 轻量 eval 的候选后端。
- 不能替换当前 X / 小红书发布主链，因为发布链依赖文本输入、文件上传、网络响应抓取和截图验证。

## [2026-04-22] 会话摘要：修正 X Pro 与普通 Timeline 重复抓取

**完成了什么：**
- 已确认旧版 `scrape_timeline.py` 实际打开的是 `https://pro.x.com/i/decks/2022466575597736041`，因此 `X-Timeline` 与 `X-Pro` 报告天然重复。
- 已将普通 timeline 入口改为 `https://x.com/home`，保留 X Pro 多列分析独立走 Deck。
- 已增强 `scroll_and_collect()`：支持 `distance`、连续无新增推文提前停止，并基于 `handle + content` 统计新增推文。
- `scrape_timeline.py` 新增：
  - `--scroll-distance`，默认 `1600`
  - `--max-stale-rounds`，默认 `6`
- 已补测试覆盖滚动距离和 stale-stop 行为。

**验证：**
- `python3 tools/auto-x/tests/test_x_utils.py` 通过。
- `python3 -m py_compile tools/auto-x/scripts/x_utils.py tools/auto-x/scripts/scrape_timeline.py tools/auto-x/scripts/scrape_xpro_columns.py` 通过。
- 真实 smoke：`python3 tools/auto-x/scripts/scrape_timeline.py --scrolls 3 --scroll-distance 1600 --output tmp/x-timeline-home-smoke.md` 成功。
- smoke 结果：3 次滚动提取 15 条普通 home timeline 推文；handle 集合与旧 X Pro 不同。

**判断：**
- 之前的问题不是用户感觉错了，而是代码真的把普通 timeline 指到了 X Pro Deck。
- 普通 timeline 后续仍可能受 `agent-browser-session scroll` 能力限制；如果要更深，可再把滚动实现下沉到原生 CDP `Runtime.evaluate(window.scrollBy)`。

## [2026-04-22] 会话摘要：安装 huashu-design skill

**完成了什么：**
- 已按 `skill-installer` 工作流安装 GitHub 仓库 `alchaincyf/huashu-design`。
- 仓库默认分支为 `master`，根目录包含 `SKILL.md`，按根级 skill 安装。
- 安装位置：`/Users/proerror/.codex/skills/huashu-design`。
- 已确认安装内容包含：`SKILL.md`、`assets/`、`references/`、`scripts/`、`demos/`。
- 已补脚本执行权限。

**验证：**
- `python3 -m py_compile /Users/proerror/.codex/skills/huashu-design/scripts/verify.py` 通过。
- `node --check render-video.js` 与 `node --check html2pptx.js` 通过。
- `python3 /Users/proerror/.codex/skills/huashu-design/scripts/verify.py --help` 正常输出。

**遗留：**
- 新安装 skill 需要重启 Codex 后才会稳定出现在可用 skill 列表。
- Playwright / ffmpeg / pptxgenjs / sharp 等依赖按具体设计任务需要在项目目录里安装，不在本次全局强装。

## [2026-04-22] 会话摘要：补齐 huashu-design 工具链依赖

**完成了什么：**
- 已从 `huashu-design` 的 `scripts/` 与 `references/` 提取实际工具链依赖。
- 已确认本机已有：Node `v24.11.1`、npm `11.12.1`、Python `3.14.3`、`ffmpeg 8.1`。
- 已在 `/Users/proerror/.codex/skills/huashu-design` 安装 Node 依赖：
  - `playwright@1.59.1`
  - `pdf-lib@1.17.1`
  - `pptxgenjs@4.0.1`
  - `sharp@0.34.5`
- 已安装 Python `playwright` 到用户 site-packages。
- 已安装 Playwright Chromium / Headless Shell 到 `~/Library/Caches/ms-playwright`。
- 已通过 Homebrew 安装 `yt-dlp 2026.03.17`；Homebrew 同时安装了 `deno 2.7.12` 作为依赖。

**验证：**
- Python Playwright headless Chromium 可启动并读取页面内容。
- `verify.py tmp/huashu-toolchain-smoke.html --viewports 960x540 --output tmp/huashu-verify-smoke` 成功，生成截图且无 JS/console 错误。
- `export_deck_pdf.mjs` 成功生成 `tmp/huashu-slides-smoke.pdf`。
- `export_deck_pptx.mjs` 成功生成 `tmp/huashu-slides-smoke.pptx`。
- `render-video.js` 成功生成 `tmp/huashu-toolchain-smoke.mp4`。

**备注：**
- 本次使用 Playwright 是 huashu-design 自身验证/导出链路要求，不改变 redbook 浏览器主链仍以真实 Chrome/CDP、headless-first 为默认的规则。
- smoke 产物位于 ignored `tmp/` 下，不进入 Git tracking。

## [2026-04-27] 会话摘要：2026-04-28 Timeline 选题 - Agent 入口迁移

**完成了什么：**
- 复查并继续抓取当前登录 X Timeline，生成 `05-选题研究/X-Timeline-2026-04-28-continued-051251.md`。
- 从 Timeline 信号中筛出可写选题：`Agent 入口从聊天框迁移到邮箱 / 浏览器 / IDE / 本地代码图谱 / 后台任务队列`。
- 已产出 X 长帖草稿、3 个 Hook、短推备选、第一条回复素材和 x-mastery-mentor 审稿：
  - `01-内容生产/02-制作中的选题/2026-04-28-Agent-入口从聊天框进入工作流/X长帖.md`
  - `01-内容生产/02-制作中的选题/2026-04-28-Agent-入口从聊天框进入工作流/QA报告.md`
  - `01-内容生产/02-制作中的选题/2026-04-28-Agent-入口从聊天框进入工作流/发布清单.md`
- Harness run `20260427-211943-agent-入口从聊天框进入工作流-279e9f` 已通过 research、draft、review gate，并推进到 publish 阶段等待用户确认。

**验证：**
- `check-gates` research 通过：研究报告含来源、结论、结构和长度要求。
- `check-gates` draft 通过：草稿含发布清单，结构与长度要求合格。
- `check-gates` review 通过：QA 报告和发布清单均被 verifier 识别。

**遗留：**
- 尚未发布。需要用户明确说“发布”或“直接发”后，才执行 X 发布和平台侧状态 URL 验证。

## [2026-04-27] 会话摘要：gpt-realtime-1.5 voice control X 短评已发布

**完成了什么：**
- 核对 OpenAI `realtime-voice-component` GitHub 仓库和 `gpt-realtime-1.5` model docs。
- 产出并发布中文 X 短评，核心判断是：语音不是“聊天能力”，而是受约束的 App 状态控制层。
- 已保存研究、草稿和发布记录：
  - `05-选题研究/gpt-realtime-voice-control-2026-04-28.md`
  - `01-内容生产/02-制作中的选题/2026-04-28-gpt-realtime-voice-control-短评/X短评.md`
  - `01-内容生产/02-制作中的选题/2026-04-28-gpt-realtime-voice-control-短评/发布记录.md`

**验证：**
- 发布脚本返回 `Post submitted!`。
- 个人主页顶部第一条已显示该帖。
- 独立状态页可打开并显示完整正文：`https://x.com/0xcybersmile/status/2048880394821660814`
- 状态页显示发布时间：2026年4月28日 上午5:42；初始数据为 `2 查看`。

**遗留：**
- 未做 git commit；当前 worktree 存在较多其他未提交变更，本次不混入提交。

## [2026-04-28] 会话摘要：Tumblr 高互动 Hook 拆解

**完成了什么：**
- 对照 `@0xcybersmile` 近期 X 开头，确认高频问题是过度使用“不是 A，而是 B / 重点不只是 / 真正重要的是 / 可能不是”。
- 查看 Tumblr `#ai`、`#writing` 热门文本帖，提炼高互动开头规律：先露态度、点名人群、轻微冒犯、用命令句、给 reblog 留接话空间。
- 已保存研究报告：`05-选题研究/Tumblr高互动Hook拆解-2026-04-28.md`。

**结论：**
- 后续 X 内容第一句不再默认使用“不是/而是/真正/可能”结构。
- 新默认是：命令句、具体场景、轻微冒犯、读者点名，再进入理性判断。

## [2026-04-28] 会话摘要：X 创作者语气风格拆解

**完成了什么：**
- 根据用户反馈“太结论了”，重新查看当前 X Timeline 和多个创作者账号样本。
- 已采样 `bozhou_ai`、`Hangsiin`、`Astronaut_1216`、`karpathy`、`levelsio` 的近期写法，拆出 5 种可借鉴语气：亲历日志型、实用备忘录型、内行八卦型、思考笔记型、现场转播型。
- 已保存研究报告：`05-选题研究/X创作者语气风格拆解-2026-04-28.md`。

**结论：**
- 上一版“别再 / 最大的问题是”仍然偏强结论。
- 后续 `@0xcybersmile` 更适合使用“观察型产品判断”：先写看到什么、试到什么、哪里不对劲，再收束判断。
- `不是 A，而是 B` 可保留在中后段，不再作为第一句。

## [2026-04-28] 会话摘要：X.com 高互动风格校准

**完成了什么：**
- 根据用户纠正，确认 Tumblr 不应作为 X.com 语气优化的主样本。
- 重新抓取当前已登录 X Timeline，生成 `05-选题研究/X高互动语气样本-2026-04-28.md`，共提取 35 条，识别 10 条高互动推文。
- 搜索 X.com `AI agent` Top 帖，生成 `05-选题研究/X-搜索-AI agent-2026-04-28.md`。
- 新增校准报告：`05-选题研究/X.com高互动风格校准-2026-04-28.md`。
- 已在 `tasks/lessons.md` 写入 Lesson 121，规则是：X.com 账号风格优化必须优先 X.com live 样本。

**结论：**
- 后续风格研究优先级：当前 X Timeline 高互动帖 -> X 搜索 Top -> 关注列表目标圈层账号 -> 英文 AI/coding 创作者 -> 站外文本平台。
- Tumblr 只保留为表达启发，不再作为 X 风格主依据。

## [2026-04-28] 会话摘要：Redbook 工作流全面 Review

**完成了什么：**
- 审查了 Redbook 的主规则、daily 入口、wiki workflow、harness run 状态、任务记录、选题池、发布数据和工具文档。
- 已保存完整审计报告：`docs/reports/2026-04-28-redbook-workflow-review.md`。

**核心结论：**
- 当前主要问题不是缺流程，而是流程过重、入口不一致、状态不闭环。
- 最优先修的是 daily 输出口径、following 全量巡检默认后台启动、stale harness run、旧素材库引用、`tasks/todo.md` 噪音。

**遗留：**
- 本轮未直接修改主流程脚本；建议下一轮按报告的 P0 清单做小步改造。

## [2026-04-28] 会话摘要：X Timeline 高互动帖子结构研究

**完成了什么：**
- 按用户要求回到当前 X Timeline，抓取 25 次滚动，共提取 97 条推文。
- 识别当前 Timeline 主要多人讨论主题：AI、GPT、Claude、code、agent。
- 保存样本报告：`05-选题研究/X-Timeline高互动结构样本-2026-04-28.md`。
- 新增结构研究报告：`05-选题研究/X-Timeline高互动帖子结构研究-2026-04-28.md`。

**结论：**
- 适合 `@0xcybersmile` 学习的结构不是泛娱乐平台爆款，也不是名人骂战，而是：成本痛点型、新工具现场型、亲测翻车型、缺失层命名型、哲学分歧型。
- 后续 X 草稿第一屏必须先进入具体处境：工具、成本、失败、验证、权限或使用动作，再给产品判断。

## [2026-04-28] 会话摘要：X 每日选题分流与 LLM Wiki 沉淀规则

**完成了什么：**
- 将账号主线明确为：AI Agent、AI 导入企业、协作方式、workflow、小技巧分享。
- 保留 AI 与 Crypto 资讯入口，但要求它们回到主线判断：AI 时事看 agent / workflow / 企业导入，Crypto 时事看 AI x Crypto / oracle / 权限 / 自动化 / 结算 / 风控。
- 新增 Wiki 方法论页：`wiki/方法论/X每日选题分流与知识沉淀.md`。
- 新增主线选题页：`wiki/选题/AI Agent企业导入与协作.md`。
- 新增 Crypto 时事边界页：`wiki/选题/Crypto与AI时事评论.md`。
- 更新共享 playbook 并同步到 `AGENTS.md` / `CLAUDE.md`。

**结论：**
- 每日选题输出应分成：主线候选 2-3 个、AI 时事候选 1-2 个、Crypto / AI x Crypto 候选 0-1 个、今日最推荐 1 个、Wiki 待沉淀点 3-5 条。
- LLM Wiki 的目标不是存新闻，而是把每日新信号沉淀成长期选题页、方法论页、框架和案例。

## [2026-04-28] 会话摘要：Redbook P0 工作流降噪修正

**完成了什么：**
- 修正 `tools/daily.sh` 收尾提示，改为真实输出文件 `05-选题研究/X-每日日程-YYYY-MM-DD.md`，并提示查看 daily log 判断 wiki daily-cycle 状态。
- 修正 `tools/auto-x/scripts/run_daily.sh`，following 全量巡检默认不再后台启动，只有显式传入 `--with-following-audit` 才运行。
- 为 harness 增加 `close-run`，并让 wiki ingest/query/lint 这类 research-only 维护 run 自动关闭为 `done`。
- 将旧 LLM Wiki maintenance run 批量 terminalize；当前统计为全部 47 个 run 中 31 个 `done`，LLM Wiki 类 28 个全部 `done`。
- 新增 `tasks/active.md` 作为轻量当前任务面板，并把本轮 P0 清单收尾到完成态。
- 复核主流程文档：当前 `AGENTS.md` / `CLAUDE.md` / `docs/shared/redbook-playbook.md` 已将 `02-内容素材库/` 旧入口收敛到 `wiki/素材/`，并统一使用 `X-每日日程-*`。

**验证：**
- `bash -n tools/daily.sh tools/auto-x/scripts/run_daily.sh`
- `python3 -m py_compile tools/wiki_workflow.py tools/redbook_harness/cli.py tools/redbook_harness/runtime.py`
- `python3 -m unittest discover -s tools/redbook_harness/tests`
- `python3 tools/wiki_workflow.py --help`

**遗留：**
- P1 仍建议另起一轮做：缩短 `AGENTS.md`、清理 `00-选题记录.md` 噪音、建立 skills manifest、结构化发布数据、untrack 已跟踪的 generated artifacts。

## [2026-04-28] 会话摘要：Redbook P1 Skills Manifest 修正

**完成了什么：**
- 新增 `docs/reference/skills-manifest.md`，把当前可用入口分成 `active`、`active-global`、`active-script`、`legacy-local`、`deprecated`。
- 明确 `/x-collect`、`/x-create`、`/x-filter` 是 `tools/x-skills/` 下的 legacy local reference，不再作为主流程默认入口。
- 将 X 研究默认收敛到 `tools/daily.sh` + `tools/wiki_workflow.py query` + 当前 X Timeline 检索；X 创作/审稿默认收敛到 `/x-mastery-mentor`。
- 将小红书默认路由改为：图文用 `/baoyu-xhs-images`，视频/数据/搜索用全局 `RedBookSkills`；`/post-to-xhs` 只作为历史 alias 文档保留。
- 更新 `.rules`、`AGENTS.md`、`CLAUDE.md`、`docs/shared/redbook-playbook.md`、`tools/README.md`、`tools/post-to-xhs-使用指南.md`。

**验证：**
- `python3 tools/sync_redbook_playbook.py`
- `git diff --check`
- manifest 中关键路径存在性检查通过
- stale default-entry regex checks returned no matches

**遗留：**
- P1 还剩：缩短 `AGENTS.md`、清理 `00-选题记录.md` 自动抓取噪音、结构化发布数据、untrack generated artifacts。

## [2026-04-28] 会话摘要：Redbook P1 Generated Artifacts Untrack

**完成了什么：**
- 在 `.gitignore` 增加 `node_modules/`、package-manager cache、`tools/auto-zhipin/.chrome-boss-profile/` 规则。
- 使用 `git rm --cached` 取消跟踪 `docs/plans/pptx-build/node_modules/`、`tools/auto-zhipin/node_modules/`、`tools/auto-zhipin/.chrome-boss-profile/`。
- 本地目录仍保留在磁盘上，只是不再进入 git。

**验证：**
- tracked `node_modules` count: `0`
- tracked `.chrome-boss-profile` count: `0`
- `git check-ignore` 覆盖 pptx-build node_modules、auto-zhipin node_modules、auto-zhipin Chrome profile。

**遗留：**
- P1 还剩：缩短 `AGENTS.md`、清理 `00-选题记录.md` 自动抓取噪音、结构化发布数据。

## [2026-04-28] 会话摘要：Redbook P1 Lean Playbook Cleanup

**完成了什么：**
- 将 always-loaded playbook 改成四条 lane：选题研究、热点速评、计划内容、系统维护。
- 将长篇系统优化方法移到 `docs/reference/system-optimization-methods.md`，主指令只保留可执行硬门槛。
- 压缩 `AGENTS.md` / `CLAUDE.md` 前置操作规则，改为指向 `tasks/active.md`、skills manifest 和 lean playbook。

**验证：**
- `AGENTS.md`: 728 行 -> 310 行
- `CLAUDE.md`: 739 行 -> 311 行
- `docs/shared/redbook-playbook.md`: 382 行 -> 119 行
- 旧长规则关键词检查已无命中；shared playbook sync 已通过。

**遗留：**
- P1 还剩：清理 `00-选题记录.md` 自动抓取噪音、结构化发布数据。

## [2026-04-28] 会话摘要：Redbook P1 Topic Pool Cleanup

**完成了什么：**
- 将 `00-选题记录.md` 里的 `X 每日研究发现` 自动抓取噪音归档到 `01-内容生产/选题管理/archive/2026-04-28-X每日研究发现-自动抓取噪音归档.md`。
- `00-选题记录.md` 现在只保留人工选题和已深化选题，并留下归档指针。
- `daily_schedule.py` / `daily_research.py` 默认不再写入选题池；需要旧行为时必须显式加 `--append-topics-to-record`。
- 更新 `tools/auto-x/README.md`，说明推荐选题保留在日报，选中后再 promotion。

**验证：**
- `python3 -m py_compile tools/auto-x/scripts/daily_schedule.py tools/auto-x/scripts/daily_research.py`
- `daily_schedule.py --help` / `daily_research.py --help` 都显示 `--append-topics-to-record`
- live topic pool 中 `X 每日研究` 行数为 0；归档中保留 127 条旧噪音行。
- `git diff --check` 通过。

**遗留：**
- P1 还剩：结构化发布数据。

## [2026-04-28] 会话摘要：Redbook P1 Structured Publish Data

**完成了什么：**
- 新增 `04-内容数据统计/publish-records.jsonl` 作为发布数据主账本，按 `T+0 / T+1 / T+3` 追加。
- 新增 `04-内容数据统计/publish-records.schema.md`，定义字段、阶段和 CLI 用法。
- 新增 `tools/record_publish.py`，用于追加结构化发布记录，避免长期手改 markdown 表。
- 将 2026-04-28 已验证的 gpt-realtime X 短评发布记录写入 JSONL，并在 `数据统计表.md` 的 X.com 区块增加 T+0 视图行。
- 同步更新 playbook、AGENTS、CLAUDE 和 tools README。

**验证：**
- `python3 -m py_compile tools/record_publish.py`
- `tools/record_publish.py --dry-run ... | python3 -m json.tool`
- `publish-records.jsonl` 可逐行 JSON 解析，当前 1 条记录。
- `python3 tools/sync_redbook_playbook.py` 显示 AGENTS/CLAUDE unchanged。
- `git diff --check` 通过。

**遗留：**
- P1 清单已完成；后续可进入 P2：`redbookctl` / dashboard。

## [2026-04-28] 会话摘要：Redbook P2 Control Surface

**完成了什么：**
- 新增 `tools/redbookctl.py` 和可执行 wrapper `tools/redbookctl`，把日常操作收敛到一个入口。
- `tools/redbookctl status` 现在汇总今日日报、`tasks/active.md`、harness active/stale runs、待确认发布、发布账本最新记录、T+1/T+3 缺口和近期未进 JSONL 的发布记录。
- 增加 `daily`、`pick`、`draft`、`publish`、`publish-record`、`close-run` 子命令；写操作都复用现有 canonical 工具或只做显式 promotion。
- 更新 shared playbook、AGENTS、CLAUDE、`tools/README.md`，把主入口改成 `tools/redbookctl`。

**验证：**
- `python3 -m py_compile tools/redbookctl.py tools/record_publish.py tools/redbook_harness/cli.py`
- `tools/redbookctl --help`
- `tools/redbookctl status`
- `tools/redbookctl status --json | python3 -m json.tool`
- `tools/redbookctl pick --dry-run ...`
- `tools/redbookctl draft`
- `tools/redbookctl publish`
- `tools/redbookctl publish-record -- ... --dry-run | python3 -m json.tool`
- `python3 tools/sync_redbook_playbook.py`
- `git diff --check`

**遗留：**
- Dashboard 暴露出 15 个 stale harness runs 和 2 个待确认发布项；后续可单独做 P2.1 状态终态化。
