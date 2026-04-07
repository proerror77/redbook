const test = require('node:test');
const assert = require('node:assert/strict');

const {
  extractDraftText,
  looksLikeMojibake,
  shouldClearConversationDraft,
} = require('../lib/draft_cleanup');

test('extractDraftText keeps only the draft payload after the marker', () => {
  assert.equal(
    extractDraftText('03月06日 张女士上海精燧智能科技人事 [草稿] æè¿è¾¹'),
    'æè¿è¾¹'
  );
});

test('looksLikeMojibake recognizes common utf8-latin1 corruption patterns', () => {
  assert.equal(looksLikeMojibake('æè¿è¾¹åè·è¿ä¸ä¸'), true);
  assert.equal(looksLikeMojibake('企业 AI 应用落地'), false);
  assert.equal(looksLikeMojibake('normal english draft'), false);
});

test('shouldClearConversationDraft only targets draft previews that look garbled by default', () => {
  assert.equal(shouldClearConversationDraft({
    title: '张女士上海精燧智能科技人事',
    preview: '03月06日 张女士上海精燧智能科技人事 [草稿] æè¿è¾¹åè·è¿ä¸ä¸',
  }), true);

  assert.equal(shouldClearConversationDraft({
    title: '正常草稿',
    preview: '03月06日 正常草稿 [草稿] 你好，我补充一下我的项目经历',
  }), false);

  assert.equal(shouldClearConversationDraft({
    title: '正常草稿',
    preview: '03月06日 正常草稿 [草稿] 你好，我补充一下我的项目经历',
  }, { allDrafts: true }), true);
});
