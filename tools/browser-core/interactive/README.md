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

当前结论：

- 原型已在当前真实 Chrome 的小红书页签上通过 smoke
- 这证明 `interactive-browser` 最小核心可以先走原生 CDP，不必默认依赖 Playwright
- 但它还没有替换任何现有业务脚本

约束：

- 在 BOSS / XHS / X 的真实业务页上完成对应 smoke 之前，不要直接替换生产主链
- 当前原型优先用于验证和过渡，不承诺兼容所有旧脚本接口
