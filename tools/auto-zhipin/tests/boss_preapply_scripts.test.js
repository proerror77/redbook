const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildApplicationFromMeta,
  validateTargetUrl: validatePlaywrightTargetUrl,
} = require('../scripts/boss_apply_playwright');
const {
  buildCandidateFromMeta,
  extractCompanyProfileText,
  validateTargetUrl: validateCdpTargetUrl,
} = require('../scripts/cdp_apply_job');
const {
  buildEntry,
} = require('../scripts/cdp_chat_triage_export');

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
