// tests/daily_summary.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeDaily, buildFeishuBaseRecord } = require('../lib/daily_summary.js');

test('summarizeDaily counts application events', () => {
  const events = [
    { type: 'application_updated', payload: { status: 'applied' } },
    { type: 'application_updated', payload: { status: 'applied' } },
    { type: 'application_updated', payload: { status: 'communicated' } },
  ];
  const s = summarizeDaily(events);
  assert.equal(s.applied, 2);
  assert.equal(s.communicated, 1);
});

test('summarizeDaily counts interview invites', () => {
  const events = [
    { type: 'message_classified', payload: { category: 'interview' } },
    { type: 'message_classified', payload: { category: 'spam' } },
  ];
  const s = summarizeDaily(events);
  assert.equal(s.interviewInvites, 1);
});

test('buildFeishuBaseRecord produces record fields', () => {
  const record = buildFeishuBaseRecord({ date: '2026-08-12', applied: 5, communicated: 3, replied: 2, interviewInvites: 1, conversionRate: 0.2 });
  assert.equal(record.date, '2026-08-12');
  assert.equal(record.applied, 5);
  assert.ok(typeof record.conversionRate === 'number');
});
