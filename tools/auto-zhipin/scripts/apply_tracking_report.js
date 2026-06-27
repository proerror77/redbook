#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { ZhipinStore } = require('../lib/store');
const { parseArgs } = require('../lib/utils');
const {
  buildApplyTrackingReport,
  renderMarkdownReport,
} = require('../lib/apply_tracking_report');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeFile(filePath, value) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, value);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const store = new ZhipinStore();
  const report = buildApplyTrackingReport(store.ledger, {
    now: args.now,
    staleHours: args['stale-hours'] || args.staleHours,
  });

  if (args.output) {
    writeFile(args.output, `${JSON.stringify(report, null, 2)}\n`);
  }
  if (args.markdown) {
    writeFile(args.markdown, renderMarkdownReport(report, {
      limit: args.limit || 20,
    }));
  }

  console.log(JSON.stringify({
    generatedAt: report.generatedAt,
    staleHours: report.staleHours,
    summary: report.summary,
    output: args.output || '',
    markdown: args.markdown || '',
  }, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
};
