const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { ZhipinStore } = require('../lib/store');

test('ZhipinStore persists site health and exposes active restriction', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zhipin-store-health-'));
  const store = new ZhipinStore({
    dataDir: tempDir,
    ledgerPath: path.join(tempDir, 'ledger.json'),
    eventsPath: path.join(tempDir, 'events.jsonl'),
  });

  store.setSiteHealth({
    status: 'restricted',
    reason: 'body:访问受限',
    recoveryAt: '2099-03-12T07:31:00.000Z',
    sourceUrl: 'https://www.zhipin.com/web/geek/jobs',
  });

  const active = store.getActiveRestriction(Date.parse('2099-03-12T07:30:00.000Z'));
  assert.ok(active);
  assert.equal(active.status, 'restricted');
  assert.equal(active.reason, 'body:访问受限');

  store.setSiteHealth({
    status: 'healthy',
    reason: null,
    recoveryAt: null,
    sourceUrl: 'https://www.zhipin.com/web/geek/chat',
  });

  assert.equal(store.getActiveRestriction(Date.parse('2099-03-12T07:30:00.000Z')), null);
});
