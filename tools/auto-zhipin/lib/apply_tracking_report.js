const { makeApplicationIdentity } = require('./utils');

const RETRYABLE_STATUSES = new Set(['failed', 'not_verified', 'retryable']);
const TERMINAL_STATUSES = new Set(['applied', 'deduped', 'skipped']);

function normalizeReasons(application = {}) {
  return [
    ...(Array.isArray(application.reasons) ? application.reasons : []),
    application.reason,
    application.applyResult?.reason,
    application.applyResult?.mode,
    application.applyResult?.status,
  ].filter(Boolean).map((reason) => String(reason));
}

function isRetryableApplication(application = {}) {
  const status = String(application.status || '');
  if (RETRYABLE_STATUSES.has(status)) {
    return true;
  }
  if (status !== 'skipped') {
    return false;
  }
  return normalizeReasons(application).some((reason) => (
    /not_verified|apply_not_verified|target_url_mismatch|trace_unstable_navigation|navigation/i.test(reason)
  ));
}

function getApplicationIdentity(application = {}) {
  return application.identityKey
    || makeApplicationIdentity(application)
    || `url:${application.url || application.jobId || application.id || ''}`;
}

function sortByNewest(left, right) {
  const leftTime = Date.parse(left.updatedAt || left.appliedAt || left.failedAt || left.skippedAt || 0) || 0;
  const rightTime = Date.parse(right.updatedAt || right.appliedAt || right.failedAt || right.skippedAt || 0) || 0;
  return rightTime - leftTime;
}

function compactApplication(application = {}) {
  return {
    jobId: application.jobId || application.id || '',
    url: application.url || '',
    title: application.title || '',
    company: application.company || '',
    salaryText: application.salaryText || application.salary || '',
    status: application.status || '',
    source: application.source || '',
    appliedAt: application.appliedAt || '',
    failedAt: application.failedAt || '',
    skippedAt: application.skippedAt || '',
    updatedAt: application.updatedAt || '',
    reasons: normalizeReasons(application),
    identityKey: getApplicationIdentity(application),
  };
}

function buildDuplicateGroups(applications = []) {
  const groups = new Map();
  for (const application of applications) {
    const identityKey = getApplicationIdentity(application);
    if (!identityKey) {
      continue;
    }
    if (!groups.has(identityKey)) {
      groups.set(identityKey, []);
    }
    groups.get(identityKey).push(application);
  }

  return Array.from(groups.entries())
    .filter(([, group]) => group.length > 1)
    .map(([identityKey, group]) => ({
      identityKey,
      count: group.length,
      statuses: Array.from(new Set(group.map((item) => item.status || 'unknown'))),
      applications: group.sort(sortByNewest).map(compactApplication),
    }))
    .sort((left, right) => right.count - left.count || left.identityKey.localeCompare(right.identityKey));
}

function buildApplyTrackingReport(ledger = {}, options = {}) {
  const nowMs = Date.parse(options.now || new Date()) || Date.now();
  const staleHours = Math.max(1, Number(options.staleHours || 48));
  const staleCutoffMs = nowMs - staleHours * 60 * 60 * 1000;
  const applications = Object.values(ledger.applications || {});

  const retryable = applications
    .filter(isRetryableApplication)
    .sort(sortByNewest)
    .map(compactApplication);

  const staleApplied = applications
    .filter((application) => {
      if (application.status !== 'applied') {
        return false;
      }
      const appliedAtMs = Date.parse(application.appliedAt || '');
      return appliedAtMs > 0 && appliedAtMs <= staleCutoffMs && !application.followedUpAt;
    })
    .sort((left, right) => String(left.appliedAt || '').localeCompare(String(right.appliedAt || '')))
    .map(compactApplication);

  const matchedCandidates = applications
    .filter((application) => application.status === 'matched')
    .sort(sortByNewest)
    .map(compactApplication);

  const duplicateGroups = buildDuplicateGroups(
    applications.filter((application) => TERMINAL_STATUSES.has(application.status) || isRetryableApplication(application))
  );

  return {
    generatedAt: new Date(nowMs).toISOString(),
    staleHours,
    summary: {
      applications: applications.length,
      applied: applications.filter((item) => item.status === 'applied').length,
      matched: matchedCandidates.length,
      retryable: retryable.length,
      staleApplied: staleApplied.length,
      duplicateGroups: duplicateGroups.length,
    },
    retryable,
    staleApplied,
    matchedCandidates,
    duplicateGroups,
  };
}

function renderMarkdownReport(report = {}, options = {}) {
  const limit = Math.max(1, Number(options.limit || 20));
  const lines = [
    '# BOSS Apply Tracking Report',
    '',
    `Generated: ${report.generatedAt || ''}`,
    `Stale threshold: ${report.staleHours || 48}h`,
    '',
    '## Summary',
    '',
    `- Applications: ${report.summary?.applications || 0}`,
    `- Applied: ${report.summary?.applied || 0}`,
    `- Matched candidates: ${report.summary?.matched || 0}`,
    `- Retryable failures: ${report.summary?.retryable || 0}`,
    `- Stale applied: ${report.summary?.staleApplied || 0}`,
    `- Duplicate groups: ${report.summary?.duplicateGroups || 0}`,
    '',
  ];

  function addSection(title, rows) {
    lines.push(`## ${title}`, '');
    if (!rows.length) {
      lines.push('- None', '');
      return;
    }
    for (const row of rows.slice(0, limit)) {
      const label = [row.company, row.title, row.salaryText].filter(Boolean).join(' / ');
      const reasons = row.reasons?.length ? ` | reasons: ${row.reasons.join(', ')}` : '';
      lines.push(`- ${label || row.jobId || row.url} | ${row.status}${reasons}`);
      if (row.url) {
        lines.push(`  ${row.url}`);
      }
    }
    if (rows.length > limit) {
      lines.push(`- ... ${rows.length - limit} more`);
    }
    lines.push('');
  }

  addSection('Retryable', report.retryable || []);
  addSection('Stale Applied', report.staleApplied || []);
  addSection('Matched Candidates', report.matchedCandidates || []);

  lines.push('## Duplicate Groups', '');
  if (!report.duplicateGroups?.length) {
    lines.push('- None', '');
  } else {
    for (const group of report.duplicateGroups.slice(0, limit)) {
      lines.push(`- ${group.identityKey} | count: ${group.count} | statuses: ${group.statuses.join(', ')}`);
    }
    if (report.duplicateGroups.length > limit) {
      lines.push(`- ... ${report.duplicateGroups.length - limit} more`);
    }
    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}

module.exports = {
  buildApplyTrackingReport,
  buildDuplicateGroups,
  compactApplication,
  isRetryableApplication,
  renderMarkdownReport,
};
