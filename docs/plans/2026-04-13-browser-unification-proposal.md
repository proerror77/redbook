# 浏览器统一方案草案

日期：2026-04-13

基于盘点文档：

- [2026-04-13-browser-stack-inventory.md](/Users/proerror/Documents/redbook/docs/reports/2026-04-13-browser-stack-inventory.md)

目标：不是立刻重构全部浏览器相关 skill，而是先定义一套统一的分层、术语、默认入口和迁移顺序。

补充偏好约束：

- 尽量不要使用 Playwright
- 只有在没有等价非 Playwright 路径时，才把 Playwright 当 fallback
- 默认执行姿态是 `headless`
- 只有在登录、验证码、人工验证必须出现时，才临时切到 `headed`

## 一句话提案

不要再把“浏览器方案”理解成一个东西。

redbook 后续只允许 3 种被明确命名的浏览器执行模式：

1. `interactive-browser`
2. `qa-browser`
3. `render-browser`

所有 skill、脚本、MCP 和 bridge 都必须归到其中之一。不存在第四种默认模式。

## 为什么这样分

你现在的混乱，根因不是“工具太多”，而是不同用途的浏览器动作被混成了一个问题。

实际上这里至少有 3 类完全不同的任务：

- 要复用真实登录态、反风控、最好看得见页面的业务动作
- 要快、可重复、适合测试和验证的 headless 动作
- 要把 HTML / file 页面转成图片的离线渲染动作

这 3 类任务不应该共用同一套默认入口。

## 设计目标

1. 任何人都能回答：这个任务该走哪一层浏览器
2. 站点业务 skill 不再自己决定底层怎么连浏览器
3. 登录态管理有唯一主策略
4. 默认执行姿态明确为 `headless`
5. 新增 skill 时，不能再偷偷带进一套私有 CDP / Chrome launcher
6. 保留迁移期兼容层，不一次性砍断旧链路

## 非目标

1. 不是一周内重写所有 X / 小红书 / 微信 / BOSS skill
2. 不是把所有浏览器能力都塞进 MCP
3. 不是马上删除 `opencli`、`agent-browser` 或旧脚本

## 决策

### 决策 1：默认浏览器底座不是 Playwright MCP，也不是 opencli bridge

**默认交互底座**定为：

- 对“真实登录态 + 当前浏览器 + 手动可介入”的业务任务：
  - `interactive-browser`
  - 技术方向：共享 Chrome CDP / 当前标签页模型
  - 会话内优先由 `Chrome DevTools MCP` 承担 LLM 工具面
  - 仓库脚本侧优先由共享 `browser-core` CDP 原语承接

理由：

- 它最符合你现在已经成功的 BOSS current-tab 路线
- 它也最符合发布型任务对真实登录态和人工兜底的要求
- 它不要求浏览器扩展必须先装好才能工作

执行姿态补充：

- 目标默认姿态仍然是 `headless`
- 当前 `current-tab` 模型是兼容过渡态，用于已跑通链路
- 中长期应迁到“命名 profile + headless + 必要时临时 headed 登录”的模式

### 决策 2：`qa-browser` 独立存在，不与业务发布底座混用

`qa-browser` 用于：

- QA
- dogfooding
- 页面验证
- 截图取证
- 复现 bug

推荐承载：

- 优先：真实 Chrome + Chrome DevTools / CDP 只读验证
- fallback：gstack `browse`

理由：

- 这更符合“尽量不要使用 Playwright”的仓库偏好
- `browse` 虽然可用，但底层仍是 Playwright，不应继续写成默认 QA 主链
- 它仍然适合作为 fallback

### 决策 3：`render-browser` 独立存在，不强行复用真实 Chrome

`render-browser` 用于：

- 本地 HTML / file 页面渲染
- 小红书卡片截图
- 静态页面转图

推荐承载：

- 优先：非 Playwright 的 Chrome/CDP 截图渲染路径
- fallback：Playwright / Chromium headless

理由：

- 这类任务不依赖真实登录态
- 不需要 current-tab
- 也不该把真人 Chrome 拿来做批量离线渲染
- 但在“尽量不要使用 Playwright”的前提下，Playwright 应只保留为兜底方案

### 决策 4：登录态统一策略只有两条主路

以后只允许两种主策略：

#### A. 真实浏览器会话

适用于：

- X 发布
- 小红书发布
- 微信浏览器发布
- BOSS 当前页动作

规则：

- 优先复用真实 Chrome / 命名 profile
- 站点需要多账号时，用统一 profile registry 管理
- 默认先尝试 headless profile
- 只有登录 / 验证码 / 人工确认必须出现时，才临时切 headed

#### B. cookie 导入到 headless

适用于：

- QA
- 只读抓取
- 验证

规则：

- 只作为 `qa-browser` 的登录态桥接
- 不作为生产写操作主策略

### 决策 5：业务 skill 禁止再私带一套“浏览器启动逻辑”

以后业务 skill 只允许拥有：

- 站点动作逻辑
- 业务表单逻辑
- DOM 选择器 / 页面状态机

不允许继续各自维护：

- 自己的 Chrome 启动器
- 自己的 profile 发现逻辑
- 自己的通用 CDP 连接封装

这些应该下沉到共享层。

### 决策 5.5：默认不弹浏览器窗口

以后任何浏览器层或业务 skill，如果没有明确理由，都应该：

- 先尝试 `headless`
- 失败后再判断是否进入“需要人工登录/验证”的 `headed`

而不是一开始就把可见浏览器窗口当默认姿态。

### 决策 6：迁移期允许兼容层，但必须降级定位

迁移期保留，但降级为兼容层：

- `opencli Browser Bridge`
- `agent-browser` / `agent-browser-session` / `actionbook`
- `Playwright MCP` 标准模式

它们的角色是：

- 兼容已有链路
- 供尚未迁移的脚本继续运行
- 在新架构中只作为 fallback / adapter

它们不再是默认入口。
在这组兼容层里，Playwright 相关路径应优先后退到最后使用。

## 目标分层

### 1. `interactive-browser`

职责：

- 连接真实 Chrome
- 选择当前标签页或命名 profile
- 提供页面级原语：
  - 打开页面
  - 选标签
  - 等待页面 ready
  - 读 DOM / a11y tree
  - 点击
  - 输入
- 上传文件
- 截图

执行姿态：

- 默认 `headless`
- 进入 `headed` 的条件必须可解释：
  - 登录
  - 验证码
  - 人工校验
  - 用户显式要求

默认服务对象：

- X
- 小红书
- 微信 browser 发布
- BOSS
- page-agent 试验层

实现建议：

- 新建共享层：`tools/browser-core/interactive/`

内部组成建议：

- `session-registry`
- `chrome-targets`
- `cdp-transport`
- `tab-selection`
- `dom-actions`
- `uploads`
- `page-readiness`
- `headed-escalation`

### 2. `qa-browser`

职责：

- headless 打开页面
- 导入 cookie
- 跑交互验证
- 读 console / network
- 截图 / diff

执行姿态：

- 固定默认 `headless`

默认服务对象：

- QA
- reproduce-bug
- verify flows
- 部署验收

实现建议：

- 优先走真实 Chrome + DevTools/CDP 的只读验证
- `gstack browse` 作为 Playwright-backed fallback，不再自己发明第二套 QA 浏览器

### 3. `render-browser`

职责：

- 把 HTML / markdown 渲染结果转成图片
- 控制 viewport / DPR
- 不关心站点登录态

执行姿态：

- 固定默认 `headless`

默认服务对象：

- `auto-redbook` 渲染链路
- 静态卡片截图

实现建议：

- 优先统一到非 Playwright 的 Chrome/CDP 截图渲染路径
- Playwright/Chromium headless 只作为 fallback
- 逐步淘汰 `agent-browser` 版本渲染脚本

## 对现有方案的重新定位

### `Chrome DevTools MCP`

新定位：

- 会话内的 `interactive-browser` 主工具面

### `browse`

新定位：

- `qa-browser` fallback

### `connect-chrome`

新定位：

- 路由文档 / 约束说明
- 不作为业务 skill 默认入口

### `setup-browser-cookies`

新定位：

- `qa-browser` 的会话桥接辅助

### `opencli Browser Bridge`

新定位：

- 兼容层 / 低层 adapter
- 在“尽量不要使用 Playwright”的前提下，它更接近可保留的非 Playwright 过渡层
- 重点保留给 BOSS 迁移期和个别 bridge 能力
- 不再作为“统一浏览器底座候选人”

### `agent-browser` / `actionbook`

新定位：

- 历史遗留兼容层
- 逐步退出主链
- 不再允许新增依赖

### `Playwright MCP`

新定位：

- 标准模式保留为通用 fallback
- `--extension` 模式只在明确验证过扩展安装时才允许启用
- 在“尽量不要使用 Playwright”的偏好下，不再做任何默认启动方式

## 对各业务线的落点建议

### X

目标：

- 站点动作保留在 `baoyu-post-to-x`
- 浏览器连接、profile 发现、CDP 原语下沉到 `interactive-browser`

第一阶段不做的事：

- 不立即重写所有 `x-browser.ts` / `x-video.ts` / `x-article.ts`

### 小红书

目标：

- 继续支持多账号
- 但账号 profile 和 tab 复用逻辑要交给统一 session registry
- 发布动作保留在现有业务 skill

### 微信

目标：

- API 路线继续保留
- browser 路线迁到 `interactive-browser`

### BOSS

目标：

- 短期继续沿 current-tab 思路
- 逐步把 `opencli` 特有桥接依赖从主路径中抽离
- 中长期迁到命名 profile + headless current-session 模型

判断：

- 它已经是最接近目标架构的一条业务线

### URL 抓取 / X to markdown

目标：

- 只读抓取应优先看是否能走 `qa-browser`
- 需要真实登录态的少数情况，再走 `interactive-browser`

## 迁移顺序

### Phase 0：冻结新增浏览器栈

立规则：

- 不再允许新增新的 Chrome launcher / CDP wrapper / profile 发现器
- 新浏览器能力只能加到共享层

### Phase 1：建共享浏览器 core

新增目录建议：

```text
tools/browser-core/
  interactive/
  qa/
  render/
  session/
  adapters/
```

最先做的能力：

- session registry
- current-tab / named-profile 选择
- 通用 CDP transport
- 文件上传
- page ready 判断
- headed escalation（只用于登录/验证码）

### Phase 2：迁 BOSS

原因：

- 它最接近 current-tab 模型
- 成功经验最多

目标：

- 让 BOSS 不再把 `opencli bridge` 视为事实上的底座

### Phase 3：迁小红书

原因：

- 多账号是最清晰的 session-registry 用例

### Phase 4：迁 X

原因：

- X 站点动作多、分支多
- 最适合在 shared core 稳定后再迁

### Phase 5：迁微信 browser 路线和 URL 抓取

### Phase 6：收口兼容层

- 标记 `agent-browser` 为 legacy
- 标记 `opencli bridge` 为 compatibility
- 清理 Playwright MCP `--extension` 残留配置
- 把 Playwright 相关路径统一压缩到 fallback 文档里

## 成功标准

架构收敛完成时，应满足：

1. 新人能在 1 分钟内回答“这个任务该用哪层浏览器”
2. 任一业务 skill 不再自己起一套私有 Chrome launcher
3. 任一业务 skill 的登录态策略都能被统一解释
4. 当前仓库默认配置不再依赖未验证扩展
5. 当前浏览器方案默认不再弹可见窗口
6. 历史兼容层的职责都被写清楚，且默认不再推荐

## 需要你拍板的 3 个问题

虽然这份草案已经给了方向，但还有 3 个你最好亲自拍板：

1. `interactive-browser` 的事实标准，是否就定为“真实 Chrome + current-tab / named-profile + CDP”
2. `opencli Browser Bridge` 是保留为长期兼容层，还是只保留到 BOSS 迁完
3. `agent-browser` 系列是立刻冻结，还是允许只在 `auto-x` 研究链路里短期保留

## 我的建议

如果你要一个明确倾向，而不是中性盘点，我的建议是：

- 把 **真实 Chrome + CDP current-tab / named-profile** 定成唯一的生产交互底座
- 把 **真实 Chrome + DevTools/CDP 只读验证** 定成优先 QA 路径
- 把 **gstack browse** 和 **Playwright/Chromium headless** 都降成 fallback
- 把 `opencli bridge` 保留为非 Playwright 过渡兼容层
- 把 `agent-browser` 系列冻结为 legacy，不再作为新能力入口

这条路最少冲突，也最符合你现在已经跑通的 BOSS current-tab 实践。
