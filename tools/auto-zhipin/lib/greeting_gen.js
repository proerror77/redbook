const { normalizeWhitespace } = require('./utils');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-3-5-haiku-latest';
const DEFAULT_TIMEOUT_MS = 15000;

function pickProfileFocus(config = {}) {
  const focusKeywords = Array.isArray(config.profile?.focusKeywords)
    ? config.profile.focusKeywords.filter(Boolean)
    : [];
  if (focusKeywords.length) {
    return focusKeywords.slice(0, 3).join(' / ');
  }
  return normalizeWhitespace(config.profile?.summary || 'AI Agent / RAG / 工作流落地');
}

function buildFallbackGreeting({ job = {}, config = {} } = {}) {
  const title = normalizeWhitespace(job.title || '这个方向');
  const company = normalizeWhitespace(job.company || '');
  const focus = pickProfileFocus(config);
  const companyPrefix = company ? `${company}的` : '';
  return `你好，我看过${companyPrefix}${title}，和我最近做的${focus}比较贴合，方便继续沟通吗？`;
}

function buildPrompt({ job = {}, config = {} } = {}) {
  const parts = [
    '请生成一句用于 BOSS 直聘首轮沟通的中文招呼语。',
    `岗位：${normalizeWhitespace(job.title || '未提供')}`,
    `公司：${normalizeWhitespace(job.company || '未提供')}`,
    `岗位摘要：${normalizeWhitespace(job.summary || '未提供')}`,
    `候选人聚焦：${pickProfileFocus(config)}`,
    '要求：',
    '1. 只输出一句完整中文，不要列表，不要引号。',
    '2. 口语化、具体、不要夸张，不要编造没给出的经历。',
    '3. 40 到 80 个中文字符优先。',
    '4. 结尾要带继续沟通的邀请。',
  ];
  return parts.join('\n');
}

function extractTextContent(payload) {
  const blocks = Array.isArray(payload?.content) ? payload.content : [];
  return blocks
    .filter((block) => block?.type === 'text' && normalizeWhitespace(block.text))
    .map((block) => normalizeWhitespace(block.text))
    .join('\n')
    .trim();
}

async function generateGreeting(options = {}) {
  const {
    job = {},
    config = {},
    apiKey = process.env.ANTHROPIC_API_KEY || '',
    model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchImpl = global.fetch,
  } = options;

  const fallbackText = buildFallbackGreeting({ job, config });
  if (!apiKey) {
    return {
      text: fallbackText,
      source: 'fallback',
      error: 'ANTHROPIC_API_KEY is not set',
    };
  }

  if (typeof fetchImpl !== 'function') {
    return {
      text: fallbackText,
      source: 'fallback',
      error: 'fetch is not available',
    };
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), Math.max(1000, Number(timeoutMs || DEFAULT_TIMEOUT_MS)));

  try {
    const response = await fetchImpl(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'anthropic-version': ANTHROPIC_API_VERSION,
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        model,
        max_tokens: 120,
        temperature: 0.4,
        messages: [
          {
            role: 'user',
            content: buildPrompt({ job, config }),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const bodyText = typeof response.text === 'function'
        ? normalizeWhitespace(await response.text())
        : '';
      throw new Error(`Anthropic API ${response.status}: ${bodyText || 'request failed'}`);
    }

    const payload = await response.json();
    const text = extractTextContent(payload);
    if (!text) {
      throw new Error('Anthropic API returned empty text content');
    }

    return {
      text,
      source: 'claude',
      model: payload.model || model,
    };
  } catch (error) {
    const errorMessage = error?.name === 'AbortError'
      ? `Anthropic request timed out after ${timeoutMs}ms`
      : String(error?.message || error || 'unknown error');
    return {
      text: fallbackText,
      source: 'fallback',
      error: errorMessage,
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

module.exports = {
  buildFallbackGreeting,
  buildPrompt,
  extractTextContent,
  generateGreeting,
};
