---
name: zhipin
description: Use this skill for BOSS直聘 / zhipin.com job search, chat triage, dedupe, dry-run preflight, and carefully gated live applications in the Redbook workspace. Trigger whenever the user asks to apply on BOSS, continue BOSS applications, inspect BOSS chats/jobs, fix BOSS apply workflow, avoid duplicate applications, or reach a daily application target. This skill is mandatory for BOSS apply work because live clicks can create real recruiter conversations.
---

# Zhipin BOSS Apply Workflow

This skill runs the Redbook BOSS/Zhipin workflow safely. It is for the repo at:

```bash
/Users/proerror/Documents/redbook/tools/auto-zhipin
```

The workflow has real external side effects. Treat BOSS `立即沟通` / `投递简历` clicks as live applications. Never count a historical `继续沟通` state as a new success.

## Operating Rules

- Reuse the existing logged-in Chrome/CDP session when available.
- Existing-page-only rule: for BOSS work, operate only on BOSS pages that are already open in the current Chrome/CDP session. Do not create a new browser window, do not create a new tab, and do not use `/json/new` or `open-if-missing` recovery paths unless the user explicitly asks for a new page.
- If no existing BOSS page is available, stop and tell the user. Do not open one yourself.
- If an existing BOSS page shows login, QR login, phone verification, security verification, restricted access, abnormal access, `403`, `/web/user/`, or `/web/passport/zp/error`, stop immediately and tell the user. Do not navigate around it, do not retry, and do not continue applying.
- Do not steal focus. Pass `--focus false` and do not call `Page.bringToFront` unless the user explicitly asks for foreground control.
- Prefer the current normal browser/CDP route for this user's BOSS work. Use Computer Use only as a fallback for blocked visual/manual cases.
- Do not use OpenCLI/OpenSeal BOSS adapters as the main path for BOSS work. As of 2026-05-05, OpenCLI `1.7.12` did not show a BOSS-specific fix, `boss chat-list` was no longer compatible, `boss chatlist` reported expired BOSS cookies, and `boss search` still failed with browser/network errors. Treat OpenCLI/OpenSeal as version/doctor evidence only unless the user explicitly asks to repair that adapter; operate BOSS through the existing web page/CDP scripts instead.
- Do not use rapid search loops. Prefer browsing existing BOSS result pages, job tabs, and natural page recommendations like a human, with moderate scrolling.
- Do not run long recommendation-chain batches. Use small, observable batches from the existing jobs page tabs or the current detail page. After each small batch, re-check page health and ledger count before continuing.
- Before any live apply, run detail dry-run and inspect the gate result.
- If the page shows login, security check, restricted access, abnormal access, or bounce-back behavior, stop apply work and diagnose session health first.
- On any abnormal access/login/security event, attach `browser-trace` to the current CDP browser before drawing conclusions or retrying. Capture enough evidence to identify the triggering profile, CDP route, script, cadence, page URL, network/console errors, DOM state, and screenshots.
- Treat abnormal access/login events as durable workflow feedback. Record the trace-backed cause and do not retry the same login or automation path next time without a recovery note.
- Prefer user-like session recovery after abnormal access: reuse an already logged-in normal browser, let the user complete any first-party verification, then resume with a read-only health check before applying. Do not attempt to bypass or defeat BOSS security controls.
- If a candidate lacks company metadata, do not live apply. Open the detail page and extract company from the detail page.
- Record and verify results through the local ledger, not only through button text or script stdout.
- Never apply to headhunter, agency, proxy-recruiting, or anonymous-company listings. Treat `猎头`, `代招`, `代招公司`, `代理招聘`, `委托招聘`, and anonymous companies such as `某大型公司` / `某知名互联网公司` / any company name beginning with `某` as hard live-apply blockers. This is a permanent user preference.

## Selection Policy

Prefer roles matching the user's target:

- AI native products
- AI Agent / 智能体
- AI efficiency / 效能 / workflow automation
- enterprise AI adoption / 企业智能化 / 企业导入
- AI organization leadership / AI 组织负责人
- AI technical director / AI 技术总监
- AI management / AI 管理 / AI 转型负责人
- AI platform / AI middle platform
- AI application platform owner / AI 应用平台负责人
- AI application architecture / solution architecture
- CTO / 技术负责人 / 技术总监 / 研发总监 / 联合创始人 when the role description clearly connects to AI, Agent, LLM, automation, enterprise AI adoption, workflow, digital transformation, or AI-enabled organizational efficiency
- AI backend / full-stack / LLM / RAG / AIGC roles when business context is relevant

Hard-block roles or companies when any of these appear in title, company, company intro, description, or detail metadata:

- Duplicate identity: same normalized `company::title` already applied, skipped, or deduped.
- Headhunter / agency / proxy recruiting / anonymous-company listings, including `猎头`, `代招`, `代招公司`, `代理招聘`, `委托招聘`, and `某...公司` placeholders.
- Existing chat / `继续沟通` / `already_continuing`.
- Chat triage shows prior rejection or disqualifying history.
- Salary lower bound below `20K`, including `18-30K`, `15-25K`, daily-rate, weekly-rate, hourly-rate, or non-`K` yuan/month jobs.
- Company size alone is not a blocker. The user explicitly allows companies above 1000 people.
- Big companies, groups, state-owned entities, research institutes, or hidden subsidiaries indicated by company intro.
- Known blacklists including 字节, 阿里, 腾讯, 美团, 华为, 京东, 百度, 拼多多/PDD, 携程, 小红书, Shopee, SHEIN, OPPO, 吉利, 研究院, 实验室, 集团, 国企, 央企, 事业单位.
- Auto/ADAS/vehicle/chip/compiler/facility-ops roles unless the user explicitly overrides for that specific role.
- Sales, outsourcing, loan, insurance, trainer, internship, overseas assignment, IDC/facility operations.
- Non-technical AI promotion/operations roles such as 主播, 推荐官, 互联网运营, 直播运营, 内容运营, or 投放.

If a company appears small in the metadata but the company intro says it belongs to a big company, block it.

## Success Definition

For daily targets, count only:

- `status === "applied"`
- first successful apply for that normalized identity
- first applied timestamp is today
- not `already_continuing`
- not dry-run
- not failed or skipped

Use the store's successful count instead of raw ledger rows:

```bash
cd /Users/proerror/Documents/redbook/tools/auto-zhipin
node - <<'NODE'
const { ZhipinStore } = require('./lib/store');
const store = new ZhipinStore();
const count = store.getTodaySuccessfulApplies(new Date());
console.log(JSON.stringify({
  todaySuccessfulApplies: count,
  remainingTo50: Math.max(0, 50 - count)
}, null, 2));
NODE
```

If raw `applied` rows differ from this count, trust this count.

## Standard Flow

### 0. Browser Trace Gate For Abnormal Or Unstable Sessions

Use `browser-trace` before retrying any BOSS flow that has shown abnormal access, login bounce, `auth_gate`, `restricted`, `_security_check`, target URL mismatch, or unexpected page navigation.

Prefer the repo wrapper for normal use:

```bash
cd /Users/proerror/Documents/redbook/tools/auto-zhipin
npm run boss:trace-probe -- \
  --cdp-endpoint http://127.0.0.1:9224 \
  --keep-trace false
```

For polling:

```bash
cd /Users/proerror/Documents/redbook/tools/auto-zhipin
npm run boss:trace-probe -- \
  --cdp-endpoint http://127.0.0.1:9224 \
  --poll true \
  --interval-ms 30000 \
  --max-loops 10 \
  --keep-trace false
```

The wrapper records `data/boss-trace-probe-latest.json` and `data/boss-trace-probe-history.jsonl`, cleans raw `.o11y` by default, and treats trace navigation to a different `job_detail` as `trace_unstable_navigation`. Continue toward live apply only when `okToLiveApply=true`, `targetCheck.ok=true`, `gate.reasons=[]`, and `trace.issues=[]`.

```bash
cd /Users/proerror/Documents/redbook
O11Y_ROOT=/Users/proerror/Documents/redbook/.o11y \
  node /Users/proerror/.agents/skills/browser-trace/scripts/start-capture.mjs 9224 boss-debug-$(date +%Y%m%dT%H%M%S) 1
```

While the trace is running, perform only read-only checks or dry-run preflight:

```bash
browse --ws 9224 pages --json
npm --silent --prefix tools/auto-zhipin run boss:apply-cdp -- \
  --cdp-endpoint http://127.0.0.1:9224 \
  --url 'https://www.zhipin.com/job_detail/xxx.html' \
  --dry-run true \
  --focus false
```

Stop and inspect:

```bash
O11Y_ROOT=/Users/proerror/Documents/redbook/.o11y \
  node /Users/proerror/.agents/skills/browser-trace/scripts/stop-capture.mjs <run-id>
O11Y_ROOT=/Users/proerror/Documents/redbook/.o11y \
  node /Users/proerror/.agents/skills/browser-trace/scripts/bisect-cdp.mjs <run-id>
O11Y_ROOT=/Users/proerror/Documents/redbook/.o11y \
  node /Users/proerror/.agents/skills/browser-trace/scripts/query.mjs <run-id> summary
O11Y_ROOT=/Users/proerror/Documents/redbook/.o11y \
  node /Users/proerror/.agents/skills/browser-trace/scripts/query.mjs <run-id> errors
```

Completion rule: do not continue to live apply unless the trace-backed evidence shows a stable BOSS page, no active auth/security blocker, and the dry-run target URL matches the requested job URL. Summarize the trace in `tasks/progress.md`; do not commit raw `.o11y` screenshots or DOM dumps unless explicitly needed.

### 1. Check Browser And Ledger

Start with lightweight state checks:

```bash
cd /Users/proerror/Documents/redbook
tools/redbookctl browser
cd tools/auto-zhipin
node scripts/report.js
```

If checking CDP manually, prefer current endpoint `http://127.0.0.1:9224` when available. Verify `/json/version` or `/json/list` before assuming the port is live.

Existing-page health check:

- Inspect only existing CDP targets from `/json/list`.
- A usable BOSS target must already be a `page` under `zhipin.com`, must not be `/web/user/`, must not be `/web/passport/zp/error`, and must not show login/security/abnormal/403 text in the current DOM.
- This check is read-only. Do not navigate, open a new tab, click, or focus the page during health checks.
- If the only BOSS target is login/security/abnormal/403, stop and report the blocker to the user.

### 2. Refresh Chat Triage When Needed

Use chat triage before larger apply runs, especially if the user mentions prior applications or rejections:

```bash
cd /Users/proerror/Documents/redbook/tools/auto-zhipin
npm run chat:triage-cdp -- --cdp-endpoint http://127.0.0.1:9224 --focus false
```

The chat triage snapshot may be incomplete if it only sees the visible conversation slice. Treat it as a blocking signal when it finds a match, not as proof that no prior rejection exists.

Do not pass `--open-if-missing true` unless the user explicitly authorizes opening/navigating a missing Chat page. If Chat is not already available from the existing BOSS session and opening it would require a new page or unexpected navigation, stop and tell the user.

### 3. Collect Candidates Without Focus Steal

Use the current already-open jobs page and scroll naturally. Do not create or navigate to a new jobs page when the current one is missing or blocked:

```bash
cd /Users/proerror/Documents/redbook/tools/auto-zhipin
npm run jobs:collect-cdp -- \
  --cdp-endpoint http://127.0.0.1:9224 \
  --tab '联合创始人' \
  --focus false \
  --scroll-steps 5
```

Inspect matched and skipped results:

```bash
node -e "const r=require('./data/cdp-collect-current-jobs-latest.json'); console.log(JSON.stringify({sourceUrl:r.sourceUrl, matched:r.matched, skipped:r.skipped.slice(0,10)}, null, 2));"
```

If the target tab is missing on a search page, navigate back to `https://www.zhipin.com/web/geek/jobs?ka=header-jobs` through the existing CDP page, wait, then collect again. Avoid opening a new visible tab.

Current override: do not navigate back automatically when the user has said not to open or change pages. In that case, stop and report that the expected jobs tab is not available on the existing page.

### 4. Detail Dry-Run Gate

For each candidate URL, run detail dry-run:

```bash
cd /Users/proerror/Documents/redbook/tools/auto-zhipin
npm --silent run boss:apply-cdp -- \
  --cdp-endpoint http://127.0.0.1:9224 \
  --url 'https://www.zhipin.com/job_detail/xxx.html' \
  --dry-run true \
  --focus false
```

Proceed only when all are true:

- `targetCheck.ok === true`
- `gate.allow === true`
- `gate.reasons` is empty
- `gate.candidate.company` is non-empty
- `gate.candidate.companySize` is not excluded
- `gate.candidate.salaryText` lower bound is at least `20K`
- `result.actionText` is not `继续沟通`
- company intro does not reveal a hidden big-company background
- the detail role still matches the user's scope: AI organization leadership, AI technical director, AI management, AI architecture, AI consulting, AI product/platform leadership, CTO/technical leadership with explicit AI/Agent/LLM/automation/digital-transformation context, Agent, LLM, RAG, AIGC, AI application engineering, or AI-enabled enterprise efficiency
- the detail role is not merely generic technical management, generic algorithm work, auto/ADAS, sensor/laser radar, chip/semiconductor, hardware robotics, facility operations, sales, or non-technical promotion

### 5. Live Apply

Live apply only for candidates that passed detail dry-run and only while the existing page remains healthy:

```bash
cd /Users/proerror/Documents/redbook/tools/auto-zhipin
npm --silent run boss:apply-cdp -- \
  --cdp-endpoint http://127.0.0.1:9224 \
  --url 'https://www.zhipin.com/job_detail/xxx.html' \
  --dry-run false \
  --focus false
```

Treat success as valid only when the output shows:

- `success: true`
- before action was `立即沟通` or equivalent live CTA
- after action is `继续沟通` or another verified success signal
- ledger count increases under `getTodaySuccessfulApplies()`

If live apply returns skipped, failed, target mismatch, auth gate, or restricted page, do not retry blindly.

### 6. Verify Target Count

After each batch, rerun the successful-count command. Stop when the requested target is reached. For the common daily target:

```bash
cd /Users/proerror/Documents/redbook/tools/auto-zhipin
node - <<'NODE'
const { ZhipinStore } = require('./lib/store');
const store = new ZhipinStore();
const count = store.getTodaySuccessfulApplies(new Date());
console.log(JSON.stringify({
  todaySuccessfulApplies: count,
  remainingTo50: Math.max(0, 50 - count),
  summary: store.summary()
}, null, 2));
NODE
```

Do not keep applying after the target is reached.

## Repair And Verification

When changing workflow code, run focused tests first:

```bash
cd /Users/proerror/Documents/redbook/tools/auto-zhipin
npm test -- --test-name-pattern 'cdp_apply_job|preapply|successful|salary|target|blacklist'
```

Run full tests before claiming the repair is complete:

```bash
cd /Users/proerror/Documents/redbook/tools/auto-zhipin
npm test
```

Also run syntax checks on changed scripts when applicable:

```bash
node --check scripts/cdp_apply_job.js
node --check scripts/cdp_collect_current_jobs.js
node --check scripts/opencli_apply_current_tab.js
```

## Reporting

Report in Chinese when the user is operating in Chinese. Include:

- current successful new-apply count and remaining target
- how many candidates were blocked and top block reasons
- exact companies/titles applied in the latest batch
- any session/auth/security blocker
- verification commands and pass/fail result

Keep the browser open if the user needs to handle login, QR, or security verification manually.
