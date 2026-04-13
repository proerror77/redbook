# 浏览器方案盘点

日期：2026-04-13

目标：梳理 redbook 当前 skills / MCP / 本地工具中所有主要浏览器自动化方案，明确它们各自的定位、依赖、重叠点和当前问题，为下一步做统一方案设计提供输入。

补充偏好约束：

- 尽量不要使用 Playwright
- 因此本文里的 Playwright 相关方案更偏“现状存在项”，不等于后续默认主入口

## 一句话结论

现在不是“一个浏览器方案太多”，而是“至少 5 层不同职责的浏览器方案没有被明确分层”：

1. 通用 MCP 浏览器控制层
2. gstack 浏览器技能层
3. 仓库内自维护浏览器桥接层
4. 站点专用浏览器自动化层
5. 试验性代理/控制台层

真正的问题不是数量本身，而是：

- 同一个仓库里同时存在 `Playwright MCP`、`Chrome DevTools MCP`、`gstack browse`、`opencli Browser Bridge`、`原生 CDP 脚本`、`当前标签页驱动` 这些入口
- 这些入口没有统一的术语和优先级
- “谁负责通用浏览器控制，谁负责登录态复用，谁负责站点业务动作” 边界不清

## 盘点范围

本次只盘点与浏览器直接相关的内容：

- skills
- MCP 配置
- 仓库内浏览器桥接工具
- 站点专用自动化入口

不盘点纯 API、纯文本处理、纯图片生成类 skill。

## 总览表

| 层级 | 方案 | 入口 / 文件 | 技术栈 | 主要用途 | 登录态来源 | 当前定位 |
|---|---|---|---|---|---|---|
| 通用控制层 | Playwright MCP | [.mcp.json](/Users/proerror/Documents/redbook/.mcp.json), [~/.codex/mcp.json](</Users/proerror/.codex/mcp.json>) | `@playwright/mcp` | 通用浏览器自动化 | 自己起浏览器，或扩展桥接 | 通用 MCP server |
| 通用控制层 | Chrome DevTools MCP | 当前运行态中已启用 | `chrome-devtools-mcp` | 连接已打开的 Chrome | 复用真实 Chrome | 通用 MCP server |
| gstack 层 | `browse` | [~/.codex/skills/gstack/browse/SKILL.md](</Users/proerror/.codex/skills/gstack/browse/SKILL.md>) | gstack browse daemon | 站点 QA / dogfooding / headless 验证 | 可配 cookie 导入 | Headless 浏览器技能 |
| gstack 层 | `connect-chrome` | [~/.codex/skills/connect-chrome/SKILL.md](</Users/proerror/.codex/skills/connect-chrome/SKILL.md>) | gstack + side panel extension | 启动可见 Chrome，供代理实时操作 | 新起受控 Chrome | 可见 Chrome 工作流 |
| gstack 层 | `setup-browser-cookies` | [~/.codex/skills/gstack/setup-browser-cookies/SKILL.md](</Users/proerror/.codex/skills/gstack/setup-browser-cookies/SKILL.md>) | cookie import into browse | 把真实浏览器 cookie 导入 headless browse | 从 Chrome/Arc/Brave/Edge 导入 | 登录态桥接辅助技能 |
| 旧通用层 | `agent-browser` / `agent-browser-session` / `actionbook` | [tools/auto-x/README.md](/Users/proerror/Documents/redbook/tools/auto-x/README.md), [tools/auto-x/scripts/x_utils.py](/Users/proerror/Documents/redbook/tools/auto-x/scripts/x_utils.py) | actionbook / agent-browser family | X 研究抓取、旧发布辅助、部分渲染脚本 | 自己连接 debug Chrome 或加载状态文件 | 历史通用浏览器栈 |
| 桥接层 | `opencli Browser Bridge` | [tools/opencli/README.md](/Users/proerror/Documents/redbook/tools/opencli/README.md) | opencli daemon + Browser Bridge extension | 跨站点低层浏览器动作、BOSS 底层 core | 主 Chrome + extension | 仓库内自维护桥接层 |
| 业务层 | X 发布 | [.agents/skills/baoyu-post-to-x/SKILL.md](/Users/proerror/Documents/redbook/.agents/skills/baoyu-post-to-x/SKILL.md) | 原生 Chrome + CDP + profile | 发 X 普通帖 / 视频 / quote / article | 自己维护 profile，首次手登 | 站点专用写操作链路 |
| 业务层 | URL 抓取 | [.agents/skills/baoyu-url-to-markdown/SKILL.md](/Users/proerror/Documents/redbook/.agents/skills/baoyu-url-to-markdown/SKILL.md) | 原生 Chrome + CDP | 抓网页并转 Markdown | 自己起 Chrome / 可指定 profile | 站点无关的内容抓取 |
| 业务层 | X to markdown | [.agents/skills/baoyu-danger-x-to-markdown/SKILL.md](/Users/proerror/Documents/redbook/.agents/skills/baoyu-danger-x-to-markdown/SKILL.md) | 逆向 API + 浏览器 cookie fallback | 拉取 X tweet/article | 环境变量或 Chrome 登录 | 数据抓取链路 |
| 业务层 | 微信发布 | [.agents/skills/baoyu-post-to-wechat/SKILL.md](/Users/proerror/Documents/redbook/.agents/skills/baoyu-post-to-wechat/SKILL.md) | API 或 Chrome CDP | 公众号文章 / 图文发布 | API 凭证或浏览器登录 | 双通道写操作链路 |
| 业务层 | 小红书发布 | [~/.codex/skills/xiaohongshu-skills/SKILL.md](</Users/proerror/.codex/skills/xiaohongshu-skills/SKILL.md>) | Chrome launcher + CDP scripts | 小红书图文 / 视频发布 | 浏览器登录，多账号 | 站点专用写操作链路 |
| 业务层 | BOSS 直聘 current-tab | [.agents/skills/zhipin/SKILL.md](/Users/proerror/Documents/redbook/.agents/skills/zhipin/SKILL.md), [tools/auto-zhipin/README.md](/Users/proerror/Documents/redbook/tools/auto-zhipin/README.md) | 当前 Chrome 标签页 + CDP + opencli core | 扫描职位、投递、聊天动作 | 复用手动登录 Chrome | 当前推荐业务链路 |
| 试验层 | Page Agent Console | [tools/page-agent-console/README.md](/Users/proerror/Documents/redbook/tools/page-agent-console/README.md) | 本地控制台 + Page Agent Extension | 内部工作台试点、多标签只读探测 | 同窗口扩展 | 试验性代理层 |

## 各方案定位

### 1. Playwright MCP

来源：

- [.mcp.json](/Users/proerror/Documents/redbook/.mcp.json)
- [~/.codex/mcp.json](</Users/proerror/.codex/mcp.json>)

定位：

- 通用浏览器 MCP server
- 适合“给 LLM 一套结构化浏览器工具”
- 偏通用自动化，不带业务语义

特点：

- 默认标准模式可以自己起浏览器
- 也支持 `--extension` 模式桥接真实 Chrome
- 但 `--extension` 只有在 Playwright MCP Bridge 扩展已安装时才成立

当前问题：

- 之前仓库和用户级配置都误把它当默认桥接层使用
- 结果就是配置要求扩展，但 Chrome 里没有扩展，直接触发 `chrome-extension://.../connect.html` 拦截页

### 2. Chrome DevTools MCP

来源：

- 当前环境里已经有 `mcp__chrome_devtools__*` 工具
- `zhipin` skill 也显式推荐过 `chrome-devtools-mcp --autoConnect`

定位：

- 通用“连接真实 Chrome”的控制层
- 更适合复用你已经登录好的真实浏览器上下文

特点：

- 不强调自己起新浏览器
- 适合保留 cookie、权限、会话
- 对“当前你正在用的 Chrome”更自然

和 Playwright MCP 的关系：

- 两者都能做通用浏览器控制
- 但 Chrome DevTools MCP 更像“接管现有 Chrome”
- Playwright MCP 更像“给 LLM 一套完整浏览器自动化接口”

### 3. gstack `browse`

来源：

- [~/.codex/skills/gstack/browse/SKILL.md](</Users/proerror/.codex/skills/gstack/browse/SKILL.md>)

定位：

- Headless QA / site verification / dogfooding

特点：

- 自带 daemon
- 快
- 偏测试、验证、页面 diff
- 可以配合 `setup-browser-cookies` 把真实会话导入

边界：

- 它不是“真实用户浏览器工作台”
- 它更像测试器，而不是长期业务操作主链

### 4. gstack `connect-chrome`

来源：

- [~/.codex/skills/connect-chrome/SKILL.md](</Users/proerror/.codex/skills/connect-chrome/SKILL.md>)

定位：

- 启动可见 Chrome，加载 side panel 扩展，让代理在真实窗口里工作

特点：

- 强调“看得见”
- 强调 side panel 实时活动流
- 更像一个受控的“真人浏览器工作舱”

边界：

- 与 `browse` 不是一类东西
- 与 `Chrome DevTools MCP` 也不是一回事，它更像 gstack 自己的可视工作流入口

### 5. `setup-browser-cookies`

来源：

- [~/.codex/skills/gstack/setup-browser-cookies/SKILL.md](</Users/proerror/.codex/skills/gstack/setup-browser-cookies/SKILL.md>)

定位：

- 不是浏览器控制层
- 是登录态桥接辅助层

特点：

- 把真实浏览器 cookie 导入 `browse`
- 解决的是“headless 浏览器如何复用真实登录态”

### 6. `opencli Browser Bridge`

来源：

- [tools/opencli/README.md](/Users/proerror/Documents/redbook/tools/opencli/README.md)

定位：

- 仓库内自维护的浏览器桥接层
- 兼做 BOSS low-level browser core

特点：

- 依赖主 Chrome 安装 `opencli Browser Bridge` unpacked extension
- 提供统一 wrapper：`redbook-opencli`
- 加锁，串行执行浏览器命令
- 解决的是“跨站点低层浏览器能力 + 稳定桥接”

边界：

- README 明确说它不是发布 skills 的替代品
- X / 小红书 / BOSS 的写操作主链路仍保留在各自技能里

### 6.5 `agent-browser` / `agent-browser-session` / `actionbook`

来源：

- [tools/auto-x/README.md](/Users/proerror/Documents/redbook/tools/auto-x/README.md)
- [tools/auto-x/scripts/x_utils.py](/Users/proerror/Documents/redbook/tools/auto-x/scripts/x_utils.py)
- [tools/auto-redbook/scripts/render_xhs_browser.sh](/Users/proerror/Documents/redbook/tools/auto-redbook/scripts/render_xhs_browser.sh)
- [tools/auto-redbook/scripts/publish_xhs.sh](/Users/proerror/Documents/redbook/tools/auto-redbook/scripts/publish_xhs.sh)

定位：

- 历史通用浏览器栈
- 主要服务旧的 X 研究链路、部分发布辅助脚本和渲染脚本

特点：

- `auto-x` README 明确依赖 `actionbook`
- `x_utils.py` 实际封装的是 `agent-browser-session`
- `auto-redbook` 里还保留 `agent-browser` 版本的渲染与发布辅助脚本

当前问题：

- 这一层已经与当前主线 skills 脱节
- 名称和底层实现不统一：README 写 actionbook，代码跑 agent-browser-session，脚本里又出现 agent-browser
- 这说明它不是单一产品，而是一条历史迁移链留下的多态残影

### 7. `baoyu-post-to-x`

来源：

- [.agents/skills/baoyu-post-to-x/SKILL.md](/Users/proerror/Documents/redbook/.agents/skills/baoyu-post-to-x/SKILL.md)

定位：

- X 站点专用写操作链路

特点：

- 用真实 Chrome + CDP
- 自己维护 profile
- 包含多条写操作脚本：普通帖、视频、quote、article

当前问题：

- 同一个 skill 内部其实已经有多条浏览器子方案：`x-browser.ts`、`x-video.ts`、`x-quote.ts`、`x-article.ts`
- 这些脚本虽然都叫“X skill”，但并不是同一个动作模型

### 8. `baoyu-url-to-markdown`

来源：

- [.agents/skills/baoyu-url-to-markdown/SKILL.md](/Users/proerror/Documents/redbook/.agents/skills/baoyu-url-to-markdown/SKILL.md)

定位：

- 站点无关的内容抓取链路

特点：

- 自己起 Chrome
- 走 CDP
- 有 `auto` 和 `wait` 两种抓取模式

它和 `browse` 的关系：

- 都能“打开网页、拿内容”
- 但 `browse` 偏测试和交互
- 它偏“产出 markdown 内容文件”

### 9. `baoyu-danger-x-to-markdown`

来源：

- [.agents/skills/baoyu-danger-x-to-markdown/SKILL.md](/Users/proerror/Documents/redbook/.agents/skills/baoyu-danger-x-to-markdown/SKILL.md)

定位：

- X 数据抓取链路

特点：

- 主链是逆向 API
- 浏览器只是 fallback，用来刷新 cookies

它不是浏览器主控层：

- 浏览器在这里是认证辅助手段
- 不是持续控制 UI 的主路径

### 10. `baoyu-post-to-wechat`

来源：

- [.agents/skills/baoyu-post-to-wechat/SKILL.md](/Users/proerror/Documents/redbook/.agents/skills/baoyu-post-to-wechat/SKILL.md)

定位：

- 微信公众号写操作链路

特点：

- 明确双通道：API / browser
- 也就是说它内部本身就已经有“浏览器方案”和“非浏览器方案”并存

### 11. 小红书发布 skill

来源：

- [~/.codex/skills/xiaohongshu-skills/SKILL.md](</Users/proerror/.codex/skills/xiaohongshu-skills/SKILL.md>)

定位：

- 小红书写操作链路

特点：

- 自带 `chrome_launcher.py`
- 通过 CDP 执行登录、发布、搜索、互动
- 支持多账号和远程 CDP

当前问题：

- 这一套自己已经像一个独立浏览器平台
- 和 gstack / Playwright MCP / opencli 之间没有明确主从关系

### 12. `zhipin` + `tools/auto-zhipin`

来源：

- [.agents/skills/zhipin/SKILL.md](/Users/proerror/Documents/redbook/.agents/skills/zhipin/SKILL.md)
- [tools/auto-zhipin/README.md](/Users/proerror/Documents/redbook/tools/auto-zhipin/README.md)

定位：

- BOSS 直聘专用业务链路

特点：

- 现在主路径不再走独立 Playwright 浏览器
- 改成直接复用当前前台 Chrome 标签页
- 站点业务动作又调用 `redbook-opencli.js boss apply`

这意味着：

- BOSS 线已经在做“去 Playwright、转 current-tab + bridge core”的收敛
- 它其实是全仓库里最接近“统一思路”的一条业务线

### 13. `page-agent-console`

来源：

- [tools/page-agent-console/README.md](/Users/proerror/Documents/redbook/tools/page-agent-console/README.md)

定位：

- 试验性的代理工作台

特点：

- 要装 `Page Agent Extension`
- 从 side panel 拿 token
- 在控制台里跑自然语言任务
- 还支持同窗口多标签只读探测

边界：

- README 明确说这是试点，不做真实发布
- 目前更像内部操作台原型，不是生产主链

## 当前重叠点

### 重叠 1：通用浏览器控制层重复

同时存在：

- Playwright MCP
- Chrome DevTools MCP
- gstack browse
- gstack connect-chrome
- agent-browser / actionbook
- opencli Browser Bridge

问题：

- 都能“控制浏览器”
- 但没有统一回答：默认该用哪一个

### 重叠 2：登录态复用方式重复

同时存在：

- Chrome DevTools 直连真实 Chrome
- Playwright MCP 扩展桥接真实 Chrome
- gstack `setup-browser-cookies`
- actionbook / agent-browser 自己连接 debug Chrome
- opencli Browser Bridge extension
- 各业务 skill 自己维护独立 profile

问题：

- 有的方案复用主 Chrome
- 有的方案复制 cookie
- 有的方案自己起新 profile
- 导致“登录态到底放哪儿”没有一致答案

### 重叠 3：站点专用写操作重复造浏览器底座

例如：

- X skill 自己带 CDP/Chrome/profile
- 小红书 skill 自己带 launcher + CDP
- 微信 skill 同时有 API 和 browser
- BOSS 线有 current-tab + opencli core

问题：

- 每条业务线都在自己解决“怎么连浏览器、怎么保登录、怎么发动作”
- 底层能力没有统一抽象

### 重叠 4：试验层和生产层混在一起

例如：

- `page-agent-console`
- `connect-chrome`
- `opencli`
- 各业务 skill

问题：

- 有些是“内部试点”
- 有些是“生产主链”
- 但从命名和目录上看，不够一眼区分

## 当前冲突点

### 冲突 1：真实 Chrome vs 自起 Chrome

两种哲学同时存在：

- 复用你已经登录好的真实 Chrome
- 为自动化独立起新 Chrome / profile

这不是细节冲突，而是架构分叉。

### 冲突 2：MCP 工具 vs 本地脚本

两种执行面同时存在：

- 用 MCP 工具直接操作
- 用 skill 包装本地脚本去操作

如果不规定优先级，就会出现“同一个任务既能用 MCP，也能用脚本，也能用桥接”的混乱。

### 冲突 3：浏览器是底座，还是业务线私有实现

现在答案不一致：

- opencli 试图做底座
- BOSS 线开始复用底座
- X / 小红书 / 微信 仍主要各自为战

## 我对现状的判断

### 目前最合理的分层应该是

#### A. 统一的“基础浏览器控制层”

只保留 1 条主链，负责：

- 连接真实 Chrome 或起测试 Chrome
- 管理登录态复用
- 暴露统一的“打开页 / 选标签 / 读 DOM / 点击 / 上传 / 截图 / 导 cookie”原语

#### B. 统一的“会话桥接层”

负责：

- 主 Chrome 复用
- cookie 导入
- extension / bridge 管理

这一层不直接承载业务语义。

#### C. 站点专用业务层

例如：

- X
- 小红书
- 微信
- BOSS

每条业务线只写站点动作，不再自己决定浏览器底层怎么连。

#### D. 试验层

例如：

- page-agent-console
- connect-chrome

明确标成试验，不和生产主链混用。

## 我认为最值得优先统一的不是“所有东西”，而是这 3 个判断

1. 默认基础浏览器层是谁
2. 默认登录态复用策略是谁
3. 业务 skill 以后还能不能自己私带一套 CDP / Chrome launcher

如果这 3 个问题不先定，后面越整越乱。

## 建议的下一步讨论顺序

1. 先定“浏览器底座主链”
2. 再定“登录态统一策略”
3. 最后才讨论“每条业务线怎么迁移”

不建议一上来就直接重构所有 skill。

## 初步建议

如果只说方向，不展开实施细节，我当前的倾向是：

- 通用“连接真实 Chrome”优先收敛到 Chrome DevTools MCP / 当前标签页模型
- `browse` 保留为 QA / headless 测试层
- `opencli Browser Bridge` 重新定位成“兼容层 / 低层原语层”，不要继续和通用控制层抢主入口
- X / 小红书 / 微信 / BOSS 这些业务 skill 后续都改成调用统一浏览器原语，而不是各自养一套浏览器启动逻辑

这不是最终方案，只是基于现状的最小冲突方向。
