const { normalizeWhitespace } = require('./utils');

const RESTRICTED_TEXT_PATTERNS = ['访问受限', '暂时被限制访问', '账户存在异常行为', '账号存在异常行为'];
const AUTH_TEXT_PATTERNS = ['异常访问行为', '完成验证后即可正常使用', '安全验证', '登录后可继续使用', '点击按钮进行验证'];
const AUTH_URL_PATTERNS = ['/web/user/', 'verify-slider', '/safe/verify-slider', 'security.html'];

function extractRestrictedRecoveryAt(input) {
  const text = normalizeWhitespace(input);
  const match = text.match(/(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\s+(\d{1,2}:\d{2})\s*恢复正常/);
  if (!match) {
    return null;
  }

  const [year, month, day] = match[1]
    .replace(/[/.]/g, '-')
    .split('-')
    .map((part) => Number(part));
  const [hour, minute] = match[2].split(':').map((part) => Number(part));
  const recoveryAt = new Date(Date.UTC(year, month - 1, day, hour - 8, minute, 0));
  if (Number.isNaN(recoveryAt.getTime())) {
    return null;
  }
  return recoveryAt.toISOString();
}

function classifySiteHealth({ url, title, bodyText, looksReady }) {
  const safeUrl = String(url || '');
  const combinedText = normalizeWhitespace(`${title || ''} ${bodyText || ''}`);

  const restrictedText = RESTRICTED_TEXT_PATTERNS.find((pattern) => combinedText.includes(pattern));
  if (restrictedText) {
    return {
      status: 'restricted',
      reason: `body:${restrictedText}`,
      recoveryAt: extractRestrictedRecoveryAt(combinedText),
    };
  }

  if (AUTH_URL_PATTERNS.some((pattern) => safeUrl.includes(pattern))) {
    return {
      status: 'auth_gate',
      reason: `redirected:${safeUrl}`,
      recoveryAt: null,
    };
  }

  const authText = AUTH_TEXT_PATTERNS.find((pattern) => combinedText.includes(pattern));
  if (authText) {
    return {
      status: 'auth_gate',
      reason: `body:${authText}`,
      recoveryAt: null,
    };
  }

  if (looksReady) {
    return {
      status: 'healthy',
      reason: null,
      recoveryAt: null,
    };
  }

  return {
    status: 'caution',
    reason: 'page_not_ready',
    recoveryAt: null,
  };
}

function isCircuitBreakerActive(siteHealth, nowMs = Date.now()) {
  if (!siteHealth || siteHealth.status !== 'restricted') {
    return false;
  }

  if (!siteHealth.recoveryAt) {
    return true;
  }

  const recoveryMs = Date.parse(siteHealth.recoveryAt);
  if (Number.isNaN(recoveryMs)) {
    return true;
  }

  return nowMs < recoveryMs;
}

module.exports = {
  RESTRICTED_TEXT_PATTERNS,
  AUTH_TEXT_PATTERNS,
  AUTH_URL_PATTERNS,
  extractRestrictedRecoveryAt,
  classifySiteHealth,
  isCircuitBreakerActive,
};
