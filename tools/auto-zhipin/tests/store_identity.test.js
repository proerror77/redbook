const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { ZhipinStore } = require('../lib/store');
const { makeApplicationIdentity } = require('../lib/utils');

test('makeApplicationIdentity normalizes company and title consistently', () => {
  const left = makeApplicationIdentity({
    company: '上海 萃普 信息技术',
    title: 'AI智能体开发工程师',
  });
  const right = makeApplicationIdentity({
    company: '上海萃普信息技术',
    title: 'AI 智能体 开发工程师',
  });

  assert.equal(left, right);
});

test('ZhipinStore can find an applied application by normalized identity', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zhipin-store-identity-'));
  const store = new ZhipinStore({
    dataDir: tempDir,
    ledgerPath: path.join(tempDir, 'ledger.json'),
    eventsPath: path.join(tempDir, 'events.jsonl'),
  });

  store.upsertApplication({
    jobId: 'job-1',
    company: '上海萃普信息技术',
    title: 'AI智能体开发工程师',
    status: 'applied',
  });

  const matched = store.findApplicationByIdentity({
    company: '上海 萃普 信息技术',
    title: 'AI 智能体 开发工程师',
  }, ['applied']);

  assert.ok(matched);
  assert.equal(matched.jobId, 'job-1');
});

test('getTodaySuccessfulApplies counts only first successful apply per identity', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zhipin-store-today-'));
  const store = new ZhipinStore({
    dataDir: tempDir,
    ledgerPath: path.join(tempDir, 'ledger.json'),
    eventsPath: path.join(tempDir, 'events.jsonl'),
  });

  store.upsertApplication({
    jobId: 'old-url',
    company: '重复公司',
    title: 'AI应用架构师',
    status: 'applied',
    appliedAt: '2026-03-22T08:00:00.000Z',
  });
  store.upsertApplication({
    jobId: 'today-dup-url',
    company: '重复公司',
    title: 'AI 应用 架构师',
    status: 'applied',
    appliedAt: '2026-04-30T02:00:00.000Z',
  });
  store.upsertApplication({
    jobId: 'today-new-url',
    company: '新公司',
    title: 'AI Agent 工程师',
    status: 'applied',
    appliedAt: '2026-04-30T03:00:00.000Z',
  });

  assert.equal(store.getTodaySuccessfulApplies('2026-04-30T12:00:00.000Z'), 1);
});

test('getTodaySuccessfulApplies excludes non-monthly salary rates', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zhipin-store-today-rate-'));
  const store = new ZhipinStore({
    dataDir: tempDir,
    ledgerPath: path.join(tempDir, 'ledger.json'),
    eventsPath: path.join(tempDir, 'events.jsonl'),
  });

  store.upsertApplication({
    jobId: 'hourly-url',
    company: '智映社',
    title: '智能体开发',
    salaryText: '50-100元/时',
    status: 'applied',
    appliedAt: '2026-04-30T06:50:00.000Z',
  });
  store.upsertApplication({
    jobId: 'today-new-url',
    company: '合格公司',
    title: 'AI Agent 工程师',
    salaryText: '30-45K',
    status: 'applied',
    appliedAt: '2026-04-30T07:00:00.000Z',
  });

  assert.equal(store.getTodaySuccessfulApplies('2026-04-30T12:00:00.000Z'), 1);
});

test('getTodaySuccessfulApplies excludes non-technical AI operations roles', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zhipin-store-today-role-'));
  const store = new ZhipinStore({
    dataDir: tempDir,
    ledgerPath: path.join(tempDir, 'ledger.json'),
    eventsPath: path.join(tempDir, 'events.jsonl'),
  });

  store.upsertApplication({
    jobId: 'ops-url',
    company: '海南深航信息技术',
    title: 'Ai落地应用推荐官/主播/互联网运营',
    salaryText: '20-40K',
    status: 'applied',
    appliedAt: '2026-04-30T07:20:00.000Z',
  });
  store.upsertApplication({
    jobId: 'engineering-url',
    company: '合格公司',
    title: 'AI Agent 工程师',
    salaryText: '30-45K',
    status: 'applied',
    appliedAt: '2026-04-30T07:30:00.000Z',
  });

  assert.equal(store.getTodaySuccessfulApplies('2026-04-30T12:00:00.000Z'), 1);
});
