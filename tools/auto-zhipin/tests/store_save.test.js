const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { ZhipinStore } = require('../lib/store');

test('ZhipinStore.save wraps persistence failures with ledger path and context', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zhipin-store-save-'));
  const blockerPath = path.join(tempDir, 'not-a-directory');
  fs.writeFileSync(blockerPath, 'x');

  const store = new ZhipinStore({
    dataDir: tempDir,
    ledgerPath: path.join(blockerPath, 'ledger.json'),
    eventsPath: path.join(tempDir, 'events.jsonl'),
  });

  assert.throws(
    () => store.save({ operation: 'unit_test', runId: 'run-1' }),
    (error) => {
      assert.match(error.message, /Failed to save ledger/);
      assert.match(error.message, /unit_test/);
      assert.match(error.message, /run-1/);
      assert.match(error.message, /ledger\.json/);
      return true;
    }
  );
});
