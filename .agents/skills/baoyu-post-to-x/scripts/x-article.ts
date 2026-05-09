import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

import { parseMarkdown } from './md-to-html.js';
import {
  buildChromeLaunchArgs,
  CHROME_CANDIDATES_BASIC,
  CdpConnection,
  copyHtmlToClipboard,
  copyImageToClipboard,
  findChromeExecutable,
  getBrowserWebSocketUrl,
  getDefaultProfileDir,
  getFreePort,
  parseHeadlessFlag,
  resolveHeadlessMode,
  pasteFromClipboard,
  sleep,
  waitForChromeDebugPort,
} from './x-utils.js';

const X_ARTICLES_URL = 'https://x.com/compose/articles';

const I18N_SELECTORS = {
  titleInput: [
    'textarea[placeholder="Add a title"]',
    'textarea[placeholder="添加标题"]',
    'textarea[placeholder="タイトルを追加"]',
    'textarea[placeholder="제목 추가"]',
    'textarea[name="Article Title"]',
  ],
  addPhotosButton: [
    '[aria-label="Add photos or video"]',
    '[aria-label="添加照片或视频"]',
    '[aria-label="写真や動画を追加"]',
    '[aria-label="사진 또는 동영상 추가"]',
  ],
  previewButton: [
    'a[href*="/preview"]',
    '[data-testid="previewButton"]',
    'button[aria-label*="preview" i]',
    'button[aria-label*="预览" i]',
    'button[aria-label*="プレビュー" i]',
    'button[aria-label*="미리보기" i]',
  ],
  publishButton: [
    '[data-testid="publishButton"]',
    'button[aria-label*="publish" i]',
    'button[aria-label*="发布" i]',
    'button[aria-label*="公開" i]',
    'button[aria-label*="게시" i]',
  ],
};

const EDITOR_SELECTOR = '.DraftEditor-editorContainer [contenteditable="true"], [data-testid="composer"][contenteditable="true"], .public-DraftEditor-content[contenteditable="true"]';
const EDITOR_CONTENT_SELECTOR = '.DraftEditor-editorContainer [data-contents="true"], [data-testid="composer"][data-contents="true"], .public-DraftEditor-content[data-contents="true"]';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildDomTraceScript(): string {
  return `(() => {
    if (window.__xArticleDomTraceInstalled) return true;
    window.__xArticleDomTraceInstalled = true;
    window.__xArticleDomTraceEvents = [];
    const MAX_EVENTS = 600;
    const describe = (target) => {
      if (!target) return null;
      const tag = target.tagName || target.nodeName || target.constructor?.name;
      const attrs = {};
      for (const name of ['role', 'aria-label', 'data-testid', 'contenteditable', 'data-contents', 'type', 'accept', 'href']) {
        try {
          const value = target.getAttribute?.(name);
          if (value) attrs[name] = value;
        } catch {}
      }
      let text = '';
      try { text = (target.innerText || target.textContent || target.value || '').slice(0, 120); } catch {}
      return { tag, attrs, text };
    };
    const log = (kind, payload = {}) => {
      const entry = { ts: Date.now(), kind, ...payload };
      window.__xArticleDomTraceEvents.push(entry);
      if (window.__xArticleDomTraceEvents.length > MAX_EVENTS) window.__xArticleDomTraceEvents.shift();
      try { console.info('[x-article-dom-trace]', JSON.stringify(entry)); } catch {}
    };

    const originalDispatchEvent = EventTarget.prototype.dispatchEvent;
    EventTarget.prototype.dispatchEvent = function(event) {
      if (event && ['click', 'change', 'input', 'beforeinput', 'paste', 'drop', 'compositionend'].includes(event.type)) {
        log('dispatchEvent', {
          type: event.type,
          inputType: event.inputType,
          target: describe(this),
          selection: window.getSelection?.().toString?.().slice(0, 80) || '',
        });
      }
      return originalDispatchEvent.apply(this, arguments);
    };

    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (['click', 'change', 'input', 'beforeinput', 'paste', 'drop'].includes(type)) {
        log('addEventListener', { type, target: describe(this), listener: listener?.name || typeof listener });
      }
      return originalAddEventListener.apply(this, arguments);
    };

    const originalElementClick = HTMLElement.prototype.click;
    HTMLElement.prototype.click = function() {
      log('HTMLElement.click', { target: describe(this), selection: window.getSelection?.().toString?.().slice(0, 80) || '' });
      return originalElementClick.apply(this, arguments);
    };

    const originalExecCommand = document.execCommand?.bind(document);
    if (originalExecCommand) {
      document.execCommand = function(command, showUi, value) {
        log('execCommand', {
          command,
          valueLength: typeof value === 'string' ? value.length : null,
          valueHead: typeof value === 'string' ? value.slice(0, 120) : null,
          selection: window.getSelection?.().toString?.().slice(0, 80) || '',
        });
        return originalExecCommand(command, showUi, value);
      };
    }

    const originalFetch = window.fetch?.bind(window);
    if (originalFetch) {
      window.fetch = async (...args) => {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
        const body = args[1]?.body;
        if (url && /ArticleEntityUpdateContent|upload|media|user_flow/.test(url)) {
          const bodyText = typeof body === 'string' ? body : '';
          let summary = null;
          if (url.includes('ArticleEntityUpdateContent') && bodyText) {
            try {
              const parsed = JSON.parse(bodyText);
              const contentState = parsed?.variables?.content_state;
              const blocks = contentState?.blocks || [];
              const entityMap = contentState?.entityMap || contentState?.entity_map || {};
              const entities = Array.isArray(entityMap)
                ? entityMap
                : Object.values(entityMap).map((entry) => entry?.value ?? entry);
              summary = {
                blocks: blocks.length,
                entities: entities.length,
                blockTypes: [...new Set(blocks.map((b) => b.type))],
                mediaBlocks: blocks.filter((b) => /media|image|atomic/i.test(b.type) || JSON.stringify(b.data || {}).includes('media')).length,
                mediaEntities: entities.filter((entity) => /media|image|photo/i.test(entity?.type || '') || /media|image|photo/i.test(JSON.stringify(entity?.data || {}))).length,
              };
            } catch (error) {
              summary = { parseError: String(error) };
            }
          }
          log('fetch', { url, bodyLength: bodyText.length, summary });
        }
        return originalFetch(...args);
      };
    }

    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) {
      this.__xArticleTraceUrl = url;
      this.__xArticleTraceMethod = method;
      return originalXhrOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function(body) {
      const url = this.__xArticleTraceUrl || '';
      if (/ArticleEntityUpdateContent|upload|media|user_flow/.test(url)) {
        const bodyText = typeof body === 'string' ? body : '';
        log('xhr.send', { method: this.__xArticleTraceMethod, url, bodyLength: bodyText.length, bodyHead: bodyText.slice(0, 160) });
      }
      return originalXhrSend.apply(this, arguments);
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const element = node;
          const imgs = element.matches?.('img') ? [element] : Array.from(element.querySelectorAll?.('img') || []);
          const editable = element.matches?.('[contenteditable="true"], [data-contents="true"]') || element.querySelector?.('[contenteditable="true"], [data-contents="true"]');
          if (imgs.length || editable) {
            log('mutation.added', {
              target: describe(element),
              imgs: imgs.map((img) => ({ src: (img.currentSrc || img.src || '').slice(0, 180), alt: img.alt, w: img.naturalWidth, h: img.naturalHeight })),
              editorTextLength: document.querySelector('[data-contents="true"]')?.innerText?.length || 0,
              mediaImgCount: Array.from(document.images).filter((img) => (img.currentSrc || img.src || '').includes('pbs.twimg.com/media')).length,
            });
          }
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    log('installed', { url: location.href, readyState: document.readyState });
    return true;
  })()`;
}

interface ArticleOptions {
  markdownPath: string;
  coverImage?: string;
  title?: string;
  submit?: boolean;
  profileDir?: string;
  chromePath?: string;
  headless?: boolean;
  newBrowser?: boolean;
  cdpEndpoint?: string;
}

async function findExistingDebugPort(profileDir: string): Promise<number | null> {
  // First: check DevToolsActivePort file in profile dir
  const portFile = path.join(profileDir, 'DevToolsActivePort');
  if (fs.existsSync(portFile)) {
    try {
      const content = fs.readFileSync(portFile, 'utf-8').trim();
      if (content) {
        const [portLine] = content.split(/\r?\n/);
        const port = Number(portLine);
        if (Number.isFinite(port) && port > 0) {
          await waitForChromeDebugPort(port, 1500, { includeLastError: true });
          return port;
        }
      }
    } catch {
      // fall through to process scan
    }
  }

  // Second: scan running Chrome processes for --remote-debugging-port arg (macOS/Linux)
  try {
    const { execSync } = await import('node:child_process');
    const output = execSync(
      "ps aux | grep 'remote-debugging-port' | grep -v grep",
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    const normalizedProfile = path.resolve(profileDir);
    const lines = output.split(/\r?\n/).filter((line) => line.includes(normalizedProfile));
    for (const line of lines) {
      const match = line.match(/--remote-debugging-port=(\d+)/);
      if (!match) continue;
      const port = Number(match[1]);
      if (Number.isFinite(port) && port > 0) {
        try {
          await waitForChromeDebugPort(port, 1500, { includeLastError: true });
          console.log(`[x-article] Found existing Chrome debug port: ${port}`);
          return port;
        } catch {
          // port found in process list but not responding
        }
      }
    }
  } catch {
    // ps scan failed, fall through
  }

  return null;
}

export async function publishArticle(options: ArticleOptions): Promise<void> {
  const { markdownPath, submit = false, profileDir = getDefaultProfileDir() } = options;
  const headless = resolveHeadlessMode(options.headless);
  const cdpEndpoint = options.cdpEndpoint?.trim();

  console.log('[x-article] Parsing markdown...');
  const parsed = await parseMarkdown(markdownPath, {
    title: options.title,
    coverImage: options.coverImage,
  });

  console.log(`[x-article] Title: ${parsed.title}`);
  console.log(`[x-article] Cover: ${parsed.coverImage ?? 'none'}`);
  console.log(`[x-article] Content images: ${parsed.contentImages.length}`);

  // Save HTML to temp file
  const htmlPath = path.join(os.tmpdir(), 'x-article-content.html');
  await writeFile(htmlPath, parsed.html, 'utf-8');
  console.log(`[x-article] HTML saved to: ${htmlPath}`);

  const chromePath = cdpEndpoint ? undefined : options.chromePath ?? findChromeExecutable(CHROME_CANDIDATES_BASIC);
  if (!cdpEndpoint && !chromePath) throw new Error('Chrome not found');

  await mkdir(profileDir, { recursive: true });
  const existingPort = cdpEndpoint || headless || options.newBrowser ? null : await findExistingDebugPort(profileDir);
  const port = cdpEndpoint ? null : existingPort ?? await getFreePort();
  let chrome: ChildProcess | null = null;

  if (cdpEndpoint) {
    console.log(`[x-article] Reusing explicit Chrome CDP endpoint: ${cdpEndpoint}`);
  } else if (existingPort) {
    console.log(`[x-article] Reusing existing Chrome instance on port ${port}`);
  } else {
    console.log(`[x-article] Launching Chrome (${headless ? 'headless' : 'headed'})...`);
    chrome = spawn(chromePath!, buildChromeLaunchArgs({
      port: port!,
      profileDir,
      url: X_ARTICLES_URL,
      headless,
    }), { stdio: 'ignore' });
    chrome.unref();
  }

  let cdp: CdpConnection | null = null;

  try {
    const wsUrl = cdpEndpoint
      ? await getBrowserWebSocketUrl(cdpEndpoint)
      : await waitForChromeDebugPort(port!, 30_000, { includeLastError: true });
    cdp = await CdpConnection.connect(wsUrl, 30_000, { defaultTimeoutMs: 30_000 });

    // Get page target
    const targets = await cdp.send<{ targetInfos: Array<{ targetId: string; url: string; type: string }> }>('Target.getTargets');
    let pageTarget = targets.targetInfos.find(
      (t) => t.type === 'page' && t.url.includes('/compose/articles/edit/')
    ) ?? targets.targetInfos.find((t) => t.type === 'page' && t.url.startsWith(X_ARTICLES_URL));

    if (!pageTarget) {
      const { targetId } = await cdp.send<{ targetId: string }>('Target.createTarget', { url: X_ARTICLES_URL });
      pageTarget = { targetId, url: X_ARTICLES_URL, type: 'page' };
    }

    const { sessionId } = await cdp.send<{ sessionId: string }>('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });

    await cdp.send('Page.enable', {}, { sessionId });
    await cdp.send('Runtime.enable', {}, { sessionId });
    await cdp.send('DOM.enable', {}, { sessionId });
    if (process.env.X_ARTICLE_DOM_TRACE === '1') {
      await cdp.send('Runtime.evaluate', {
        expression: buildDomTraceScript(),
        awaitPromise: true,
      }, { sessionId });
      console.log('[x-article] DOM method tracing enabled');
    }

    console.log('[x-article] Waiting for articles page...');
    await sleep(3000);

    // Wait for and click "create" button
    const waitForElement = async (selector: string, timeoutMs = 60_000): Promise<boolean> => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const result = await cdp!.send<{ result: { value: boolean } }>('Runtime.evaluate', {
          expression: `!!document.querySelector('${selector}')`,
          returnByValue: true,
        }, { sessionId });
        if (result.result.value) return true;
        await sleep(500);
      }
      return false;
    };

    const clickElement = async (selector: string): Promise<boolean> => {
      const result = await cdp!.send<{ result: { value: boolean } }>('Runtime.evaluate', {
        expression: `(() => { const el = document.querySelector('${selector}'); if (el) { el.click(); return true; } return false; })()`,
        returnByValue: true,
      }, { sessionId });
      return result.result.value;
    };

    const typeText = async (selector: string, text: string): Promise<void> => {
      await cdp!.send('Runtime.evaluate', {
        expression: `(() => {
          const el = document.querySelector('${selector}');
          if (el) {
            el.focus();
            document.execCommand('insertText', false, ${JSON.stringify(text)});
          }
        })()`,
      }, { sessionId });
    };

    const pressKey = async (key: string, modifiers = 0): Promise<void> => {
      await cdp!.send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key,
        code: `Key${key.toUpperCase()}`,
        modifiers,
        windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0),
      }, { sessionId });
      await cdp!.send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key,
        code: `Key${key.toUpperCase()}`,
        modifiers,
        windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0),
      }, { sessionId });
    };

    const waitForEvent = async <T = unknown>(method: string, timeoutMs = 5000): Promise<T | null> => {
      return await new Promise<T | null>((resolve) => {
        let settled = false;
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          resolve(null);
        }, timeoutMs);

        cdp!.on(method, (params) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(params as T);
        });
      });
    };

    const realClickElement = async (selectorExpression: string): Promise<boolean> => {
      const result = await cdp!.send<{ result: { value?: { x: number; y: number } | null } }>('Runtime.evaluate', {
        expression: `(() => {
          const el = ${selectorExpression};
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          if (!rect.width || !rect.height) return null;
          el.scrollIntoView({ block: 'center', inline: 'center' });
          const updated = el.getBoundingClientRect();
          return { x: updated.left + updated.width / 2, y: updated.top + updated.height / 2 };
        })()`,
        returnByValue: true,
      }, { sessionId });

      const point = result.result.value;
      if (!point) return false;

      await cdp!.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: point.x,
        y: point.y,
      }, { sessionId });
      await cdp!.send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: point.x,
        y: point.y,
        button: 'left',
        buttons: 1,
        clickCount: 1,
      }, { sessionId });
      await cdp!.send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: point.x,
        y: point.y,
        button: 'left',
        buttons: 0,
        clickCount: 1,
      }, { sessionId });
      return true;
    };

    const titleSelectors = I18N_SELECTORS.titleInput.join(', ');

    // Check if we're on the articles list page (has Write button)
    console.log('[x-article] Looking for Write button...');
    const writeButtonFound = await waitForElement('button[aria-label="create"], [data-testid="empty_state_button_text"]', 10_000);

    if (writeButtonFound) {
      console.log('[x-article] Clicking Write button...');
      await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          if (document.querySelector(${JSON.stringify(titleSelectors)})) return false;
          const createButton = document.querySelector('button[aria-label="create"]');
          if (createButton) { createButton.click(); return true; }
          const emptyStateButton = document.querySelector('[data-testid="empty_state_button_text"]');
          const clickable = emptyStateButton?.closest('button, a, [role="button"]') ?? emptyStateButton;
          if (clickable) { clickable.click(); return true; }
          return false;
        })()`,
      }, { sessionId });
      await sleep(2000);
    }

    // Wait for editor (title textarea)
    console.log('[x-article] Waiting for editor...');
    const editorFound = await waitForElement(titleSelectors, 30_000);
    if (!editorFound) {
      if (headless) {
        throw new Error('X Article editor not found in headless mode. Run once with --headed to log in, verify X Premium access, or handle verification.');
      }
      console.log('[x-article] Editor not found. Please ensure you have X Premium and are logged in.');
      await sleep(60_000);
      throw new Error('Editor not found');
    }

    // Upload cover image
    if (parsed.coverImage) {
      console.log('[x-article] Uploading cover image...');

      // Click "Add photos or video" button
      const addPhotosSelectors = JSON.stringify(I18N_SELECTORS.addPhotosButton);
      await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const selectors = ${addPhotosSelectors};
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) { el.click(); return true; }
          }
          return false;
        })()`,
      }, { sessionId });
      await sleep(500);

      // Use file input directly
      const { root } = await cdp.send<{ root: { nodeId: number } }>('DOM.getDocument', {}, { sessionId });
      const { nodeId } = await cdp.send<{ nodeId: number }>('DOM.querySelector', {
        nodeId: root.nodeId,
        selector: '[data-testid="fileInput"], input[type="file"][accept*="image"]',
      }, { sessionId });

      if (nodeId) {
        await cdp.send('DOM.setFileInputFiles', {
          nodeId,
          files: [parsed.coverImage],
        }, { sessionId });
        console.log('[x-article] Cover image file set');

        // Wait for Apply button to appear and click it
        console.log('[x-article] Waiting for Apply button...');
        const applyFound = await waitForElement('[data-testid="applyButton"]', 15_000);
        if (applyFound) {
          // Check if modal is present
          const isModalOpen = async (): Promise<boolean> => {
            const result = await cdp!.send<{ result: { value: boolean } }>('Runtime.evaluate', {
              expression: `!!document.querySelector('[role="dialog"][aria-modal="true"]')`,
              returnByValue: true,
            }, { sessionId });
            return result.result.value;
          };

          // Click Apply button with retry logic
          const maxRetries = 3;
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`[x-article] Clicking Apply button (attempt ${attempt}/${maxRetries})...`);

            await cdp.send('Runtime.evaluate', {
              expression: `document.querySelector('[data-testid="applyButton"]')?.click()`,
            }, { sessionId });

            // Wait for modal to close (up to 5 seconds per attempt)
            const closeTimeout = 5000;
            const checkInterval = 300;
            const startTime = Date.now();
            let modalClosed = false;

            while (Date.now() - startTime < closeTimeout) {
              await sleep(checkInterval);
              const stillOpen = await isModalOpen();
              if (!stillOpen) {
                modalClosed = true;
                break;
              }
            }

            if (modalClosed) {
              console.log('[x-article] Cover image applied, modal closed');
              await sleep(500);
              break;
            }

            if (attempt < maxRetries) {
              console.log('[x-article] Modal still open, retrying...');
            } else {
              console.log('[x-article] Modal did not close after all attempts, continuing anyway...');
            }
          }
        } else {
          console.log('[x-article] Apply button not found, continuing...');
        }
      }
    }

    // Fill title using keyboard input
    if (parsed.title) {
      console.log('[x-article] Filling title...');

      // Focus title input
      const titleInputSelectors = JSON.stringify(I18N_SELECTORS.titleInput);
      await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const selectors = ${titleInputSelectors};
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) { el.focus(); return true; }
          }
          return false;
        })()`,
      }, { sessionId });
      await sleep(200);

      // Type title character by character using insertText
      await cdp.send('Input.insertText', { text: parsed.title }, { sessionId });
      await sleep(300);

      // Tab out to trigger save
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }, { sessionId });
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }, { sessionId });
      await sleep(500);
    }

    // Insert HTML content
    console.log('[x-article] Inserting content...');

    // Read HTML content
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    // Focus on DraftEditor body
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const editor = document.querySelector(${JSON.stringify(EDITOR_SELECTOR)});
        if (editor) {
          editor.focus();
          editor.click();
          return true;
        }
        return false;
      })()`,
    }, { sessionId });
    await sleep(300);

    const contentSegments = parsed.contentImages.length > 0
      ? parsed.contentImages.reduce<string[]>((segments, img) => {
          const marker = new RegExp(`<p>\\s*${escapeRegExp(img.placeholder)}\\s*</p>\\n?`);
          const last = segments.pop() ?? '';
          const [before, after] = last.split(marker, 2);
          segments.push(before ?? '');
          segments.push(after ?? '');
          return segments;
        }, [htmlContent])
      : [htmlContent];

    const moveCaretToEditorEnd = async (): Promise<void> => {
      await cdp!.send('Runtime.evaluate', {
        expression: `(() => {
          const editor = document.querySelector(${JSON.stringify(EDITOR_SELECTOR)});
          if (!editor) return false;
          editor.focus();
          const range = document.createRange();
          range.selectNodeContents(editor);
          range.collapse(false);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          return true;
        })()`,
      }, { sessionId });
      await sleep(250);
    };

    const getArticleImageState = async (): Promise<{
      totalImages: number;
      bodyImages: number;
      coverSrc: string;
      editorRectTop: number | null;
    }> => {
      const result = await cdp!.send<{ result: { value: {
        totalImages: number;
        bodyImages: number;
        coverSrc: string;
        editorRectTop: number | null;
      } } }>('Runtime.evaluate', {
        expression: `(() => {
          const editor = document.querySelector(${JSON.stringify(EDITOR_SELECTOR)});
          const content = document.querySelector(${JSON.stringify(EDITOR_CONTENT_SELECTOR)}) || editor;
          const editorRect = editor?.getBoundingClientRect?.();
          const editorTop = editorRect ? editorRect.top : null;
          const images = Array.from(document.images);
          const isMediaImage = (img) => {
            const src = img.currentSrc || img.src || '';
            return src.includes('pbs.twimg.com/media') || src.startsWith('blob:') || src.startsWith('data:image/');
          };
          const bodyImages = content
            ? Array.from(content.querySelectorAll('img')).filter(isMediaImage).length
            : 0;
          const coverCandidates = images
            .filter(isMediaImage)
            .map((img) => ({ img, rect: img.getBoundingClientRect() }))
            .filter(({ rect }) => rect.width > 100 && rect.height > 100 && (editorTop === null || rect.bottom < editorTop + 12))
            .sort((a, b) => (b.rect.width * b.rect.height) - (a.rect.width * a.rect.height));
          const coverSrc = coverCandidates[0] ? (coverCandidates[0].img.currentSrc || coverCandidates[0].img.src || '') : '';
          return {
            totalImages: images.filter(isMediaImage).length,
            bodyImages,
            coverSrc,
            editorRectTop: editorTop,
          };
        })()`,
        returnByValue: true,
      }, { sessionId });
      return result.result.value;
    };

    const waitForInlineMediaCommitted = async (
      before: { totalImages: number; bodyImages: number; coverSrc: string },
      timeoutMs = 20_000,
    ): Promise<boolean> => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const state = await getArticleImageState();
        if (before.coverSrc && state.coverSrc && state.coverSrc !== before.coverSrc && state.bodyImages <= before.bodyImages) {
          console.warn('[x-article] Inline upload changed the cover image instead of inserting into the body');
          return false;
        }
        if (state.bodyImages > before.bodyImages || state.totalImages > before.totalImages) {
          return true;
        }
        await sleep(500);
      }
      return false;
    };

    const dispatchMouseClick = async (point: { x: number; y: number }): Promise<void> => {
      await cdp!.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: point.x,
        y: point.y,
      }, { sessionId });
      await cdp!.send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: point.x,
        y: point.y,
        button: 'left',
        buttons: 1,
        clickCount: 1,
      }, { sessionId });
      await cdp!.send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: point.x,
        y: point.y,
        button: 'left',
        buttons: 0,
        clickCount: 1,
      }, { sessionId });
    };

    const clickArticleInsertMediaMenu = async (): Promise<boolean> => {
      await moveCaretToEditorEnd();
      const insertButton = await cdp!.send<{ result: { value: {
        x: number;
        y: number;
        label: string;
        text: string;
      } | null } }>('Runtime.evaluate', {
        expression: `(() => {
          const editor = document.querySelector(${JSON.stringify(EDITOR_SELECTOR)});
          if (!editor) return null;
          const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
          const candidates = buttons.map((el) => {
            const rect = el.getBoundingClientRect();
            const label = el.getAttribute('aria-label') || '';
            const text = (el.textContent || '').trim();
            const disabled = el.disabled || el.getAttribute('aria-disabled') === 'true';
            const isInsertMedia = (
              /添加媒体内容|add media|insert media|media content/i.test(label)
              || /^(插入|Insert)$/i.test(text)
            );
            return { el, rect, label, text, disabled, isInsertMedia };
          }).filter((item) => (
            item.isInsertMedia
            && !item.disabled
            && item.rect.width > 0
            && item.rect.height > 0
          ));
          candidates.sort((a, b) => a.rect.top - b.rect.top);
          const chosen = candidates[0];
          if (!chosen) return null;
          chosen.el.scrollIntoView({ block: 'center', inline: 'center' });
          const updated = chosen.el.getBoundingClientRect();
          return {
            x: updated.left + updated.width / 2,
            y: updated.top + updated.height / 2,
            label: chosen.label,
            text: chosen.text,
          };
        })()`,
        returnByValue: true,
      }, { sessionId });

      if (!insertButton.result.value) return false;
      console.log(`[x-article] Opening body insert menu: label="${insertButton.result.value.label}" text="${insertButton.result.value.text}"`);
      await dispatchMouseClick(insertButton.result.value);
      await sleep(500);

      const mediaMenuItem = await cdp!.send<{ result: { value: {
        x: number;
        y: number;
        text: string;
      } | null } }>('Runtime.evaluate', {
        expression: `(() => {
          const menuItems = Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], div, button'));
          const candidates = menuItems.map((el) => {
            const rect = el.getBoundingClientRect();
            const text = (el.textContent || '').trim();
            const role = el.getAttribute('role') || '';
            return { el, rect, text, role };
          }).filter((item) => (
            item.rect.width > 0
            && item.rect.height > 0
            && /^(媒体|Media|メディア|미디어|照片|图片|Photo|Image)$/i.test(item.text)
            && !/gif/i.test(item.text)
          ));
          candidates.sort((a, b) => {
            const roleDelta = (a.role === 'menuitem' ? 0 : 1) - (b.role === 'menuitem' ? 0 : 1);
            if (roleDelta !== 0) return roleDelta;
            return a.rect.top - b.rect.top;
          });
          const chosen = candidates[0];
          if (!chosen) return null;
          const updated = chosen.el.getBoundingClientRect();
          return {
            x: updated.left + updated.width / 2,
            y: updated.top + updated.height / 2,
            text: chosen.text,
          };
        })()`,
        returnByValue: true,
      }, { sessionId });

      if (!mediaMenuItem.result.value) {
        console.warn('[x-article] Body insert menu opened, but Media menu item was not found');
        return false;
      }

      console.log(`[x-article] Choosing body insert menu item: "${mediaMenuItem.result.value.text}"`);
      await dispatchMouseClick(mediaMenuItem.result.value);
      return true;
    };

    const clickBodyMediaButton = async (): Promise<boolean> => {
      if (await clickArticleInsertMediaMenu()) return true;

      await moveCaretToEditorEnd();
      const result = await cdp!.send<{ result: { value: {
        ok: boolean;
        reason?: string;
        candidate?: {
          label: string;
          text: string;
          x: number;
          y: number;
          top: number;
          editorTop: number;
          editorBottom: number;
        };
      } } }>('Runtime.evaluate', {
        expression: `(() => {
          const editor = document.querySelector(${JSON.stringify(EDITOR_SELECTOR)});
          if (!editor) return { ok: false, reason: 'editor_not_found' };
          editor.focus();
          const editorRect = editor.getBoundingClientRect();
          const selectors = ${JSON.stringify(I18N_SELECTORS.addPhotosButton)};
          const selectorMatches = selectors.flatMap((sel) => Array.from(document.querySelectorAll(sel)));
          const allButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
          const textMatches = allButtons.filter((el) => /photo|image|media|照片|图片|图像|動画|写真|이미지|사진/i.test(
            [el.getAttribute('aria-label'), el.textContent].filter(Boolean).join(' ')
          ));
          const unique = Array.from(new Set([...selectorMatches, ...textMatches]));
          const visible = unique.map((el) => {
            const rect = el.getBoundingClientRect();
            const label = el.getAttribute('aria-label') || '';
            const text = (el.textContent || '').trim().slice(0, 80);
            const inDialog = !!el.closest('[role="dialog"][aria-modal="true"]');
            const disabled = el.disabled || el.getAttribute('aria-disabled') === 'true';
            const headerLike = rect.bottom < editorRect.top - 8;
            const tooFarBelow = rect.top > editorRect.bottom + 220;
            const area = rect.width * rect.height;
            const distanceToEditorEnd = Math.abs((rect.top + rect.height / 2) - editorRect.bottom);
            return { el, rect, label, text, inDialog, disabled, headerLike, tooFarBelow, area, distanceToEditorEnd };
          }).filter((item) => (
            item.area > 0
            && !item.inDialog
            && !item.disabled
            && !item.headerLike
            && !item.tooFarBelow
          ));
          visible.sort((a, b) => a.distanceToEditorEnd - b.distanceToEditorEnd);
          const chosen = visible[0];
          if (!chosen) {
            return {
              ok: false,
              reason: 'no_body_scoped_media_button',
              candidateCount: unique.length,
              editorTop: editorRect.top,
              editorBottom: editorRect.bottom,
            };
          }
          chosen.el.scrollIntoView({ block: 'center', inline: 'center' });
          const updated = chosen.el.getBoundingClientRect();
          return {
            ok: true,
            candidate: {
              label: chosen.label,
              text: chosen.text,
              x: updated.left + updated.width / 2,
              y: updated.top + updated.height / 2,
              top: updated.top,
              editorTop: editorRect.top,
              editorBottom: editorRect.bottom,
            },
          };
        })()`,
        returnByValue: true,
      }, { sessionId });

      const value = result.result.value;
      if (!value.ok || !value.candidate) {
        console.warn(`[x-article] Body-scoped media button not found: ${value.reason ?? 'unknown'}`);
        return false;
      }

      console.log(`[x-article] Clicking body media button: label="${value.candidate.label}" text="${value.candidate.text}" top=${Math.round(value.candidate.top)} editorTop=${Math.round(value.candidate.editorTop)}`);
      await dispatchMouseClick(value.candidate);
      return true;
    };

    const insertHtmlAtCursor = async (html: string, label: string): Promise<void> => {
      if (!html.trim()) return;

      await moveCaretToEditorEnd();
      const beforeLength = await cdp!.send<{ result: { value: number } }>('Runtime.evaluate', {
        expression: `document.querySelector(${JSON.stringify(EDITOR_CONTENT_SELECTOR)})?.innerText?.length || 0`,
        returnByValue: true,
      }, { sessionId });

      console.log(`[x-article] Attempting to insert HTML segment via paste event: ${label}`);
      await cdp!.send('Runtime.evaluate', {
        expression: `(() => {
          const editor = document.querySelector(${JSON.stringify(EDITOR_SELECTOR)});
          if (!editor) return false;
          editor.focus();
          const html = ${JSON.stringify(html)};
          const dt = new DataTransfer();
          dt.setData('text/html', html);
          dt.setData('text/plain', html.replace(/<[^>]*>/g, ''));
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: dt
          });
          editor.dispatchEvent(pasteEvent);
          return true;
        })()`,
      }, { sessionId });

      await sleep(1000);
      const afterPasteLength = await cdp!.send<{ result: { value: number } }>('Runtime.evaluate', {
        expression: `document.querySelector(${JSON.stringify(EDITOR_CONTENT_SELECTOR)})?.innerText?.length || 0`,
        returnByValue: true,
      }, { sessionId });

      if (afterPasteLength.result.value > beforeLength.result.value) {
        console.log(`[x-article] HTML segment inserted successfully (${afterPasteLength.result.value} chars total)`);
        return;
      }

      console.log('[x-article] Paste event may not have worked, trying insertHTML...');
      await moveCaretToEditorEnd();
      await cdp!.send('Runtime.evaluate', {
        expression: `(() => {
          const editor = document.querySelector(${JSON.stringify(EDITOR_SELECTOR)});
          if (!editor) return false;
          editor.focus();
          document.execCommand('insertHTML', false, ${JSON.stringify(html)});
          return true;
        })()`,
      }, { sessionId });

      await sleep(1000);
      const afterInsertLength = await cdp!.send<{ result: { value: number } }>('Runtime.evaluate', {
        expression: `document.querySelector(${JSON.stringify(EDITOR_CONTENT_SELECTOR)})?.innerText?.length || 0`,
        returnByValue: true,
      }, { sessionId });

      if (afterInsertLength.result.value > beforeLength.result.value) {
        console.log(`[x-article] HTML segment inserted via execCommand (${afterInsertLength.result.value} chars total)`);
        return;
      }

      console.log('[x-article] Auto-insert failed. HTML copied to clipboard - please paste manually (Cmd+V)');
      copyHtmlToClipboard(htmlPath);
      console.log('[x-article] Waiting 30s for manual paste...');
      await sleep(30_000);
    };

    await insertHtmlAtCursor(contentSegments[0] ?? htmlContent, 'initial');

    if (parsed.contentImages.length > 0 && contentSegments.length === parsed.contentImages.length + 1) {
      console.log('[x-article] Inserting content images with segmented flow...');

      const insertImageAtCursor = async (imagePath: string): Promise<boolean> => {
        await moveCaretToEditorEnd();
        const beforeImageState = await getArticleImageState();

        await cdp!.send('Page.setInterceptFileChooserDialog', { enabled: true }, { sessionId });
        const chooserPromise = waitForEvent<{ backendNodeId?: number; mode?: string }>('Page.fileChooserOpened', 5000);

        const clicked = await clickBodyMediaButton();

        if (!clicked) {
          console.warn('[x-article] Inline image button not found');
          await cdp!.send('Page.setInterceptFileChooserDialog', { enabled: false }, { sessionId });
          return false;
        }

        const chooser = await chooserPromise;
        let fileInputTarget: { backendNodeId?: number; nodeId?: number } | null = null;
        if (chooser?.backendNodeId) {
          fileInputTarget = { backendNodeId: chooser.backendNodeId };
          console.log('[x-article] Inline file chooser opened');
        } else {
          await sleep(700);
          const { root } = await cdp!.send<{ root: { nodeId: number } }>('DOM.getDocument', {}, { sessionId });
          const { nodeId } = await cdp!.send<{ nodeId: number }>('DOM.querySelector', {
            nodeId: root.nodeId,
            selector: '[data-testid="fileInput"], input[type="file"][accept*="image"], input[type="file"]',
          }, { sessionId });
          if (nodeId) fileInputTarget = { nodeId };
        }

        if (!fileInputTarget) {
          console.warn('[x-article] Inline file input not found');
          await cdp!.send('Page.setInterceptFileChooserDialog', { enabled: false }, { sessionId });
          return false;
        }

        await cdp!.send('DOM.setFileInputFiles', {
          ...fileInputTarget,
          files: [imagePath],
        }, { sessionId });
        await cdp!.send('Page.setInterceptFileChooserDialog', { enabled: false }, { sessionId });

        console.log('[x-article] Inline image file set');

        const waitForInlineApply = async (timeoutMs = 15_000): Promise<boolean> => {
          const start = Date.now();
          while (Date.now() - start < timeoutMs) {
            const found = await cdp!.send<{ result: { value: boolean } }>('Runtime.evaluate', {
              expression: `(() => {
                const button = document.querySelector('[data-testid="applyButton"]')
                  || Array.from(document.querySelectorAll('button, [role="button"]')).find((el) => {
                    const text = (el.textContent || '').trim();
                    const aria = el.getAttribute('aria-label') || '';
                    return text === '应用' || /^apply$/i.test(text) || aria === '应用' || /^apply$/i.test(aria);
                  });
                return !!button;
              })()`,
              returnByValue: true,
            }, { sessionId });
            if (found.result.value) return true;
            await sleep(300);
          }
          return false;
        };

        if (await waitForInlineApply()) {
          console.log('[x-article] Applying inline media edit...');
          const applied = await realClickElement(`(() => document.querySelector('[data-testid="applyButton"]')
            || Array.from(document.querySelectorAll('button, [role="button"]')).find((el) => {
              const text = (el.textContent || '').trim();
              const aria = el.getAttribute('aria-label') || '';
              return text === '应用' || /^apply$/i.test(text) || aria === '应用' || /^apply$/i.test(aria);
            }) || null)()`);
          if (!applied) return false;

          const modalClosedStart = Date.now();
          while (Date.now() - modalClosedStart < 15_000) {
            const stillOpen = await cdp!.send<{ result: { value: boolean } }>('Runtime.evaluate', {
              expression: `!!document.querySelector('[role="dialog"][aria-modal="true"], [data-testid="applyButton"]')`,
              returnByValue: true,
            }, { sessionId });
            if (!stillOpen.result.value) break;
            await sleep(300);
          }
        } else {
          console.log('[x-article] Inline media Apply button not found; waiting for direct body-media commit...');
        }

        return await waitForInlineMediaCommitted(beforeImageState);
      };

      for (let i = 0; i < parsed.contentImages.length; i++) {
        const img = parsed.contentImages[i]!;
        console.log(`[x-article] [${i + 1}/${parsed.contentImages.length}] Inserting inline image: ${path.basename(img.localPath)}`);
        if (await insertImageAtCursor(img.localPath)) {
          console.log(`[x-article] Image uploaded via file input: ${path.basename(img.localPath)}`);
        } else {
          console.warn(`[x-article] Failed to insert image via file chooser: ${path.basename(img.localPath)}`);
        }
        console.log('[x-article] Waiting for upload...');
        await sleep(5000);
        await insertHtmlAtCursor(contentSegments[i + 1] ?? '', `after ${img.placeholder}`);
      }

      console.log('[x-article] All images processed.');
    }

    // Legacy placeholder replacement fallback.
    if (parsed.contentImages.length > 0 && contentSegments.length !== parsed.contentImages.length + 1) {
      console.log('[x-article] Inserting content images...');

      // First, check what placeholders exist in the editor
      const editorContent = await cdp.send<{ result: { value: string } }>('Runtime.evaluate', {
        expression: `document.querySelector(${JSON.stringify(EDITOR_CONTENT_SELECTOR)})?.innerText || ''`,
        returnByValue: true,
      }, { sessionId });

      console.log('[x-article] Checking for placeholders in content...');
      for (const img of parsed.contentImages) {
        // Use regex for exact match (not followed by digit, e.g., XIMGPH_1 should not match XIMGPH_10)
        const regex = new RegExp(img.placeholder + '(?!\\d)');
        if (regex.test(editorContent.result.value)) {
          console.log(`[x-article] Found: ${img.placeholder}`);
        } else {
          console.log(`[x-article] NOT found: ${img.placeholder}`);
        }
      }

      // Process images in reverse XIMGPH order so inserting/deleting an image
      // does not disturb placeholders that appear earlier in the DraftJS tree.
      const getPlaceholderIndex = (placeholder: string): number => {
        const match = placeholder.match(/XIMGPH_(\d+)/);
        return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
      };
      const sortedImages = [...parsed.contentImages].sort(
        (a, b) => getPlaceholderIndex(b.placeholder) - getPlaceholderIndex(a.placeholder),
      );

      for (let i = 0; i < sortedImages.length; i++) {
        const img = sortedImages[i]!;
        console.log(`[x-article] [${i + 1}/${sortedImages.length}] Inserting image at placeholder: ${img.placeholder}`);

        // Helper to select placeholder with retry
        const selectPlaceholder = async (maxRetries = 3): Promise<boolean> => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            // Find, scroll to, and select the placeholder text in DraftEditor
            await cdp!.send('Runtime.evaluate', {
              expression: `(() => {
                const editor = document.querySelector(${JSON.stringify(EDITOR_CONTENT_SELECTOR)});
                if (!editor) return false;

                const placeholder = ${JSON.stringify(img.placeholder)};

                // Search through all text nodes in the editor
                const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
                let node;

                while ((node = walker.nextNode())) {
                  const text = node.textContent || '';
                  let searchStart = 0;
                  let idx;
                  // Search for exact match (not prefix of longer placeholder like XIMGPH_1 in XIMGPH_10)
                  while ((idx = text.indexOf(placeholder, searchStart)) !== -1) {
                    const afterIdx = idx + placeholder.length;
                    const charAfter = text[afterIdx];
                    // Exact match if next char is not a digit (XIMGPH_1 should not match XIMGPH_10)
                    if (charAfter === undefined || !/\\d/.test(charAfter)) {
                      // Found exact placeholder - scroll to it first
                      const parentElement = node.parentElement;
                      if (parentElement) {
                        parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }

                      // Select it
                      const range = document.createRange();
                      range.setStart(node, idx);
                      range.setEnd(node, idx + placeholder.length);
                      const sel = window.getSelection();
                      sel.removeAllRanges();
                      sel.addRange(range);
                      return true;
                    }
                    searchStart = afterIdx;
                  }
                }
                return false;
              })()`,
            }, { sessionId });

            // Wait for scroll and selection to settle
            await sleep(800);

            // Verify selection matches the placeholder
            const selectionCheck = await cdp!.send<{ result: { value: string } }>('Runtime.evaluate', {
              expression: `window.getSelection()?.toString() || ''`,
              returnByValue: true,
            }, { sessionId });

            const selectedText = selectionCheck.result.value.trim();
            if (selectedText === img.placeholder) {
              console.log(`[x-article] Selection verified: "${selectedText}"`);
              return true;
            }

            if (attempt < maxRetries) {
              console.log(`[x-article] Selection attempt ${attempt} got "${selectedText}", retrying...`);
              await sleep(500);
            } else {
              console.warn(`[x-article] Selection failed after ${maxRetries} attempts, got: "${selectedText}"`);
            }
          }
          return false;
        };

        // Try to select the placeholder
        const selected = await selectPlaceholder(3);
        if (!selected) {
          console.warn(`[x-article] Skipping image - could not select placeholder: ${img.placeholder}`);
          continue;
        }

        // Delete placeholder using execCommand (more reliable than keyboard events for DraftJS)
        console.log(`[x-article] Deleting placeholder...`);
        const deleteResult = await cdp.send<{ result: { value: boolean } }>('Runtime.evaluate', {
          expression: `(() => {
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed) return false;
            // Try execCommand delete first
            if (document.execCommand('delete', false)) return true;
            // Fallback: replace selection with empty using insertText
            document.execCommand('insertText', false, '');
            return true;
          })()`,
          returnByValue: true,
        }, { sessionId });

        await sleep(500);

        // Check that placeholder is no longer in editor (exact match, not substring)
        const afterDelete = await cdp.send<{ result: { value: boolean } }>('Runtime.evaluate', {
          expression: `(() => {
            const editor = document.querySelector(${JSON.stringify(EDITOR_CONTENT_SELECTOR)});
            if (!editor) return true;
            const text = editor.innerText;
            const placeholder = ${JSON.stringify(img.placeholder)};
            // Use regex to find exact match (not followed by digit)
            const regex = new RegExp(placeholder + '(?!\\\\d)');
            return !regex.test(text);
          })()`,
          returnByValue: true,
        }, { sessionId });

        if (!afterDelete.result.value) {
          console.warn(`[x-article] Placeholder may not have been deleted, trying dispatchEvent...`);
          // Try selecting and deleting with InputEvent
          await selectPlaceholder(1);
          await sleep(300);
          await cdp.send('Runtime.evaluate', {
            expression: `(() => {
              const editor = document.querySelector(${JSON.stringify(EDITOR_SELECTOR)});
              if (!editor) return;
              editor.focus();
              // Dispatch beforeinput and input events for deletion
              const beforeEvent = new InputEvent('beforeinput', { inputType: 'deleteContentBackward', bubbles: true, cancelable: true });
              editor.dispatchEvent(beforeEvent);
              const inputEvent = new InputEvent('input', { inputType: 'deleteContentBackward', bubbles: true });
              editor.dispatchEvent(inputEvent);
            })()`,
          }, { sessionId });
          await sleep(500);
        }

        // Focus editor to ensure cursor is in position
        await cdp.send('Runtime.evaluate', {
          expression: `(() => {
            const editor = document.querySelector(${JSON.stringify(EDITOR_SELECTOR)});
            if (editor) editor.focus();
          })()`,
        }, { sessionId });
        await sleep(300);

        const insertViaFileInput = async (): Promise<boolean> => {
          console.log(`[x-article] Trying direct file upload for image...`);

          const beforeImageState = await getArticleImageState();

          await cdp!.send('Page.setInterceptFileChooserDialog', { enabled: true }, { sessionId });
          const chooserPromise = waitForEvent<{ backendNodeId?: number; mode?: string }>('Page.fileChooserOpened', 5000);
          const openButton = await clickBodyMediaButton();

          if (!openButton) {
            console.warn('[x-article] Inline image button not found');
            await cdp!.send('Page.setInterceptFileChooserDialog', { enabled: false }, { sessionId });
            return false;
          }

          const chooser = await chooserPromise;
          let fileInputTarget: { backendNodeId?: number; nodeId?: number } | null = chooser?.backendNodeId
            ? { backendNodeId: chooser.backendNodeId }
            : null;

          if (!fileInputTarget) {
            await sleep(700);
            const { root } = await cdp!.send<{ root: { nodeId: number } }>('DOM.getDocument', {}, { sessionId });
            const { nodeId } = await cdp!.send<{ nodeId: number }>('DOM.querySelector', {
              nodeId: root.nodeId,
              selector: '[data-testid="fileInput"], input[type="file"][accept*="image"], input[type="file"]',
            }, { sessionId });
            if (nodeId) fileInputTarget = { nodeId };
          }

          if (!fileInputTarget) {
            console.warn('[x-article] Inline file input not found');
            await cdp!.send('Page.setInterceptFileChooserDialog', { enabled: false }, { sessionId });
            return false;
          }

          await cdp!.send('DOM.setFileInputFiles', {
            ...fileInputTarget,
            files: [img.localPath],
          }, { sessionId });
          await cdp!.send('Page.setInterceptFileChooserDialog', { enabled: false }, { sessionId });

          console.log('[x-article] Inline image file set');

          return await waitForInlineMediaCommitted(beforeImageState, 25_000);
        };

        if (await insertViaFileInput()) {
          console.log(`[x-article] Image uploaded via file input: ${path.basename(img.localPath)}`);
        } else {
          console.log(`[x-article] Direct upload failed, falling back to clipboard: ${path.basename(img.localPath)}`);
          if (!copyImageToClipboard(img.localPath)) {
            console.warn(`[x-article] Failed to copy image to clipboard`);
            continue;
          }

          // Wait for clipboard to be fully ready
          await sleep(1000);

          // Paste image using paste script (activates Chrome, sends real keystroke)
          console.log(`[x-article] Pasting image...`);
          if (pasteFromClipboard('Google Chrome', 5, 1000)) {
            console.log(`[x-article] Image pasted: ${path.basename(img.localPath)}`);
          } else {
            console.warn(`[x-article] Failed to paste image after retries`);
          }
        }

        // Wait for image to upload
        console.log(`[x-article] Waiting for upload...`);
        await sleep(5000);
      }

      console.log('[x-article] All images processed.');
    }

    // Before preview: blur editor to trigger save
    console.log('[x-article] Triggering content save...');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        // Blur editor to trigger any pending saves
        const editor = document.querySelector(${JSON.stringify(EDITOR_SELECTOR)});
        if (editor) {
          editor.blur();
        }
        // Also click elsewhere to ensure focus is lost
        document.body.click();
      })()`,
    }, { sessionId });
    await sleep(1500);

    if (submit) {
      console.log('[x-article] Publishing...');
      const publishSelectors = JSON.stringify(I18N_SELECTORS.publishButton);
      const clickPublish = async (): Promise<boolean> => {
        const result = await cdp!.send<{ result: { value: boolean } }>('Runtime.evaluate', {
          expression: `(() => {
            const isVisible = (el) => {
              const rect = el.getBoundingClientRect();
              const style = getComputedStyle(el);
              return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
            };
            const isEnabled = (el) => !el.disabled && el.getAttribute('aria-disabled') !== 'true';
            const labelOf = (el) => (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim();
            const isPublishLabel = (label) => {
              const normalized = (label || '').trim();
              return normalized === '发布'
                || normalized === '公开'
                || /^publish$/i.test(normalized)
                || /发布文章|publish article/i.test(normalized);
            };
            const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
            const matchingButtons = buttons.filter((el) => isVisible(el) && isEnabled(el) && isPublishLabel(labelOf(el)));
            const dialogButton = matchingButtons.find((el) => el.closest('[role="dialog"], [aria-modal="true"]'));
            if (dialogButton) { dialogButton.click(); return true; }
            const ariaConfirmButton = matchingButtons.find((el) => el.getAttribute('aria-label') && isPublishLabel(el.getAttribute('aria-label')));
            if (ariaConfirmButton) { ariaConfirmButton.click(); return true; }
            const selectors = ${publishSelectors};
            for (const sel of selectors) {
              const el = document.querySelector(sel);
              if (el && isVisible(el) && isEnabled(el)) { el.click(); return true; }
            }
            const textButton = matchingButtons[0];
            if (textButton) { textButton.click(); return true; }
            window.__xArticlePublishCandidates = Array.from(document.querySelectorAll('button, a, [role="button"]'))
              .filter(isVisible)
              .map((el) => ({
                tag: el.tagName,
                label: labelOf(el),
                aria: el.getAttribute('aria-label'),
                testid: el.getAttribute('data-testid'),
                disabled: el.disabled || el.getAttribute('aria-disabled'),
                rect: (() => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })(),
              }))
              .filter((item) => item.label || item.aria || item.testid)
              .slice(-120);
            return false;
          })()`,
          returnByValue: true,
        }, { sessionId });
        return result.result.value;
      };

      const openPreviewAndVerify = async (): Promise<boolean> => {
        const previewSelectors = JSON.stringify(I18N_SELECTORS.previewButton);
        const previewClicked = await cdp!.send<{ result: { value: boolean } }>('Runtime.evaluate', {
          expression: `(() => {
            const selectors = ${previewSelectors};
            for (const sel of selectors) {
              const el = document.querySelector(sel);
              if (el) { el.click(); return true; }
            }
            const textButton = Array.from(document.querySelectorAll('button, a, [role="button"]'))
              .find((el) => (el.textContent || '').trim() === '预览' || /^preview$/i.test((el.textContent || '').trim()));
            if (textButton) { textButton.click(); return true; }
            return false;
          })()`,
          returnByValue: true,
        }, { sessionId });

        if (!previewClicked.result.value) return false;
        console.log('[x-article] Preview opened before publish');
        await sleep(3000);
        if (parsed.contentImages.length > 0) {
          const expectedMediaImages = parsed.contentImages.length + (parsed.coverImage ? 1 : 0);
          const previewImageCheck = await cdp!.send<{ result: { value: { mediaImages: number; bodyText: string } } }>('Runtime.evaluate', {
            expression: `(() => {
              const mediaImages = Array.from(document.images)
                .filter((img) => (img.currentSrc || img.src || '').includes('pbs.twimg.com/media') && img.naturalWidth > 500)
                .length;
              return { mediaImages, bodyText: document.body.innerText.slice(0, 1000) };
            })()`,
            returnByValue: true,
          }, { sessionId });

          const { mediaImages, bodyText } = previewImageCheck.result.value;
          if (mediaImages < expectedMediaImages) {
            throw new Error(`X Article preview persisted ${mediaImages}/${expectedMediaImages} expected media images before publish. Body: ${bodyText.slice(0, 160)}`);
          }
          console.log(`[x-article] Preview media verification passed (${mediaImages}/${expectedMediaImages}) before publish`);
        }
        return true;
      };

      let openedPublishSheet = await clickPublish();
      if (!openedPublishSheet) {
        const previewOpened = await openPreviewAndVerify();
        if (previewOpened) {
          openedPublishSheet = await clickPublish();
        }
      }
      if (!openedPublishSheet) {
        console.log('[x-article] Publish button not visible; reopening latest article draft...');
        await cdp.send('Page.navigate', { url: X_ARTICLES_URL }, { sessionId });
        await sleep(4000);

        const openedDraft = await cdp.send<{ result: { value: { ok: boolean; url: string; bodyText: string } } }>('Runtime.evaluate', {
          expression: `(() => {
            const title = ${JSON.stringify(parsed.title)};
            const isVisible = (el) => {
              const rect = el.getBoundingClientRect();
              const style = getComputedStyle(el);
              return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
            };
            const titleCards = Array.from(document.querySelectorAll('a'))
              .filter((el) => isVisible(el) && (el.innerText || '').includes(title));
            const card = titleCards[0];
            if (card) card.click();
            return { ok: !!card, url: location.href, bodyText: document.body.innerText.slice(0, 1200) };
          })()`,
          returnByValue: true,
        }, { sessionId });

        if (openedDraft.result.value.ok) {
          console.log('[x-article] Latest article draft opened');
          await sleep(4000);
          openedPublishSheet = await clickPublish();
        } else {
          console.log(`[x-article] Latest article draft not found. URL: ${openedDraft.result.value.url}. Body: ${openedDraft.result.value.bodyText.slice(0, 240)}`);
        }

        if (!openedPublishSheet) {
        const candidates = await cdp.send<{ result: { value: unknown } }>('Runtime.evaluate', {
          expression: `(() => ({
            url: location.href,
            bodyText: document.body.innerText.slice(0, 1200),
            candidates: window.__xArticlePublishCandidates || [],
          }))()`,
          returnByValue: true,
        }, { sessionId });
        throw new Error(`Publish button not found. Candidates: ${JSON.stringify(candidates.result.value).slice(0, 1200)}`);
        }
      }
      await sleep(2500);
      const confirmedPublish = await clickPublish();
      if (!confirmedPublish) {
        throw new Error('Publish confirmation button not found');
      }
      await sleep(8000);

      const publishState = await cdp.send<{ result: { value: { url: string; bodyText: string } } }>('Runtime.evaluate', {
        expression: `(() => {
          return { url: location.href, bodyText: document.body.innerText.slice(0, 1000) };
        })()`,
        returnByValue: true,
      }, { sessionId });

      const { url, bodyText } = publishState.result.value;
      if (!url.includes('/status/') && !url.includes('/article/')) {
        throw new Error(`Publish did not navigate to a public article/status URL. Current URL: ${url}. Body: ${bodyText.slice(0, 200)}`);
      }
      console.log(`[x-article] Article published: ${url}`);
    } else {
      // Click Preview button
      console.log('[x-article] Opening preview...');
      const previewSelectors = JSON.stringify(I18N_SELECTORS.previewButton);
      const previewClicked = await cdp.send<{ result: { value: boolean } }>('Runtime.evaluate', {
        expression: `(() => {
          const selectors = ${previewSelectors};
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) { el.click(); return true; }
          }
          const textButton = Array.from(document.querySelectorAll('button, a, [role="button"]'))
            .find((el) => (el.textContent || '').trim() === '预览' || /^preview$/i.test((el.textContent || '').trim()));
          if (textButton) { textButton.click(); return true; }
          return false;
        })()`,
        returnByValue: true,
      }, { sessionId });

      if (previewClicked.result.value) {
        console.log('[x-article] Preview opened');
        await sleep(3000);
        if (parsed.contentImages.length > 0) {
          const expectedMediaImages = parsed.contentImages.length + (parsed.coverImage ? 1 : 0);
          const previewImageCheck = await cdp.send<{ result: { value: { mediaImages: number; bodyText: string } } }>('Runtime.evaluate', {
            expression: `(() => {
              const mediaImages = Array.from(document.images)
                .filter((img) => (img.currentSrc || img.src || '').includes('pbs.twimg.com/media') && img.naturalWidth > 500)
                .length;
              return { mediaImages, bodyText: document.body.innerText.slice(0, 1000) };
            })()`,
            returnByValue: true,
          }, { sessionId });

          const { mediaImages, bodyText } = previewImageCheck.result.value;
          if (mediaImages < expectedMediaImages) {
            throw new Error(`X Article preview persisted ${mediaImages}/${expectedMediaImages} expected media images. Inline content images were not saved into the article body. Body: ${bodyText.slice(0, 160)}`);
          }
          console.log(`[x-article] Preview media verification passed (${mediaImages}/${expectedMediaImages})`);
        }
      } else {
        console.log('[x-article] Preview button not found');
      }

      console.log('[x-article] Article composed (draft mode).');
      console.log('[x-article] Browser remains open for manual review.');
    }

  } finally {
    if (cdp) {
      if (headless && !existingPort && !cdpEndpoint) {
        try { await cdp.send('Browser.close', {}, { timeoutMs: 5_000 }); } catch {}
      }
      cdp.close();
    }
    if (headless && chrome) {
      setTimeout(() => {
        if (!chrome.killed) try { chrome.kill('SIGKILL'); } catch {}
      }, 2_000).unref?.();
      try { chrome.kill('SIGTERM'); } catch {}
    }
  }
}

function printUsage(): never {
  console.log(`Publish Markdown article to X (Twitter) Articles

Usage:
  npx -y bun x-article.ts <markdown_file> [options]

Options:
  --title <title>     Override title
  --cover <image>     Override cover image
  --submit            Actually publish (default: draft only)
  --profile <dir>     Chrome profile directory
  --cdp-endpoint <url> Existing Chrome CDP endpoint to reuse (for tracing/debug)
  --new-browser       Do not reuse an existing Chrome debug port
  --headed            Open a visible browser for login/manual preview
  --headless          Force background mode (default; can also set X_BROWSER_HEADLESS=0)
  --help              Show this help

Markdown frontmatter:
  ---
  title: My Article Title
  cover_image: /path/to/cover.jpg
  ---

Example:
  npx -y bun x-article.ts article.md
  npx -y bun x-article.ts article.md --cover ./hero.png
  npx -y bun x-article.ts article.md --submit
`);
  process.exit(0);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
  }

  let markdownPath: string | undefined;
  let title: string | undefined;
  let coverImage: string | undefined;
  let submit = false;
  let profileDir: string | undefined;
  let newBrowser = false;
  let cdpEndpoint: string | undefined;
  const headless = parseHeadlessFlag(args);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--title' && args[i + 1]) {
      title = args[++i];
    } else if (arg === '--cover' && args[i + 1]) {
      coverImage = args[++i];
    } else if (arg === '--submit') {
      submit = true;
    } else if (arg === '--profile' && args[i + 1]) {
      profileDir = args[++i];
    } else if (arg === '--cdp-endpoint' && args[i + 1]) {
      cdpEndpoint = args[++i];
    } else if (arg === '--new-browser') {
      newBrowser = true;
    } else if (arg === '--headless' || arg === '--headed') {
      continue;
    } else if (!arg.startsWith('-')) {
      markdownPath = arg;
    }
  }

  if (!markdownPath) {
    console.error('Error: Markdown file path required');
    process.exit(1);
  }

  if (!fs.existsSync(markdownPath)) {
    console.error(`Error: File not found: ${markdownPath}`);
    process.exit(1);
  }

  await publishArticle({ markdownPath, title, coverImage, submit, profileDir, headless, newBrowser, cdpEndpoint });
}

await main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
