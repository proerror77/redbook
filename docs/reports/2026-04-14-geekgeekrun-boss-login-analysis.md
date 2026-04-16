# geekgeekrun 参考分析：BOSS 登录与浏览器承载

日期：2026-04-14

参考仓库：

- `https://github.com/geekgeekrun/geekgeekrun`

## 结论先说

是的，**从首页/登录页开始** 比直接跳消息页更像正确方向。

而且从 `geekgeekrun` 的实现看，它并不是把“登录”和“业务自动化”混在同一条链路里，而是明确拆成了：

1. **登录助手链路**
2. **登录后业务链路**

这和我们现在的问题正好对应：

- 你现在直接打 `chat` 入口，未登录时会跳页
- `geekgeekrun` 不是这么干的

## 他们具体怎么做

### 1. 登录助手从 `/web/user/` 开始，不是从 `chat` 开始

在下面这个文件里：

- `packages/launch-bosszhipin-login-page-with-preload-extension/index.mjs`

它启动浏览器后，明确走的是：

- `https://www.zhipin.com/web/user/`

而不是直接进聊天页。

这和我们刚才的实验一致：

- `chat` 入口会在 `chat` 和 `/web/user/` 之间来回跳
- 首页/登录页入口相对更稳定

### 2. 登录和业务自动化是分开的

在这些文件里能看出来：

- `packages/ui/src/main/flow/LAUNCH_BOSS_ZHIPIN_LOGIN_PAGE_WITH_PRELOAD_EXTENSION.ts`
- `packages/ui/src/main/window/cookieAssistantWindow.ts`
- `packages/launch-bosszhipin-login-page-with-preload-extension/index.mjs`

它的模式不是：

- “业务自动化顺便把登录也做了”

而是：

- 单独起一个登录助手窗口
- 让用户完成登录
- 捕获 cookies
- 保存 `boss-cookies.json`
- 后续业务流再使用这些持久化登录信息

这点非常关键。

### 3. 他们还有一个很窄的 Puppeteer 反检测 preload patch

NPM 包：

- `@geekgeekrun/puppeteer-extra-plugin-laodeng`

我直接解包看了它的源码，结论是：

- 它不是完整反检测系统
- 它只是一个 **`evaluateOnNewDocument` 级别的 preload patch**
- 主要做 3 件事：
  1. 劫持 `Function.prototype.toString`
  2. 让被包裹函数继续看起来像 `[native code]`
  3. 包装 `console.log/debug/info/warn/error/dir/table`，避免把原始对象直接暴露给 DevTools/CDP

也就是说，它解决的是：

- 一小部分 “控制台 / 函数字符串化 / DevTools 展开对象” 检测面

它 **不** 解决：

- 登录流程设计
- cookie/session 持久化
- 页面跳转策略
- current-tab 选择
- 网络层 / 浏览器指纹 /更大范围的自动化痕迹

所以这个包的价值不是“拿来就能解决我们现在的问题”。

它真正有价值的地方是：

- 如果后续我们继续走 raw CDP 路线，可以把其中的 preload 思路改写成 `Page.addScriptToEvaluateOnNewDocument`
- 但它只能作为一个小 patch，不是主方案

## 对我们当前方案的启发

### 关键启发 1

**不要让 `chat` 页面承担登录升级态。**

如果登录态失效：

- 不要继续在 `chat` 页上兜圈子
- 不要把“登录恢复”混在 `boss:apply-current` 这种业务动作里

而应该：

- 明确切到登录助手流
- 登录助手只负责拿回可用 session

### 关键启发 2

**登录助手应是单独的、有头的、一次性的。**

这也符合你刚才给的约束：

- 平时默认无头
- 只有登录没办法的时候，才给你一个有头窗口去登录

所以更好的方式不是：

- 整个主链一直有头

而是：

- 业务链默认无头
- 登录失效时，单独起一个 login helper
- 用户登录成功后，关掉 helper
- 业务链继续无头

### 关键启发 3

**登录成功的判据应基于网络事件 / cookies，不是肉眼看页面。**

`geekgeekrun` 在登录助手里会等这些响应：

- `https://www.zhipin.com/wapi/zppassport/qrcode/loginConfirm`
- `https://www.zhipin.com/wapi/zppassport/qrcode/dispatcher`
- `https://www.zhipin.com/wapi/zppassport/login/phoneV2`

登录完成后：

- 它再跳到主页
- 然后保存 cookies

这比“看页面好像登进去了”稳得多。

## 我认为对 redbook 最好的吸收方式

不是照抄整个 Electron + Puppeteer + extension 架构。

那个 repo 的整体方案更像：

- 一个完整桌面 App
- 自己内嵌浏览器
- 自己做登录助手、cookie 助手、主业务 UI

redbook 不需要整套照搬。

我们真正该吸收的是 **流程拆法**：

### 目标流程

#### A. 默认业务链

- headless
- 非 Playwright 优先
- 不负责登录

#### B. 登录助手链

- 只在登录失效时触发
- 单独有头
- 从 `/web/user/` 或首页开始，不从 `chat` 开始
- 监听登录相关网络事件
- 成功后持久化 cookies / localStorage
- 关闭窗口

#### C. 登录后业务链恢复

- 回到 headless
- 使用刚保存的 session
- 从首页或职位页开始，不直接从最敏感入口开始

## 对当前 redbook 的直接建议

### 建议 1

先不要继续试：

- `boss-probe.mjs --url chat`

去解决登录。

应该新增：

- `boss-login-helper.mjs`

它只做：

1. 新开一个临时页签或临时 profile
2. 打开 `https://www.zhipin.com/web/user/`
3. 让用户登录
4. 监听登录成功网络事件
5. 保存 session
6. 关闭 helper

### 建议 2

`boss-probe.mjs` 后续默认入口应改成：

- 首页/登录页

而不是：

- `chat`

### 建议 3

在没有证明 raw CDP 能稳定处理登录升级态前：

- 不要继续动 `boss:apply-current` 主链

## 为什么这条比我们现在更好

因为它把 3 个概念拆开了：

1. 登录恢复
2. session 持久化
3. 业务动作

而我们现在的问题，本质上就是把这三件事混在了一起。

## 我的建议结论

基于 `geekgeekrun`，我认为 redbook 当前最应该做的不是“继续调 chat 跳页”。

而是：

1. **新增一个最小 BOSS 登录助手原型**
2. **从 `/web/user/` 开始**
3. **以网络事件/cookie 为登录成功判据**
4. **登录完成后回到 headless 主链**

如果你同意，下一步我就不碰生产主链，先只做这个：

- `tools/browser-core/interactive/boss-login-helper.mjs`

只验证“登录恢复链”本身，不做投递。

## 本轮 redbook 原型验证结论

这个 helper 已经做出来了，而且我刚做了两条 5 秒 smoke：

- `node tools/browser-core/interactive/boss-login-helper.mjs --url https://www.zhipin.com/ --timeout-seconds 5`
- `node tools/browser-core/interactive/boss-login-helper.mjs --url https://www.zhipin.com/web/user/ --timeout-seconds 5`

结果：

- 首页入口：稳定停留在 `https://www.zhipin.com/shanghai/?seoRefer=index`
- `/web/user/` 入口：稳定停留在登录页
- 两条路径在 5 秒观测窗口内都没有像 `chat` 入口那样发生明显跳页振荡

这进一步说明：

- 登录恢复链应该独立出来
- 入口应该优先首页或 `/web/user/`
- 不应该从 `chat` 入口直接开始

## 新的硬约束

用户后续补充了更强的一手证据：

- `OpenCLI / BB-browser` 这类外部 CDP 附加浏览器方案，亲测搞不定 Boss
- Boss 会利用 Console hook 时间差和 `Function.prototype.toString()` 特征检测浏览器被远程接管
- 一旦检测到，就会强制回退或关闭页面

因此，本分析的建议需要再收紧一层：

- `登录恢复链` 不能默认建立在“外部 CDP 远程附加真实 Chrome”之上
- 如果继续做 Boss，优先方向应该转向：
  - 浏览器进程内执行
  - 扩展 / preload / Electron 内嵌浏览器
  - 或半自动化的人机协同流程

而不是继续赌 remote CDP 路线

而 `laodeng` 这个包：

- 可以作为后续 raw CDP 预加载补丁的参考
- 但不应该取代上面这条“先拆登录恢复链”的主路线
