const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { ZhipinStore } = require('../lib/store');

function makeStore() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zhipin-store-supervisor-'));
  return new ZhipinStore({
    dataDir: tempDir,
    ledgerPath: path.join(tempDir, 'ledger.json'),
    eventsPath: path.join(tempDir, 'events.jsonl'),
  });
}

test('ZhipinStore acquires, blocks, and reclaims supervisor locks', () => {
  const store = makeStore();

  const first = store.acquireSupervisorLock('worker-a', { ttlMs: 1000, nowMs: 1000 });
  assert.equal(first.acquired, true);
  assert.equal(first.lock.owner, 'worker-a');

  const blocked = store.acquireSupervisorLock('worker-b', { ttlMs: 1000, nowMs: 1500 });
  assert.equal(blocked.acquired, false);
  assert.equal(blocked.reason, 'already_locked');

  const reclaimed = store.acquireSupervisorLock('worker-b', { ttlMs: 1000, nowMs: 2501 });
  assert.equal(reclaimed.acquired, true);
  assert.equal(reclaimed.lock.owner, 'worker-b');
});

test('ZhipinStore persists supervisor checkpoint and managed tabs', () => {
  const store = makeStore();

  store.setSupervisorCheckpoint({
    status: 'running',
    nextRole: 'chat',
  }, { source: 'unit_test' });
  store.setManagedTabs({
    jobs: { tabIndex: 2, url: 'https://www.zhipin.com/web/geek/jobs' },
    chat: { tabIndex: 3, url: 'https://www.zhipin.com/web/geek/chat?ka=header-message' },
  }, { source: 'unit_test' });

  assert.equal(store.getSupervisorCheckpoint().status, 'running');
  assert.equal(store.getSupervisorCheckpoint().nextRole, 'chat');
  assert.equal(store.getManagedTabs().jobs.tabIndex, 2);
  assert.equal(store.getManagedTabs().chat.tabIndex, 3);
});
