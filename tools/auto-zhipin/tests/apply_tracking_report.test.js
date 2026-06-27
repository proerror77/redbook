const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildApplyTrackingReport,
  isRetryableApplication,
  renderMarkdownReport,
} = require('../lib/apply_tracking_report');

test('apply tracking report separates retryable failures from terminal skips', () => {
  const ledger = {
    applications: {
      failed: {
        jobId: 'failed',
        title: 'AI Agent 工程师',
        company: '失败公司',
        status: 'failed',
        failedAt: '2026-06-27T01:00:00.000Z',
        reasons: ['native_feed_apply_not_verified'],
      },
      legacySkippedFailure: {
        jobId: 'legacy-skipped',
        title: 'AI 架构师',
        company: '旧失败公司',
        status: 'skipped',
        skippedAt: '2026-06-27T01:10:00.000Z',
        reasons: ['apply_not_verified'],
      },
      terminalSkipped: {
        jobId: 'terminal-skipped',
        title: 'AI 运营',
        company: '不合适公司',
        status: 'skipped',
        skippedAt: '2026-06-27T01:20:00.000Z',
        reasons: ['low_salary'],
      },
    },
  };

  const report = buildApplyTrackingReport(ledger, { now: '2026-06-27T12:00:00.000Z' });

  assert.deepEqual(
    report.retryable.map((item) => item.jobId).sort(),
    ['failed', 'legacy-skipped']
  );
  assert.equal(isRetryableApplication(ledger.applications.terminalSkipped), false);
});

test('apply tracking report lists stale applies and duplicate identity groups', () => {
  const ledger = {
    applications: {
      oldApplied: {
        jobId: 'old-applied',
        title: 'AI Agent 负责人',
        company: '重复公司',
        status: 'applied',
        appliedAt: '2026-06-24T01:00:00.000Z',
      },
      duplicateFailure: {
        jobId: 'duplicate-failure',
        title: 'AI Agent负责人',
        company: '重复 公司',
        status: 'failed',
        failedAt: '2026-06-26T01:00:00.000Z',
        reasons: ['apply_not_verified'],
      },
      freshApplied: {
        jobId: 'fresh-applied',
        title: 'AI 平台负责人',
        company: '新公司',
        status: 'applied',
        appliedAt: '2026-06-27T10:00:00.000Z',
      },
      matched: {
        jobId: 'matched',
        title: 'AI 架构师',
        company: '候选公司',
        status: 'matched',
        updatedAt: '2026-06-27T11:00:00.000Z',
      },
    },
  };

  const report = buildApplyTrackingReport(ledger, {
    now: '2026-06-27T12:00:00.000Z',
    staleHours: 48,
  });

  assert.deepEqual(report.staleApplied.map((item) => item.jobId), ['old-applied']);
  assert.deepEqual(report.matchedCandidates.map((item) => item.jobId), ['matched']);
  assert.equal(report.duplicateGroups.length, 1);
  assert.equal(report.duplicateGroups[0].count, 2);

  const markdown = renderMarkdownReport(report, { limit: 5 });
  assert.match(markdown, /Retryable/);
  assert.match(markdown, /Duplicate Groups/);
});
