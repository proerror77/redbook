#!/usr/bin/env node

const fs = require('node:fs');
const { parseArgs, normalizeWhitespace } = require('../lib/utils');
const {
  CHROME_MESSAGE_TRIAGE_PATH,
  DATA_DIR,
} = require('../lib/paths');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildDraft(entry) {
  const title = normalizeWhitespace(entry.title || '');
  const preview = normalizeWhitespace(entry.preview || '');
  const isCeo = /CEO/i.test(title);
  const isHr = /HR|招聘|人事/i.test(title);
  const mentionsAgent = /agent|智能体|workflow|工作流|harness/i.test(`${title} ${preview}`);

  if (isCeo && mentionsAgent) {
    return '你好，前面看了你这边的方向，我这边比较擅长企业 AI 应用落地、Agent workflow 设计，以及咨询加交付这一类项目。如果你们现在还在推进相关场景，我可以结合你们当前业务目标，先聊聊能最快落地的一条线。';
  }

  if (isCeo) {
    return '你好，前面看了你这边的岗位和方向，我这边更偏企业 AI 应用、流程改造和 Agent 落地。如果你们还在看这个方向，我可以结合产品、交付和工程实现一起聊聊，看看有没有合作空间。';
  }

  if (isHr) {
    return '你好，我这边再跟进一下。如果岗位还在推进，方便的话可以约个时间聊聊具体业务场景和团队当前最想解决的问题。我比较擅长企业 AI 应用落地、Agent 工作流和咨询加交付这类项目。';
  }

  return '你好，我再跟进一下。如果这个岗位还在推进，我这边可以结合你们当前业务场景，聊聊 AI 应用落地、流程改造和 Agent workflow 这块我能怎么尽快上手。';
}

function formatEntry(entry) {
  return [
    `## ${entry.title}`,
    '',
    `- 时间：${entry.timeText || 'unknown'}`,
    `- 预览：${entry.preview || ''}`,
    `- 建议动作：继续跟进，不自动发送`,
    '',
    '建议回复：',
    buildDraft(entry),
    '',
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = args.input || CHROME_MESSAGE_TRIAGE_PATH;
  const output = args.output || `${DATA_DIR}/followup-drafts-latest.md`;
  const triage = readJson(input);
  const entries = triage?.buckets?.follow_up_candidate || [];

  const markdown = [
    '# BOSS 跟进草稿',
    '',
    `- 生成时间：${new Date().toISOString()}`,
    `- 候选数：${entries.length}`,
    '',
    ...(entries.length ? entries.map(formatEntry) : ['当前没有可跟进对象。', '']),
  ].join('\n');

  fs.writeFileSync(output, `${markdown}\n`);
  console.log(JSON.stringify({
    input,
    output,
    candidates: entries.length,
  }, null, 2));
}

main();
