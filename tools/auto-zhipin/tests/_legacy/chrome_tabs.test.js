const test = require('node:test');
const assert = require('node:assert/strict');

const { pickManagedTabCandidate, urlMatchesRole } = require('../lib/managed_tabs');

test('pickManagedTabCandidate prefers an explicit role marker', () => {
  const tabs = [
    { tabIndex: 1, url: 'https://www.zhipin.com/web/geek/jobs', role: '' },
    { tabIndex: 2, url: 'https://www.zhipin.com/web/geek/jobs', role: 'jobs' },
  ];

  const candidate = pickManagedTabCandidate(tabs, 'jobs', {});
  assert.equal(candidate.tabIndex, 2);
});

test('pickManagedTabCandidate falls back to role URL matching', () => {
  const tabs = [
    { tabIndex: 1, url: 'https://example.com', role: '' },
    { tabIndex: 2, url: 'https://www.zhipin.com/web/geek/chat?ka=header-message', role: '' },
  ];

  const candidate = pickManagedTabCandidate(tabs, 'chat', {});
  assert.equal(candidate.tabIndex, 2);
});

test('urlMatchesRole distinguishes jobs and chat tabs', () => {
  assert.equal(urlMatchesRole('jobs', 'https://www.zhipin.com/job_detail/abc.html'), true);
  assert.equal(urlMatchesRole('chat', 'https://www.zhipin.com/web/geek/chat?ka=header-message'), true);
  assert.equal(urlMatchesRole('chat', 'https://www.zhipin.com/web/geek/jobs'), false);
});
