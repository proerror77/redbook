import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const helperModuleUrl = pathToFileURL(path.resolve(
  '/Users/proerror/Documents/redbook/tools/opencli/lib/verify_helpers.js'
)).href;

test('isTransientBridgeError recognizes bridge disconnects and target navigation resets', async () => {
  const { isTransientBridgeError } = await import(helperModuleUrl);

  assert.equal(isTransientBridgeError('Extension not connected'), true);
  assert.equal(
    isTransientBridgeError('API evaluate failed: {"code":-32000,"message":"Inspected target navigated or closed"}'),
    true
  );
  assert.equal(isTransientBridgeError('boss search failed: HTTP 401'), false);
});
