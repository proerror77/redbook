# auto-zhipin TODOS

## P2 — navigateCurrentTab() 頁面等待機制

**What:** 將 `navigateCurrentTab()` 的固定 sleep 改為輪詢 `document.readyState` + 目標元素出現。

**Why:** 固定 sleep（4500ms）在網絡慢時會導航失敗，在網絡快時浪費時間。

**How to apply:** 在 `lib/chrome_current.js` 的 `navigateCurrentTab()` 中，sleep 後加一個輪詢循環，檢查 `document.readyState === 'complete'` 且目標選擇器（由調用方傳入）已出現。

**Depends on:** 無

---

## P2 — 多平台求職支持（獵聘、拉勾）

**What:** 將 collect/apply 流程擴展到獵聘（liepin.com）和拉勾（lagou.com）。

**Why:** 單一平台覆蓋面有限，多平台可顯著增加曝光量。

**How to apply:** 抽象出 `PlatformAdapter` 接口，BOSS直聘為第一個實現。獵聘和拉勾各自實現 `extractJobsScript()` 和 `clickApplyScript()`，其餘流程（store、filters、greeting_gen）複用。

**Depends on:** 本次 PR 完成後（chrome_current.js 架構穩定）

---

## P2 — 面試準備材料自動生成

**What:** 收到面試邀請（`classifyReplyIntent` 返回 `interview`）後，自動生成公司研究摘要、常見面試問題、自我介紹要點，存入 `05-選題研究/面試準備-{公司}-{日期}.md`。

**Why:** 收到面試邀請到準備完成通常需要 1-2 小時，自動化可節省時間並提高準備質量。

**How to apply:** 在 `chrome_monitor_queue.js` 的 intent 處理中，當 intent === 'interview' 時，調用 Claude API 生成準備材料（複用 greeting_gen.js 的 API 調用模式）。

**Depends on:** chrome_monitor_queue.js 完成
