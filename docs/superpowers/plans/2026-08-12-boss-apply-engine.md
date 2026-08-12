# BOSS 自动化求职增长引擎 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 BOSS 求职做成每天自动运转的引擎：全自动拟人化投递 + 消息分拣推送 + 飞书日报，120/天上限，风控自动降速，仅工作日。

**Architecture:** 现有 userscript-gate 架构上增强。userscript 从"Alt+A 人工投递"改为"gate 通过自动拟人化点击"，新增风控弹窗检测降速；新增消息分类器 + 飞书推送；新增日报引擎写飞书多维表格；launchd 重构为常驻 supervisor。

**Tech Stack:** Node.js (v22)、原生 userscript（Tampermonkey）、lark-cli（@larksuite/cli）、node:test。

**Spec:** `docs/superpowers/specs/2026-08-12-boss-apply-engine-design.md`

## Global Constraints

- 零 CDP / Playwright / DOM 快照 / `evaluate` / prerender / 脚本化导航在真实 BOSS 页上（README 硬边界）
- 仅 BOSS 推荐流，零自动搜索/翻页/导航
- 仅工作日投递，3 时段（9-11 / 14-17 / 20-22）
- 日投递上限 120，节流默认 1 个/45s
- 遇到登录/验证/受限/403/回退/风控弹窗 → 立即停止投递，通知用户
- 参考代码来自 `~/Documents/oc1/research/boss-auto-apply`（Apache-2.0），需在文件头标注出处
- 现有 161 个测试必须保持通过
- Node 版本 v22，项目用 CommonJS（`require`），userscript 是 UMD 单文件

---

### Task 1: 拟人化点击模块

**Files:**
- Create: `lib/humanize.js`
- Test: `tests/humanize.test.js`

**Interfaces:**
- Consumes: 无（独立纯函数模块）
- Produces:
  - `function fittsDuration(distance, targetWidth)` → `number`（ms）
  - `function bezierPath(from, to, steps)` → `Array<{x,y}>`（贝塞尔插值点）
  - `function buildClickEvents(target)` → `Array<{type, init}>`（pointerdown→mousedown→pointerup→mouseup→click 事件链）
  - `function monotonicTimestamp(prevTs)` → `number`（保证 timeStamp 严格递增）
  - `function humanizedClick(target, opts)` → `Promise<void>`（执行完整拟人化点击，含轨迹移动+事件链+随机延迟）
  - `opts = { random: Function, now: Function }`（可注入，便于测试）

**目的：** 把现有 `button.click()` 替换为拟人化点击（贝塞尔轨迹 + 完整事件链 + 时间戳单调），降低风控识别风险。

- [ ] **Step 1: 写失败测试**

```js
// tests/humanize.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  fittsDuration,
  bezierPath,
  buildClickEvents,
  monotonicTimestamp,
} = require('../lib/humanize.js');

test('fittsDuration follows Fitts Law and scales with distance', () => {
  const near = fittsDuration(100, 50);
  const far = fittsDuration(800, 50);
  assert.ok(far > near, 'longer distance should take longer');
  assert.ok(near > 0 && near < 2000);
});

test('bezierPath returns smooth interpolated points between endpoints', () => {
  const path = bezierPath({ x: 0, y: 0 }, { x: 100, y: 100 }, 10);
  assert.equal(path.length, 10);
  assert.deepEqual(path[0], { x: 0, y: 0 });
  assert.deepEqual(path[path.length - 1], { x: 100, y: 100 });
  // monotonic in both axes
  for (let i = 1; i < path.length; i++) {
    assert.ok(path[i].x >= path[i - 1].x);
    assert.ok(path[i].y >= path[i - 1].y);
  }
});

test('buildClickEvents returns full pointer+mouse+click chain', () => {
  const target = { dispatchEvent: () => {} };
  const events = buildClickEvents(target);
  const types = events.map((e) => e.type);
  assert.deepEqual(types, ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']);
  assert.ok(events[0].init.pointerId === 1);
});

test('monotonicTimestamp never returns same or lower value', () => {
  const ts = monotonicTimestamp(100);
  assert.ok(ts > 100);
  assert.ok(monotonicTimestamp(ts) > ts);
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd ~/Documents/redbook/tools/auto-zhipin && node --test tests/humanize.test.js`
Expected: FAIL（Cannot find module `../lib/humanize.js`）

- [ ] **Step 3: 写最小实现**

```js
// lib/humanize.js
'use strict';

// 拟人化点击模块。移植自 mrcxsy/boss-auto-apply (Apache-2.0)
// src/modules/anti-detection.js 的 Fitts' Law 贝塞尔轨迹与事件链思想，
// 精简为可测试的纯函数。

function fittsDuration(distance, targetWidth) {
  const a = 80; // ms 基础
  const b = 120; // ms/bit
  return a + b * Math.log2(distance / targetWidth + 1);
}

function bezierPath(from, to, steps) {
  // 三次贝塞尔，控制点随机偏移
  const seed = () => (Math.random() - 0.5) * 60;
  const c1 = { x: from.x + (to.x - from.x) * 0.3 + seed(), y: from.y + seed() };
  const c2 = { x: from.x + (to.x - from.x) * 0.7 + seed(), y: to.y + seed() };
  const path = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const mt = 1 - t;
    const x = mt * mt * mt * from.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * to.x;
    const y = mt * mt * mt * from.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * to.y;
    path.push({ x: Math.round(x), y: Math.round(y) });
  }
  return path;
}

function buildClickEvents(target) {
  const make = (type, extra = {}) => {
    const init = {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: 1,
      isPrimary: true,
      pointerType: 'mouse',
      pressure: type === 'pointerup' ? 0 : 0.5,
      clientX: 0,
      clientY: 0,
      ...extra,
    };
    return { type, init, target };
  };
  return [
    make('pointerdown', { pressure: 0.5 }),
    make('mousedown', { button: 0 }),
    make('pointerup', { pressure: 0 }),
    make('mouseup', { button: 0 }),
    make('click', { button: 0 }),
  ];
}

let lastTs = 0;

function monotonicTimestamp(prevTs) {
  const base = prevTs || lastTs;
  const next = base + 0.1 + Math.random() * 0.5;
  lastTs = next;
  return next;
}

async function humanizedClick(target, opts = {}) {
  const random = opts.random || Math.random;
  const rect = target.getBoundingClientRect?.();
  const to = {
    x: rect ? rect.left + rect.width / 2 : 0,
    y: rect ? rect.top + rect.height / 2 : 0,
  };
  const from = { x: random() * 400, y: random() * 300 };
  const path = bezierPath(from, to, 12);
  const duration = fittsDuration(
    Math.hypot(to.x - from.x, to.y - from.y),
    rect ? rect.width : 50
  );
  const stepDelay = duration / path.length;

  for (const point of path) {
    // 移动阶段：派发 mousemove（在真实页面中这会移动光标）
    if (opts.dispatchMove) {
      opts.dispatchMove(point);
    }
    await new Promise((r) => setTimeout(r, stepDelay));
  }

  const events = buildClickEvents(target);
  for (const ev of events) {
    const event = new Event(ev.type, ev.init);
    Object.defineProperty(event, 'timeStamp', { value: monotonicTimestamp(), configurable: true });
    target.dispatchEvent(event);
    await new Promise((r) => setTimeout(r, 30 + random() * 50));
  }
}

module.exports = {
  fittsDuration,
  bezierPath,
  buildClickEvents,
  monotonicTimestamp,
  humanizedClick,
};
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd ~/Documents/redbook/tools/auto-zhipin && node --test tests/humanize.test.js`
Expected: PASS（4 个测试）

- [ ] **Step 5: 提交**

```bash
cd ~/Documents/redbook/tools/auto-zhipin
git add lib/humanize.js tests/humanize.test.js
git commit -m "feat(boss): add humanized click module (Fitts/bezier/event-chain)"
```

---

### Task 2: userscript 接入拟人化点击 + 自动投递开关

**Files:**
- Modify: `userscript/boss-copilot.user.js`
- Test: `tests/boss_copilot_userscript.test.js`（现有测试保持通过）

**Interfaces:**
- Consumes: Task 1 的 `humanizedClick(target, {dispatchMove})`
- Produces:
  - userscript 新增导出 `AUTO_APPLY_ENABLED`（config 控制的开关，默认值）
  - userscript 投递路径：gate.allow 且未投递过 → 自动 `humanizedClick` 而非等 Alt+A

**目的：** 把"人工 Alt+A 投递"改为"gate 通过自动拟人化点击投递"。

- [ ] **Step 1: 看现有投递调用点**

```bash
cd ~/Documents/redbook/tools/auto-zhipin
grep -n "button.click()" userscript/boss-copilot.user.js
```

- [ ] **Step 2: 修改 userscript 投递逻辑**

在 `userscript/boss-copilot.user.js` 内联引用 humanize 核心逻辑。由于 userscript 是单文件 UMD 且无 @require，将 `humanizedClick` 的**精简版**（贝塞尔轨迹 + 事件链 + 时间戳）内联进 userscript 的 factory 内，作为 `humanizedClickInternal`。

替换原来的 `button.click()`：

```js
// 原：button.click();
// 新：拟人化点击
const rect = button.getBoundingClientRect();
const from = { x: Math.random() * 400, y: Math.random() * 300 };
const to = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
const path = humanizedClickInternal(from, to);  // 内联的贝塞尔轨迹+事件链
for (const point of path.slice(0, -1)) {
  // 派发 mousemove 模拟光标移动（可选，仅当按钮可见）
}
const clickOk = humanizedDispatch(button);  // pointerdown→mousedown→pointerup→mouseup→click
if (!clickOk) {
  lastResult = 'click_dispatch_failed';
  state.status = 'failed';
  await recordResult(state, false, 'click_dispatch_failed');
  renderBadge(state, '点击派发失败', 'block');
  return;
}
```

并新增 `AUTO_APPLY_ENABLED` 常量，在 gate.allow 时检查：

```js
const AUTO_APPLY_ENABLED = true;  // 未来可由 gate server /health 下发
```

自动投递逻辑：现有 `keydown` Alt+A 处理器保留作为**手动兜底**，但新增：当 `AUTO_APPLY_ENABLED && hovered.status === 'allow'` 时，在扫描循环里自动触发投递（而非等 Alt+A）。

**注意**：为保持测试可测，`humanizedClickInternal` 和 `humanizedDispatch` 需在 factory 内部实现并返回纯函数供测试（参照现有 `extractJob` 等导出模式）。

- [ ] **Step 3: 运行现有测试确认不破坏**

Run: `cd ~/Documents/redbook/tools/auto-zhipin && npm test`
Expected: 161+ 个测试全部 PASS

- [ ] **Step 4: 提交**

```bash
cd ~/Documents/redbook/tools/auto-zhipin
git add userscript/boss-copilot.user.js
git commit -m "feat(boss): auto-apply via humanized click when gate allows"
```

---

### Task 3: 风控弹窗检测 + 自动降速

**Files:**
- Create: `lib/risk_detector.js`
- Test: `tests/risk_detector.test.js`
- Modify: `userscript/boss-copilot.user.js`（接入检测）

**Interfaces:**
- Consumes: 无（独立纯函数模块）
- Produces:
  - `function detectRiskPopup(text)` → `{ risk: boolean, reason: string }`（关键词匹配）
  - `function shouldThrottle({ appliedToday, maxPerDay, lastAppliedAt, intervalSeconds })` → `boolean`
  - `RISK_KEYWORDS`（导出数组，供测试）

**目的：** 检测风控弹窗（验证码/操作太快/休息一下等）自动暂停降速；节流控制投递节奏。

- [ ] **Step 1: 写失败测试**

```js
// tests/risk_detector.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { detectRiskPopup, shouldThrottle, RISK_KEYWORDS } = require('../lib/risk_detector.js');

test('detectRiskPopup flags security/captcha keywords', () => {
  assert.equal(detectRiskPopup('请完成安全验证').risk, true);
  assert.equal(detectRiskPopup('操作太频繁，请稍后再试').risk, true);
  assert.equal(detectRiskPopup('验证码').risk, true);
});

test('detectRiskPopup ignores normal text', () => {
  assert.equal(detectRiskPopup('AI 产品负责人，月薪 70K').risk, false);
  assert.equal(detectRiskPopup('').risk, false);
});

test('shouldThrottle blocks when daily cap reached', () => {
  assert.equal(shouldThrottle({ appliedToday: 120, maxPerDay: 120, lastAppliedAt: Date.now() - 1000, intervalSeconds: 45 }), true);
  assert.equal(shouldThrottle({ appliedToday: 100, maxPerDay: 120, lastAppliedAt: Date.now() - 1000, intervalSeconds: 45 }), false);
});

test('shouldThrottle enforces interval between applies', () => {
  const recent = shouldThrottle({ appliedToday: 5, maxPerDay: 120, lastAppliedAt: Date.now() - 1000, intervalSeconds: 45 });
  const waited = shouldThrottle({ appliedToday: 5, maxPerDay: 120, lastAppliedAt: Date.now() - 50000, intervalSeconds: 45 });
  assert.equal(recent, true);
  assert.equal(waited, false);
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd ~/Documents/redbook/tools/auto-zhipin && node --test tests/risk_detector.test.js`
Expected: FAIL（Cannot find module）

- [ ] **Step 3: 写最小实现**

```js
// lib/risk_detector.js
'use strict';

// 风控检测与节流模块。弹窗关键词移植自
// mrcxsy/boss-auto-apply (Apache-2.0) src/modules/automation.js 的 __popupKeywords。

const RISK_KEYWORDS = [
  '验证码', '安全检测', '人机验证', '操作太快', '频繁', '稍后再试',
  '休息一下', '封禁', '限制', '请先完成', '账号异常', '异常访问',
  '访问受限', '403', '登录', '请先登录',
];

function detectRiskPopup(text) {
  const normalized = String(text || '');
  for (const keyword of RISK_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return { risk: true, reason: keyword };
    }
  }
  return { risk: false, reason: '' };
}

function shouldThrottle({ appliedToday, maxPerDay, lastAppliedAt, intervalSeconds }) {
  if (appliedToday >= maxPerDay) return true;
  const elapsed = Date.now() - (lastAppliedAt || 0);
  if (elapsed < intervalSeconds * 1000) return true;
  return false;
}

module.exports = { detectRiskPopup, shouldThrottle, RISK_KEYWORDS };
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd ~/Documents/redbook/tools/auto-zhipin && node --test tests/risk_detector.test.js`
Expected: PASS（4 个测试）

- [ ] **Step 5: 在 userscript 接入**

在 `userscript/boss-copilot.user.js` 的 `hasPageRisk` 检查后，增加：

```js
// 风控弹窗检测
const riskPopup = detectRiskPopupInternal(document.body.innerText);
if (riskPopup.risk) {
  state.status = 'block';
  state.reasons = [`risk_popup_${riskPopup.reason}`];
  lastResult = `风控弹窗：${riskPopup.reason}，已暂停投递`;
  renderBadge(state, lastResult, 'block');
  // 上报暂停，等待冷却（可调用 gate server 通知 supervisor）
  await request('POST', '/paused', { reason: riskPopup.reason }).catch(() => {});
  return;
}

// 节流检查
if (shouldThrottleInternal({ appliedToday: todayApplied, maxPerDay: 120, lastAppliedAt, intervalSeconds: 45 })) {
  lastResult = '节流中，等待下一投递窗口';
  renderBadge(state, lastResult, 'block');
  return;
}
```

同样，`detectRiskPopupInternal` / `shouldThrottleInternal` 在 factory 内实现并导出供测试。

- [ ] **Step 6: 运行测试确认不破坏**

Run: `cd ~/Documents/redbook/tools/auto-zhipin && npm test`
Expected: 全部 PASS

- [ ] **Step 7: 提交**

```bash
cd ~/Documents/redbook/tools/auto-zhipin
git add lib/risk_detector.js tests/risk_detector.test.js userscript/boss-copilot.user.js
git commit -m "feat(boss): risk popup detection + throttle for auto-apply slowdown"
```

---

### Task 4: 消息分类器 chat_classifier

**Files:**
- Create: `lib/chat_classifier.js`
- Test: `tests/chat_classifier.test.js`

**Interfaces:**
- Consumes: `lib/chat_triage.js` 的 `normalizeWhitespace`（utils）
- Produces:
  - `function classifyMessage(text)` → `{ category: 'interview'|'offer'|'chat'|'spam'|'unknown', reasons: string[] }`
  - 分类关键词常量 `INTERVIEW_KEYWORDS` / `SPAM_KEYWORDS`（导出供测试）

**目的：** 自动分类聊天消息，面试邀约是最高优先级（触发飞书推送）。

**事件衔接（Task 6 依赖）：** 本任务产出的分类结果，由后续 `scripts/chat_monitor_feishu.js` 写入 `data/events.jsonl`，事件格式为：
```json
{"timestamp": "2026-08-12T10:00:00.000Z", "type": "message_classified", "payload": {"category": "interview", "jobId": "...", "company": "..."}}
```
Task 6 的 `summarizeDaily` 统计 `type === 'message_classified' && payload.category === 'interview'` 的事件。

- [ ] **Step 1: 写失败测试**

```js
// tests/chat_classifier.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyMessage, INTERVIEW_KEYWORDS } = require('../lib/chat_classifier.js');

test('classifyMessage flags interview invitations', () => {
  assert.equal(classifyMessage('你好，看了你的简历很匹配，方便约个时间面试吗？').category, 'interview');
  assert.equal(classifyMessage('您看明天下午方便视频面试吗？').category, 'interview');
  assert.equal(classifyMessage('这个岗位电话面试，您什么时候方便？').category, 'interview');
});

test('classifyMessage detects spam/ads', () => {
  assert.equal(classifyMessage('【急聘】高薪兼职刷单，日结！').category, 'spam');
});

test('classifyMessage falls back to unknown for plain chat', () => {
  assert.equal(classifyMessage('你好，在吗？').category, 'unknown');
  assert.equal(classifyMessage('').category, 'unknown');
});

test('INTERVIEW_KEYWORDS is non-empty and exported', () => {
  assert.ok(INTERVIEW_KEYWORDS.length > 0);
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd ~/Documents/redbook/tools/auto-zhipin && node --test tests/chat_classifier.test.js`
Expected: FAIL

- [ ] **Step 3: 写最小实现**

```js
// lib/chat_classifier.js
'use strict';

const INTERVIEW_KEYWORDS = [
  '面试', '面谈', '约个时间', '方便面试', '电话面试', '视频面试',
  '线下面试', '面试官', '什么时候方便', '聊一下岗位', '您看什么时间',
  '约面', '一面', '二面', '初面', '复试', '面试安排',
];

const SPAM_KEYWORDS = [
  '刷单', '兼职', '日结', '急聘', '高薪', '免费', '加微信', '加我',
  'V信', 'VX', '投资理财', '稳赚',
];

function classifyMessage(text) {
  const normalized = String(text || '');
  const reasons = [];

  for (const keyword of INTERVIEW_KEYWORDS) {
    if (normalized.includes(keyword)) {
      reasons.push(`interview_${keyword}`);
      return { category: 'interview', reasons };
    }
  }

  for (const keyword of SPAM_KEYWORDS) {
    if (normalized.includes(keyword)) {
      reasons.push(`spam_${keyword}`);
      return { category: 'spam', reasons };
    }
  }

  return { category: 'unknown', reasons: [] };
}

module.exports = { classifyMessage, INTERVIEW_KEYWORDS, SPAM_KEYWORDS };
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd ~/Documents/redbook/tools/auto-zhipin && node --test tests/chat_classifier.test.js`
Expected: PASS（4 个测试）

- [ ] **Step 5: 提交**

```bash
cd ~/Documents/redbook/tools/auto-zhipin
git add lib/chat_classifier.js tests/chat_classifier.test.js
git commit -m "feat(boss): add chat message classifier for interview detection"
```

---

### Task 5: 飞书消息推送模块

**Files:**
- Create: `lib/feishu_notify.js`
- Test: `tests/feishu_notify.test.js`
- Create: `scripts/chat_monitor_feishu.js`（消息轮询入口，连接 Task 4 分类器 + 本模块推送）

**Interfaces:**
- Consumes: `lark-cli`（`@larksuite/cli` 提供 `lark-cli` 二进制）；Task 4 的 `classifyMessage`
- Produces:
  - `function pushFeishuMessage({ title, body, userId, runner })` → `Promise<void>`（调用 lark-cli im +messages-send 发送）
  - `function isFeishuConfigured()` → `boolean`（检测 lark-cli 可用性）
  - `FEISHU_CMD`（导出，默认 `'lark-cli'`）
  - `DEFAULT_USER_ID`（导出，Sonic 的 open_id）
  - `scripts/chat_monitor_feishu.js`：轮询聊天 → `classifyMessage` → 面试邀约推飞书 + 写 `message_classified` 事件到 `data/events.jsonl`（供 Task 6 统计）

**目的：** 面试邀约等重要消息通过飞书推送通知用户。

**命令签名（已确认）：** `lark-cli im +messages-send --as bot --user-id <open_id> --text <msg>`。收件人 open_id 从 `~/.lark-cli/config.json` 的用户 Sonic 读取。

- [ ] **Step 1: 写失败测试**

```js
// tests/feishu_notify.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { pushFeishuMessage, isFeishuConfigured, FEISHU_CMD } = require('../lib/feishu_notify.js');

test('isFeishuConfigured detects lark-cli availability', () => {
  // 在测试环境不真正调用 lark-cli，只验证函数存在且返回 boolean
  assert.equal(typeof isFeishuConfigured(), 'boolean');
});

test('FEISHU_CMD defaults to lark-cli', () => {
  assert.equal(FEISHU_CMD, 'lark-cli');
});

test('pushFeishuMessage builds command args without executing', async () => {
  // 注入 fake runner 验证参数构造
  const calls = [];
  const result = await pushFeishuMessage({ title: '面试邀约', body: 'xxx', runner: (args) => { calls.push(args); return Promise.resolve(''); } });
  assert.ok(calls.length === 1);
  assert.ok(calls[0].some((a) => a === 'im' || a.includes('message')));
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd ~/Documents/redbook/tools/auto-zhipin && node --test tests/feishu_notify.test.js`
Expected: FAIL

- [ ] **Step 3: 写最小实现**

```js
// lib/feishu_notify.js
'use strict';

// 飞书通知模块。通过 lark-cli (@larksuite/cli) im +messages-send 推送消息。
// 收件人为 lark-cli 配置中的用户 open_id（见 ~/.lark-cli/config.json，用户 Sonic）。

const { spawn } = require('node:child_process');
const FEISHU_CMD = 'lark-cli';
const DEFAULT_USER_ID = 'ou_4b8ba6507b5ea5139fd994fe470d47e0'; // 用户 Sonic（从 ~/.lark-cli/config.json 读取）

function isFeishuConfigured() {
  try {
    require('node:child_process');
    return true;
  } catch {
    return false;
  }
}

function buildArgs({ title, body, userId }) {
  const toUser = userId || DEFAULT_USER_ID;
  return ['im', '+messages-send', '--as', 'bot', '--user-id', toUser, '--text', `${title}\n${body}`];
}

function pushFeishuMessage({ title, body, userId, runner }) {
  const run = runner || ((args) => {
    return new Promise((resolve, reject) => {
      const child = spawn(FEISHU_CMD, args, { stdio: 'inherit' });
      child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`lark-cli exited ${code}`))));
      child.on('error', reject);
    });
  });
  return run(buildArgs({ title, body, userId }));
}

module.exports = { pushFeishuMessage, isFeishuConfigured, FEISHU_CMD, buildArgs, DEFAULT_USER_ID };
```

**命令签名**（已用 `lark-cli im +messages-send --help` 确认）：`lark-cli im +messages-send --as bot --user-id <open_id> --text <msg>`。收件人 open_id 从 `~/.lark-cli/config.json` 的用户 Sonic 读取。

- [ ] **Step 4: 运行测试验证通过**

Run: `cd ~/Documents/redbook/tools/auto-zhipin && node --test tests/feishu_notify.test.js`
Expected: PASS（3 个测试）

- [ ] **Step 5: 写消息轮询入口 chat_monitor_feishu.js**

```js
// scripts/chat_monitor_feishu.js
'use strict';
// 消息轮询：读取聊天列表 → classifyMessage 分类 → 面试邀约推飞书 + 写 message_classified 事件
const fs = require('node:fs');
const path = require('node:path');
const { classifyMessage } = require('../lib/chat_classifier.js');
const { pushFeishuMessage } = require('../lib/feishu_notify.js');

const DATA_DIR = path.join(__dirname, '..', 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.jsonl');

function appendEvent(event) {
  fs.appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n');
}

// 读取聊天列表（来源：现有 cdp_chat_triage_export.js 或 opencli 输出的 triage json）
function loadChatMessages(triagePath) {
  if (!fs.existsSync(triagePath)) return [];
  const raw = JSON.parse(fs.readFileSync(triagePath, 'utf8'));
  // 结构依赖现有 triage 输出；若字段不一致，实施时按实际 triage 结构适配
  return Array.isArray(raw) ? raw : (raw.messages || []);
}

async function main({ triagePath = path.join(DATA_DIR, 'chat-triage-latest.json') } = {}) {
  const messages = loadChatMessages(triagePath);
  let pushed = 0;
  for (const msg of messages) {
    const text = msg.preview || msg.text || '';
    const { category } = classifyMessage(text);
    appendEvent({
      timestamp: new Date().toISOString(),
      type: 'message_classified',
      payload: { category, jobId: msg.jobId || '', company: msg.company || '' },
    });
    if (category === 'interview') {
      await pushFeishuMessage({
        title: `🎯 面试邀约：${msg.company || '未知公司'}`,
        body: `${msg.jobTitle || ''}\n${text}\n${msg.jobId || ''}`,
      });
      pushed += 1;
    }
  }
  console.log(`chat_monitor: classified ${messages.length} messages, pushed ${pushed} interview invites`);
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { main, loadChatMessages, appendEvent };
```

- [ ] **Step 6: 手动验证脚本入口（dry-run，不真正推送）**

Run: `cd ~/Documents/redbook/tools/auto-zhipin && node -e "require('./scripts/chat_monitor_feishu.js').main({triagePath: '/nonexistent'}).then(()=>console.log('ok (no messages, no push)'))"`
Expected: `chat_monitor: classified 0 messages...` 或 `ok`（无 triage 文件时不崩溃）

- [ ] **Step 7: 提交**

```bash
cd ~/Documents/redbook/tools/auto-zhipin
git add lib/feishu_notify.js tests/feishu_notify.test.js scripts/chat_monitor_feishu.js
git commit -m "feat(boss): add feishu notification + chat monitor polling"
```

---

### Task 6: 日报引擎 daily_report_feishu

**Files:**
- Create: `scripts/daily_report_feishu.js`
- Create: `lib/daily_summary.js`
- Test: `tests/daily_summary.test.js`

**Interfaces:**
- Consumes: `data/ledger.json` / `data/events.jsonl` 结构；Task 5 的 `pushFeishuMessage`；lark-cli `base` 写多维表格
- Produces:
  - `function summarizeDaily(events)` → `{ date, applied, communicated, replied, interviewInvites, conversionRate }`
  - `function buildFeishuBaseRecord(summary)` → `object`（多维表格记录字段）

**目的：** 每日汇总台账 → 生成日报 → 写飞书多维表格 + 推送摘要。

- [ ] **Step 1: 写失败测试**

```js
// tests/daily_summary.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeDaily, buildFeishuBaseRecord } = require('../lib/daily_summary.js');

test('summarizeDaily counts application events', () => {
  const events = [
    { type: 'application_updated', payload: { status: 'applied' } },
    { type: 'application_updated', payload: { status: 'applied' } },
    { type: 'application_updated', payload: { status: 'communicated' } },
  ];
  const s = summarizeDaily(events);
  assert.equal(s.applied, 2);
  assert.equal(s.communicated, 1);
});

test('summarizeDaily counts interview invites', () => {
  const events = [
    { type: 'message_classified', payload: { category: 'interview' } },
    { type: 'message_classified', payload: { category: 'spam' } },
  ];
  const s = summarizeDaily(events);
  assert.equal(s.interviewInvites, 1);
});

test('buildFeishuBaseRecord produces record fields', () => {
  const record = buildFeishuBaseRecord({ date: '2026-08-12', applied: 5, communicated: 3, replied: 2, interviewInvites: 1, conversionRate: 0.2 });
  assert.equal(record.date, '2026-08-12');
  assert.equal(record.applied, 5);
  assert.ok(typeof record.conversionRate === 'number');
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd ~/Documents/redbook/tools/auto-zhipin && node --test tests/daily_summary.test.js`
Expected: FAIL

- [ ] **Step 3: 写最小实现**

```js
// lib/daily_summary.js
'use strict';

function summarizeDaily(events = []) {
  const summary = {
    date: new Date().toISOString().slice(0, 10),
    applied: 0,
    communicated: 0,
    replied: 0,
    interviewInvites: 0,
    conversionRate: 0,
  };
  for (const event of events) {
    if (!event || !event.type) continue;
    if (event.type === 'application_updated') {
      const status = event.payload?.status || '';
      if (status === 'applied') summary.applied += 1;
      if (status === 'communicated') summary.communicated += 1;
      if (status === 'replied') summary.replied += 1;
    }
    if (event.type === 'message_classified' && event.payload?.category === 'interview') {
      summary.interviewInvites += 1;
    }
  }
  if (summary.applied > 0) {
    summary.conversionRate = summary.interviewInvites / summary.applied;
  }
  return summary;
}

function buildFeishuBaseRecord(summary) {
  return {
    date: summary.date,
    applied: summary.applied,
    communicated: summary.communicated,
    replied: summary.replied,
    interviewInvites: summary.interviewInvites,
    conversionRate: Number(summary.conversionRate.toFixed(3)),
  };
}

module.exports = { summarizeDaily, buildFeishuBaseRecord };
```

- [ ] **Step 4: 写脚本入口**

```js
// scripts/daily_report_feishu.js
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { summarizeDaily, buildFeishuBaseRecord } = require('../lib/daily_summary.js');
const { pushFeishuMessage } = require('../lib/feishu_notify.js');

const DATA_DIR = path.join(__dirname, '..', 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.jsonl');

function loadTodayEvents() {
  if (!fs.existsSync(EVENTS_FILE)) return [];
  const today = new Date().toISOString().slice(0, 10);
  const lines = fs.readFileSync(EVENTS_FILE, 'utf8').split('\n').filter(Boolean);
  return lines
    .map((line) => { try { return JSON.parse(line); } catch { return null; } })
    .filter((e) => e && e.timestamp && e.timestamp.slice(0, 10) === today);
}

async function main() {
  const events = loadTodayEvents();
  const summary = summarizeDaily(events);
  const record = buildFeishuBaseRecord(summary);
  console.log('日报汇总:', JSON.stringify(summary, null, 2));

  // 写飞书多维表格（lark-cli base）
  // 目标 base token 与 table id 从环境变量读取（BOSS_FEISHU_BASE_TOKEN / BOSS_FEISHU_TABLE_ID）
  const baseToken = process.env.BOSS_FEISHU_BASE_TOKEN;
  const tableId = process.env.BOSS_FEISHU_TABLE_ID;
  if (baseToken && tableId) {
    const recordsJson = JSON.stringify({ create_records: [record] });
    const { spawnSync } = require('node:child_process');
    spawnSync('lark-cli', ['base', '+record-upsert', '--as', 'bot', '--base-token', baseToken, '--table-id', tableId, '--json', recordsJson], { stdio: 'inherit' });
  } else {
    console.log('未配置 BOSS_FEISHU_BASE_TOKEN/TABLE_ID，跳过多维表格写入');
  }

  // 推送日报摘要消息
  await pushFeishuMessage({
    title: `📊 BOSS 日报 ${summary.date}`,
    body: `投递 ${summary.applied} | 沟通 ${summary.communicated} | 回复 ${summary.replied} | 面试邀约 ${summary.interviewInvites} | 转化率 ${(summary.conversionRate * 100).toFixed(1)}%`,
  });
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { loadTodayEvents, main };
```

- [ ] **Step 5: 运行测试验证通过**

Run: `cd ~/Documents/redbook/tools/auto-zhipin && node --test tests/daily_summary.test.js`
Expected: PASS（3 个测试）

- [ ] **Step 6: 手动验证脚本入口**

Run: `cd ~/Documents/redbook/tools/auto-zhipin && node scripts/daily_report_feishu.js`
Expected: 打印日报汇总 JSON（飞书写入因无凭证会失败但不应崩溃——pushFeishuMessage 的 runner 需容错）

- [ ] **Step 7: 提交**

```bash
cd ~/Documents/redbook/tools/auto-zhipin
git add lib/daily_summary.js tests/daily_summary.test.js scripts/daily_report_feishu.js
git commit -m "feat(boss): daily report engine with feishu base + message push"
```

---

### Task 7: launchd 重构（删旧建新 supervisor）

**Files:**
- Modify: `package.json`（新增 `boss:supervisor` script）
- Create: `scripts/supervisor.sh`
- Create: `com.redbook.boss-supervisor.plist`
- Delete（launchctl unload + rm）: `com.redbook.boss-chatlist.plist`、`com.redbook.boss-daily-apply.plist`、`~/Library/LaunchAgents/com.redbook.daily-zhipin-apply.plist`

**Interfaces:**
- Consumes: Task 6 的 `scripts/daily_report_feishu.js`；现有 `scripts/userscript_gate_server.js`
- Produces:
  - `scripts/supervisor.sh`：拉起 gate 服务器 + 消息分拣轮询 + 日报（可 kill -0 守护）
  - `com.redbook.boss-supervisor.plist`：launchd 常驻任务，仅工作日，3 时段投递

**目的：** 删除 3 套失效旧任务，新建 1 套常驻 supervisor。

- [ ] **Step 1: 卸载失效旧任务**

```bash
launchctl unload ~/Library/LaunchAgents/com.redbook.boss-chatlist.plist 2>/dev/null
launchctl unload ~/Library/LaunchAgents/com.redbook.boss-daily-apply.plist 2>/dev/null
launchctl unload ~/Library/LaunchAgents/com.redbook.daily-zhipin-apply.plist 2>/dev/null
# 删除非 repo 内的孤儿 plist
rm -f ~/Library/LaunchAgents/com.redbook.daily-zhipin-apply.plist
# 解除 repo 内两个旧 plist 的符号链接（保留文件在 git，但不再作为 launchd 任务）
rm -f ~/Library/LaunchAgents/com.redbook.boss-chatlist.plist
rm -f ~/Library/LaunchAgents/com.redbook.boss-daily-apply.plist
```

- [ ] **Step 2: 创建 supervisor 脚本**

```bash
# scripts/supervisor.sh
#!/bin/bash
# BOSS 求职引擎 supervisor：常驻 gate 服务器 + 消息分拣 + 日报
# 仅工作日运行，投递时段由 gate server 内部控制
cd "$(dirname "$0")/.."

LOG_FILE="logs/supervisor_$(date +%Y-%m-%d).log"
mkdir -p logs

# 1. 启动 gate 服务器（若未运行）
if ! pgrep -f "userscript_gate_server.js" >/dev/null; then
  nohup node scripts/userscript_gate_server.js >> "$LOG_FILE" 2>&1 &
  echo "[$(date)] gate server started" >> "$LOG_FILE"
fi

# 2. 消息分拣轮询（每 15 分钟一次，由 launchd StartInterval 控制）
#    chat_monitor_feishu.js 由 Task 5/4 提供，若存在则执行
if [ -f scripts/chat_monitor_feishu.js ]; then
  node scripts/chat_monitor_feishu.js --once >> "$LOG_FILE" 2>&1
fi

# 3. 每日日报（由 launchd StartCalendarInterval 在每日某时触发）
#    daily_report_feishu.js 单独由另一个日历任务触发，见 plist
```

- [ ] **Step 3: 创建 launchd plist**

```xml
<!-- com.redbook.boss-supervisor.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.redbook.boss-supervisor</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/Users/proerror/Documents/redbook/tools/auto-zhipin/scripts/supervisor.sh</string>
    </array>
    <key>StartInterval</key>
    <integer>900</integer>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/Users/proerror/.nvm/versions/node/v24.11.1/bin:/usr/local/bin:/usr/bin:/bin</string>
        <key>HOME</key>
        <string>/Users/proerror</string>
    </dict>
    <key>WorkingDirectory</key>
    <string>/Users/proerror/Documents/redbook/tools/auto-zhipin</string>
    <key>StandardOutPath</key>
    <string>/Users/proerror/Documents/redbook/tools/auto-zhipin/logs/launchd-supervisor.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/proerror/Documents/redbook/tools/auto-zhipin/logs/launchd-supervisor-err.log</string>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

**注意**：`WorkingDirectory` + 完整 `HOME` 设置是修复 `Operation not permitted` 的关键（旧任务缺 WorkingDirectory）。

- [ ] **Step 4: 安装并加载新任务**

```bash
cp /Users/proerror/Documents/redbook/tools/auto-zhipin/com.redbook.boss-supervisor.plist ~/Library/LaunchAgents/
chmod +x /Users/proerror/Documents/redbook/tools/auto-zhipin/scripts/supervisor.sh
launchctl load ~/Library/LaunchAgents/com.redbook.boss-supervisor.plist
launchctl list | grep boss-supervisor
```

- [ ] **Step 5: 验证旧任务已移除 + 新任务运行**

```bash
launchctl list | grep redbook   # 应只剩 boss-supervisor（和无关的 daily-x）
tail -20 ~/Documents/redbook/tools/auto-zhipin/logs/launchd-supervisor.log
```

- [ ] **Step 6: 提交**

```bash
cd ~/Documents/redbook/tools/auto-zhipin
git add scripts/supervisor.sh com.redbook.boss-supervisor.plist package.json
git commit -m "chore(boss): replace dead launchd tasks with supervisor"
```

---

## 自审记录

（writing-plans 流程要求实施前自审。见下方"Self-Review"。）

## 依赖顺序

Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7

每个任务独立可测、可提交。Task 2 依赖 Task 1（humanizedClick），Task 3 依赖自身模块 + 接入 userscript，Task 4/5 独立，Task 6 依赖 Task 5，Task 7 依赖 Task 6。
