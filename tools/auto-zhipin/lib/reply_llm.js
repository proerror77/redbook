const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { normalizeWhitespace } = require('./utils');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_VERSION = '2023-06-01';
const DEFAULT_ANTHROPIC_MODEL = 'claude-3-5-haiku-latest';
const DEFAULT_CODEX_MODEL = 'gpt-5.4-mini';
const DEFAULT_PROVIDER = 'codex_cli';
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_CODEX_BIN = 'codex';
const ALLOWED_INTENTS = new Set([
  'no_action',
  'default',
  'cv_request',
  'interview',
  'salary',
  'explicit_rejection',
]);
const REPLY_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    intent: {
      type: 'string',
      enum: Array.from(ALLOWED_INTENTS),
    },
    shouldCreateDraft: { type: 'boolean' },
    shouldSendResumeButton: { type: 'boolean' },
    replyText: { type: 'string' },
  },
  required: ['intent', 'shouldCreateDraft', 'shouldSendResumeButton', 'replyText'],
};

function pickProfileFocus(config = {}) {
  const focusKeywords = Array.isArray(config.profile?.focusKeywords)
    ? config.profile.focusKeywords.filter(Boolean)
    : [];
  if (focusKeywords.length) {
    return focusKeywords.slice(0, 3).join(' / ');
  }
  return normalizeWhitespace(config.profile?.summary || 'AI Agent / RAG / 企业智能化');
}

function extractTextContent(payload) {
  const blocks = Array.isArray(payload?.content) ? payload.content : [];
  return blocks
    .filter((block) => block?.type === 'text' && normalizeWhitespace(block.text))
    .map((block) => normalizeWhitespace(block.text))
    .join('\n')
    .trim();
}

function extractJsonObject(text) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) {
    throw new Error('LLM returned empty text content');
  }

  const fenced = normalized.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/i);
  if (fenced) {
    return JSON.parse(fenced[1]);
  }

  const firstBrace = normalized.indexOf('{');
  const lastBrace = normalized.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(normalized.slice(firstBrace, lastBrace + 1));
  }

  return JSON.parse(normalized);
}

function sanitizePlan(raw = {}) {
  const intent = ALLOWED_INTENTS.has(raw.intent) ? raw.intent : 'no_action';
  const replyText = intent === 'no_action'
    ? ''
    : normalizeWhitespace(raw.replyText || raw.reply_text || '');

  return {
    intent,
    replyText,
    shouldCreateDraft: Boolean(raw.shouldCreateDraft ?? raw.should_create_draft ?? (intent !== 'no_action' && replyText)),
    shouldSendResumeButton: Boolean(raw.shouldSendResumeButton ?? raw.should_send_resume_button ?? intent === 'cv_request'),
  };
}

function normalizeProvider(value = '') {
  const normalized = normalizeWhitespace(value).toLowerCase();
  if (!normalized || normalized === 'auto') {
    return 'auto';
  }
  if (['anthropic', 'claude'].includes(normalized)) {
    return 'anthropic';
  }
  if (['codex', 'codex_cli', 'codex-cli'].includes(normalized)) {
    return 'codex_cli';
  }
  return 'auto';
}

function resolveReplyProvider({ config = {}, apiKey = '', codexBin = '' } = {}) {
  const configured = normalizeProvider(
    config.chat?.replyProvider
    || process.env.ZHIPIN_REPLY_PROVIDER
    || DEFAULT_PROVIDER
  );

  if (configured !== 'auto') {
    return configured;
  }
  if (apiKey) {
    return 'anthropic';
  }
  if (codexBin || process.env.CODEX_BIN || DEFAULT_CODEX_BIN) {
    return 'codex_cli';
  }
  return 'anthropic';
}

function buildReplyPlanPrompt({ message = {}, conversation = {}, job = {}, config = {} } = {}) {
  const historyContext = Array.isArray(conversation.historyContext)
    ? conversation.historyContext.map((item) => normalizeWhitespace(item)).filter(Boolean).slice(0, 12)
    : [];
  const parts = [
    '你是 BOSS 直聘消息助手。你要根据最新一条对方消息，判断是否值得回复，并生成一条自然的中文回复草稿。',
    '只输出一个 JSON 对象，不要输出解释，不要输出 Markdown 代码块外的文字。',
    'JSON schema:',
    '{"intent":"no_action|default|cv_request|interview|salary|explicit_rejection","shouldCreateDraft":true|false,"shouldSendResumeButton":true|false,"replyText":"string"}',
    '规则：',
    '1. 只有当对方消息明确需要回应时，shouldCreateDraft 才能为 true。',
    '2. 如果对方只是系统送达、已读、无实质内容，intent=no_action，replyText 为空。',
    '3. 如果对方是在要简历、履历、附件、在线简历，intent=cv_request；只有站内“发送简历按钮”可能有帮助时，shouldSendResumeButton 才为 true。',
    '4. 如果对方明确拒绝，但语气礼貌且未来仍可能合作，可以给一句非常短的收尾回复；否则 shouldCreateDraft=false。',
    '5. replyText 必须像真人对话，不要模板腔，不要夸张，不要编造经历；优先 18-80 个中文字符。',
    '6. 如果对方提了问题，replyText 必须正面回答或承接这个问题，而不是泛泛说“方便沟通吗”。',
    `候选人定位：${pickProfileFocus(config)}`,
    `当前会话标题：${normalizeWhitespace(conversation.title || '未提供')}`,
    `关联岗位：${normalizeWhitespace(job.company || '未提供')} / ${normalizeWhitespace(job.title || '未提供')}`,
    `岗位摘要：${normalizeWhitespace(job.summary || '未提供')}`,
    `最新来信：${normalizeWhitespace(message.text || '未提供')}`,
  ];
  if (historyContext.length) {
    parts.push('最近会话历史：');
    for (const line of historyContext) {
      parts.push(`- ${line}`);
    }
  }
  return parts.join('\n');
}

function execFileAsync(execFileImpl, file, args, options) {
  return new Promise((resolve, reject) => {
    execFileImpl(file, args, options, (error, stdout, stderr) => {
      if (error) {
        error.stdout = error.stdout || stdout;
        error.stderr = error.stderr || stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function generateReplyPlanWithAnthropic(options = {}) {
  const {
    message = {},
    conversation = {},
    job = {},
    config = {},
    apiKey = process.env.ANTHROPIC_API_KEY || '',
    model = config.chat?.replyModel || process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL,
    timeoutMs = Number(config.chat?.replyTimeoutMs || DEFAULT_TIMEOUT_MS),
    fetchImpl = global.fetch,
  } = options;

  if (!apiKey) {
    return {
      intent: 'no_action',
      replyText: '',
      shouldCreateDraft: false,
      shouldSendResumeButton: false,
      source: 'disabled',
      error: 'ANTHROPIC_API_KEY is not set',
    };
  }

  if (typeof fetchImpl !== 'function') {
    return {
      intent: 'no_action',
      replyText: '',
      shouldCreateDraft: false,
      shouldSendResumeButton: false,
      source: 'disabled',
      error: 'fetch is not available',
    };
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs));

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
        max_tokens: 220,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: buildReplyPlanPrompt({ message, conversation, job, config }),
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
    const plan = sanitizePlan(extractJsonObject(text));
    return {
      ...plan,
      source: 'claude',
      model: payload.model || model,
    };
  } catch (error) {
    const errorMessage = error?.name === 'AbortError'
      ? `Anthropic request timed out after ${timeoutMs}ms`
      : String(error?.message || error || 'unknown error');
    return {
      intent: 'no_action',
      replyText: '',
      shouldCreateDraft: false,
      shouldSendResumeButton: false,
      source: 'disabled',
      error: errorMessage,
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function generateReplyPlanWithCodexCli(options = {}) {
  const {
    message = {},
    conversation = {},
    job = {},
    config = {},
    timeoutMs = Number(config.chat?.replyTimeoutMs || DEFAULT_TIMEOUT_MS),
    model = config.chat?.replyModel || process.env.CODEX_MODEL || DEFAULT_CODEX_MODEL,
    codexBin = process.env.CODEX_BIN || DEFAULT_CODEX_BIN,
    execFileImpl = childProcess.execFile,
    workdir = path.resolve(__dirname, '..'),
  } = options;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zhipin-reply-'));
  const schemaPath = path.join(tempDir, 'reply-plan.schema.json');
  const outputPath = path.join(tempDir, 'reply-plan.json');

  try {
    fs.writeFileSync(schemaPath, JSON.stringify(REPLY_PLAN_SCHEMA), 'utf8');
    const args = [
      'exec',
      '--skip-git-repo-check',
      '--ephemeral',
      '--color',
      'never',
      '-C',
      workdir,
      '--output-schema',
      schemaPath,
      '-o',
      outputPath,
    ];
    if (model) {
      args.push('--model', model);
    }
    args.push(buildReplyPlanPrompt({ message, conversation, job, config }));

    await execFileAsync(execFileImpl, codexBin, args, {
      timeout: Math.max(1000, timeoutMs),
      maxBuffer: 2 * 1024 * 1024,
      encoding: 'utf8',
    });

    const raw = fs.readFileSync(outputPath, 'utf8');
    const plan = sanitizePlan(JSON.parse(raw));
    return {
      ...plan,
      source: 'codex_cli',
      model: model || DEFAULT_CODEX_MODEL,
    };
  } catch (error) {
    const errorMessage = error?.code === 'ETIMEDOUT'
      ? `Codex CLI request timed out after ${timeoutMs}ms`
      : normalizeWhitespace(`${error?.message || error || 'unknown error'} ${error?.stderr || ''}`.trim());
    return {
      intent: 'no_action',
      replyText: '',
      shouldCreateDraft: false,
      shouldSendResumeButton: false,
      source: 'disabled',
      error: errorMessage,
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function generateReplyPlan(options = {}) {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY ?? '';
  const provider = resolveReplyProvider({
    config: options.config,
    apiKey,
    codexBin: options.codexBin,
  });

  if (provider === 'anthropic') {
    return generateReplyPlanWithAnthropic({
      ...options,
      apiKey,
    });
  }
  if (provider === 'codex_cli') {
    return generateReplyPlanWithCodexCli(options);
  }

  return {
    intent: 'no_action',
    replyText: '',
    shouldCreateDraft: false,
    shouldSendResumeButton: false,
    source: 'disabled',
    error: `unsupported reply provider: ${provider}`,
  };
}

module.exports = {
  buildReplyPlanPrompt,
  extractJsonObject,
  extractTextContent,
  generateReplyPlan,
  generateReplyPlanWithAnthropic,
  generateReplyPlanWithCodexCli,
  normalizeProvider,
  resolveReplyProvider,
  sanitizePlan,
};
