const test = require('node:test');
const assert = require('node:assert/strict');

const {
  APPLY_BUTTON_SELECTORS,
  detailMatchesJob,
  extractJob,
  hasPageRisk,
  isApplyVerified,
} = require('../userscript/boss-copilot.user.js');

function textNode(text) {
  return { innerText: text, textContent: text };
}

test('uses the reviewed apply button selector priority', () => {
  assert.deepEqual(APPLY_BUTTON_SELECTORS, [
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
  const applyFlow = source.slice(source.indexOf('async function applyHovered()'));
  assert.match(applyFlow, /request\('POST', '\/gate', \{ job: state\.job \}\)/);
});

test('page risk detection stops auth, verification, and restricted pages', () => {
  assert.equal(hasPageRisk('https://www.zhipin.com/web/user/', ''), true);
  assert.equal(hasPageRisk('https://www.zhipin.com/web/geek/job', '当前访问受限，请稍后重试'), true);
  assert.equal(hasPageRisk('https://www.zhipin.com/web/geek/job', 'AI Agent 架构师 立即沟通'), false);
});
