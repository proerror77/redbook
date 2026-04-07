const { nowIso, stableHash } = require('./utils');
const {
  extractConversations,
  extractMessages,
  messageListContainsText,
  openConversation,
  sendActiveReply,
  sendResumeFromActiveConversation,
} = require('./zhipin');

function hasRecentCompletedAction(existingActions, conversationId, type, cooldownHours) {
  if (!cooldownHours) {
    return false;
  }
  const threshold = Date.now() - (Number(cooldownHours) * 60 * 60 * 1000);
  return (existingActions || []).some((action) => {
    if (action.conversationId !== conversationId || action.type !== type || action.status !== 'completed') {
      return false;
    }
    return Date.parse(action.executedAt || action.updatedAt || action.createdAt || 0) >= threshold;
  });
}

function buildActionsForIntent({
  intent,
  message,
  conversation,
  job,
  config,
  existingActions = [],
  replyText = '',
  replySource = '',
}) {
  const conversationId = conversation?.id || message?.conversationId;
  if (!conversationId || !message?.id) {
    return [];
  }

  if (intent === 'cv_request' && config.chat?.autoSendResumeButton && replySource === 'claude') {
    return [{
      id: stableHash(`${conversationId}:${message.id}:send_resume_button`),
      conversationId,
      conversationTitle: conversation?.title || null,
      messageId: message.id,
      jobId: job?.id || null,
      type: 'send_resume_button',
      reason: intent,
      status: 'pending',
      dedupeKey: `${conversationId}:${message.id}:send_resume_button`,
      payload: {
        sourceText: message.text,
      },
      createdAt: nowIso(),
    }];
  }

  if (intent === 'explicit_rejection' && config.chat?.autoRejectionFollowup) {
    if (hasRecentCompletedAction(existingActions, conversationId, 'send_text_reply', config.chat.rejectionFollowupCooldownHours)) {
      return [];
    }

    const text = String(replyText || '').trim();
    if (!text || replySource !== 'claude') {
      return [];
    }
    return [{
      id: stableHash(`${conversationId}:${message.id}:send_text_reply:${text}`),
      conversationId,
      conversationTitle: conversation?.title || null,
      messageId: message.id,
      jobId: job?.id || null,
      type: 'send_text_reply',
      reason: intent,
      status: 'pending',
      dedupeKey: `${conversationId}:${message.id}:send_text_reply`,
      payload: {
        text,
      },
      createdAt: nowIso(),
    }];
  }

  return [];
}

function pickRunnableActions(actions, config) {
  const runnable = (actions || [])
    .filter((action) => action.status === 'pending' || action.status === 'in_progress')
    .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  const limit = Number(config.chat?.maxAutoActionsPerRun || 0);
  return limit > 0 ? runnable.slice(0, limit) : runnable;
}

function findConversationForAction(conversations, action) {
  return (conversations || []).find((conversation) => {
    const title = String(conversation.title || '');
    const targetTitle = String(action.conversationTitle || '');
    const titleMatches = targetTitle && title && (
      title === targetTitle
      || title.includes(targetTitle)
      || targetTitle.includes(title)
    );
    return conversation.id === action.conversationId
      || titleMatches;
  }) || null;
}

function createPlaywrightActionExecutor(page) {
  return {
    async listConversations() {
      return extractConversations(page);
    },
    async openConversation(conversation) {
      return openConversation(page, conversation);
    },
    async containsText(text, action) {
      const messages = await extractMessages(page, action.conversationId);
      return messageListContainsText(messages, text);
    },
    async sendReply(text) {
      return sendActiveReply(page, text);
    },
    async sendResume() {
      return sendResumeFromActiveConversation(page);
    },
  };
}

async function executeAction(executor, action) {
  if (action.type === 'send_resume_button') {
    return executor.sendResume();
  }

  if (action.type === 'send_text_reply') {
    const replyText = action.payload?.text || '';
    if (await executor.containsText(replyText, action)) {
      return { ok: true, via: 'already_present' };
    }
    return executor.sendReply(replyText, action);
  }

  return { ok: false, reason: `unsupported_action:${action.type}` };
}

async function processPendingActions({ page, store, config, conversations = null, executor = null }) {
  const actionExecutor = executor || createPlaywrightActionExecutor(page);
  let currentConversations = conversations || await actionExecutor.listConversations();
  const actions = pickRunnableActions(store.getPendingActions(), config);
  const summary = {
    attempted: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
  };

  for (const action of actions) {
    summary.attempted += 1;
    const conversation = findConversationForAction(currentConversations, action);
    if (!conversation) {
      store.markActionStatus(action.id, 'failed', { reason: 'conversation_not_found' });
      summary.failed += 1;
      continue;
    }

    store.markActionStatus(action.id, 'in_progress', { startedAt: nowIso() });
    await actionExecutor.openConversation(conversation);

    const result = await executeAction(actionExecutor, action);
    if (!result.ok) {
      store.markActionStatus(action.id, 'failed', result);
      summary.failed += 1;
      continue;
    }

    store.markActionStatus(action.id, 'completed', result);
    summary.completed += 1;
    currentConversations = await actionExecutor.listConversations();
  }

  return summary;
}

module.exports = {
  buildActionsForIntent,
  createPlaywrightActionExecutor,
  pickRunnableActions,
  processPendingActions,
};
