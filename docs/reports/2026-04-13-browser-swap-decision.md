# 浏览器链路切换决策

日期：2026-04-13

## 决策

当前 **不切换** 现有生产浏览器链路。

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

按当前规则：**成功了再换，不成功就别换**。

所以结论只能是：**先保留现有生产链路，不做替换。**

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

## 已尝试但未保留的动作

- 我尝试过一版极窄替换：只把 `boss:apply-current -- --probe true` 的连接层切到 raw CDP
- 因为没有拿到足够稳定的验证证据，这个替换已经回滚
- 当前生产脚本未被替换

## 当前正确状态

1. 标准已经统一
2. 原型已经建立
3. 验证已经推进
4. 生产链路尚未切换

这正是当前最安全、也最符合用户要求的状态。

## 下一步

如果要继续推进，正确顺序是：

1. 继续验证 `interactive-browser` 原型
2. 先补 BOSS 活跃页 read-only probe
3. 再补 BOSS `dry-run` apply parity
4. 只有都过了，才切对应窄链路
