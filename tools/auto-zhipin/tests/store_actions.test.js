const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { ZhipinStore } = require('../lib/store');

test('ZhipinStore upserts and completes actions without duplicating a dedupe key', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zhipin-store-'));
  const store = new ZhipinStore({
    dataDir: tempDir,
    ledgerPath: path.join(tempDir, 'ledger.json'),
    eventsPath: path.join(tempDir, 'events.jsonl'),
  });

  const actionId = store.upsertAction({
    conversationId: 'conversation-1',
    messageId: 'message-1',
    type: 'send_resume_button',
    dedupeKey: 'conversation-1:message-1:send_resume_button',
    status: 'pending',
  });

  const secondId = store.upsertAction({
    conversationId: 'conversation-1',
    messageId: 'message-1',
    type: 'send_resume_button',
    dedupeKey: 'conversation-1:message-1:send_resume_button',
    status: 'pending',
    payload: { source: 'retry' },
  });

  assert.equal(secondId, actionId);
  assert.equal(store.getPendingActions().length, 1);

  store.markActionStatus(actionId, 'completed', { via: '发送简历' });

  assert.equal(store.getPendingActions().length, 0);
  assert.equal(store.ledger.actions[actionId].status, 'completed');
  assert.equal(store.ledger.actions[actionId].result.via, '发送简历');
  assert.ok(store.ledger.actions[actionId].executedAt);
});
