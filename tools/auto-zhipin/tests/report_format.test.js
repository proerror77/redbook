const test = require('node:test');
const assert = require('node:assert/strict');

const { buildAsciiFunnel } = require('../scripts/report');
const { resolveDefaultReportPath } = require('../scripts/funnel_report');

test('buildAsciiFunnel renders core pipeline stages in ASCII', () => {
  const output = buildAsciiFunnel({
    jobs: 40,
    matched: 10,
    applied: 4,
    pendingDrafts: 2,
  });

  assert.match(output, /Jobs/);
  assert.match(output, /Matched/);
  assert.match(output, /Applied/);
  assert.match(output, /Pending Drafts/);
  assert.match(output, /40/);
});

test('resolveDefaultReportPath uses today date instead of a fixed historical filename', () => {
  const reportPath = resolveDefaultReportPath(new Date('2026-03-19T10:00:00+08:00'));
  assert.equal(
    reportPath,
    '/Users/proerror/Documents/redbook/docs/reports/2026-03-19-zhipin-funnel-report.md'
  );
});
