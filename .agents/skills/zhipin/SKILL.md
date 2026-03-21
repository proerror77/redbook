---
name: zhipin
description: 使用 Chrome 當前分頁 (CDP) 進行 BOSS 直聘掃描、過濾、投遞與後續動作執行。替代 Playwright 全程新建瀏覽器的版本。
---

# /zhipin

這個 Skill 專門把你目前已登入的 Chrome 當前分頁作為控制端，直接驅動已打開的 zhipin 頁面。

對應你現在的「最新版方式」：
- 掃描/抽職位：`chrome_collect_queue.js`
- 對單條職位做實際投遞：`redbook-opencli.js boss apply`
- 站內回覆與自動動作：`reply_worker.js --backend pinchtab`

> 不再要求你每次都啟新 Playwright 瀏覽器。

## 先決條件

1. Chrome 已手動登入 zhipin 且頁面可正常訪問。
2. `tools/auto-zhipin/config.local.json` 配好 filters / apply / chat。
3. 已安裝 dependency：`cd tools/auto-zhipin && npm install`。
4. 如要用 `pinchtab` 後端執行回覆/動作，先啟動：

```bash
cd /Users/proerror/Documents/redbook/tools/auto-zhipin
npx --yes pinchtab
```

### 0) 新版 MCP 直連（推薦，Chrome 146+）

如果你是 Chrome 146（或更高）且已開啟 `chrome://inspect/#remote-debugging` 的自動連接，建議直接掛載 MCP，讓 Claude 直接操控「你正在登入的 Chrome」：

```bash
claude mcp add chrome-devtools -- npx chrome-devtools-mcp@latest --autoConnect
```

重啟 Session 後，Claude 即可直接在 MCP 連線下操作你目前的瀏覽器上下文（cookie、權限、會話都保留）。

這條路徑的價值是：
- 不需要再開新瀏覽器（非 headless）。
- 不需要你額外重複登入。
- 比較接近「真實你」的行為環境。

你在本地確認 MCP 正常後，可把 `/zhipin` 流程中的操作改為：
- 優先用 MCP 開啟對應的 `zhipin` 頁簽/聊天頁。
- 再用 `/zhipin` 命令觸發你既有的本地腳本（`chrome_collect_queue`）做採集，投遞則走 `redbook-opencli.js boss apply`。

## 快速命令

> 以下皆以你目前 repo root 為前提。若你改動 root，請自行替換路徑。

### 1) 掃描（只讀 + 打標）

```bash
node /Users/proerror/Documents/redbook/tools/auto-zhipin/scripts/chrome_collect_queue.js \
  --limit 30
```

參數補充：`--url <search-url>`、`--include`, `--exclude`, `--require-location`。

### 2) 對單條職位投遞

```bash
node /Users/proerror/Documents/redbook/tools/opencli/bin/redbook-opencli.js boss apply \
  --url <job-url>
```

可選：`--greeting "..."` 自訂開場訊息。

### 3) 一次把草稿/動作送出（站內）

```bash
node /Users/proerror/Documents/redbook/tools/auto-zhipin/scripts/reply_worker.js --run-actions --backend pinchtab
```

如果你要直接發送所有待回覆草稿：

```bash
node /Users/proerror/Documents/redbook/tools/auto-zhipin/scripts/reply_worker.js --send-all --backend pinchtab
```

### 4) 監聽新消息（原生模式）

目前仍建議 `monitor_messages` 保持 Playwright 後端進行輪詢抓消息（更穩定）：

```bash
node /Users/proerror/Documents/redbook/tools/auto-zhipin/scripts/monitor_messages.js --once --run-actions
```

### 5) 查看結果

```bash
node /Users/proerror/Documents/redbook/tools/auto-zhipin/scripts/report.js
node /Users/proerror/Documents/redbook/tools/auto-zhipin/scripts/funnel_report.js
```

如果 MCP 已就緒，也可以在 MCP 對話中先把頁面導向你要操作的 Zhipin 分頁（聊天頁或搜尋頁），再執行以下命令即可。

## /zhipin 建議流程（你現在的版本）

1. `chrome_collect_queue`（先把本頁職位跑過濾）
2. 人工確認 matched 明確後
3. `redbook-opencli.js boss apply --url <job-url>`（開啟投遞）
4. `reply_worker --run-actions --backend pinchtab`（可選）
5. 檢查 `report`

## 注意事項

- 先用 `dryRun` 驗證後再關閉：`config.local.json -> apply.dryRun = false`。
- 已有 `siteHealth` 熱點時，會先觸發限制保護，避免直接重試。
- `/zhipin` 只做「流程入口」，底層邏輯仍沿用你既有 `tools/auto-zhipin` 相關腳本。
