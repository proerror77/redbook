const test = require('node:test');
const assert = require('node:assert/strict');

const { buildDailyReportMarkdown, resolveDailyReportPath } = require('../lib/daily_report');

test('resolveDailyReportPath uses the project report directory with a local date stamp', () => {
  const reportPath = resolveDailyReportPath({
    projectRoot: '/Users/proerror/Documents/redbook',
    date: new Date('2026-03-19T10:00:00+08:00'),
  });

  assert.equal(
    reportPath,
    '/Users/proerror/Documents/redbook/05-选题研究/求职日报-2026-03-19.md'
  );
});

test('buildDailyReportMarkdown includes summary and attempted results', () => {
  const markdown = buildDailyReportMarkdown({
    dateLabel: '2026-03-19',
    summary: {
      applied: 12,
      matched: 4,
      skipped: 20,
      pendingDrafts: 2,
      pendingActions: 1,
    },
    siteHealth: { status: 'healthy', reason: null },
    attempted: [
      { company: '某科技', candidate: 'AI智能体开发工程师', ok: true, mode: 'detail_success_signal', greetingSource: 'claude' },
      { company: '另一家公司', candidate: 'AI应用架构师', ok: false, mode: 'detail_gate', reasons: ['salary_below_minimum'] },
    ],
  });

  assert.match(markdown, /# 求职日报 2026-03-19/);
  assert.match(markdown, /累计已投递：12/);
  assert.match(markdown, /某科技 \/ AI智能体开发工程师/);
  assert.match(markdown, /greeting=claude/);
  assert.match(markdown, /salary_below_minimum/);
});
