# interactive-browser 原型验证

日期：2026-04-13

目标：验证 redbook 后续 `interactive-browser` 是否可以先走“真实 Chrome + 原生 CDP”，而不是默认依赖 Playwright。

## 做了什么

新增原型：

- [tools/browser-core/interactive/chrome-cdp.mjs](/Users/proerror/Documents/redbook/tools/browser-core/interactive/chrome-cdp.mjs)
- [tools/browser-core/interactive/smoke.mjs](/Users/proerror/Documents/redbook/tools/browser-core/interactive/smoke.mjs)
- [tools/browser-core/interactive/README.md](/Users/proerror/Documents/redbook/tools/browser-core/interactive/README.md)

能力范围只覆盖：

- 连接 Chrome `http://127.0.0.1:9222`
- 枚举 page targets
- 连接 target 的 websocket
- 执行只读 `Runtime.evaluate`
- 抽取：
  - `title`
  - `url`
  - `hasFocus`
  - `visibilityState`
  - `readyState`
  - `bodyPreview`
- 按 URL / title 关键词选最优页签

## 烟测命令

```bash
node tools/browser-core/interactive/smoke.mjs --url-keyword creator.xiaohongshu.com
node tools/browser-core/interactive/smoke.mjs --title-keyword 小红书
```

## 结果

两条命令都成功：

- 能枚举当前真实 Chrome 的多个小红书页签
- 能正确识别当前聚焦页：
  - `https://creator.xiaohongshu.com/publish/publish?source=&published=true&from=tab_switch`
- 能读到页面状态：
  - `hasFocus: true`
  - `visibilityState: "visible"`
  - `readyState: "complete"`
- 能提取正文预览文本，说明 `Runtime.evaluate` 路径可用

## 结论

这个原型已经证明一件事：

- `interactive-browser` 的最小共享核心，可以先走 **原生 Chrome CDP**
- 不需要默认依赖 Playwright 才能完成“连接真实 Chrome、选中业务页、执行只读 probe”

## 为什么这还不等于“立刻切换主链”

因为这轮成功的只是：

- 真实 Chrome 连接
- 页签选择
- 只读 probe

还没有完成：

- BOSS 页真实 probe
- X 页真实 probe
- 文件上传
- 鼠标点击
- 输入
- 业务动作级成功验证

补充：

- 现有 `boss:apply-current -- --probe true` 仍然依赖旧链路去找“当前活跃 BOSS 页”，在当前会话里没有稳定拿到目标页
- 因此它还不能作为“切换是否成立”的证据来源
- 我也尝试过一版很窄的替换：只把 `boss:apply-current -- --probe true` 的连接层切到 raw CDP
- 但这条替换没有拿到足够稳定的验证证据，因此已经回滚，不保留在生产脚本中

## 新增验证：BOSS 域 read-only probe

我新增了一个不改生产脚本的独立原型命令：

```bash
node tools/browser-core/interactive/boss-probe.mjs
```

它会：

1. 通过 Chrome debug endpoint 新建一个临时页签
2. 导航到 `https://www.zhipin.com/web/geek/chat?ka=header-message`
3. 用原生 CDP `Runtime.evaluate` 做只读 probe
4. 输出页面状态后关闭临时页签

本轮结果：

- 导航成功
- `pageTitle: "BOSS直聘"`
- `readyState: "complete"`
- `loginExpired: true`
- `securityCheck: false`
- 用户后续观察到：如果把这个未登录页签继续留在真实 Chrome 里，页面会在首页/前页之间来回跳转
- 连续 10 秒采样也确认了同一 target 会在以下状态间振荡：
  - `https://www.zhipin.com/web/geek/chat?ka=header-message`
  - `https://www.zhipin.com/web/user/`
  - 短暂空 URL

这说明：

- 原型已经能在第二个真实业务域（BOSS）完成只读 probe
- 但当前 BOSS 会话本身是“登录已失效”状态
- 且登录升级态本身也不稳定
- 所以它还不能进一步证明 dry-run apply parity

## 新增验证：首页入口 vs 聊天入口

我又做了一个对比实验：

```bash
node tools/browser-core/interactive/boss-probe.mjs --url https://www.zhipin.com/
node tools/browser-core/interactive/boss-probe.mjs --url https://www.zhipin.com/web/geek/chat?ka=header-message
```

并对两条路径做了短时间连续观察。

结果：

- 首页入口会进入 `https://www.zhipin.com/shanghai/?seoRefer=index`
- 在采样窗口里它比聊天页更稳定
- 聊天入口则会在 `chat` 与 `/web/user/` 之间来回跳

这说明：

- 直接从消息页开始，确实更容易触发不稳定状态
- 如果后续还要继续验证登录升级态，应该优先从首页入口开始，而不是直接跳消息页

所以按当前规则：

- **原型成功**
- **但还不足以直接替换生产主链**

## 下一步建议

1. 先从首页入口而不是聊天入口继续验证 BOSS 登录升级态
2. 再在已登录的活跃 BOSS 页上重跑同一个 `boss-probe` 原型
3. 再补 BOSS `dry-run` apply parity
4. 再拿它去跑 XHS 的点击/输入最小动作
5. 只有都过了，才考虑替换 `opencli_apply_current_tab.js` 这类现有脚本的连接层
