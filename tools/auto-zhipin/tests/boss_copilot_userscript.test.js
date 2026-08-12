const test = require('node:test');
const assert = require('node:assert/strict');

const {
  APPLY_BUTTON_SELECTORS,
  AUTO_APPLY_ENABLED,
  buildClickEventsInternal,
  detectRiskPopupInternal,
  detailMatchesJob,
  extractJob,
  hasPageRisk,
  humanizedClick,
  humanizedDispatch,
  isApplyVerified,
  shouldThrottleInternal,
} = require('../userscript/boss-copilot.user.js');

function textNode(text) {
  return { innerText: text, textContent: text };
}

test('uses the reviewed apply button selector priority', () => {
  assert.deepEqual(APPLY_BUTTON_SELECTORS, [
    // BOSS 新版按钮结构（2026-08 实测）：class 为 op-btn-chat / op-btn，页面级
    'a.op-btn-chat',
    '.op-btn-chat',
    '.op-btn.btn-chat',
    // 旧版详情页按钮（保留兼容）
    '.job-op .btn-startchat',
    '.btn-startchat-wrap .btn-startchat',
    'a.btn.btn-startchat',
    'a[redirect-url*="/web/geek/chat"]',
    'a[ka*="chat"]',
    'a[data-url*="/friend/add"]',
  ]);
});

test('extractJob reads card fields without applying filter logic', () => {
  const values = new Map([
    ['.job-name', textNode('AI Agent 架构师')],
    ['.company-name', textNode('示例科技')],
    ['.salary', textNode('40-60K·14薪')],
    ['.job-area', textNode('上海')],
  ]);
  const root = {
    innerText: 'AI Agent 架构师 示例科技 40-60K·14薪 上海 5-10年 本科',
    querySelector: (selector) => values.get(selector) || null,
    querySelectorAll: () => [textNode('5-10年'), textNode('本科')],
  };
  const anchor = {
    href: 'https://www.zhipin.com/job_detail/example.html?lid=1',
    innerText: 'AI Agent 架构师',
    textContent: 'AI Agent 架构师',
    closest: () => root,
  };

  assert.deepEqual(extractJob(anchor), {
    url: 'https://www.zhipin.com/job_detail/example.html?lid=1',
    title: 'AI Agent 架构师',
    company: '示例科技',
    salaryText: '40-60K·14薪',
    location: '上海',
    experienceText: '5-10年',
    degreeText: '本科',
    summary: root.innerText,
  });
});

test('global detail button must match the hovered job title', () => {
  const job = { title: 'AI Agent 架构师', company: '示例科技' };
  assert.equal(detailMatchesJob('AI Agent 架构师\n示例科技\n立即沟通', job), true);
  assert.equal(detailMatchesJob('AI Agent 架构师\n另一家公司\n立即沟通', job), false);
  assert.equal(detailMatchesJob('后端工程师\n另一家公司\n立即沟通', job), false);
});

test('apply verification accepts continue text or chat navigation only', () => {
  assert.equal(isApplyVerified('https://www.zhipin.com/web/geek/job', '立即沟通', '继续沟通'), true);
  assert.equal(isApplyVerified('https://www.zhipin.com/web/geek/chat?id=1', '', ''), true);
  assert.equal(isApplyVerified('https://www.zhipin.com/web/geek/job', '已有岗位 继续沟通', '已有岗位 继续沟通'), false);
  assert.equal(isApplyVerified('https://www.zhipin.com/web/geek/job', '立即沟通', '立即沟通'), false);
});

test('apply hotkey rechecks the gate before clicking', () => {
  const source = require('node:fs').readFileSync(require.resolve('../userscript/boss-copilot.user.js'), 'utf8');
  const applyFlow = source.slice(source.indexOf('async function applyHovered('));
  assert.match(applyFlow, /request\('POST', '\/gate', \{ job: state\.job \}\)/);
});

test('card-local button miss opens target card detail before global apply', () => {
  const source = require('node:fs').readFileSync(require.resolve('../userscript/boss-copilot.user.js'), 'utf8');
  const applyFlow = source.slice(source.indexOf('async function applyHovered('));
  // New BOSS layout: cards have no button, so the script must click the target card
  // (openDetailForJob) and re-check the detail panel before clicking the global button.
  assert.match(applyFlow, /await openDetailForJob\(state\)/);
  assert.match(applyFlow, /detail = document\.querySelector\(DETAIL_SELECTOR\)/);
  assert.match(applyFlow, /button = findButton\(detail \|\| document\)/);
  assert.match(applyFlow, /detailMatchesJob\(detail\.innerText, state\.job\)/);
  // The anti-mistake protection is preserved: refuse if the panel didn't switch to the target job
  assert.match(applyFlow, /lastResult = 'detail_mismatch'/);
});

test('openDetailForJob clicks the card and waits for panel to match target job', () => {
  const source = require('node:fs').readFileSync(require.resolve('../userscript/boss-copilot.user.js'), 'utf8');
  const fn = source.slice(source.indexOf('async function openDetailForJob('), source.indexOf('async function applyHovered('));
  assert.match(fn, /humanizedDispatch\(clickTarget\)/);
  assert.match(fn, /detailMatchesJob\(panel\.innerText, state\.job\)/);
  assert.match(fn, /timeoutMs = 4000/);
});

test('page risk detection stops auth, verification, and restricted pages', () => {
  assert.equal(hasPageRisk('https://www.zhipin.com/web/user/', ''), true);
  assert.equal(hasPageRisk('https://www.zhipin.com/web/geek/job', '当前访问受限，请稍后重试'), true);
  assert.equal(hasPageRisk('https://www.zhipin.com/web/geek/job', 'AI Agent 架构师 立即沟通'), false);
});

test('AUTO_APPLY_ENABLED is exported and defaults to true', () => {
  assert.equal(AUTO_APPLY_ENABLED, true);
});

test('buildClickEventsInternal returns correct event chain with pointer fields', () => {
  const target = { addEventListener: () => {}, dispatchEvent: () => {} };
  const events = buildClickEventsInternal(target);
  assert.equal(events.length, 5);
  assert.deepEqual(events.map((e) => e.type), ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']);

  // Verify pointer fields
  for (const ev of events) {
    assert.equal(ev.init.pointerId, 1);
    assert.equal(ev.init.isPrimary, true);
    assert.equal(ev.init.pointerType, 'mouse');
    assert.equal(ev.init.bubbles, true);
    assert.equal(ev.init.cancelable, true);
  }

  // Verify pressure values
  assert.equal(events[0].init.pressure, 0.5); // pointerdown
  assert.equal(events[2].init.pressure, 0);   // pointerup
});

test('humanizedDispatch generates monotonic timestamps', () => {
  const dispatched = [];
  const target = {
    dispatchEvent: (event) => {
      dispatched.push({ type: event.type, timeStamp: event.timeStamp });
      return true;
    },
  };

  const result = humanizedDispatch(target);
  assert.equal(result, true);
  assert.equal(dispatched.length, 5);

  // Verify strict monotonicity
  for (let i = 1; i < dispatched.length; i++) {
    assert.ok(dispatched[i].timeStamp > dispatched[i - 1].timeStamp,
      `timestamp[${i}] (${dispatched[i].timeStamp}) should be > timestamp[${i-1}] (${dispatched[i - 1].timeStamp})`);
  }
});

test('humanizedDispatch returns false on dispatch error', () => {
  const target = {
    dispatchEvent: () => {
      throw new Error('dispatch failed');
    },
  };
  const result = humanizedDispatch(target);
  assert.equal(result, false);
});

test('auto-apply wiring present in scan function', () => {
  const source = require('node:fs').readFileSync(require.resolve('../userscript/boss-copilot.user.js'), 'utf8');
  const scanFlow = source.slice(source.indexOf('async function scan()'));
  assert.match(scanFlow, /AUTO_APPLY_ENABLED/);
  assert.match(scanFlow, /applyHovered\(/);
});

test('applyHovered handles humanizedClick failure path correctly', () => {
  const source = require('node:fs').readFileSync(require.resolve('../userscript/boss-copilot.user.js'), 'utf8');
  const applyFlow = source.slice(source.indexOf('async function applyHovered('));
  // 投递点击现在用拟人化 humanizedClick（异步、按住节奏），失败路径仍记 click_dispatch_failed
  assert.match(applyFlow, /await humanizedClick\(button\)/);
  assert.match(applyFlow, /if \(!clickOk\)/);
  assert.match(applyFlow, /lastResult = 'click_dispatch_failed'/);
  assert.match(applyFlow, /state\.status = 'failed'/);
  assert.match(applyFlow, /recordResult\(state, false, 'click_dispatch_failed'\)/);
  assert.match(applyFlow, /renderBadge\(state, '点击派发失败', 'block'\)/);
});

test('detectRiskPopupInternal (inlined) flags captcha text', () => {
  assert.equal(detectRiskPopupInternal('请完成安全验证').risk, true);
  assert.equal(detectRiskPopupInternal('验证码').risk, true);
  assert.equal(detectRiskPopupInternal('AI 产品负责人，月薪 70K').risk, false);
  assert.equal(detectRiskPopupInternal('').risk, false);
});

test('notifyRiskStopped helper posts to gate server /paused with job context', () => {
  const source = require('node:fs').readFileSync(require.resolve('../userscript/boss-copilot.user.js'), 'utf8');
  assert.match(source, /function notifyRiskStopped\(state, reason\)/);
  assert.match(source, /request\('POST', '\/paused', \{/);
  assert.match(source, /reason,\n\s+job: state \? \{ url: state\.job\.url, title: state\.job\.title, company: state\.job\.company \} : \{\}/);
});

test('risk popup stop calls notifyRiskStopped with the popup reason', () => {
  const source = require('node:fs').readFileSync(require.resolve('../userscript/boss-copilot.user.js'), 'utf8');
  const riskFlow = source.slice(source.indexOf('async function applyHovered('));
  // The risk-popup path must stop (status=block, render badge) AND notify the user
  assert.match(riskFlow, /detectRiskPopupInternal\(document\.body\.innerText\)/);
  assert.match(riskFlow, /state\.status = 'block'/);
  assert.match(riskFlow, /notifyRiskStopped\(state, `risk_popup_\$\{riskPopup\.reason\}\`\)/);
});

test('page risk (login/verify/403) stop also notifies the user', () => {
  const source = require('node:fs').readFileSync(require.resolve('../userscript/boss-copilot.user.js'), 'utf8');
  const riskFlow = source.slice(source.indexOf('async function applyHovered('));
  assert.match(riskFlow, /hasPageRisk\(window\.location\.href, document\.body\.innerText\)/);
  assert.match(riskFlow, /lastResult = 'page_risk_detected'/);
  assert.match(riskFlow, /notifyRiskStopped\(state, 'page_risk_detected'\)/);
});

test('shouldThrottleInternal (inlined) enforces cap and interval', () => {
  assert.equal(shouldThrottleInternal({ appliedToday: 120, maxPerDay: 120, lastAppliedAt: Date.now() - 50000, intervalSeconds: 45 }), true);
  assert.equal(shouldThrottleInternal({ appliedToday: 5, maxPerDay: 120, lastAppliedAt: Date.now() - 1000, intervalSeconds: 45 }), true);
  assert.equal(shouldThrottleInternal({ appliedToday: 5, maxPerDay: 120, lastAppliedAt: Date.now() - 50000, intervalSeconds: 45 }), false);
});

test('humanizedClick uses realistic press-and-hold pacing with monotonic timestamps', async () => {
  const dispatched = [];
  const target = {
    dispatchEvent: (event) => {
      dispatched.push({ type: event.type, timeStamp: event.timeStamp });
      return true;
    },
  };
  // setTimeoutFn 传 0 立即回调，避免真等 70-160ms
  const result = await humanizedClick(target, { setTimeoutFn: (cb) => cb() });
  assert.equal(result, true);
  assert.deepEqual(dispatched.map((d) => d.type), ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click']);
  for (let i = 1; i < dispatched.length; i++) {
    assert.ok(dispatched[i].timeStamp >= dispatched[i - 1].timeStamp,
      `timestamp[${i}] should be >= previous`);
  }
});

test('humanizedClick returns false on dispatch error', async () => {
  const target = {
    dispatchEvent: () => { throw new Error('dispatch failed'); },
  };
  const result = await humanizedClick(target, { setTimeoutFn: (cb) => cb() });
  assert.equal(result, false);
});

test('auto-apply viewport-first selection and scroll-feed exploration present in scan', () => {
  const source = require('node:fs').readFileSync(require.resolve('../userscript/boss-copilot.user.js'), 'utf8');
  const scanFlow = source.slice(source.indexOf('async function scan()'));
  // 视口内第一张 allow 卡优先；无则拟人化下拉探索
  assert.match(scanFlow, /allowStates\.find\(/);
  assert.match(scanFlow, /getBoundingClientRect/);
  assert.match(scanFlow, /scrollFeedForMore\(\)/);
  assert.match(scanFlow, /noAllowScrollCooldownUntil/);
  assert.match(scanFlow, /noAllowStrikeCount/);
  // 无搜索/翻页/导航
  assert.doesNotMatch(scanFlow, /window\.location\s*=/);
  assert.doesNotMatch(scanFlow, /location\.href\s*=/);
  assert.doesNotMatch(scanFlow, /\.click\(\)/);
});

test('scrollFeedForMore defined with humanized small-step scrolling', () => {
  const source = require('node:fs').readFileSync(require.resolve('../userscript/boss-copilot.user.js'), 'utf8');
  const fn = source.slice(source.indexOf('async function scrollFeedForMore('), source.indexOf('function isVisible('));
  assert.match(fn, /scrollBy\(\{ top:/);
  assert.match(fn, /behavior: 'smooth'/);
  assert.match(fn, /2 \+ Math\.floor\(Math\.random\(\) \* 3\)/); // 2-4 小步
  assert.match(fn, /moved < 100/); // 到底部判定
});

test('isVisible excludes is-disabled buttons', () => {
  const source = require('node:fs').readFileSync(require.resolve('../userscript/boss-copilot.user.js'), 'utf8');
  const fn = source.slice(source.indexOf('function isVisible('), source.indexOf('function findButton('));
  assert.match(fn, /classList\.contains\('is-disabled'\)/);
});

test('throttle interval jittered in apply flow', () => {
  const source = require('node:fs').readFileSync(require.resolve('../userscript/boss-copilot.user.js'), 'utf8');
  const applyFlow = source.slice(source.indexOf('async function applyHovered('));
  assert.match(applyFlow, /interval = 45 \+ Math\.floor\(Math\.random\(\) \* 45\)/);
  assert.match(applyFlow, /intervalSeconds: interval/);
});

test('apply failures also reset the throttle clock (no 5s re-attempt storm)', () => {
  const source = require('node:fs').readFileSync(require.resolve('../userscript/boss-copilot.user.js'), 'utf8');
  const applyFlow = source.slice(source.indexOf('async function applyHovered('));
  // lastAppliedAt 必须在成功和失败路径都重置；不得再出现"仅成功才重置"的旧写法
  assert.doesNotMatch(applyFlow, /if \(success\) lastAppliedAt/);
  assert.match(applyFlow, /lastAppliedAt = Date\.now\(\)/);
});

test('detail_mismatch failures also cool down (no repeated card clicks)', () => {
  const source = require('node:fs').readFileSync(require.resolve('../userscript/boss-copilot.user.js'), 'utf8');
  const applyFlow = source.slice(source.indexOf('async function applyHovered('));
  assert.match(applyFlow, /state\.failCount = \(state\.failCount \|\| 0\) \+ 1/);
  assert.match(applyFlow, /lastAppliedAt = Date\.now\(\); \/\/ 面板未切换也冷却/);
});

test('failed apply re-checks risk post-click and closes business dialog', () => {
  const source = require('node:fs').readFileSync(require.resolve('../userscript/boss-copilot.user.js'), 'utf8');
  const applyFlow = source.slice(source.indexOf('async function applyHovered('));
  // 点击后无导航：先重查风控词，真风控必须停+通知；否则拟人关闭业务对话框
  assert.match(applyFlow, /const postRisk = detectRiskPopupInternal\(document\.body\.innerText\)/);
  assert.match(applyFlow, /notifyRiskStopped\(state, `risk_popup_\$\{postRisk\.reason\}`\)/);
  assert.match(applyFlow, /await closeOpenDialog\(\)/);
});

test('repeated failures exclude the job from auto-apply candidates', () => {
  const source = require('node:fs').readFileSync(require.resolve('../userscript/boss-copilot.user.js'), 'utf8');
  const scanFlow = source.slice(source.indexOf('async function scan()'));
  assert.match(scanFlow, /\(s\.failCount \|\| 0\) < 2/);
  assert.match(scanFlow, /if \(outcome === 'throttled'\) await exploreFeed\(\)/);
  assert.match(scanFlow, /async function exploreFeed\(\)/);
});

test('post-apply stay/continue confirm dialog is treated as apply success', () => {
  const source = require('node:fs').readFileSync(require.resolve('../userscript/boss-copilot.user.js'), 'utf8');
  const applyFlow = source.slice(source.indexOf('async function applyHovered('));
  // 点击"立即沟通"后弹"留在本页/继续沟通"确认框 = 投递成功：记 success，点"留在本页"关闭
  assert.match(applyFlow, /const stayBtn = findStayButton\(document\)/);
  assert.match(applyFlow, /success = true/);
  assert.match(applyFlow, /humanizedClick\(stayBtn\)/);
  assert.match(applyFlow, /else if \(stayBtn\)/);
});

test('findStayButton defined and scoped to dialog containers', () => {
  const source = require('node:fs').readFileSync(require.resolve('../userscript/boss-copilot.user.js'), 'utf8');
  const fn = source.slice(source.indexOf('function findStayButton('), source.indexOf('function isVisible('));
  assert.match(fn, /\[class\*="dialog"\]/);
  assert.match(fn, /留在本页/);
  // "继续沟通"只在确认框容器内认，避免误点推荐流卡片的"继续沟通"状态按钮
  assert.match(fn, /if \(containers\.length\)/);
});
