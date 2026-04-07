import type { IPage } from '../../types.js';

export const CHAT_URL = 'https://www.zhipin.com/web/geek/chat?ka=header-message';

export function createBrowserAdapter(page: IPage) {
  return {
    evaluate(script: string) {
      return page.evaluate(script);
    },
    waitMs(ms: number) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },
  };
}

export async function sleepMs(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function gotoChat(page: IPage) {
  await page.goto(CHAT_URL);
  await sleepMs(1200);
}

export function conversationMatches(conversation: any, kwargs: Record<string, any> = {}) {
  const byId = String(kwargs.conversation_id || '').trim();
  const byTitle = String(kwargs.title || '').trim();
  if (byId && String(conversation.id || '') === byId) {
    return true;
  }
  if (!byTitle) {
    return false;
  }
  const title = String(conversation.title || '');
  return title === byTitle || title.includes(byTitle) || byTitle.includes(title);
}

export async function resolveConversation(page: IPage, chatBrowser: any, kwargs: Record<string, any> = {}) {
  const adapter = createBrowserAdapter(page);
  const limit = Math.max(20, Number(kwargs.index || 0) + 1);
  await gotoChat(page);
  const conversations = await chatBrowser.extractConversations(adapter, limit);
  const matched = conversations.find((conversation: any) => conversationMatches(conversation, kwargs));
  if (matched) {
    return {
      adapter,
      conversation: matched,
      conversations,
    };
  }

  const index = Math.max(0, Number(kwargs.index || 0));
  if (conversations[index]) {
    return {
      adapter,
      conversation: conversations[index],
      conversations,
    };
  }

  throw new Error('Conversation not found. Use `boss chat-list` to inspect available conversations first.');
}

export function tailLimit<T>(items: T[], limit: number) {
  const size = Math.max(1, Number(limit || 20));
  return items.slice(-size);
}

export function formatActionRow(result: Record<string, any> = {}, extra: Record<string, any> = {}) {
  const action = result.action || '';
  const status = result.status || (result.ok ? 'success' : 'failed');
  const reason = result.reason || '';
  return {
    ...result,
    action,
    status,
    reason,
    mode: result.mode || reason || status,
    via: result.via || reason || status,
    ...extra,
  };
}
