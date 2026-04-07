import { createRequire } from 'node:module';
import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';
import { createBrowserAdapter, gotoChat } from './_helpers.js';

const require = createRequire(import.meta.url);
const chatBrowser = require('../../shared/boss/chat-browser.cjs');

cli({
  site: 'boss',
  name: 'chat-list',
  description: 'BOSS直聘列出当前聊天会话',
  domain: 'www.zhipin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'limit', type: 'int', default: 20, help: 'Maximum number of conversations to return' },
  ],
  columns: ['title', 'preview', 'unreadCount', 'timeText', 'id'],
  func: async (page: IPage | null, kwargs) => {
    if (!page) {
      throw new Error('Browser page required');
    }
    await gotoChat(page);
    const adapter = createBrowserAdapter(page);
    const limit = Math.max(1, Number(kwargs.limit || 20));
    const conversations = await chatBrowser.extractConversations(adapter, limit);
    return conversations.slice(0, limit);
  },
});
