#!/usr/bin/env node

const fs = require('node:fs');
const { parseArgs } = require('../lib/utils');
const {
  CHROME_MESSAGE_TRIAGE_PATH,
  CHROME_MESSAGE_TRIAGE_REPORT_PATH,
} = require('../lib/paths');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function formatEntry(entry) {
  const hintText = Array.isArray(entry.matchHints) && entry.matchHints.length
    ? ` | hints: ${entry.matchHints.join(', ')}`
    : '';
  return `- ${entry.title} | ${entry.timeText || 'unknown'} | ${entry.preview}${hintText}`;
}

function formatSection(title, entries, emptyText) {
  if (!entries.length) {
    return [`## ${title}`, `- ${emptyText}`, ''].join('\n');
  }
  return [`## ${title}`, ...entries.map(formatEntry), ''].join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = args.input || CHROME_MESSAGE_TRIAGE_PATH;
  const output = args.output || CHROME_MESSAGE_TRIAGE_REPORT_PATH;
  const triage = readJson(input);
  const buckets = triage.buckets || {};

  const lines = [
    '# BOSS 消息整理',
    '',
    `- 生成时间：${triage.generatedAt || 'unknown'}`,
    `- 扫描会话：${triage.scanned || 0}`,
    '',
    formatSection('立即回复', buckets.reply_candidate || [], '当前没有需要立即回复的会话。'),
    formatSection('建议跟进', buckets.follow_up_candidate || [], '当前没有建议跟进的会话。'),
    formatSection('站外邮箱跳过', buckets.offsite_email || [], '当前没有站外邮箱对象。'),
    formatSection('大公司 / 集团忽略', buckets.big_company_ignore || [], '当前没有大公司忽略对象。'),
    formatSection('暂不动作', buckets.no_action || [], '当前没有暂不动作的会话。'),
  ];

  fs.writeFileSync(output, `${lines.join('\n')}\n`);
  console.log(JSON.stringify({
    input,
    output,
    scanned: triage.scanned || 0,
    followUpCandidates: (buckets.follow_up_candidate || []).length,
    bigCompanyIgnore: (buckets.big_company_ignore || []).length,
  }, null, 2));
}

main();
