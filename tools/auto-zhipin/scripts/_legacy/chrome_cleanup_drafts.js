#!/usr/bin/env node

const { loadConfig } = require('../lib/config');
const { createCurrentTabAdapter, evalCurrentTab, navigateCurrentTab } = require('../lib/chrome_current');
const { requireBossCoreModule } = require('../lib/opencli_core');
const { shouldClearConversationDraft } = require('../lib/draft_cleanup');
const { parseArgs } = require('../lib/utils');

const chatBrowserCore = requireBossCoreModule('chat-browser');
const currentTabAdapter = createCurrentTabAdapter();

function clearActiveDraftInput() {
  return JSON.parse(evalCurrentTab(`(() => {
    function normalize(value) {
      return String(value || '').replace(/\\s+/g, ' ').trim();
    }
    const selectors = [
      '.chat-input [contenteditable="true"]',
      '[class*=chat-input] [contenteditable="true"]',
      'textarea',
      '[contenteditable="true"]',
    ];
    let input = null;
    for (const selector of selectors) {
      input = document.querySelector(selector);
      if (input) {
        break;
      }
    }
    if (!input) {
      return JSON.stringify({ ok: false, reason: 'input_not_found' });
    }
    const tagName = String(input.tagName || '').toLowerCase();
    const before = normalize(tagName === 'textarea' || tagName === 'input'
      ? input.value
      : (input.innerText || input.textContent));
    input.focus();
    if (tagName === 'textarea' || tagName === 'input') {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      if (document.execCommand) {
        document.execCommand('selectAll', false);
        document.execCommand('insertText', false, '');
      }
      input.textContent = '';
      input.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        data: '',
        inputType: 'deleteContentBackward',
      }));
    }
    const after = normalize(tagName === 'textarea' || tagName === 'input'
      ? input.value
      : (input.innerText || input.textContent));
    return JSON.stringify({ ok: true, before, after });
  })()`));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { config } = loadConfig(args.config);
  navigateCurrentTab(config.chat.url, Number(args['wait-ms'] || 2500));

  const conversations = await chatBrowserCore.extractConversations(
    currentTabAdapter,
    Number(args.limit || 30)
  );
  const targets = conversations.filter((conversation) => shouldClearConversationDraft(conversation, {
    allDrafts: Boolean(args['all-drafts']),
  }));

  const results = [];
  for (const conversation of targets) {
    const opened = await chatBrowserCore.openConversation(currentTabAdapter, conversation);
    const cleared = clearActiveDraftInput();
    results.push({
      title: conversation.title,
      preview: conversation.preview,
      opened,
      cleared,
    });
  }

  console.log(JSON.stringify({
    scanned: conversations.length,
    cleaned: results.length,
    results,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
