#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { formatDateStamp } = require('../lib/daily_report');
const { ZhipinStore } = require('../lib/store');
const { DATA_DIR, ROOT_DIR } = require('../lib/paths');
const { makeApplicationIdentity, normalizeWhitespace, parseArgs } = require('../lib/utils');

const DEFAULT_SIDEBAR_PATH = path.join(DATA_DIR, 'chat_sidebar_latest.json');

function resolveDefaultReportPath(date = new Date()) {
  return path.join(ROOT_DIR, '..', '..', 'docs', 'reports', `${formatDateStamp(date)}-zhipin-funnel-report.md`);
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function parseSidebarEntry(raw) {
  const text = normalizeWhitespace(raw);
  const match = text.match(/^(\d{2}:\d{2}|昨天|\d{2}月\d{2}日)\s+(.*)$/);
  const timeText = match ? match[1] : '';
  const body = match ? match[2] : text;
  const readState = /\[已读\]/.test(body)
    ? 'read'
    : /\[送达\]/.test(body)
      ? 'delivered'
      : /\[祈祷\]/.test(body)
        ? 'reaction'
        : 'none';
  const message = body.replace(/\[(已读|送达|祈祷)\]\s*/g, '').trim();
  return { raw: text, timeText, readState, message };
}

function classifyConversation(entry) {
  const text = entry.message;
  const isDefaultGreeting = text.includes('你好，看过您的职位，觉得比较适合自己');

  if (/附件简历已发送给对方|已发送给Boss|已发送给Boss点击查看附件/i.test(text)) {
    return 'resume_sent';
  }
  if (/面试时间已过|方便沟通|面试|约一下|电话/i.test(text)) {
    return 'positive_reply';
  }
  if (/不合适|不太合适|不够匹配|抱歉|未通过|已招满|暂时不考虑/i.test(text)) {
    return 'rejected';
  }
  if (isDefaultGreeting && entry.readState === 'read') {
    return 'opened_no_reply';
  }
  if (isDefaultGreeting && entry.readState === 'delivered') {
    return 'delivered_no_reply';
  }
  if (!isDefaultGreeting) {
    return 'replied_needs_followup';
  }
  return 'unknown';
}

function pickBestApplication(entry, applications) {
  const haystack = entry.raw;
  let best = null;
  for (const application of applications) {
    if (!application.company || !haystack.includes(application.company)) {
      continue;
    }
    let score = application.company.length;
    if (application.title && haystack.includes(application.title)) {
      score += application.title.length;
    }
    if (!best || score > best.score) {
      best = { score, application };
    }
  }
  return best ? best.application : null;
}

function buildBuckets(conversations, applications) {
  const buckets = {
    positive_reply: [],
    replied_needs_followup: [],
    rejected: [],
    resume_sent: [],
    opened_no_reply: [],
    delivered_no_reply: [],
    unknown: [],
  };

  for (const conversation of conversations) {
    const matchedApplication = pickBestApplication(conversation, applications);
    const category = classifyConversation(conversation);
    buckets[category].push({
      ...conversation,
      category,
      company: matchedApplication?.company || '',
      title: matchedApplication?.title || '',
      identityKey: matchedApplication?.identityKey || '',
      applicationStatus: matchedApplication?.status || '',
    });
  }
  return buckets;
}

function uniqueAppliedApplications(applications) {
  const seen = new Set();
  const result = [];
  for (const application of applications) {
    if (application.status !== 'applied') {
      continue;
    }
    const identityKey = application.identityKey || makeApplicationIdentity(application);
    if (!identityKey || seen.has(identityKey)) {
      continue;
    }
    seen.add(identityKey);
    result.push(application);
  }
  return result;
}

function toBulletList(items, formatter, empty = '- 无') {
  if (!items.length) {
    return empty;
  }
  return items.map((item) => `- ${formatter(item)}`).join('\n');
}

function buildMarkdown({ summary, buckets, uniqueApplied, unmatchedRejections, duplicateApplied }) {
  return `# BOSS 投递漏斗报表

生成时间：${new Date().toISOString()}

## 总览
- 去重后已投递：${summary.uniqueApplied}
- 聊天列表已抓取会话：${summary.sidebarCount}
- 明确拒绝：${summary.rejected}
- 系统已发附件简历：${summary.resumeSent}
- 已读未回：${summary.openedNoReply}
- 送达未回：${summary.deliveredNoReply}
- 有回复待跟进：${summary.repliedNeedsFollowup}
- 正向/可继续聊：${summary.positiveReply}
- 账面重复投递风险：${summary.duplicateApplied}

## 高优先级跟进
${toBulletList(
  [...buckets.positive_reply, ...buckets.replied_needs_followup],
  (item) => `${item.timeText} ${item.company || '未匹配公司'}${item.title ? ` / ${item.title}` : ''}：${item.message}`,
)}

## 明确拒绝
${toBulletList(
  buckets.rejected,
  (item) => `${item.timeText} ${item.company || '未匹配公司'}${item.title ? ` / ${item.title}` : ''}：${item.message}`,
)}

## 已发附件简历
${toBulletList(
  buckets.resume_sent,
  (item) => `${item.timeText} ${item.company || '未匹配公司'}：${item.message}`,
)}

## 等待中
### 已读未回
${toBulletList(
  buckets.opened_no_reply,
  (item) => `${item.timeText} ${item.company || '未匹配公司'}${item.title ? ` / ${item.title}` : ''}`,
)}

### 送达未回
${toBulletList(
  buckets.delivered_no_reply,
  (item) => `${item.timeText} ${item.company || '未匹配公司'}${item.title ? ` / ${item.title}` : ''}`,
)}

## 去重后已投岗位
${toBulletList(
  uniqueApplied,
  (item) => `${item.company} / ${item.title}${item.manualRecord ? ' [manualRecord]' : ''}`,
)}

## 未匹配到 ledger 的拒绝或系统消息
${toBulletList(
  unmatchedRejections,
  (item) => `${item.timeText} ${item.message}`,
)}

## 重复投递风险
${toBulletList(
  duplicateApplied,
  (item) => `${item.identityKey} -> ${item.count} 次：${item.items.map((entry) => `${entry.company}/${entry.title}`).join('；')}`,
)}
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sidebarPath = args.sidebar || DEFAULT_SIDEBAR_PATH;
  const reportPath = args.output || resolveDefaultReportPath();
  const store = new ZhipinStore();

  const sidebarRaw = readJson(sidebarPath, []);
  const conversations = sidebarRaw.map(parseSidebarEntry);
  const applications = Object.values(store.ledger.applications || {});
  const uniqueApplied = uniqueAppliedApplications(applications);
  const buckets = buildBuckets(conversations, uniqueApplied);

  const duplicateGroups = new Map();
  for (const application of applications.filter((item) => item.status === 'applied')) {
    const identityKey = application.identityKey || makeApplicationIdentity(application);
    if (!identityKey) {
      continue;
    }
    if (!duplicateGroups.has(identityKey)) {
      duplicateGroups.set(identityKey, []);
    }
    duplicateGroups.get(identityKey).push(application);
  }
  const duplicateApplied = Array.from(duplicateGroups.entries())
    .map(([identityKey, items]) => ({ identityKey, count: items.length, items }))
    .filter((group) => group.count > 1);

  const unmatchedRejections = [...buckets.rejected, ...buckets.resume_sent]
    .filter((item) => !item.company);

  const summary = {
    uniqueApplied: uniqueApplied.length,
    sidebarCount: conversations.length,
    rejected: buckets.rejected.length,
    resumeSent: buckets.resume_sent.length,
    openedNoReply: buckets.opened_no_reply.length,
    deliveredNoReply: buckets.delivered_no_reply.length,
    repliedNeedsFollowup: buckets.replied_needs_followup.length,
    positiveReply: buckets.positive_reply.length,
    duplicateApplied: duplicateApplied.length,
  };

  const markdown = buildMarkdown({
    summary,
    buckets,
    uniqueApplied,
    unmatchedRejections,
    duplicateApplied,
  });

  ensureDir(path.dirname(reportPath));
  fs.writeFileSync(reportPath, markdown);

  console.log(JSON.stringify({
    summary,
    reportPath,
    sidebarPath,
  }, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = {
  resolveDefaultReportPath,
};
