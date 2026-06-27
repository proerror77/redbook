# BOSS直聘自动化原型

这个目录是一个独立原型，不接到现有内容生产主流程里。

目标只做三件事：
- 监看聊天消息并落本地台账
- 扫描职位并按规则过滤
- 在显式开关下执行自动投递 / 回复

## 运行模型

### 1. 默认 live 后端是「Codex Chrome extension + 用户真实 Chrome profile」

当前推荐主路径是：

1. 用户在日常使用的 Chrome profile 里打开并登录 BOSS。
2. Codex Chrome extension 连接到当前 Codex chat，并获准操作 `zhipin.com`。
3. Codex 通过 extension 控制真实 BOSS 页面做低速、小批量、可见的 live apply。
4. 本目录脚本只负责候选筛选、本地台账、dry-run gate、计数和证据记录；不要声称普通 Node 脚本能直接调用 Codex chat 里的 extension 工具句柄。
5. 只有 extension 控制面不可用且用户接受 fallback 时，才使用 Computer Use。CDP / Playwright / 持久化 profile 只保留为诊断、历史兼容或显式实验路径。

这样做的原因是：
- extension 使用用户真实登录态，不需要新开 `--remote-debugging-port` Chrome 或分离 profile。
- live click 更接近用户当前页面，不把 Playwright/CDP 作为默认申请路径。
- 脚本仍然保留可验证的筛选、台账和安全门，避免只靠页面按钮文字统计成功。

如果页面出现登录失效、滑块或 `访问受限 / 异常访问行为`，先人工处理，再做只读 health check；不要尝试绕过或对抗 BOSS 安全控制。

异常登录 / 异常访问不是一次性报错，要作为后续策略输入：
- 一旦出现 `访问受限 / 异常访问行为 / 账号异常行为 / _security_check / auth_gate / restricted`，必须先挂 `browser-trace` 到当前 CDP 会话，采集 network、console、page navigation、DOM 和截图证据。
- 记录触发异常的浏览器 profile、CDP 端口、脚本入口、操作节奏、页面 URL 和 trace 摘要；下次不要无记录地重复同一条登录或自动化路径。
- 恢复路径应是用户式恢复：复用已登录的普通浏览器，由用户完成 BOSS 第一方验证，再先跑只读 health check / dry-run；不要尝试绕过或对抗 BOSS 安全控制。

### 2. 默认保守，不默认发消息 / 投递

- 回复默认只生成草稿
- 投递默认 `dry-run`
- 真正点击发送或投递，必须显式开开关
- 自动发简历按钮 / 拒绝补一句也默认关闭

## 目录结构

```text
tools/auto-zhipin/
├── data/                  # ledger / events / runtime artifacts（gitignore runtime files）
├── lib/                   # 共享逻辑
├── scripts/
│   ├── chrome_collect_queue.js
│   ├── chrome_monitor_queue.js
│   ├── reply_worker.js     # 站内动作执行；PinchTab 只保留为显式实验后端
│   └── report.js
├── tests/
├── config.example.json
└── package.json
```

## 安装

```bash
cd tools/auto-zhipin
npm install
```

项目内仍保留 `playwright` 依赖和历史脚本，但它们不是默认 live 后端。真实网页操作优先使用 Codex Chrome Extension 连接用户日常 Chrome；本目录脚本默认只承担筛选、台账、dry-run gate、计数和证据记录。

## 配置

1. 复制一份本地配置：

```bash
cd tools/auto-zhipin
cp config.example.json config.local.json
```

2. 根据你的情况改：
- `jobs.searchUrls`
- `filters.*`
- `apply.enabled`
- `apply.dryRun`
- `chat.autoReplyEnabled`
- `chat.autoReplySend`
- `chat.draftReplyMode`
- `chat.pollIntervalMs`
- `chat.autoSendResumeButton`
- `chat.autoRejectionFollowup`
- `profile.summary`
- `profile.focusKeywords`

消息自动化说明：
- 当前版本里，自动草稿和自动发送都走 LLM 生成，不再默认用模板文本直发
- 需要先配置 `ANTHROPIC_API_KEY`，否则监看脚本会跳过自动草稿/自动动作，只做只读监看

风控建议：
- `chat.pollIntervalMs` 不要过于频繁，建议 `25s+`
- 连续切搜索词、连续开详情页、连续点投递按钮，比单次扫描本身更容易触发验证
- 遇到异常访问或异常登录时，先用 `browser-trace` 留证并复盘触发路径；没有 trace-backed 记录时，不要重复同一方式登录、打开详情页或批量 dry-run。
- 如果页面出现 `访问受限 / 账号异常行为 / 暂时被限制访问`，应立即停止所有自动化，直到页面给出的恢复时间之后再由人工先确认状态
- 如果之前已经触发过 `restricted`，恢复时间到了之后，第一轮运行只做健康探测，不直接继续投递或回复；需要第二次再显式重跑

## Browser Trace 诊断门

目的：当 BOSS 页面不稳定时，把“为什么失败”记录成证据，再决定下一步，而不是重复同一条登录或投递路径。

触发条件：
- `异常访问行为`、`账号异常行为`、`访问受限`
- `_security_check`、`auth_gate`、`restricted`
- 登录页反复跳转、chat 页打不开、详情页自动跳走
- dry-run 出现 `target_url_mismatch` 或目标详情 URL 无法验证

标准步骤：

```bash
cd /Users/proerror/Documents/redbook

# 1. 启动只读 trace，挂到当前 CDP。优先用当前实际端口，例如 9224。
RUN_ID=boss-debug-$(date +%Y%m%dT%H%M%S)
O11Y_ROOT=/Users/proerror/Documents/redbook/.o11y \
  node /Users/proerror/.agents/skills/browser-trace/scripts/start-capture.mjs 9224 "$RUN_ID" 1

# 2. trace 运行中，只做只读检查或 dry-run。
browse --ws 9224 pages --json
npm --silent --prefix tools/auto-zhipin run boss:apply-cdp -- \
  --cdp-endpoint http://127.0.0.1:9224 \
  --url 'https://www.zhipin.com/job_detail/xxx.html' \
  --dry-run true \
  --focus false

# 3. 停止并切分 trace。
O11Y_ROOT=/Users/proerror/Documents/redbook/.o11y \
  node /Users/proerror/.agents/skills/browser-trace/scripts/stop-capture.mjs "$RUN_ID"
O11Y_ROOT=/Users/proerror/Documents/redbook/.o11y \
  node /Users/proerror/.agents/skills/browser-trace/scripts/bisect-cdp.mjs "$RUN_ID"

# 4. 看摘要和错误。
O11Y_ROOT=/Users/proerror/Documents/redbook/.o11y \
  node /Users/proerror/.agents/skills/browser-trace/scripts/query.mjs "$RUN_ID" summary
O11Y_ROOT=/Users/proerror/Documents/redbook/.o11y \
  node /Users/proerror/.agents/skills/browser-trace/scripts/query.mjs "$RUN_ID" errors
```

判定标准：
- 可以继续：BOSS 页面稳定、没有 auth/security blocker、dry-run 的 `targetCheck.ok === true`。
- 必须停止：出现异常访问、登录/安全页、`target_url_mismatch`、详情页连续跳转、chat 页无法稳定打开。
- 记录要求：把 trace 摘要、导航序列、错误类型、触发脚本和恢复建议写入 `tasks/progress.md`。原始 `.o11y` 截图和 DOM 可能包含账号/招聘页面信息，默认不提交。

### 固定脚本：trace-backed probe

优先使用封装好的脚本，而不是手动拼 `browser-trace` 命令。它会：
- 挂 `browser-trace` 到当前 CDP。
- 对当前或指定 `job_detail` 做只读 dry-run gate。
- 停止并切分 trace。
- 默认删除原始 `.o11y` 截图/DOM，只保留摘要到 `data/boss-trace-probe-latest.json` 和 `data/boss-trace-probe-history.jsonl`。
- 如果 trace 期间出现其他 `job_detail` 导航，会追加 `trace_unstable_navigation`，并强制 `okToLiveApply=false`。
- 如果 trace 期间出现 `/web/user/`、`/web/passport/zp/error`、`403/code=32/code=38`、security/verify/captcha URL，也会追加 trace blocker 并强制 `okToLiveApply=false`。

单次检查：

```bash
cd /Users/proerror/Documents/redbook/tools/auto-zhipin
npm run boss:trace-probe -- \
  --cdp-endpoint http://127.0.0.1:9224 \
  --keep-trace false
```

轮询检查：

```bash
cd /Users/proerror/Documents/redbook/tools/auto-zhipin
npm run boss:trace-probe -- \
  --cdp-endpoint http://127.0.0.1:9224 \
  --poll true \
  --interval-ms 30000 \
  --max-loops 10 \
  --keep-trace false
```

只有当输出里 `okToLiveApply=true`，并且 `targetCheck.ok=true`、`gate.reasons=[]`、`trace.issues=[]` 时，才可以进入受监督的 live apply 决策。

### trace-supervised batch apply

需要自动投递时，不要直接跑长批量 `apply-cdp`。使用 trace supervisor 包住每一个候选：

```bash
cd /Users/proerror/Documents/redbook/tools/auto-zhipin
npm run boss:trace-apply-batch -- \
  --cdp-endpoint http://127.0.0.1:9224 \
  --candidates data/cdp-collect-联合创始人_上海_-20260508-batch1.json,data/cdp-collect-架构师_上海_-20260508-batch1.json \
  --target-successes 3 \
  --delay-ms 60000 \
  --live false
```

默认 `--live false` 只输出 `eligibleDryRun`，不会点击投递。真正 live 必须同时满足：

```bash
BOSS_ENABLE_LIVE_APPLY=1 npm run boss:trace-apply-batch -- \
  --cdp-endpoint http://127.0.0.1:9224 \
  --candidates data/cdp-collect-联合创始人_上海_-20260508-batch1.json \
  --target-successes 1 \
  --delay-ms 60000 \
  --live true
```

这个 runner 每个候选都执行：
- live 前健康检查：现有 BOSS page 不能是登录/异常/安全/403 页面。
- trace-backed probe：`okToLiveApply=true` 才允许继续。
- 单个 live apply：固定 `--focus false --click-mode dom`。
- live trace 回放：出现目标漂移、登录页、异常页、安全页、403/code=32/code=38 立即硬停。
- 账本验证：只有 `getTodaySuccessfulApplies()` 增加 1 才计为成功。
- 成功后等待 `--delay-ms`，避免连续详情页/投递节奏触发风控。

### current-page / recommendations apply

当前更推荐的 live 路线是复用用户真实 Chrome 中已经打开的 BOSS 页面，
从站内推荐、新发布、当前列表或详情页相关推荐继续筛选，而不是启动
关键词搜索循环。50 个投递可以作为总目标，但执行时仍应按 2-3 个成功
为一个检查点推进。

投递前先看 ledger 追踪面，避免重复投递、漏掉未验证失败、或忽略长时间
未推进的已投岗位：

```bash
cd /Users/proerror/Documents/redbook/tools/auto-zhipin
npm run boss:apply-tracking -- \
  --markdown data/apply-tracking-latest.md \
  --stale-hours 48
```

只读/诊断：

```bash
cd /Users/proerror/Documents/redbook/tools/auto-zhipin
npm run boss:current-chrome-doctor -- --ports=9222,9223,9224,9225
npm run boss:trace-apply-recommendations -- \
  --cdp-endpoint http://127.0.0.1:9224 \
  --target-successes 2 \
  --max-candidates 10 \
  --live false
```

只有 doctor 明确显示 `okToUseCdpScripts=true` 且 `usableBossPorts` 指向
真实 BOSS 页面时，才允许 CDP fallback。否则应回到 Codex Chrome
Extension 操作用户真实 Chrome tab。

Native/JXA feed runner 只作为显式 fallback，不是默认后台方案。它默认不再
`Chrome.activate()`，但仍会改动当前 Chrome 的 BOSS workbench tab；如果用户
正在用同一个 Chrome 窗口，它会影响该 tab 的内容。真实 live 必须显式打开
环境门：

```bash
cd /Users/proerror/Documents/redbook/tools/auto-zhipin
npm run boss:native-feed -- --target-successes 5 --max-reviewed 40
BOSS_ENABLE_LIVE_APPLY=1 npm run boss:native-feed -- --live --target-successes 2 --max-reviewed 32
```

如果需要把 Chrome 拉到前台人工监督，再额外传 `--focus true`。

## 使用方法

### 1. 登录并准备浏览器上下文

默认准备方式：

1. 用户在日常 Chrome profile 里打开 BOSS，并确认已登录。
2. Codex App 使用 `Chrome` 插件 / Codex Chrome Extension 连接该真实 Chrome。
3. Codex 通过 `agent.browsers.get("extension")`、`browser.user.openTabs()`、`claimTab()` 复用已有 BOSS 页。

历史命令 `npm run bootstrap` / `npm run boss:login` 仍可用于诊断或显式实验，但它们会走独立自动化 profile，不作为 live apply 默认入口。

### 2. 监看消息

```bash
cd tools/auto-zhipin
npm run chrome:monitor -- --once
npm run chrome:monitor
npm run reply
```

默认行为：
- 默认先由 Codex Chrome Extension/真实 Chrome 页面确认聊天页状态；脚本只做消息采集、ledger 和 action queue
- 检测是否命中登录失效 / 风控
- 轮询会话列表和当前会话消息
- 按保守节奏轮询，避免过于频繁刷新
- 若未配置 `ANTHROPIC_API_KEY`，则只做消息采集，不会自动生成或发送回复
- 新消息写入 `data/ledger.json` 和 `data/events.jsonl`
- 为新入站消息生成回复草稿
- 如果启用自动动作，会先把动作写入 action queue，再顺序执行

自动动作范围：
- `cv_request`：优先点击站内 `发送简历 / 投递简历 / 发简历`
- `explicit_rejection`：只在明确 `不合适 / 暂不匹配 / 已招满` 这类消息里补一句
- 不做邮箱投递、附件上传或站外表单

### 3. 扫描职位和过滤

```bash
cd tools/auto-zhipin
npm run chrome:collect
npm run scan
```

默认行为：
- 默认应复用当前 BOSS 页面、站内推荐或最新职位列表；旧的
  `config.jobs.searchUrls` 只作为显式 fallback
- 抽取职位卡片
- 按规则打标签：`matched` / `skipped`
- 把理由写入 ledger

### 4. 自动投递

默认 live 路径：

1. Codex Chrome Extension 操作用户真实 Chrome 里的 BOSS 页面，低速、小批量执行。
2. 每次 live click 前后用脚本台账和页面证据交叉核对。
3. 脚本投递命令默认只作为 dry-run gate 或显式 fallback，不是默认 live click 面。

Dry-run / 诊断命令：

```bash
cd tools/auto-zhipin
npm run boss:apply -- --url https://www.zhipin.com/job_detail/xxx.html --dry-run true
```

说明：
- 默认按 `config.apply.dryRun` 执行；仓库默认是 `true`
- `--dry-run true` 只做预检路径，不写成真实已投
- 真实投递优先由 Codex Chrome Extension 在真实页面操作；只有用户明确要求脚本 fallback，才显式传 `--dry-run false` 或调整配置
- 真正需要兼容旧的 current-tab / CDP 流程时，再手动运行 `boss:apply-current`

旧入口保留为 fallback：

```bash
cd tools/auto-zhipin
npm run boss:apply-current -- --probe true
npm run boss:apply-opencli -- --url https://www.zhipin.com/job_detail/xxx.html
```

如果 BOSS 对 current-tab / CDP / Playwright 路线触发了更强检测，优先回到 Codex Chrome Extension + 用户真实 Chrome 的可见页面；不要继续硬试旧入口。

### 5. PinchTab 动作层（实验）

```bash
cd tools/auto-zhipin
npm run pinchtab:reply -- --run-actions
```

`reply_worker.js` 现在默认走 `pinchtab`，不再默认假设本地还装着 Playwright。

### 6. 查看追踪摘要

```bash
cd tools/auto-zhipin
node scripts/report.js
npm run boss:apply-tracking -- --markdown data/apply-tracking-latest.md
```

### 7. 实验性 PinchTab 后端

这条线目前分成两层：
- `action executor`：实验性接入自动回复管理
- 旧的 `pinchtab:probe` / `pinchtab:monitor` / `pinchtab:apply` npm 脚本已经移出主入口；相关脚本只保留在 `_legacy` 目录作参考

先启动 PinchTab server：

```bash
npx --yes pinchtab
```

然后在 `tools/auto-zhipin` 里运行：

```bash
npm run pinchtab:reply -- --run-actions
```

当前产物：
- `data/events.jsonl`
- `data/ledger.json`

说明：
- 这条后端目前是实验性的
- 搜索结果页的岗位抽取默认应由 Codex Chrome Extension/真实 Chrome 页面配合本地 ledger 完成；PinchTab 只保留为动作执行实验层
- `pinchtab eval` 在当前本机版本里表现不稳定，所以动作层直接改用了 PinchTab 的 HTTP API
- 当前已接：
  - `自动回复管理`
  - `站内发简历按钮`
  - `已知岗位 URL / matched 队列` 的顺序投递
- 当前未接：
  - 基于 PinchTab 的站内搜索结果抽取
  - 并发投递

## 追踪台账

原型目前有两层追踪：

- `data/ledger.json`
  - 最新快照
  - 职位、投递、会话、消息、草稿、action、运行记录
- `data/events.jsonl`
  - 事件流
  - 方便回放和排查

## 已知限制

- 首登和登录失效恢复仍然要人工参与
- live 主链路依赖同一个用户真实 Chrome 会话，因此不要并发运行多个写入型浏览器动作或脚本 fallback
- 若已经触发 `访问受限`，继续重试只会放大风险；这类状态必须视为硬停机
- 原型会把最近一次站点健康状态写入 `ledger.json`；命中过 `restricted` 后会触发本地 circuit breaker
- DOM 选择器可能变化，所以抽取逻辑用了较多候选选择器和文本兜底
- “自动投递”在 BOSS 直聘里本质上可能是“立即沟通 / 发起联系”，不是传统 ATS 的简历提交
- 非当前打开会话的识别主要依赖聊天列表预览；真正执行动作前会再次打开会话复核

## 建议的真实使用顺序

1. 用户在日常 Chrome 打开 BOSS，并确认登录/安全状态正常。
2. Codex 用 Chrome 插件 / Codex Chrome Extension claim 现有 BOSS tab。
3. `npm run chrome:collect` 先看过滤效果或用页面直接筛选候选。
3. 调整 `filters`
4. 真正投递前，先用 `npm run boss:apply -- --url ... --dry-run true` 做预检或用页面做保守核对。
5. 确认无误后，通过 Codex Chrome Extension 在真实页面低速投递，并写入/核对 ledger。
6. 投递后运行 `npm run boss:apply-tracking`，复查 retryable / stale / duplicate。
7. 只有 extension 控制面不可用且用户接受 fallback 时，才考虑 `boss:native-feed`、Computer Use、`boss:apply-current`、`boss:apply-opencli` 或 Playwright 脚本。
8. 需要消息处理时再运行 `npm run chrome:monitor` 或 `npm run reply`
