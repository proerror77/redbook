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

function deriveJobDetailFields(infoTags = [], bodyText = '') {
  const tags = Array.isArray(infoTags)
    ? infoTags.map(normalizeWhitespace).filter(Boolean)
    : [];
  const lines = normalizeWhitespace(bodyText)
    .split(/(?=北京|上海|深圳|杭州|广州|成都|南京|苏州|武汉|西安|厦门|远程)/)
    .map(normalizeWhitespace)
    .filter(Boolean);
  for (const line of lines) {
    const match = line.match(/(北京|上海|深圳|杭州|广州|成都|南京|苏州|武汉|西安|厦门|远程)\s+([^|，,。]*?(?:经验不限|应届|在校|\d+\s*[-~至]?\s*\d*\s*年))\s+([^|，,。]*?(?:博士|硕士|本科|大专|学历不限|不限))/);
    if (match) {
      tags.push(match[1], match[2], match[3]);
      break;
    }
  }
  const isExperience = (value) => /(经验不限|应届|在校|\d+\s*[-~至]?\s*\d*\s*年)/.test(value);
  const isDegree = (value) => /(博士|硕士|本科|大专|学历不限)/.test(value)
    || (value === '不限' && !isExperience(value));
  const isSalary = (value) => /\d+\s*[-~]?\s*\d*\s*[kK]/.test(value);
  const isStatus = (value) => /招聘中|感兴趣|立即沟通|继续沟通/.test(value);
  const isLocation = (value) => /(北京|上海|深圳|杭州|广州|成都|南京|苏州|武汉|西安|厦门|远程)/.test(value)
    && !isExperience(value)
    && !isDegree(value)
    && !isSalary(value)
    && !isStatus(value);

  const experienceText = tags.find(isExperience) || '';
  const degreeText = tags.find(isDegree) || '';
  const location = tags.find(isLocation) || '';

  return {
    location,
    experienceText,
    degreeText,
  };
}

function deriveCompanyFields(companyTags = [], bodyText = '') {
  const tags = Array.isArray(companyTags)
    ? companyTags.map(normalizeWhitespace).filter(Boolean)
    : [];
  const lines = String(bodyText || '').split(/\n+/).map(normalizeWhitespace).filter(Boolean);
  const companyInfoIndex = lines.findIndex((line) => line.includes('公司基本信息'));
  if (companyInfoIndex >= 0) {
    tags.push(...lines.slice(companyInfoIndex + 1, companyInfoIndex + 8));
  }
  return {
    companySize: tags.find((item) => /\d+\s*-\s*\d+人|\d+人以上|少于\d+人/.test(item)) || '',
    stage: tags.find((item) => /(轮|上市|融资|未融资|不需要融资|天使)/.test(item)) || '',
  };
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
  deriveJobDetailFields,
  deriveCompanyFields,
};
