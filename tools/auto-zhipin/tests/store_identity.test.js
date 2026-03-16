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
