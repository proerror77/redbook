# BOSS直聘自动化原型

这个目录是一个独立原型，不接到现有内容生产主流程里。

目标只做三件事：
- 监看聊天消息并落本地台账
- 扫描职位并按规则过滤
- 在显式开关下执行自动投递 / 回复

## 运行模型

### 1. 默认后端是「当前前台 Chrome 标签页」

现在这套主路径不再依赖 Playwright 持久化 profile，而是直接复用你已经登录好的前台 Google Chrome：

1. 手动打开 Google Chrome 并登录 BOSS 直聘
2. 保持目标标签页在前台
3. 运行 `chrome:collect` / `chrome:monitor` / `boss:apply-current`
4. 所有动作都按单标签页串行执行，避免串写和风控放大

如果页面出现登录失效、滑块或 `访问受限 / 异常访问行为`，先人工处理，再重新运行脚本。

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
│   ├── reply_worker.js     # PinchTab 实验后端
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

不需要再安装 Playwright 浏览器。主链路直接走当前前台 Google Chrome。

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
- 如果页面出现 `访问受限 / 账号异常行为 / 暂时被限制访问`，应立即停止所有自动化，直到页面给出的恢复时间之后再由人工先确认状态
- 如果之前已经触发过 `restricted`，恢复时间到了之后，第一轮运行只做健康探测，不直接继续投递或回复；需要第二次再显式重跑

## 使用方法

### 1. 手动准备当前标签页

```bash
npm run bootstrap
```

这条命令现在只会提示你：
- 手动在前台 Google Chrome 登录 BOSS
- 打开职位列表页或聊天页
- 再运行下面的 current-tab 命令

### 2. 监看消息

```bash
cd tools/auto-zhipin
npm run chrome:monitor -- --once
npm run chrome:monitor
npm run reply
```

默认行为：
- 把前台标签切到聊天页
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
- 如果未传 `--url`，按 `config.jobs.searchUrls` 顺序切前台标签页
- 抽取职位卡片
- 按规则打标签：`matched` / `skipped`
- 把理由写入 ledger

### 4. 自动投递

如果你已经把目标岗位打开在当前前台 BOSS 页里，优先用 current-tab 入口：

```bash
cd tools/auto-zhipin
npm run boss:apply-current -- --probe true
npm run boss:apply-current
npm run boss:apply-current -- --dry-run true
```

说明：
- `--probe true` 只读取当前聚焦的 BOSS 页，不点击按钮
- 默认会优先选中当前聚焦/可见的 BOSS 页，再直接对当前已展开的岗位执行 `立即沟通`
- 这条路径不会再先 `goto(job_url)` 再按 URL 重选职位卡，适合搜索结果右侧详情已展开的场景
- 如果页面已经落在 `verify.html`，脚本会暂停等待人工完成验证，不会自动点验证按钮

只有在你已经确认“当前页没有稳定展开目标岗位，但有可靠职位 URL”时，才退回旧入口：

```bash
cd tools/auto-zhipin
npm run boss:apply -- --url https://www.zhipin.com/job_detail/xxx.html
```

旧的 URL 入口仍可用，但更容易命中 `job_card_not_found`，所以不再作为当前页投递的首选。

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
- 搜索结果页的岗位抽取主路径已经改成 current-tab；PinchTab 目前更适合作为动作执行层
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
- 这套主链路依赖“当前前台 Chrome 标签页”，因此任何并发运行都会互相踩状态
- 若已经触发 `访问受限`，继续重试只会放大风险；这类状态必须视为硬停机
- 原型会把最近一次站点健康状态写入 `ledger.json`；命中过 `restricted` 后会触发本地 circuit breaker
- DOM 选择器可能变化，所以抽取逻辑用了较多候选选择器和文本兜底
- “自动投递”在 BOSS 直聘里本质上可能是“立即沟通 / 发起联系”，不是传统 ATS 的简历提交
- 非当前打开会话的识别主要依赖聊天列表预览；真正执行动作前会再次打开会话复核

## 建议的真实使用顺序

1. 手动在前台 Google Chrome 登录 BOSS，并打开职位列表或聊天页
2. `npm run chrome:collect` 先看过滤效果
3. 调整 `filters`
4. 真正投递前，如果目标岗位已经在当前页展开，先用 `npm run boss:apply-current -- --probe true` 验证脚本是否看见当前页
5. 确认读取无误后，使用 `npm run boss:apply-current` 执行当前页投递
6. 只有当前页无法稳定展开岗位时，才退回 `npm run boss:apply -- --url ...`
7. 需要消息处理时再运行 `npm run chrome:monitor` 或 `npm run reply`
