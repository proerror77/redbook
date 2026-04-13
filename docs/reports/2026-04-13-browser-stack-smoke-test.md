# 浏览器方案烟测报告

日期：2026-04-13

相关文档：

- [浏览器方案盘点](/Users/proerror/Documents/redbook/docs/reports/2026-04-13-browser-stack-inventory.md)
- [浏览器统一方案草案](/Users/proerror/Documents/redbook/docs/plans/2026-04-13-browser-unification-proposal.md)

## 结论摘要

这轮不是“所有浏览器方案都坏了”，而是分成了 4 类状态：

1. **可用且建议保留**：Chrome DevTools MCP、gstack browse、opencli bridge、XHS current-tab CDP
2. **可用但只做了命令面烟测**：Playwright MCP 标准模式、X 发布脚本、微信 browser 脚本、URL to Markdown
3. **有明显文档/实现漂移**：connect-chrome
4. **当前不稳定或缺依赖**：agent-browser-session、旧 agent-browser 渲染链、部分 Python render 脚本

补充偏好约束：

- 尽量不要使用 Playwright
- 因此即使某些 Playwright-backed 路径这轮 smoke 通过，它们也不再是后续统一方案里的默认主入口

## 状态表

| 方案 | 状态 | 证据 | 备注 |
|---|---|---|---|
| Chrome DevTools MCP | PASS | `list_pages` 返回当前真实 Chrome 标签页；`take_snapshot` 成功读取小红书创作后台 | 真实 Chrome 连接可用 |
| Playwright MCP 标准模式 | PASS | `npx -y @playwright/mcp@latest --headless --port 39991` 成功监听；输出 `/mcp` URL | 标准模式可用，但仅作为 fallback |
| Playwright MCP 扩展模式 | BLOCKED | 之前会生成 `chrome-extension://.../connect.html` 拦截页；根因已定位为扩展未安装 | 已从仓库/用户配置中去掉默认 `--extension` |
| gstack browse | PASS | `~/.codex/skills/gstack/browse/dist/browse --help` 正常；`goto https://example.com` + `text` 成功 | Playwright-backed，可用但不宜做默认主链 |
| connect-chrome | FAIL | skill 文档要求 `$B connect` / `$B disconnect`，但真实 `browse` binary 无这两个命令 | 文档与实现已漂移 |
| setup-browser-cookies | UNTESTED | 未做完整交互测试 | 依赖人工在浏览器里选 cookie 域 |
| opencli Browser Bridge | PASS | `node tools/opencli/bin/redbook-opencli.js doctor` 返回 Daemon/Extension/Connectivity 全 OK；`node tools/opencli/scripts/verify.js` 全量 smoke 通过 | 第一轮瞬时失败，第二轮稳定通过 |
| agent-browser-session / actionbook | FAIL | `tools/auto-x/scripts/x_utils.ensure_browser()` 自动恢复失败，`page.goto https://x.com/home` 超时 | 当前旧研究链路不稳定 |
| XHS current-tab CDP | PASS | `cdp_publish.py --reuse-existing-tab check-login` 成功连接 `127.0.0.1:9222` 并确认登录 | 当前主 Chrome 的 XHS 会话可复用 |
| BOSS current-tab probe | PARTIAL | `boss:apply-current -- --probe true` 能枚举当前 Chrome 标签，但因没有激活的 BOSS 页而退出 | 基础机制可用，缺少测试场景 |
| X 发布脚本 | PARTIAL | `x-browser.ts --help` 正常输出 | 未做真实预览/发布烟测，避免副作用 |
| 微信 browser 发布脚本 | PARTIAL | `wechat-browser.ts --help` 正常输出 | 未做真实发布烟测，避免副作用 |
| URL to Markdown | PARTIAL | `main.ts --help` 正常输出 | 未做真实抓取烟测 |
| render_xhs_browser.sh | PARTIAL | `--help` 正常输出 | 依赖 `agent-browser`，未做实际渲染 |
| render_xhs.py | FAIL | 直接报缺依赖：`No module named 'markdown'` | 旧 Python render 栈未备齐 |

## 关键发现

### 1. `browse` 和 `connect-chrome` 不是同一成熟度

`browse` 实际 binary 是好的，但 `connect-chrome` skill 文档已经过时：

- 文档还指向 `~/.claude/skills/gstack/...`
- 文档要求执行 `connect` / `disconnect`
- 实际 binary 并没有这两个命令

这不是环境问题，而是 skill 文档和 runtime 能力已经分叉。

### 2. `opencli bridge` 当前是可用的

这是这轮一个比较重要的结论。

它不是理论上可用，而是：

- `doctor` 通过
- `verify.js` 通过
- `twitter/xiaohongshu/boss` 的只读 smoke 都通过

说明 `opencli Browser Bridge` 目前已经是仓库里最稳定的桥接层之一。

### 3. `agent-browser-session` 是当前最不稳定的一条旧链

`auto-x` 这一支的旧浏览器底座现在处于：

- daemon 存在
- headless Chrome 也在
- 但 session 恢复和导航不稳定

这比“命令不存在”更麻烦，因为它会给人一种“好像还能用”的错觉。

### 4. 业务层呈现两种成熟路线

#### 成熟路线

- XHS current-tab CDP
- opencli bridge + BOSS

共同点：

- 复用真实浏览器会话
- 不强依赖新扩展桥接
- 更接近统一方案里提的 `interactive-browser`

#### 半稳定路线

- X 自维护 CDP 脚本
- 微信 browser 脚本
- URL to Markdown

共同点：

- 命令面在
- 但这轮没做真实业务 smoke

## 我对现状的判断

如果只根据这轮烟测，不带主观偏好，当前更像这样：

### 应保留为主链候选

- Chrome DevTools MCP
- opencli Browser Bridge
- XHS current-tab CDP

### 应降级为兼容层

- gstack browse
- Playwright MCP 标准模式
- Playwright MCP `--extension`
- agent-browser / agent-browser-session / actionbook

### 应优先修文档或接口漂移

- connect-chrome

### 应补环境依赖或淘汰

- 旧 Python render 栈

## 下一步建议

1. **先修 `connect-chrome` 文档漂移**
   - 先确认真实可见浏览器入口到底是什么
   - 不要让文档继续指向不存在的 `connect/disconnect`

2. **给 `interactive-browser` 先做一个共享 core**
   - 优先服务 BOSS / XHS
   - 再慢慢接 X / 微信 browser 路线

3. **冻结 `agent-browser-session` 新增使用**
   - 现有脚本先不删
   - 但不再允许新功能继续依赖它

4. **把 render 栈从业务交互栈里分出去**
   - `render_xhs_browser.sh`
   - `render_xhs.py`
   - 这些单独归到 `render-browser`

## 本轮命令证据（摘要）

### Chrome DevTools MCP

- `list_pages`
- `take_snapshot`

### gstack browse

- `~/.codex/skills/gstack/browse/dist/browse --help`
- `goto https://example.com`
- `text`

### Playwright MCP 标准模式

- `npx -y @playwright/mcp@latest --headless --port 39991`

### opencli

- `node tools/opencli/bin/redbook-opencli.js doctor`
- `node tools/opencli/scripts/verify.js`

### agent-browser-session

- `python tools/auto-x/scripts/x_utils.py`（通过 `ensure_browser()`）

### XHS current-tab

- `python3 ~/.codex/skills/xiaohongshu-skills/scripts/cdp_publish.py --reuse-existing-tab check-login`

### BOSS current-tab

- `cd tools/auto-zhipin && npm run boss:apply-current -- --probe true`
