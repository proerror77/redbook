'use strict';
// 消息轮询：读取聊天列表 → classifyMessage 分类 → 面试邀约推飞书 + 写 message_classified 事件
const fs = require('node:fs');
const path = require('node:path');
const { classifyMessage } = require('../lib/chat_classifier.js');
const { pushFeishuMessage } = require('../lib/feishu_notify.js');

const DATA_DIR = path.join(__dirname, '..', 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.jsonl');

function appendEvent(event) {
  fs.appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n');
}

// 读取聊天列表（来源：现有 cdp_chat_triage_export.js 或 opencli 输出的 triage json）
function loadChatMessages(triagePath) {
  if (!fs.existsSync(triagePath)) return [];
  const raw = JSON.parse(fs.readFileSync(triagePath, 'utf8'));
  // 结构依赖现有 triage 输出；若字段不一致，实施时按实际 triage 结构适配
  return Array.isArray(raw) ? raw : (raw.messages || []);
}

async function main({ triagePath = path.join(DATA_DIR, 'chat-triage-latest.json') } = {}) {
  const messages = loadChatMessages(triagePath);
  let pushed = 0;
  for (const msg of messages) {
    const text = msg.preview || msg.text || '';
    const { category } = classifyMessage(text);
    appendEvent({
      timestamp: new Date().toISOString(),
      type: 'message_classified',
      payload: { category, jobId: msg.jobId || '', company: msg.company || '' },
    });
    if (category === 'interview') {
      try {
        await pushFeishuMessage({
          title: `🎯 面试邀约：${msg.company || '未知公司'}`,
          body: `${msg.jobTitle || ''}\n${text}\n${msg.jobId || ''}`,
        });
        pushed += 1;
      } catch (err) {
        console.error('feishu push failed:', err.message);
      }
    }
  }
  console.log(`chat_monitor: classified ${messages.length} messages, pushed ${pushed} interview invites`);
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { main, loadChatMessages, appendEvent };
