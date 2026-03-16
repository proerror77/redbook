const test = require('node:test');
const assert = require('node:assert/strict');

const { evaluateJob, parseExperience, parseSalaryRange } = require('../lib/filters');

test('parseSalaryRange parses monthly salary text', () => {
  assert.deepEqual(parseSalaryRange('25-35K·14薪'), {
    minMonthlyK: 25,
    maxMonthlyK: 35,
  });
});

test('parseExperience handles unrestricted experience', () => {
  assert.deepEqual(parseExperience('经验不限'), {
    minYears: 0,
    maxYears: 0,
    unrestricted: true,
  });
});

test('evaluateJob rejects excluded keywords and low salary', () => {
  const result = evaluateJob(
    {
      title: 'AI 销售顾问',
      company: '某公司',
      salaryText: '10-15K',
      experienceText: '1-3年',
      degreeText: '本科',
      summary: '偏销售岗位',
    },
    {
      includeKeywords: [],
      excludeKeywords: ['销售'],
      minMonthlySalaryK: 20,
      maxExperienceYears: 8,
      allowedDegrees: ['本科'],
      excludeCompanySizes: [],
      excludeFundingStages: [],
      excludeLocations: [],
      excludeRecruiterTitles: [],
    }
  );

  assert.equal(result.allow, false);
  assert.deepEqual(result.reasons.sort(), ['matched_exclude_keyword', 'salary_below_minimum'].sort());
});

test('evaluateJob allows a matching engineering role', () => {
  const result = evaluateJob(
    {
      title: '全栈工程师',
      company: '某 AI 公司',
      salaryText: '30-45K',
      experienceText: '3-5年',
      degreeText: '本科',
      summary: 'Node.js React AI Agent',
    },
    {
      includeKeywords: ['AI', '全栈'],
      excludeKeywords: ['销售'],
      minMonthlySalaryK: 20,
      maxExperienceYears: 8,
      allowedDegrees: ['本科'],
      excludeCompanySizes: [],
      excludeFundingStages: [],
      excludeLocations: [],
      excludeRecruiterTitles: [],
    }
  );

  assert.equal(result.allow, true);
  assert.deepEqual(result.reasons, []);
});

test('evaluateJob rejects overseas facility operations roles', () => {
  const result = evaluateJob(
    {
      title: '基础设施运维工程师/值班长（驻日本等）',
      company: '上海科栈科技有限公司',
      salaryText: '12-19K',
      experienceText: '1-3年',
      degreeText: '大专',
      summary: '驻外国家/地区：日本，马来西亚；IDC机房运维；暖通；UPS；柴油发电机；配电室；高压电工；低压电工',
    },
    {
      includeKeywords: [],
      excludeKeywords: ['销售', '外包', '贷款', '保险'],
      minMonthlySalaryK: 20,
      maxExperienceYears: 8,
      allowedDegrees: ['大专', '本科', '硕士'],
      excludeCompanySizes: [],
      excludeFundingStages: [],
      excludeLocations: [],
      excludeRecruiterTitles: [],
    }
  );

  assert.equal(result.allow, false);
  assert.deepEqual(
    result.reasons.sort(),
    ['facility_ops_excluded', 'overseas_assignment_excluded', 'salary_below_minimum'].sort()
  );
});

test('evaluateJob still allows genuine AI infrastructure software roles', () => {
  const result = evaluateJob(
    {
      title: 'AI 基础设施软件架构负责人',
      company: '超擎数智',
      salaryText: '35-50K·13薪',
      experienceText: '5-10年',
      degreeText: '本科',
      summary: '负责 AI 训练/推理集群管理系统、算力调度系统、网络智能调优系统、GPU 集群与 RDMA 优化',
    },
    {
      includeKeywords: [],
      excludeKeywords: ['销售', '外包', '贷款', '保险'],
      minMonthlySalaryK: 20,
      maxExperienceYears: 10,
      allowedDegrees: ['本科', '硕士'],
      excludeCompanySizes: [],
      excludeFundingStages: [],
      excludeLocations: [],
      excludeRecruiterTitles: [],
    }
  );

  assert.equal(result.allow, true);
  assert.deepEqual(result.reasons, []);
});
