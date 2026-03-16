const crypto = require('node:crypto');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stableHash(input) {
  return crypto.createHash('sha1').update(String(input)).digest('hex').slice(0, 16);
}

function nowIso() {
  return new Date().toISOString();
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }

    const trimmed = token.slice(2);
    if (trimmed.includes('=')) {
      const [key, value] = trimmed.split(/=(.*)/s, 2);
      args[key] = value;
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[trimmed] = true;
      continue;
    }

    args[trimmed] = next;
    index += 1;
  }

  return args;
}

function hasText(value, matcher) {
  return String(value || '').toLowerCase().includes(String(matcher || '').toLowerCase());
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeKeyPart(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '');
}

function makeApplicationIdentity(input = {}) {
  const company = normalizeKeyPart(input.company || '');
  const title = normalizeKeyPart(input.title || '');
  if (!company && !title) {
    return '';
  }
  return `${company}::${title}`;
}

module.exports = {
  sleep,
  stableHash,
  nowIso,
  parseArgs,
  hasText,
  normalizeWhitespace,
  normalizeKeyPart,
  makeApplicationIdentity,
};
