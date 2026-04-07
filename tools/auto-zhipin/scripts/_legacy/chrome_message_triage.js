#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { loadConfig } = require('../lib/config');
const { createCurrentTabAdapter, navigateCurrentTab } = require('../lib/chrome_current');
const { requireBossCoreModule } = require('../lib/opencli_core');
const {
  deriveMatchHints,
  isBigCompanyText,
  isExplicitRejectionText,
  isOffsiteEmailText,
} = require('../lib/chat_triage');
const { parseArgs, normalizeWhitespace } = require('../lib/utils');

function uniqBy(entries, keyFn) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = keyFn(entry);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function classifyConversation(conversation) {
  const title = normalizeWhitespace(conversation.title || '');
  const preview = normalizeWhitespace(conversation.preview || '');
  const haystack = `${title} ${preview}`;
  const common = {
    title,
    preview,
    timeText: conversation.timeText || '',
    unreadCount: Number(conversation.unreadCount || 0),
    matchHints: deriveMatchHints(title, preview),
  };

  if (isOffsiteEmailText(haystack)) {
    return { bucket: 'offsite_email', ...common };
  }
  if (isExplicitRejectionText(preview)) {
    return { bucket: 'explicit_rejection', ...common };
  }
  if (isBigCompanyText(haystack)) {
    return { bucket: 'big_company_ignore', ...common };
  }
  if (common.unreadCount > 0) {
    return { bucket: 'reply_candidate', ...common };
  }
  if (/CEO|创始人|合伙人/i.test(title) || /算是吧|可以聊|方便聊|继续沟通|明白/i.test(preview)) {
    return { bucket: 'follow_up_candidate', ...common };
  }
  return { bucket: 'no_action', ...common };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { config } = loadConfig(args.config);
  const output = args.output
    || path.join(path.resolve(__dirname, '..'), 'data', 'chrome-message-triage-latest.json');
  const adapter = createCurrentTabAdapter();
  const chatBrowser = requireBossCoreModule('chat-browser');

  navigateCurrentTab(config.chat.url, Number(args['wait-ms'] || 2500));
  await adapter.waitMs(1200);

  const conversations = await chatBrowser.extractConversations(adapter, Number(args.limit || 30));
  const classified = conversations.map(classifyConversation);
  const buckets = {
    reply_candidate: uniqBy(classified.filter((item) => item.bucket === 'reply_candidate'), (item) => item.title),
    follow_up_candidate: uniqBy(classified.filter((item) => item.bucket === 'follow_up_candidate'), (item) => item.title),
    offsite_email: uniqBy(classified.filter((item) => item.bucket === 'offsite_email'), (item) => item.title),
    explicit_rejection: uniqBy(classified.filter((item) => item.bucket === 'explicit_rejection'), (item) => item.title),
    big_company_ignore: uniqBy(classified.filter((item) => item.bucket === 'big_company_ignore'), (item) => item.title),
    no_action: uniqBy(classified.filter((item) => item.bucket === 'no_action'), (item) => item.title),
  };

  const result = {
    generatedAt: new Date().toISOString(),
    scanned: conversations.length,
    buckets,
  };
  fs.writeFileSync(output, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({
    output,
    scanned: conversations.length,
    replyCandidates: buckets.reply_candidate.length,
    followUpCandidates: buckets.follow_up_candidate.length,
    offsiteEmail: buckets.offsite_email.length,
    explicitRejection: buckets.explicit_rejection.length,
    bigCompanyIgnore: buckets.big_company_ignore.length,
    noAction: buckets.no_action.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
