const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildApplicationFromMeta,
  validateTargetUrl: validatePlaywrightTargetUrl,
} = require('../scripts/boss_apply_playwright');
const {
  buildCandidateFromMeta,
  pickReusableTarget,
  extractCompanyProfileText,
  getHeadhunterBlockReasons,
  isChatNavigationSuccess,
  normalizeClickMode,
  validateTargetUrl: validateCdpTargetUrl,
} = require('../scripts/cdp_apply_job');
const {
  buildEntry,
} = require('../scripts/cdp_chat_triage_export');
const {
  findTraceBlockingIssues,
  findTraceNavigationIssues,
  probeOnce,
  readOption,
} = require('../scripts/boss_trace_probe');
const {
  classifyUrl: classifyTraceApplyUrl,
  isCandidateBlockOnly,
} = require('../scripts/boss_trace_apply_batch');

test('boss_apply_playwright builds a non-empty identity from detail metadata', () => {
  const application = buildApplicationFromMeta({
    url: 'https://www.zhipin.com/job_detail/target.html',
  }, {
    url: 'https://www.zhipin.com/job_detail/target.html',
    evidence: {
      initialMeta: {
        url: 'https://www.zhipin.com/job_detail/target.html',
        title: 'AI Agent 工程师',
        company: '小团队科技',
        salaryText: '45-60K',
        companySize: '20-99人',
      },
    },
  });

  assert.equal(application.company, '小团队科技');
  assert.equal(application.title, 'AI Agent 工程师');
  assert.equal(application.identityKey, '小团队科技::aiagent工程师');
});

test('cdp_apply_job builds a gated candidate from detail metadata', () => {
  const candidate = buildCandidateFromMeta({
    url: 'https://www.zhipin.com/job_detail/target.html',
    jobName: '企业 AI 应用架构师',
    salaryText: '50-70K',
    company: '落地科技',
    actionText: '继续沟通',
    infoTags: ['上海', '5-10年', '本科'],
    companyTags: ['20-99人', 'A轮'],
  }, 'https://www.zhipin.com/job_detail/target.html');

  assert.equal(candidate.identityKey, '落地科技::企业ai应用架构师');
  assert.equal(candidate.companySize, '20-99人');
  assert.equal(candidate.stage, 'A轮');
  assert.equal(candidate.applyState, 'already_continuing');
});

test('cdp_apply_job derives location experience and degree by tag meaning', () => {
  const candidate = buildCandidateFromMeta({
    url: 'https://www.zhipin.com/job_detail/target.html',
    jobName: 'AI Agent 架构师',
    salaryText: '45-70K',
    company: '智能应用科技',
    infoTags: ['本科', '上海', '5-10年'],
    companyTags: ['20-99人'],
  }, 'https://www.zhipin.com/job_detail/target.html');

  assert.equal(candidate.location, '上海');
  assert.equal(candidate.experienceText, '5-10年');
  assert.equal(candidate.degreeText, '本科');
});

test('cdp_apply_job supplements detail fields from body text', () => {
  const candidate = buildCandidateFromMeta({
    url: 'https://www.zhipin.com/job_detail/target.html',
    jobName: '工业大模型平台技术负责人',
    salaryText: '50-80K',
    company: '只冲科技',
    infoTags: ['招聘中', '50-80K'],
    companyTags: ['工业大模型平台技术负责人', '50-80K'],
    body: [
      '工业大模型平台技术负责人 50-80K',
      '上海 5-10年 本科',
      '公司基本信息',
      '只冲科技',
      'A轮',
      '100-499人',
    ].join('\n'),
  }, 'https://www.zhipin.com/job_detail/target.html');

  assert.equal(candidate.location, '上海');
  assert.equal(candidate.experienceText, '5-10年');
  assert.equal(candidate.degreeText, '本科');
  assert.equal(candidate.companySize, '100-499人');
  assert.equal(candidate.stage, 'A轮');
});

test('cdp_apply_job carries company profile text for hidden company blacklist checks', () => {
  const body = [
    '公司基本信息',
    '上海从鲸信息技术',
    '未融资',
    '500-999人',
    '职位描述',
    '负责大模型基础设施',
    '公司介绍',
    '创立于2015年4月，2018年7月在美国纳斯达克上市（NASDAQ：PDD）。',
    '拼多多集团-PDD致力于以创新的消费者体验创造价值。',
    '工商信息',
    '公司名称',
  ].join('\n');
  const candidate = buildCandidateFromMeta({
    url: 'https://www.zhipin.com/job_detail/target.html',
    jobName: 'AI Infra研发工程师',
    salaryText: '21-22K',
    company: '上海从鲸信息技术',
    infoTags: ['上海', '在校/应届', '硕士'],
    companyTags: ['500-999人', '未融资'],
    body,
  }, 'https://www.zhipin.com/job_detail/target.html');

  assert.match(extractCompanyProfileText(body), /拼多多集团-PDD/);
  assert.match(candidate.summary, /NASDAQ：PDD/);
});

test('cdp_apply_job keeps mouse click as default and accepts explicit DOM click mode', () => {
  assert.equal(normalizeClickMode(), 'mouse');
  assert.equal(normalizeClickMode('mouse'), 'mouse');
  assert.equal(normalizeClickMode('dom'), 'dom');
  assert.equal(normalizeClickMode('element-click'), 'dom');
  assert.equal(normalizeClickMode('unexpected'), 'mouse');
});

test('cdp_apply_job blocks headhunter and anonymous agency detail pages', () => {
  assert.deepEqual(
    getHeadhunterBlockReasons({
      company: '某大型互联网公司',
      location: '代招公司：上海某大型电子商务公司',
      summary: '负责 AI Agent 平台',
    }, {}),
    ['headhunter_or_agency_recruiter', 'anonymous_headhunter_company']
  );

  assert.deepEqual(
    getHeadhunterBlockReasons({
      company: '上海真实智能科技',
      location: '上海',
      summary: '负责企业 AI Agent 落地',
    }, {}),
    []
  );
});

test('cdp_apply_job treats matching BOSS chat navigation as an apply success signal', () => {
  assert.equal(
    isChatNavigationSuccess(
      'https://www.zhipin.com/job_detail/abc123.html',
      'https://www.zhipin.com/web/geek/chat?id=x&jobId=abc123&securityId=y'
    ),
    true
  );
  assert.equal(
    isChatNavigationSuccess(
      'https://www.zhipin.com/job_detail/abc123.html',
      'https://www.zhipin.com/web/geek/chat?id=x&jobId=other&securityId=y'
    ),
    false
  );
});

test('apply target validators reject URL mismatches', () => {
  assert.deepEqual(
    validatePlaywrightTargetUrl('https://www.zhipin.com/job_detail/expected.html', {
      url: 'https://www.zhipin.com/job_detail/actual.html',
    }).reason,
    'target_url_mismatch'
  );

  assert.deepEqual(
    validateCdpTargetUrl(
      'https://www.zhipin.com/job_detail/expected.html',
      'https://www.zhipin.com/web/geek/jobs'
    ).reason,
    'target_url_not_verified'
  );
});

test('cdp_apply_job can reuse an existing safe BOSS homepage tab', async () => {
  const server = await new Promise((resolve) => {
    const http = require('node:http');
    const instance = http.createServer((request, response) => {
      if (request.url === '/json/list') {
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify([
          {
            type: 'page',
            url: 'https://www.zhipin.com/',
            webSocketDebuggerUrl: 'ws://127.0.0.1/devtools/page/home',
          },
        ]));
        return;
      }
      response.statusCode = 404;
      response.end('not found');
    }).listen(0, () => resolve(instance));
  });
  try {
    const port = server.address().port;
    const target = await pickReusableTarget(`http://127.0.0.1:${port}`, 'https://www.zhipin.com/job_detail/target.html');
    assert.equal(target.url, 'https://www.zhipin.com/');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('cdp_apply_job refuses to reuse an existing blocked BOSS page', async () => {
  const server = await new Promise((resolve) => {
    const http = require('node:http');
    const instance = http.createServer((request, response) => {
      if (request.url === '/json/list') {
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify([
          {
            type: 'page',
            url: 'https://www.zhipin.com/web/passport/zp/error.html?tip=x',
            webSocketDebuggerUrl: 'ws://127.0.0.1/devtools/page/error',
          },
        ]));
        return;
      }
      response.statusCode = 404;
      response.end('not found');
    }).listen(0, () => resolve(instance));
  });
  try {
    const port = server.address().port;
    await assert.rejects(
      () => pickReusableTarget(`http://127.0.0.1:${port}`, 'https://www.zhipin.com/job_detail/target.html'),
      /Existing-page-only mode refuses new tabs/
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('chat triage entry classification uses opened message text, not just preview', () => {
  const entry = buildEntry({
    id: 'conversation-1',
    title: '张女士拒绝科技HR',
    preview: '你好，可以看一下吗',
    timeText: '04月29日',
    messages: [{
      text: '抱歉，暂时不考虑，岗位匹配度有所差距。',
      direction: 'incoming',
    }],
  });

  assert.equal(entry.category, 'explicit_rejection');
  assert.ok(entry.matchHints.includes('拒绝科技'));
  assert.equal(entry.messages[0].text, '抱歉，暂时不考虑，岗位匹配度有所差距。');
});

test('boss_trace_probe exports a probe runner for trace-backed dry-run checks', () => {
  assert.equal(typeof probeOnce, 'function');
});

test('boss_trace_probe accepts dashed keep-trace CLI options', () => {
  assert.equal(readOption({ 'keep-trace': 'true' }, 'keepTrace', 'keep-trace'), 'true');
  assert.equal(readOption({ keepTrace: 'false', 'keep-trace': 'true' }, 'keepTrace', 'keep-trace'), 'false');
});

test('boss_trace_probe flags trace navigation to a different job detail', () => {
  const issues = findTraceNavigationIssues({
    pages: [
      { pageId: 0, url: 'https://www.zhipin.com/job_detail/expected.html' },
      { pageId: 1, url: 'https://www.zhipin.com/job_detail/other.html' },
      { pageId: 2, url: 'about:blank' },
    ],
  }, 'https://www.zhipin.com/job_detail/expected.html');

  assert.deepEqual(issues, [{
    reason: 'trace_unstable_navigation',
    pageId: 1,
    url: 'https://www.zhipin.com/job_detail/other.html',
  }]);
});

test('boss_trace_probe flags auth security and abnormal account trace pages', () => {
  const issues = findTraceBlockingIssues({
    pages: [
      { pageId: 0, url: 'https://www.zhipin.com/job_detail/expected.html' },
      { pageId: 1, url: 'https://www.zhipin.com/web/user/' },
      { pageId: 2, url: 'https://www.zhipin.com/web/passport/zp/error.html?tip=x' },
      { pageId: 3, url: 'https://www.zhipin.com/403.html?code=38' },
      { pageId: 4, url: 'https://www.zhipin.com/web/common/security-check' },
    ],
  });

  assert.deepEqual(issues.map((issue) => issue.reason), [
    'trace_login_navigation',
    'trace_abnormal_account_navigation',
    'trace_restricted_navigation',
    'trace_security_navigation',
  ]);
});

test('boss_trace_apply_batch separates candidate blocks from session blockers', () => {
  assert.equal(classifyTraceApplyUrl('https://www.zhipin.com/web/passport/zp/error.html?tip=x'), 'abnormal_account_page');
  assert.equal(classifyTraceApplyUrl('https://www.zhipin.com/web/user/'), 'login_page');
  assert.equal(classifyTraceApplyUrl('https://www.zhipin.com/403.html?code=38'), 'restricted_page');
  assert.equal(classifyTraceApplyUrl('https://www.zhipin.com/job_detail/target.html'), '');

  assert.equal(isCandidateBlockOnly(['salary_below_minimum', 'duplicate_identity']), true);
  assert.equal(isCandidateBlockOnly(['trace_abnormal_account_navigation']), false);
  assert.equal(isCandidateBlockOnly(['target_url_mismatch']), false);
});
