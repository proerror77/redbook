---
name: zhipin
description: 使用 tools/auto-zhipin 的 Playwright profile 主链进行 BOSS 直聘扫描、过滤、投递预检与后续动作执行；current-tab/CDP 只作为显式 fallback。
---

# /zhipin

这个 Skill 是 BOSS 工作流的入口说明。当前主链是 `tools/auto-zhipin` 的 Playwright CLI + 持久化 profile；current-tab/CDP 和 OpenCLI 只作为低层 fallback 或诊断入口。

## Browser Mode

- Mode: `interactive-browser`
- Standard: [docs/standards/browser-modes.md](/Users/proerror/Documents/redbook/docs/standards/browser-modes.md)
- Position: BOSS is an explicit exception to the repo's general "avoid Playwright" preference because recent validation found Playwright profile more stable than current-tab/CDP for this site.

当前主入口：
- 登录/profile 准备：`npm run boss:login`
- 扫描/抽职位：`npm run chrome:collect`
- 单条投递预检/投递：`npm run boss:apply -- --url <job-url> --dry-run true|false`
- 消息监看：`npm run chrome:monitor`
- 报告：`npm run report`

`boss:apply-current`、`boss:apply-opencli`、PinchTab 相关路径只在 Playwright profile 主链失效或需要低层诊断时使用。

## 先決條件

1. 先用 `npm run boss:login` 把登录态写入 `tools/auto-zhipin/.auth/profile`。
2. `tools/auto-zhipin/config.local.json` 配好 filters / apply / chat。
3. 已安裝 dependency：`cd tools/auto-zhipin && npm install`。
4. 页面出现登录失效、滑块、`访问受限 / 异常访问行为` 时停止自动化，人工恢复后先跑只读探测。

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

1. `npm run boss:login`
2. `npm run chrome:collect`
3. 人工确认 matched 明确后，先 `npm run boss:apply -- --url <job-url> --dry-run true`
4. 确认无误后，才 `npm run boss:apply -- --url <job-url> --dry-run false`
5. 检查 `npm run report`

## 注意事項

- 先用 `dryRun` 验证后再关闭：`config.local.json -> apply.dryRun = false` 或单次传 `--dry-run false`。
- 已有 `siteHealth` 熱點時，會先觸發限制保護，避免直接重試。
- `/zhipin` 只做「流程入口」，底層邏輯仍沿用你既有 `tools/auto-zhipin` 相關腳本。
