import { createRequire } from 'node:module';
import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';
import { createBrowserAdapter, resolveConversation, tailLimit } from './_helpers.js';

const require = createRequire(import.meta.url);
const chatBrowser = require('../../shared/boss/chat-browser.cjs');

cli({
  site: 'boss',
  name: 'chat-thread',
  description: 'BOSS直聘读取指定会话的消息线程',
  domain: 'www.zhipin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'conversation_id', help: 'Conversation id from chat-list' },
    { name: 'title', help: 'Conversation title fallback when id is unavailable' },
    { name: 'index', type: 'int', default: 0, help: 'Fallback conversation index from chat-list results' },
    { name: 'limit', type: 'int', default: 20, help: 'Maximum number of messages to return' },
  ],
  columns: ['direction', 'text', 'timeText', 'conversationId'],
  func: async (page: IPage | null, kwargs) => {
    if (!page) {
      throw new Error('Browser page required');
    }
    const { adapter, conversation } = await resolveConversation(page, chatBrowser, kwargs);
    const openResult = await chatBrowser.openConversation(adapter, conversation);
    if (!openResult.ok) {
      throw new Error(openResult.reason || 'Failed to open conversation');
    }
    const messages = await chatBrowser.extractMessages(
      createBrowserAdapter(page),
      conversation.id || 'active-thread',
      Math.max(20, Number(kwargs.limit || 20))
    );
    return tailLimit(messages, kwargs.limit || 20);
  },
});
