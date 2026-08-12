'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { summarizeDaily, buildFeishuBaseRecord } = require('../lib/daily_summary.js');
const { pushFeishuMessage } = require('../lib/feishu_notify.js');

const DATA_DIR = path.join(__dirname, '..', 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.jsonl');

function loadTodayEvents() {
  if (!fs.existsSync(EVENTS_FILE)) return [];
  const today = new Date().toISOString().slice(0, 10);
  const lines = fs.readFileSync(EVENTS_FILE, 'utf8').split('\n').filter(Boolean);
  return lines
    .map((line) => { try { return JSON.parse(line); } catch { return null; } })
    .filter((e) => e && e.timestamp && e.timestamp.slice(0, 10) === today);
}

async function main() {
  const events = loadTodayEvents();
  const summary = summarizeDaily(events);
  const record = buildFeishuBaseRecord(summary);
  console.log('日报汇总:', JSON.stringify(summary, null, 2));

  // 写飞书多维表格（lark-cli base）
  // 目标 base token 与 table id 从环境变量读取（BOSS_FEISHU_BASE_TOKEN / BOSS_FEISHU_TABLE_ID）
  const baseToken = process.env.BOSS_FEISHU_BASE_TOKEN;
  const tableId = process.env.BOSS_FEISHU_TABLE_ID;
  if (baseToken && tableId) {
    const recordsJson = JSON.stringify({ create_records: [record] });
    const result = spawnSync('lark-cli', ['base', '+record-upsert', '--as', 'bot', '--base-token', baseToken, '--table-id', tableId, '--json', recordsJson], { stdio: 'inherit' });
    if (result.status !== 0) {
      console.error(`lark-cli base write failed (status ${result.status})`);
    }
  } else {
    console.log('未配置 BOSS_FEISHU_BASE_TOKEN/TABLE_ID，跳过多维表格写入');
  }

  // 推送日报摘要消息
  try {
    await pushFeishuMessage({
      title: `📊 BOSS 日报 ${summary.date}`,
      body: `投递 ${summary.applied} | 沟通 ${summary.communicated} | 回复 ${summary.replied} | 面试邀约 ${summary.interviewInvites} | 转化率 ${(summary.conversionRate * 100).toFixed(1)}%`,
    });
  } catch (err) {
    console.error('飞书推送失败:', err.message);
  }
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { loadTodayEvents, main };
