#!/usr/bin/env node

const { ZhipinStore } = require('../lib/store');

function main() {
  const store = new ZhipinStore();
  const summary = store.summary();
  const pendingDrafts = store.getPendingDrafts().slice(0, 10);
  const pendingActions = store.getPendingActions().slice(0, 10);
  const latestApplications = Object.values(store.ledger.applications)
    .sort((left, right) => String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')))
    .slice(0, 10);

  console.log('=== Zhipin Prototype Summary ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log('');
  console.log('=== Pending Drafts ===');
  console.log(JSON.stringify(pendingDrafts, null, 2));
  console.log('');
  console.log('=== Pending Actions ===');
  console.log(JSON.stringify(pendingActions, null, 2));
  console.log('');
  console.log('=== Latest Applications ===');
  console.log(JSON.stringify(latestApplications, null, 2));
}

main();
