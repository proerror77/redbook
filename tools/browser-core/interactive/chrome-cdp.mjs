import { setTimeout as delay } from 'node:timers/promises';

function ensureHttpEndpoint(endpoint) {
  if (!endpoint) {
    return 'http://127.0.0.1:9222';
  }
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint.replace(/\/+$/, '');
  }
  return `http://${endpoint.replace(/\/+$/, '')}`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function listPageTargets(endpoint = 'http://127.0.0.1:9222') {
  const base = ensureHttpEndpoint(endpoint);
  const targets = await fetchJson(`${base}/json/list`);
  return Array.isArray(targets)
    ? targets.filter((target) => target?.type === 'page' && target?.webSocketDebuggerUrl)
    : [];
}

export async function createPageTarget(endpoint = 'http://127.0.0.1:9222', url = 'about:blank') {
  const base = ensureHttpEndpoint(endpoint);
  const response = await fetch(`${base}/json/new?${url}`, { method: 'PUT' });
  if (!response.ok) {
    throw new Error(`Failed to create page target: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function closePageTarget(endpoint = 'http://127.0.0.1:9222', targetId) {
  const base = ensureHttpEndpoint(endpoint);
  const response = await fetch(`${base}/json/close/${targetId}`);
  if (!response.ok) {
    throw new Error(`Failed to close page target ${targetId}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function toMessageText(data) {
  if (typeof data === 'string') {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString('utf8');
  }
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('utf8');
  }
  return String(data ?? '');
}

export class CDPTargetClient {
  constructor(target) {
    this.target = target;
    this.ws = null;
    this.nextId = 0;
    this.pending = new Map();
  }

  async connect(timeoutMs = 5000) {
    const ws = new WebSocket(this.target.webSocketDebuggerUrl);
    this.ws = ws;

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP WebSocket timeout')), timeoutMs);
      ws.addEventListener('open', () => {
        clearTimeout(timer);
        resolve();
      });
      ws.addEventListener('error', (event) => {
        clearTimeout(timer);
        reject(new Error(`CDP WebSocket failed: ${event?.message || 'unknown error'}`));
      });
    });

    ws.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(toMessageText(event.data));
        if (message?.id) {
          const pending = this.pending.get(message.id);
          if (pending) {
            this.pending.delete(message.id);
            if (message.error) {
              pending.reject(new Error(message.error.message || JSON.stringify(message.error)));
            } else {
              pending.resolve(message.result);
            }
          }
        }
      } catch {
        // Ignore malformed messages from Chrome.
      }
    });

    ws.addEventListener('close', () => {
      for (const [id, pending] of this.pending.entries()) {
        this.pending.delete(id);
        pending.reject(new Error(`CDP target connection closed (pending id=${id})`));
      }
    });
  }

  async send(method, params = {}, timeoutMs = 10000) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('CDP target is not connected');
    }
    const id = ++this.nextId;
    const payload = JSON.stringify({ id, method, params });

    const resultPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
    });

    this.ws.send(payload);
    return resultPromise;
  }

  async evaluate(expression, { awaitPromise = true, returnByValue = true } = {}) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise,
      returnByValue,
    });
    if (result?.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || 'Runtime.evaluate failed');
    }
    return result?.result?.value;
  }

  async navigate(url, { waitForReadyState = 'complete', timeoutMs = 15000 } = {}) {
    await this.send('Page.enable', {}, 3000).catch(() => {});
    await this.send('Runtime.enable', {}, 3000).catch(() => {});
    await this.send('Page.navigate', { url }, 5000);

    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const state = await this.evaluate('document.readyState', {
        awaitPromise: true,
        returnByValue: true,
      }).catch(() => '');
      const href = await this.evaluate('location.href', {
        awaitPromise: true,
        returnByValue: true,
      }).catch(() => '');
      if ((waitForReadyState === 'complete' && state === 'complete')
        || (waitForReadyState === 'interactive' && (state === 'interactive' || state === 'complete'))) {
        return { href, readyState: state };
      }
      await delay(250);
    }

    throw new Error(`Navigation timeout waiting for readyState=${waitForReadyState}`);
  }

  async describePage({ bodyLimit = 600 } = {}) {
    const expression = `(() => ({
      title: document.title || '',
      url: location.href,
      hasFocus: typeof document.hasFocus === 'function' ? document.hasFocus() : false,
      visibilityState: document.visibilityState || '',
      readyState: document.readyState || '',
      bodyPreview: document.body ? document.body.innerText.replace(/\\s+/g, ' ').trim().slice(0, ${Number(bodyLimit) || 600}) : ''
    }))()`;
    return this.evaluate(expression);
  }

  async close() {
    if (!this.ws) {
      return;
    }
    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.close();
      await delay(50);
    }
    this.ws = null;
  }
}

export async function describePageTargets(endpoint, { urlKeyword = '', titleKeyword = '', bodyLimit = 600 } = {}) {
  const targets = await listPageTargets(endpoint);
  const described = [];

  for (const target of targets) {
    const client = new CDPTargetClient(target);
    try {
      await client.connect();
      const page = await client.describePage({ bodyLimit });
      described.push({
        targetId: target.id || '',
        targetTitle: target.title || '',
        targetUrl: target.url || '',
        webSocketDebuggerUrl: target.webSocketDebuggerUrl,
        ...page,
      });
    } catch (error) {
      described.push({
        targetId: target.id || '',
        targetTitle: target.title || '',
        targetUrl: target.url || '',
        webSocketDebuggerUrl: target.webSocketDebuggerUrl,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      await client.close().catch(() => {});
    }
  }

  const scored = described.map((page, index) => {
    let score = 0;
    if (page.error) {
      score = Number.NEGATIVE_INFINITY;
    } else {
      const urlText = String(page.url || page.targetUrl || '');
      const titleText = String(page.title || page.targetTitle || '');
      const matchesUrl = !urlKeyword || urlText.includes(urlKeyword);
      const matchesTitle = !titleKeyword || titleText.includes(titleKeyword);

      if (!matchesUrl || !matchesTitle) {
        score = Number.NEGATIVE_INFINITY;
        return { ...page, score };
      }

      if (page.hasFocus) score += 500;
      if (page.visibilityState === 'visible') score += 200;
      if (urlKeyword && String(page.url || '').includes(urlKeyword)) score += 250;
      if (titleKeyword && String(page.title || '').includes(titleKeyword)) score += 250;
      score -= index;
    }
    return { ...page, score };
  });

  const selected = scored
    .filter((page) => Number.isFinite(page.score))
    .sort((a, b) => b.score - a.score)[0] || null;

  return {
    endpoint: ensureHttpEndpoint(endpoint),
    urlKeyword,
    titleKeyword,
    targets: scored,
    selected,
  };
}

export async function navigateTargetById(endpoint, targetId, url, options = {}) {
  const targets = await listPageTargets(endpoint);
  const target = targets.find((item) => item.id === targetId);
  if (!target) {
    throw new Error(`Target not found: ${targetId}`);
  }

  const client = new CDPTargetClient(target);
  try {
    await client.connect();
    const navigation = await client.navigate(url, options);
    const page = await client.describePage({ bodyLimit: options.bodyLimit ?? 600 });
    return {
      targetId,
      requestedUrl: url,
      navigation,
      page,
    };
  } finally {
    await client.close().catch(() => {});
  }
}
