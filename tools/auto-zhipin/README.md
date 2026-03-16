# BOSS直聘自动化原型

这个目录是一个独立原型，不接到现有内容生产主流程里。

目标只做三件事：
- 监看聊天消息并落本地台账
- 扫描职位并按规则过滤
- 在显式开关下执行自动投递 / 回复

## 运行模型

### 1. 第一次必须人工登录

这个站点对 fresh session 很敏感。未登录或新会话常见两种情况：
- 跳登录页
- 跳滑块 / 风控验证页，例如“当前 IP 地址可能存在异常访问行为”

所以正确路径不是“上来就 headless”，而是：

1. 先用 headed 模式跑一次 `bootstrap`
2. 你手动完成登录 / 滑块 / 短信验证
3. 工具把持久化 profile 留在 `tools/auto-zhipin/.auth/`
4. 后续 `monitor` / `scan` 再尽量走 headless

### 2. 默认保守，不默认发消息 / 投递

- 回复默认只生成草稿
- 投递默认 `dry-run`
- 真正点击发送或投递，必须显式开开关
- 自动发简历按钮 / 拒绝补一句也默认关闭

## 目录结构

```text
tools/auto-zhipin/
├── .auth/                 # 本地浏览器持久化 profile（gitignore）
├── data/                  # ledger / events / runtime artifacts（gitignore runtime files）
├── lib/                   # 共享逻辑
├── scripts/
│   ├── bootstrap_auth.js
│   ├── monitor_messages.js
│   ├── scan_jobs.js
│   ├── reply_worker.js
│   └── report.js
├── tests/
├── config.example.json
└── package.json
```

## 安装

```bash
cd tools/auto-zhipin
npm install
npx playwright install chromium
```

如果本机装了 Chrome，默认会优先尝试 `channel: "chrome"`；如果没有，脚本会回退到 Playwright 自带的 Chromium。

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
- `browser.slowMoMs`
- `chat.autoReplyEnabled`
- `chat.autoReplySend`
- `chat.pollIntervalMs`
- `chat.autoSendResumeButton`
- `chat.autoRejectionFollowup`
- `profile.summary`
- `profile.focusKeywords`

风控建议：
- `browser.slowMoMs` 不要设成 `0`，默认保守值建议至少 `250-350ms`
- `chat.pollIntervalMs` 不要过于频繁，建议 `25s+`
- 连续切搜索词、连续开详情页、连续点投递按钮，比单次扫描本身更容易触发验证
- 如果页面出现 `访问受限 / 账号异常行为 / 暂时被限制访问`，应立即停止所有自动化，直到页面给出的恢复时间之后再由人工先确认状态
- 如果之前已经触发过 `restricted`，恢复时间到了之后，第一轮运行只做健康探测，不直接继续投递或回复；需要第二次再显式重跑

## 使用方法

### 1. 登录引导

```bash
cd tools/auto-zhipin
node scripts/bootstrap_auth.js
```

你只需要在打开的浏览器里完成一次人工登录。脚本检测到聊天页可用后会退出。

### 2. 监看消息

```bash
cd tools/auto-zhipin
node scripts/monitor_messages.js --once
node scripts/monitor_messages.js
```

默认行为：
- 打开聊天页
- 检测是否命中登录失效 / 风控
- 轮询会话列表和当前会话消息
- 按保守节奏轮询，避免过于频繁刷新
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
node scripts/scan_jobs.js
```

默认行为：
- 打开配置里的搜索页
- 抽取职位卡片
- 按规则打标签：`matched` / `skipped`
- 把理由写入 ledger

### 4. 自动投递

先确认：
- `config.local.json` 里 `apply.enabled = true`
- `apply.dryRun = false`

然后运行：

```bash
cd tools/auto-zhipin
node scripts/scan_jobs.js --apply
```

### 5. 发送回复草稿

```bash
cd tools/auto-zhipin
node scripts/reply_worker.js --send-all
node scripts/reply_worker.js --run-actions
node scripts/reply_worker.js --backend pinchtab --run-actions
```

不带参数时会打印待发送草稿和 pending actions。

### 6. 查看追踪摘要

```bash
cd tools/auto-zhipin
node scripts/report.js
```

### 7. 实验性 PinchTab 后端

这条线目前分成两层：
- `probe`：探测页面健康状态
- `readonly monitor`：对聊天页做只读抓取，不发送消息、不投递
- `action executor`：实验性接入自动回复管理和已知 URL 的顺序投递

先启动 PinchTab server：

```bash
npx --yes pinchtab
```

然后在 `tools/auto-zhipin` 里运行：

```bash
npm run pinchtab:probe -- --url https://example.com --mode page
npm run pinchtab:probe -- --url https://www.zhipin.com/web/geek/chat?ka=header-message --mode chat
npm run pinchtab:monitor
npm run pinchtab:reply -- --run-actions
npm run pinchtab:apply -- --url https://www.zhipin.com/job_detail/xxx.html
```

当前产物：
- `data/pinchtab_probe_latest.json`
- `data/pinchtab_chat_readonly_latest.json`

说明：
- 这条后端目前是实验性的
- 搜索结果页的岗位抽取仍然走 Playwright；PinchTab 目前更适合作为动作执行层
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
- 站点的滑块 / 风控会影响纯 headless 成功率
- 若已经触发 `访问受限`，继续重试只会放大风险；这类状态必须视为硬停机
- 原型会把最近一次站点健康状态写入 `ledger.json`；命中过 `restricted` 后会触发本地 circuit breaker
- DOM 选择器可能变化，所以抽取逻辑用了较多候选选择器和文本兜底
- “自动投递”在 BOSS 直聘里本质上可能是“立即沟通 / 发起联系”，不是传统 ATS 的简历提交
- 非当前打开会话的识别主要依赖聊天列表预览；真正执行动作前会再次打开会话复核

## 建议的真实使用顺序

1. `bootstrap_auth.js`
2. `scan_jobs.js --once` 先看过滤效果
3. 调整 `filters`
4. 开 `--apply`，但先保留 `dryRun`
5. 确认日志和台账合理后，再关闭 `dryRun`
