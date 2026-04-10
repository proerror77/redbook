#!/usr/bin/env node

const { ZhipinStore } = require('../lib/store');

function buildAsciiBar(value, maxValue, width = 24) {
  if (value <= 0 || maxValue <= 0) {
    return ''.padEnd(width, ' ');
  }
  const filled = Math.max(1, Math.round((value / maxValue) * width));
  return ''.padEnd(filled, '#').padEnd(width, ' ');
}

function buildAsciiFunnel(summary = {}) {
  const stages = [
    { label: 'Jobs', value: Number(summary.jobs || 0) },
    { label: 'Matched', value: Number(summary.matched || 0) },
    { label: 'Applied', value: Number(summary.applied || 0) },
    { label: 'Pending Drafts', value: Number(summary.pendingDrafts || 0) },
  ];
  const maxValue = Math.max(...stages.map((stage) => stage.value), 0);
  return stages
    .map((stage) => `${stage.label.padEnd(14)} |${buildAsciiBar(stage.value, maxValue)}| ${stage.value}`)
    .join('\n');
}

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
  console.log('=== ASCII Funnel ===');
  console.log(buildAsciiFunnel(summary));
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

if (require.main === module) {
  main();
}

module.exports = {
  buildAsciiFunnel,
};
