import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const helperModuleUrl = pathToFileURL(path.resolve(
  '/Users/proerror/Documents/redbook/tools/opencli/vendor/@jackwener/opencli/dist/clis/boss/_helpers.js'
)).href;

test('formatActionRow preserves standardized action fields while adding CLI extras', async () => {
  const { formatActionRow } = await import(helperModuleUrl);
  const row = formatActionRow({
    ok: true,
    action: 'apply',
    status: 'success',
    reason: null,
    button: '立即沟通',
    url: 'https://www.zhipin.com/job_detail/demo.html',
  }, {
    conversationId: 'c1',
  });

  assert.equal(row.ok, true);
  assert.equal(row.action, 'apply');
  assert.equal(row.status, 'success');
  assert.equal(row.reason, '');
  assert.equal(row.button, '立即沟通');
  assert.equal(row.url, 'https://www.zhipin.com/job_detail/demo.html');
  assert.equal(row.conversationId, 'c1');
});

test('formatActionRow falls back to status/reason for human-facing mode and via columns', async () => {
  const { formatActionRow } = await import(helperModuleUrl);
  const row = formatActionRow({
    ok: false,
    action: 'send_message',
    status: 'failed',
    reason: 'input_not_found',
  });

  assert.equal(row.mode, 'input_not_found');
  assert.equal(row.via, 'input_not_found');
  assert.equal(row.status, 'failed');
  assert.equal(row.reason, 'input_not_found');
});
