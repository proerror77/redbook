# 浏览器模式标准

日期：2026-04-13

这是 redbook 当前唯一的浏览器分层标准。

如果某个 skill、脚本、MCP 配置或 README 与本文冲突，以本文为准。

## 目标

统一的不是“只剩一个浏览器工具”，而是：

- 默认分层
- 默认入口
- 默认登录态策略
- 兼容层定位

## 全局偏好

- 尽量不要使用 Playwright。
- 默认优先级：真实 Chrome + CDP/current-tab > 非 Playwright 兼容桥接 > Playwright fallback。
- 如果某能力当前只能依赖 Playwright，必须在该 skill 或 README 里明确标注原因，不能把它写成默认主入口。
- 例外：BOSS 当前主链已经收口到 `tools/auto-zhipin` 的 Playwright CLI + 持久化 profile，因为近期验证显示它比 current-tab/CDP 更稳定；BOSS current-tab 只保留为 fallback。

## 默认执行姿态

- 默认：`headless`
- 只有以下情况才允许临时 `headed`：
  - 首次登录或登录态失效，必须人工登录
  - 验证码 / 风控 / 安全校验必须人工处理
  - 明确需要人工目视确认页面状态
  - 用户明确要求打开可见浏览器

也就是说：

- 是否使用真实 Chrome / CDP，是“底座选择”问题
- 是否 headless / headed，是“执行姿态”问题

两者不要混为一谈。

## 只允许的 3 种浏览器模式

### 1. `interactive-browser`

用途：

- 真实登录态
- 当前浏览器或命名 profile
- 需要人工兜底的业务动作
- 真实站点写操作

默认承载：

- 真实 Chrome 或命名 profile
- CDP

默认执行姿态：

- 优先 `headless`
- 只有在登录 / 验证码 / 人工确认必须出现时，才临时切 `headed`

适用业务：

- X 发布
- 小红书发布
- 微信 browser 发布
- BOSS：`tools/auto-zhipin` Playwright profile 主链；current-tab 仅 fallback

默认原则：

- 优先复用真实浏览器会话
- 优先无头执行
- 不默认新起可见私有浏览器
- 不默认要求扩展桥接
- 进入业务动作前，先用 `tools/redbookctl browser` 或 `node tools/browser-core/interactive/session.mjs` 读取现有 CDP tabs；只有没有可复用 tab 时才允许创建新 tab。

备注：

- 当前 `current-tab` 这类依赖“你正在看的真实 Chrome”方案，属于兼容过渡态，不是未来默认姿态。

### 2. `qa-browser`

用途：

- QA
- 验证
- dogfooding
- 抓 console / network
- 截图取证

默认承载：

- 优先：真实 Chrome + Chrome DevTools / CDP 只读验证
- 次选：gstack `browse`（Playwright-backed fallback）

默认原则：

- 可以 headless
- 可以导入 cookie
- 不作为生产写操作主链
- 默认就是 `headless`

### 3. `render-browser`

用途：

- 静态 HTML / markdown 渲染
- 卡片截图
- file:// 页面生成图片

默认承载：

- 优先：非 Playwright 的 Chrome/CDP 截图渲染路径
- 次选：Playwright/Chromium headless fallback

默认原则：

- 不依赖真实登录态
- 不依赖 current-tab
- 不与业务交互链混用
- 默认就是 `headless`

## 登录态标准

只允许 2 种主策略：

### A. 真实浏览器会话

用于：

- `interactive-browser`

### B. cookie 导入

用于：

- `qa-browser`

不允许把 cookie 导入作为生产写操作的默认主策略。

## 兼容层

以下方案允许保留，但默认都不是主入口：

- `opencli Browser Bridge`
- `agent-browser`
- `agent-browser-session`
- `actionbook`
- `Playwright MCP --extension`

它们的定位是：

- legacy
- adapter
- fallback

不是默认浏览器底座。

## 禁止事项

从现在开始，新的业务 skill 不应再：

1. 自己维护一套新的 Chrome launcher
2. 自己维护一套新的 profile 发现逻辑
3. 自己维护一套新的通用 CDP transport
4. 把兼容层写成默认入口
5. 在没有先检查现有 CDP tabs 的情况下直接 `open` 新页面

## 当前默认判断

如果你不确定该用哪层：

- 真实业务动作：`interactive-browser`
- 测试与验证：`qa-browser`
- 纯渲染截图：`render-browser`

## 对现有主要方案的定位

| 方案 | 模式 | 定位 |
|---|---|---|
| Chrome DevTools MCP | `interactive-browser` | 主工具面候选 |
| BOSS Playwright profile | `interactive-browser` | BOSS 站点主链例外 |
| gstack `browse` | `qa-browser` | Playwright-backed fallback |
| Playwright/Chromium headless | `render-browser` | fallback |
| opencli Browser Bridge | legacy adapter | 兼容层 |
| agent-browser/session/actionbook | legacy adapter | 兼容层 |
| Playwright MCP 标准模式 | fallback | 通用备选 |
| Playwright MCP `--extension` | fallback | 仅在扩展已验证安装时使用 |
