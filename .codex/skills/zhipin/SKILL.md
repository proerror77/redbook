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
- Do not steal focus. Pass `--focus false` and do not call `Page.bringToFront` unless the user explicitly asks for foreground control.
- Prefer the current normal browser/CDP route for this user's BOSS work. Use Computer Use only as a fallback for blocked visual/manual cases.
- Do not use rapid search loops. Prefer browsing existing BOSS result pages, job tabs, and natural page recommendations like a human, with moderate scrolling.
- Before any live apply, run detail dry-run and inspect the gate result.
- If the page shows login, security check, restricted access, abnormal access, or bounce-back behavior, stop apply work and diagnose session health first.
- If a candidate lacks company metadata, do not live apply. Open the detail page and extract company from the detail page.
- Record and verify results through the local ledger, not only through button text or script stdout.

## Selection Policy

Prefer roles matching the user's target:

- AI native products
- AI Agent / 智能体
- AI efficiency / 效能 / workflow automation
- enterprise AI adoption / 企业智能化 / 企业导入
- AI platform / AI middle platform
- AI application architecture / solution architecture
- CTO / 技术负责人 / 联合创始人 when the company is small or medium
- AI backend / full-stack / LLM / RAG / AIGC roles when business context is relevant

Hard-block roles or companies when any of these appear in title, company, company intro, description, or detail metadata:

- Duplicate identity: same normalized `company::title` already applied, skipped, or deduped.
- Existing chat / `继续沟通` / `already_continuing`.
- Chat triage shows prior rejection or disqualifying history.
- Salary lower bound below `20K`, including `18-30K`, `15-25K`, daily-rate, or weekly-rate jobs.
- Company size `1000-9999人` or `10000人以上`.
- Big companies, groups, state-owned entities, research institutes, or hidden subsidiaries indicated by company intro.
- Known blacklists including 字节, 阿里, 腾讯, 美团, 华为, 京东, 百度, 拼多多/PDD, 携程, 小红书, Shopee, SHEIN, OPPO, 吉利, 研究院, 实验室, 集团, 国企, 央企, 事业单位.
- Auto/ADAS/vehicle/chip/compiler/facility-ops roles unless the user explicitly overrides for that specific role.
- Sales, outsourcing, loan, insurance, trainer, internship, overseas assignment, IDC/facility operations.

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

### 1. Check Browser And Ledger

Start with lightweight state checks:

```bash
cd /Users/proerror/Documents/redbook
tools/redbookctl browser
cd tools/auto-zhipin
node scripts/report.js
```

If checking CDP manually, prefer current endpoint `http://127.0.0.1:9224` when available. Verify `/json/version` or `/json/list` before assuming the port is live.

### 2. Refresh Chat Triage When Needed

Use chat triage before larger apply runs, especially if the user mentions prior applications or rejections:

```bash
cd /Users/proerror/Documents/redbook/tools/auto-zhipin
npm run chat:triage-cdp -- --cdp-endpoint http://127.0.0.1:9224 --focus false
```

The chat triage snapshot may be incomplete if it only sees the visible conversation slice. Treat it as a blocking signal when it finds a match, not as proof that no prior rejection exists.

### 3. Collect Candidates Without Focus Steal

Use the current jobs page and scroll naturally:

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

### 5. Live Apply

Live apply only for candidates that passed detail dry-run:

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
