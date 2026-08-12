'use strict';

// 飞书通知模块。通过 lark-cli (@larksuite/cli) im +messages-send 推送消息。
// 收件人为 lark-cli 配置中的用户 open_id（见 ~/.lark-cli/config.json，用户 Sonic）。

const { spawn, spawnSync } = require('node:child_process');

const FEISHU_CMD = 'lark-cli';
const DEFAULT_USER_ID = 'ou_4b8ba6507b5ea5139fd994fe470d47e0'; // 用户 Sonic（从 ~/.lark-cli/config.json 读取）

/**
 * 检测 lark-cli 是否在 PATH 中可用。
 * 使用 spawnSync 调用 lark-cli --version，根据是否成功返回 boolean。
 * @returns {boolean}
 */
function isFeishuConfigured() {
  try {
    const result = spawnSync(FEISHU_CMD, ['--version'], {
      stdio: 'pipe',
      timeout: 3000,
    });
    // result.error 表示无法启动进程（ENOENT 等）；status 非 null 表示进程正常退出
    return result.error == null && result.status != null;
  } catch {
    return false;
  }
}

function buildArgs({ title, body, userId }) {
  const toUser = userId || DEFAULT_USER_ID;
  return ['im', '+messages-send', '--as', 'bot', '--user-id', toUser, '--text', `${title}\n${body}`];
}

function pushFeishuMessage({ title, body, userId, runner }) {
  const run = runner || ((args) => {
    return new Promise((resolve, reject) => {
      const child = spawn(FEISHU_CMD, args, { stdio: 'inherit' });
      child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`lark-cli exited ${code}`))));
      child.on('error', reject);
    });
  });
  return run(buildArgs({ title, body, userId }));
}

module.exports = { pushFeishuMessage, isFeishuConfigured, FEISHU_CMD, buildArgs, DEFAULT_USER_ID };
