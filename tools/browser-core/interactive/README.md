# interactive-browser prototype

状态：prototype

目的：

- 验证在不依赖 Playwright 的前提下，是否能通过原生 Chrome CDP 连接真实 Chrome
- 提供最小共享能力：
  - 枚举页签
  - 读取页签元信息
  - 按 URL / title 规则选页签
  - 运行只读 `Runtime.evaluate`

当前文件：

- [chrome-cdp.mjs](/Users/proerror/Documents/redbook/tools/browser-core/interactive/chrome-cdp.mjs)
- [smoke.mjs](/Users/proerror/Documents/redbook/tools/browser-core/interactive/smoke.mjs)
- [session.mjs](/Users/proerror/Documents/redbook/tools/browser-core/interactive/session.mjs)

当前结论：

- 原型已在当前真实 Chrome 的小红书页签上通过 smoke
- 这证明 `interactive-browser` 最小核心可以先走原生 CDP，不必默认依赖 Playwright
- 但它还没有替换任何现有业务脚本

## 会话检查

先检查当前真实 Chrome / CDP 里有没有可复用登录态，再决定是否进入业务 workflow：

```bash
node tools/browser-core/interactive/session.mjs
node tools/browser-core/interactive/session.mjs --json
```

这个命令只读取现有 tab，不打开新页面。它会汇总 X、小红书、微信公众号、BOSS 的 tab 数量和登录态信号。

约束：

- 在 BOSS / XHS / X 的真实业务页上完成对应 smoke 之前，不要直接替换生产主链
- 当前原型优先用于验证和过渡，不承诺兼容所有旧脚本接口
