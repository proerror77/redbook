const { normalizeWhitespace } = require('./utils');

function extractDraftText(preview = '') {
  const text = String(preview || '');
  const markerIndex = text.indexOf('[草稿]');
  if (markerIndex < 0) {
    return '';
  }
  return normalizeWhitespace(text.slice(markerIndex + '[草稿]'.length));
}

function looksLikeMojibake(text = '') {
  const value = String(text || '');
  if (!value) {
    return false;
  }
  if (/[一-龥]/.test(value)) {
    return false;
  }
  if (/(æ|å|ä|ç|è|é|ê|ï|ð|ñ|ò|ó|ô|õ|ö|ø|ù|ú|û|ü|ý|þ|ÿ|ï¼|ã|â)/i.test(value)) {
    return true;
  }
  const latinSupplementChars = value.match(/[À-ÿ]/g) || [];
  return latinSupplementChars.length >= 4;
}

function shouldClearConversationDraft(conversation = {}, options = {}) {
  const preview = String(conversation.preview || '');
  if (!preview.includes('[草稿]')) {
    return false;
  }
  if (options.allDrafts) {
    return true;
  }
  return looksLikeMojibake(extractDraftText(preview));
}

module.exports = {
  extractDraftText,
  looksLikeMojibake,
  shouldClearConversationDraft,
};
