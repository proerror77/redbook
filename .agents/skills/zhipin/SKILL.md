---
name: zhipin
description: 使用 Codex Chrome Extension 连接普通已登录 Chrome 慢速监督进行 BOSS 直聘 live apply；tools/auto-zhipin 负责筛选、账本、计数和诊断，Computer Use/CDP/Playwright 只作为 fallback 或显式诊断。
---

# /zhipin

这个 Skill 是 BOSS 工作流的入口说明。当前 live apply 主链是 Codex Chrome Extension 连接用户普通已登录 Chrome profile 后慢速监督操作真实 BOSS 页面。`tools/auto-zhipin` 继续负责筛选、账本、计数、doctor 和非 live gate；Computer Use、current-tab/CDP、Playwright / Browser Trace 只作为 fallback 或显式诊断入口，不作为默认真实投递路径。

OpenCLI/OpenSeal 不再作为 BOSS 默认路径。2026-05-05 复查 OpenCLI `1.7.12` 后确认没有 BOSS 相关修复证据：`boss chat-list` 已不兼容，`boss chatlist` 报 BOSS cookie 过期，`boss search` 仍有 browser/network error。除非用户明确要求修 OpenCLI adapter，否则 BOSS 相关操作直接从现有网页/CDP 路径处理。

## Browser Mode

- Mode: `interactive-browser`
- Standard: [docs/standards/browser-modes.md](/Users/proerror/Documents/redbook/docs/standards/browser-modes.md)
- Position: BOSS is an explicit exception: newly launched CDP/automation profiles are high-risk for live apply. Prefer Codex Chrome Extension attached to the user's normal visible Chrome profile for real applications.

当前主入口：
- 真实投递：Codex Chrome Extension + 普通已登录 Chrome 慢速监督
- 扫描/抽职位/本地候选：`npm run chrome:collect`
- 单条非 live 预检：`npm run boss:apply -- --url <job-url> --dry-run true`
- 消息监看：`npm run chrome:monitor`
- 报告：`npm run report`

Computer Use、`boss:apply-current`、CDP、Playwright、Browser Trace 只在 Codex Chrome Extension 不可用、用户接受 fallback，或用户明确接受风险时用于诊断 / dry-run；不要用新开的 `--remote-debugging-port` Chrome 做 BOSS live apply。`boss:apply-opencli` / OpenCLI / OpenSeal 只保留为版本和 doctor 诊断参考，不用于 BOSS chat、search 或 apply 主流程。

## 先決條件

1. 用户先在普通 Chrome 里确认 BOSS 已登录；如果出现登录、验证码、安全、异常、403，停止。
2. `tools/auto-zhipin/config.local.json` 配好 filters / apply / chat。
3. 已安裝 dependency：`cd tools/auto-zhipin && npm install`。
4. 页面出现登录失效、滑块、`访问受限 / 异常访问行为` 时停止自动化，人工恢复后先用可见页面确认，不要新开 CDP Chrome 恢复 live apply。

## 快速命令

> 以下皆以你目前 repo root 為前提。若你改動 root，請自行替換路徑。

### 1) 掃描（只讀 + 打標）

```bash
cd /Users/proerror/Documents/redbook/tools/auto-zhipin
npm run chrome:collect -- --limit 30
```

參數補充：`--url <search-url>`、`--include`, `--exclude`, `--require-location`。

### 2) 對單條職位投遞

```bash
npm run boss:apply -- --url <job-url> --dry-run true
npm run boss:apply -- --url <job-url> --dry-run false
```

默认是 dry-run。真实投递必须显式 `--dry-run false` 或配置 `apply.dryRun=false`。

### 3) 一次把草稿/動作送出（站內）

```bash
npm run chrome:monitor -- --once
```

### 5) 查看結果

```bash
npm run report
npm run funnel-report
```

## /zhipin 建議流程（你現在的版本）

1. 用户在普通 Chrome 确认 BOSS 已登录且页面正常。
2. 用 Codex Chrome Extension 慢速查看 Chat、排除已拒绝和重复投递；如果 extension 控制面不可用，再请用户确认是否退到 Computer Use。
3. 用 Codex Chrome Extension 在现有页面/推荐流中筛选岗位，脚本只做账本和本地 gate。
4. 每次真实点击 `立即沟通` 后，必须看见成功状态或聊天状态，再写入/核对 ledger。
5. 每个小批次后检查 `npm run report`；出现登录、验证、异常、403、自动跳回时立即停。

## 注意事項

- 不再把 `--dry-run false` / CDP live click 作为默认投递方式；除非用户明确要求并接受 CDP 风险。
- 已有 `siteHealth` 熱點時，會先觸發限制保護，避免直接重試。
- `/zhipin` 只做「流程入口」，底層邏輯仍沿用你既有 `tools/auto-zhipin` 相關腳本。
