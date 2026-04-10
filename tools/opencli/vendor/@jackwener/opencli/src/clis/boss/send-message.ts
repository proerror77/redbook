import { createRequire } from 'node:module';
import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';
import { formatActionRow, resolveConversation } from './_helpers.js';

const require = createRequire(import.meta.url);
const chatBrowser = require('../../shared/boss/chat-browser.cjs');

cli({
  site: 'boss',
  name: 'send-message',
  description: 'BOSS直聘向指定会话发送文本消息',
  domain: 'www.zhipin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'message', required: true, help: 'Text to send' },
    { name: 'conversation_id', help: 'Conversation id from chat-list' },
    { name: 'title', help: 'Conversation title fallback when id is unavailable' },
    { name: 'index', type: 'int', default: 0, help: 'Fallback conversation index from chat-list results' },
    { name: 'dry_run', type: 'bool', default: false, help: 'Populate the input without clicking send' },
  ],
  columns: ['ok', 'action', 'status', 'reason', 'via', 'dryRun', 'conversationId'],
  func: async (page: IPage | null, kwargs) => {
    if (!page) {
      throw new Error('Browser page required');
    }
    const { adapter, conversation } = await resolveConversation(page, chatBrowser, kwargs);
    const openResult = await chatBrowser.openConversation(adapter, conversation);
    if (!openResult.ok) {
      throw new Error(openResult.reason || 'Failed to open conversation');
    }
    const result = await chatBrowser.sendActiveReply(adapter, kwargs.message, {
      dryRun: Boolean(kwargs.dry_run),
    });
    return [formatActionRow(result, {
      dryRun: Boolean(result.dryRun),
      conversationId: conversation.id || '',
    })];
  },
});
