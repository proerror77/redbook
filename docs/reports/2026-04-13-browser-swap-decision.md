# 浏览器链路切换决策

日期：2026-04-13

## 决策

当前 **不切换** 现有生产浏览器链路。

对 Boss 再补一条更强结论：

- **停止继续尝试基于外部 CDP 附加的 Boss 浏览器自动化主链。**

## 为什么现在不切

这不是因为方向错了，而是因为验证门槛还没过。

目前已经证明：

- 非 Playwright、headless-first 的 `interactive-browser` 原型是可行的
- 它能在真实 Chrome + CDP 下完成只读 probe
- 小红书页签选择与只读抽取已通过 smoke

但尚未证明：

- 它能稳定覆盖 BOSS 生产链路的行为契约
- 它能在真实 BOSS 活跃页上持续稳定选中目标页
- 它能复现现有链路里的 verify-page / wait-resume / apply result contract
- 对 Boss 来说，外部 CDP 附加浏览器本身就会触发站点级反自动化检测

按当前规则：**成功了再换，不成功就别换**。

所以结论只能是：**先保留现有生产链路，不做替换。**

并且对 Boss 额外补一条更强结论：

- **不要再把 OpenCLI / BB-browser / 外部 CDP 附加浏览器 作为 Boss 主链候选。**

## 已有成功证据

### 1. headless-first / avoid-Playwright 规则已写入标准

- [docs/standards/browser-modes.md](/Users/proerror/Documents/redbook/docs/standards/browser-modes.md)

### 2. 非 Playwright `interactive-browser` 原型已建立

- [tools/browser-core/interactive/chrome-cdp.mjs](/Users/proerror/Documents/redbook/tools/browser-core/interactive/chrome-cdp.mjs)
- [tools/browser-core/interactive/smoke.mjs](/Users/proerror/Documents/redbook/tools/browser-core/interactive/smoke.mjs)
- [docs/reports/2026-04-13-interactive-browser-prototype.md](/Users/proerror/Documents/redbook/docs/reports/2026-04-13-interactive-browser-prototype.md)

### 3. 原型对小红书 read-only probe 成功

最新 smoke 结果表明：

- `--title-keyword 小红书` 能稳定选中小红书页
- 目标页返回：
  - `url`
  - `title`
  - `readyState`
  - `visibilityState`
  - `bodyPreview`

### 3.5 原型对 BOSS 域 read-only probe 成功

新增原型命令：

- `node tools/browser-core/interactive/boss-probe.mjs`

本轮结果：

- 成功在独立临时页签中导航到 `https://www.zhipin.com/web/geek/chat?ka=header-message`
- 成功读取：
  - `pageTitle: "BOSS直聘"`
  - `readyState: "complete"`
  - `loginExpired: true`
  - `securityCheck: false`

这说明：

- 非 Playwright 原型已经可以覆盖第二个真实业务域的 read-only probe
- 但当前 BOSS 登录态失效，因此这条证据还不足以支持链路替换
- 同时，新鲜对比还表明：
  - raw CDP 能看到并进入 BOSS 登录页
  - 现有 `boss:apply-current -- --probe true` 通过 Playwright `connectOverCDP` 看到的页签集合却不包含这张 BOSS 页
  - 所以当前真正缺的不是“继续替换连接层”，而是先在 raw CDP 这条可见会话里完成有效 BOSS 登录并复验

### 3.6 用户观察到未登录时出现跳页循环

新增用户证据：

- 当 raw CDP 留下的 BOSS 登录页保持打开时，页面会在“首页/前页”之间来回跳转
- 用户因此主动关闭了该页签，避免继续被打断

这条证据的重要性在于：

- 说明当前原型不仅没有完成“登录成功”，而且连“登录升级态”本身都不稳定
- 这与外部讨论里提到的 Boss 对自动化/DevTools/CDP 的对抗行为一致
- 因此当前不能把“先人工登录再继续验证”当作稳定前置条件

本轮 fresh verification 进一步把这件事量化了：

- 对同一个 BOSS target id 连续采样 10 秒
- 观测到该 target 在以下状态间来回切换：
  - `https://www.zhipin.com/web/geek/chat?ka=header-message`
  - `https://www.zhipin.com/web/user/`
  - 短暂空 URL

这说明：

- 当前不是“偶尔跳一次”
- 而是目标页本身在自动化上下文下发生状态振荡
- 在这种状态下，登录升级态不具备作为生产链切换前置条件的稳定性

### 3.7 首页入口明显比聊天入口稳定

新增对比验证：

- `node tools/browser-core/interactive/boss-probe.mjs --url https://www.zhipin.com/`
- `node tools/browser-core/interactive/boss-probe.mjs --url https://www.zhipin.com/web/geek/chat?ka=header-message`
- 原型对两条路径分别做了 8 秒观察

结果：

- 首页入口会落在 `https://www.zhipin.com/shanghai/?seoRefer=index`
- 在采样窗口里只有一次有效页面状态，随后变成 `about:blank`
- 聊天入口则在 `chat` 与 `/web/user/` 登录页之间反复来回跳

这说明：

- 直接跳 `chat` 入口确实更容易触发不稳定状态
- 如果后续还要继续验证登录升级态，应该优先从首页入口开始，而不是直接进消息页

### 3.8 用户实测确认：外部 CDP 附加本身会触发 Boss 检测

新增用户证据：

- Boss 会检测 Console 函数被 hook 后的时间差
- Boss 会检测 `Function.prototype.toString()` 等函数特征
- 一旦有外部 CDP 会话附加到浏览器，Console 会被接管，相关调用会产生可被检测的微小时延
- 页面会因此被强制回退或关闭

这条证据的含义不是“某个实现细节还不稳”，而是：

- `connectOverCDP`
- `chrome-devtools-mcp`
- `OpenCLI / Browser Bridge`

这一整类“外部远程附加浏览器”的路线，对 Boss 都应视为高风险主链候选。

### 3.9 `/web/user/` 登录 helper 也未能建立稳定登录恢复链

我后续又尝试了一个更保守的 `boss-login-helper`：

- 不走 `chat`
- 直接从 `/web/user/` 开始
- 只做登录恢复，不碰投递

结果仍然没有建立起可用登录恢复链。

这意味着：

- 问题已经不只是“入口选错了”
- 而是 **Boss 对外部附加控制的整条路线本身不适合作为主链**

因此当前决策进一步收紧为：

- 不只是“不切换现有主链”
- 而是 **不再继续把 Boss 的远程附加浏览器自动化当作主路线推进**

### 4. 现有 BOSS 生产链路有实测保障

本轮 fresh verification：

- `node --test tools/auto-zhipin/tests/opencli_job_browser.test.js` → `7/7 pass`
- `node --test tools/auto-zhipin/tests/opencli_chat_browser.test.js` → `15/15 pass`

说明当前生产链路不是“看起来能用”，而是有稳定行为契约的。

### 5. 架构复核 verdict

架构复核结论：

- 当前“不要切主链”是正确决策
- 关键缺口包括：
  - BOSS `dry-run` apply parity
  - verify-page handling parity
  - headless-first session model proof
  - multi-tab target selection stability proof
  - 登录升级态本身不能出现跳页循环，否则即使 read-only probe 成功，也仍不具备替换资格
  - BOSS 登录升级态下一轮应从首页入口开始验证，而不是直接从聊天页开始
  - 对 Boss，后续方案不应再默认依赖外部 CDP 附加浏览器

## 已尝试但未保留的动作

- 我尝试过一版极窄替换：只把 `boss:apply-current -- --probe true` 的连接层切到 raw CDP
- 因为没有拿到足够稳定的验证证据，这个替换已经回滚
- 当前生产脚本未被替换

另外：

- 结合最新用户实测，`OpenCLI / BB-browser` 也不再保留为 Boss 主链候选

## 当前正确状态

1. 标准已经统一
2. 原型已经建立
3. 验证已经推进
4. 生产链路尚未切换

这正是当前最安全、也最符合用户要求的状态。

## 下一步

如果要继续推进，正确顺序是：

1. 将目标从“驱动 Boss 网页”切换为“辅助投递与管理投递”
2. 保留人工完成 Boss 内的关键动作
3. 自动化围绕：
   - 职位收集与筛选
   - 草稿回复与跟进提醒
   - 投递台账
   - 结果追踪
4. 不再继续推进外部 CDP 附加式的 Boss 主链替换
