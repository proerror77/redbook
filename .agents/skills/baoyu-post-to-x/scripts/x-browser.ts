import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  buildChromeLaunchArgs,
  CHROME_CANDIDATES_FULL,
  CdpConnection,
  copyImageToClipboard,
  findChromeExecutable,
  getDefaultProfileDir,
  getExpectedXHandle,
  getFreePort,
  maybeGetBrowserWebSocketUrl,
  normalizeXHandle,
  parseHeadlessFlag,
  resolveHeadlessMode,
  pasteFromClipboard,
  sleep,
  waitForChromeDebugPort,
} from './x-utils.js';

const X_COMPOSE_URL = 'https://x.com/compose/post';

interface XBrowserOptions {
  text?: string;
  images?: string[];
  submit?: boolean;
  timeoutMs?: number;
  loginWaitMs?: number;
  keepOpenOnLoginRequired?: boolean;
  checkLogin?: boolean;
  expectedHandle?: string;
  profileDir?: string;
  chromePath?: string;
  headless?: boolean;
  cdpEndpoint?: string;
  newBrowser?: boolean;
  allowLongformGallery?: boolean;
}

export async function postToX(options: XBrowserOptions): Promise<void> {
  const { text, images = [], submit = false, timeoutMs = 120_000 } = options;
  const resolvedImages = images.map((imagePath) => path.resolve(imagePath));
  const headless = resolveHeadlessMode(options.headless);
  const missingImages = resolvedImages.filter((imagePath) => !fs.existsSync(imagePath));
  if (missingImages.length > 0) {
    throw new Error(`Image file(s) not found; refusing to continue because this would risk a text-only X post: ${missingImages.join(', ')}`);
  }
  if (submit && resolvedImages.length > 1 && String(text || '').length > 1000 && !options.allowLongformGallery) {
    throw new Error([
      'Refusing to submit a longform regular X post with multiple images.',
      'Regular X posts render images as a gallery, not inline article illustrations.',
      'Use x-article.ts with Markdown inline images, split into a structured thread, or pass --allow-longform-gallery only when a gallery is intentional.',
    ].join(' '));
  }

  let cdp: CdpConnection | null = null;
  let launchedChrome: ReturnType<typeof spawn> | null = null;
  let ownsBrowser = false;
  let keepBrowserOpen = false;
  let launchedProfileDir: string | null = null;
  let launchedChromePath: string | null = null;

  try {
    const explicitCdpEndpoint = Boolean(options.cdpEndpoint?.trim());
    const shouldLaunchNewBrowser = Boolean(options.newBrowser || options.profileDir || (submit && !explicitCdpEndpoint));
    let wsUrl = shouldLaunchNewBrowser ? null : await maybeGetBrowserWebSocketUrl(options.cdpEndpoint);

    if (wsUrl) {
      console.log(`[x-browser] Reusing existing Chrome CDP session (${options.cdpEndpoint || process.env.X_BROWSER_CDP_ENDPOINT || 'http://127.0.0.1:9222'})`);
    } else {
      const profileDir = options.profileDir ?? getDefaultProfileDir();
      const chromePath = options.chromePath ?? findChromeExecutable(CHROME_CANDIDATES_FULL);
      if (!chromePath) throw new Error('Chrome not found. Set X_BROWSER_CHROME_PATH env var.');
      launchedProfileDir = profileDir;
      launchedChromePath = chromePath;

      await mkdir(profileDir, { recursive: true });

      const port = await getFreePort();
      console.log(`[x-browser] Launching Chrome (${headless ? 'headless' : 'headed'}, profile: ${profileDir})`);

      launchedChrome = spawn(chromePath, buildChromeLaunchArgs({
        port,
        profileDir,
        url: X_COMPOSE_URL,
        headless,
      }), { stdio: 'ignore' });
      ownsBrowser = true;
      wsUrl = await waitForChromeDebugPort(port, 30_000, { includeLastError: true });
    }

    cdp = await CdpConnection.connect(wsUrl, 30_000, { defaultTimeoutMs: 15_000 });

    const targets = await cdp.send<{ targetInfos: Array<{ targetId: string; url: string; type: string }> }>('Target.getTargets');
    const pageTargets = targets.targetInfos.filter((t) => t.type === 'page');
    let pageTarget = pageTargets.find((t) => /https?:\/\/(x|twitter)\.com\/compose\/post/.test(t.url));

    if (!pageTarget) {
      pageTarget = pageTargets.find((t) => t.url === 'about:blank');
    }

    if (!pageTarget && ownsBrowser) {
      pageTarget = pageTargets.find((t) => /https?:\/\/(x|twitter)\.com\//.test(t.url));
    }

    if (!pageTarget) {
      console.log('[x-browser] No reusable compose/about:blank tab found; creating one controlled compose tab.');
      const { targetId } = await cdp.send<{ targetId: string }>('Target.createTarget', { url: X_COMPOSE_URL });
      pageTarget = { targetId, url: X_COMPOSE_URL, type: 'page' };
    }

    const { sessionId } = await cdp.send<{ sessionId: string }>('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });

    await cdp.send('Page.enable', {}, { sessionId });
    await cdp.send('Runtime.enable', {}, { sessionId });
    await cdp.send('Input.setIgnoreInputEvents', { ignore: false }, { sessionId });

    if (!pageTarget.url.includes('/compose/post')) {
      console.log(`[x-browser] Navigating reusable tab to compose: ${X_COMPOSE_URL}`);
      await cdp.send('Page.navigate', { url: X_COMPOSE_URL }, { sessionId, timeoutMs: 5_000 });
    }

    console.log('[x-browser] Waiting for X editor...');
    await sleep(3000);

    type VisibleEditor = { x: number; y: number; w: number; h: number };

    const findVisibleEditor = async (): Promise<VisibleEditor | null> => {
      const result = await cdp!.send<{ result: { value: string } }>('Runtime.evaluate', {
        expression: `JSON.stringify((function() {
          const editors = Array.from(document.querySelectorAll('[contenteditable="true"][data-testid="tweetTextarea_0"]'))
            .map((el) => {
              const rect = el.getBoundingClientRect();
              const style = window.getComputedStyle(el);
              return {
                x: rect.x,
                y: rect.y,
                w: rect.width,
                h: rect.height,
                visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
              };
            })
            .filter((editor) => editor.visible)
            .sort((a, b) => b.h - a.h);
          return editors[0] || null;
        })())`,
        returnByValue: true,
      }, { sessionId });

      const value = result.result.value;
      return typeof value === 'string' && value ? JSON.parse(value) as VisibleEditor | null : null;
    };

    const waitForEditor = async (waitMs: number = timeoutMs): Promise<boolean> => {
      const start = Date.now();
      while (Date.now() - start < waitMs) {
        const editor = await findVisibleEditor();
        if (editor) return true;
        await sleep(1000);
      }
      return false;
    };

    const readLoginSnapshot = async (): Promise<{ url?: string; title?: string; accountText?: string }> => {
      const result = await cdp!.send<{ result: { value?: string } }>('Runtime.evaluate', {
        expression: `JSON.stringify((function() {
          const accountButton = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
          return {
            url: window.location.href,
            title: document.title,
            accountText: accountButton ? accountButton.innerText.replace(/\\s+/g, ' ').trim() : ''
          };
        })())`,
        returnByValue: true,
      }, { sessionId });
      return JSON.parse(result.result.value || '{}') as { url?: string; title?: string; accountText?: string };
    };

    const resolveExpectedHandle = (): string | undefined => (
      options.expectedHandle
        ? normalizeXHandle(options.expectedHandle)
        : getExpectedXHandle()
    );

    const expectedUsername = (): string => {
      const expectedHandle = resolveExpectedHandle();
      if (!expectedHandle) {
        throw new Error('X submit verification requires --expected-handle or expected_handle in EXTEND.md.');
      }
      return expectedHandle.replace(/^@/, '').toLowerCase();
    };

    const requireExpectedAccount = async (
      context: string,
      requireConfigured: boolean = false,
    ): Promise<void> => {
      const expectedHandle = resolveExpectedHandle();
      if (!expectedHandle) {
        if (requireConfigured) {
          throw new Error(`${context} requires --expected-handle or expected_handle in EXTEND.md. Refusing to continue without an account guard.`);
        }
        return;
      }

      const snapshot = await readLoginSnapshot();
      const seen = String(snapshot.accountText || '').toLowerCase();
      if (!seen.includes(expectedHandle)) {
        throw new Error(`${context} saw the wrong X account. Expected ${expectedHandle}; saw ${snapshot.accountText || snapshot.title || snapshot.url || 'no account text'}.`);
      }
      console.log(`[x-browser] ${context} account check passed: ${snapshot.accountText || expectedHandle}`);
    };

    const focusVisibleEditor = async (): Promise<void> => {
      const editor = await findVisibleEditor();
      if (!editor) throw new Error('Visible X editor not found.');

      const x = editor.x + Math.min(40, editor.w / 2);
      const y = editor.y + Math.min(40, editor.h / 2);
      await cdp!.send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x,
        y,
        button: 'left',
        clickCount: 1,
      }, { sessionId });
      await cdp!.send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x,
        y,
        button: 'left',
        clickCount: 1,
      }, { sessionId });
      await sleep(200);
    };

    const countComposerMedia = async (): Promise<number> => {
      const result = await cdp!.send<{ result: { value?: number } }>('Runtime.evaluate', {
        expression: `(function() {
          function isVisible(el) {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return rect.width > 20 && rect.height > 20 && style.display !== 'none' && style.visibility !== 'hidden';
          }

          function findComposerRoot() {
            const editors = Array.from(document.querySelectorAll('[contenteditable="true"][data-testid="tweetTextarea_0"]'))
              .filter(isVisible)
              .sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height);
            const editor = editors[0];
            if (!editor) return null;

            let node = editor;
            while (node && node !== document.body) {
              if (node.querySelector?.('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]')) {
                return node;
              }
              node = node.parentElement;
            }
            return editor.closest('[role="dialog"]') || editor.closest('article') || editor.closest('main');
          }

          const root = findComposerRoot();
          if (!root) return 0;

          const mediaRoots = Array.from(root.querySelectorAll(
            '[data-testid="attachments"] [data-testid="tweetPhoto"], [data-testid="attachments"] [aria-label="Image"], [data-testid="tweetPhoto"], div[aria-label="Image"]'
          )).filter((el) => {
            if (!isVisible(el)) return false;
            const img = el.querySelector('img[src^="blob:"], img[src*="pbs.twimg.com/media"]');
            return Boolean(img && isVisible(img));
          });
          if (mediaRoots.length > 0) return mediaRoots.length;

          const sources = new Set(Array.from(root.querySelectorAll(
            '[data-testid="attachments"] img[src^="blob:"], [data-testid="attachments"] img[src*="pbs.twimg.com/media"], [data-testid="tweetPhoto"] img[src^="blob:"], [data-testid="tweetPhoto"] img[src*="pbs.twimg.com/media"]'
          )).filter(isVisible).map((img) => img.getAttribute('src')).filter(Boolean));
          return sources.size;
        })()`,
        returnByValue: true,
      }, { sessionId });
      return Number(result.result.value || 0);
    };

    const waitForComposerMedia = async (expectedCount: number): Promise<number> => {
      const start = Date.now();
      let count = 0;
      while (Date.now() - start < 45_000) {
        count = await countComposerMedia();
        if (count >= expectedCount) return count;
        await sleep(1000);
      }
      return count;
    };

    const getCurrentUrl = async (): Promise<string> => {
      const result = await cdp!.send<{ result: { value?: string } }>('Runtime.evaluate', {
        expression: 'window.location.href',
        returnByValue: true,
      }, { sessionId });
      return result.result.value || '';
    };

    const normalizeOwnStatusUrl = (rawUrl: string, username: string): string | null => {
      try {
        const url = new URL(rawUrl);
        if (!['x.com', 'twitter.com'].includes(url.hostname.replace(/^www\./, ''))) return null;
        const match = url.pathname.match(new RegExp(`^/${username}/status/(\\d+)`, 'i'));
        if (!match) return null;
        return `https://x.com/${username}/status/${match[1]}`;
      } catch {
        return null;
      }
    };

    const statusIdFromUrl = (rawUrl: string, username: string): string | null => {
      const normalized = normalizeOwnStatusUrl(rawUrl, username);
      return normalized?.match(/\/status\/(\d+)$/)?.[1] || null;
    };

    const findMatchingOwnTimelinePostUrl = async (username: string, expectedSnippet: string): Promise<string | null> => {
      const result = await cdp!.send<{ result: { value?: string | null } }>('Runtime.evaluate', {
        expression: `(function() {
          const username = ${JSON.stringify(username)};
          const expectedSnippet = ${JSON.stringify(expectedSnippet)};
          function normalizeText(value) {
            return String(value || '').replace(/\\s+/g, ' ').trim();
          }
          function ownStatusUrl(rawUrl) {
            try {
              const url = new URL(rawUrl);
              const host = url.hostname.replace(/^www\\./, '');
              if (host !== 'x.com' && host !== 'twitter.com') return null;
              const match = url.pathname.match(new RegExp('^/' + username + '/status/(\\\\d+)', 'i'));
              if (!match) return null;
              return 'https://x.com/' + username + '/status/' + match[1];
            } catch {
              return null;
            }
          }
          const articles = Array.from(document.querySelectorAll('article')).filter((article) => {
            const rect = article.getBoundingClientRect();
            const style = window.getComputedStyle(article);
            return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
          });
          for (const article of articles) {
            const textMatches = expectedSnippet
              ? normalizeText(article.innerText).includes(normalizeText(expectedSnippet))
              : true;
            if (!textMatches) continue;
            const ownHref = Array.from(article.querySelectorAll('a[href*="/status/"]'))
              .map((anchor) => ownStatusUrl(anchor.href))
              .find(Boolean);
            if (ownHref) return ownHref;
          }
          return null;
        })()`,
        returnByValue: true,
      }, { sessionId });
      return result.result.value || null;
    };

    const waitForPublishedPostUrl = async (): Promise<string> => {
      const username = expectedUsername();
      const expectedSnippet = text?.trim().replace(/\s+/g, ' ').slice(0, 40) || '';
      const start = Date.now();
      let openedProfile = false;
      while (Date.now() - start < 30_000) {
        const currentUrl = await getCurrentUrl();
        const currentOwnStatus = normalizeOwnStatusUrl(currentUrl, username);
        if (currentOwnStatus) return currentOwnStatus;

        if (!openedProfile && Date.now() - start > 4_000) {
          openedProfile = true;
          await cdp!.send('Page.navigate', { url: `https://x.com/${username}` }, { sessionId, timeoutMs: 5_000 });
          await sleep(3000);
        }

        if (openedProfile) {
          const candidate = await findMatchingOwnTimelinePostUrl(username, expectedSnippet);
          if (candidate) return candidate;
        }
        await sleep(1000);
      }
      throw new Error(`Post submitted, but no matching status URL was found on @${username}'s timeline. Refusing to claim success without a verifiable own-account X status URL.`);
    };

    const verifyPublishedPost = async (postUrl: string): Promise<void> => {
      const username = expectedUsername();
      const normalizedPostUrl = normalizeOwnStatusUrl(postUrl, username);
      if (!normalizedPostUrl) {
        throw new Error(`Refusing to verify a non-owned or malformed X status URL: ${postUrl}`);
      }
      const statusId = statusIdFromUrl(normalizedPostUrl, username);
      if (!statusId) {
        throw new Error(`Unable to parse X status id from URL: ${normalizedPostUrl}`);
      }

      const currentUrl = await getCurrentUrl();
      if (normalizeOwnStatusUrl(currentUrl, username) !== normalizedPostUrl) {
        await cdp!.send('Page.navigate', { url: normalizedPostUrl }, { sessionId, timeoutMs: 5_000 });
        await sleep(4000);
      }

      const expectedSnippet = text?.trim().replace(/\s+/g, ' ').slice(0, 40) || '';
      const result = await cdp!.send<{ result: { value?: string } }>('Runtime.evaluate', {
        expression: `JSON.stringify((function() {
          const username = ${JSON.stringify(username)};
          const statusId = ${JSON.stringify(statusId)};
          const expectedSnippet = ${JSON.stringify(expectedSnippet)};
          function isVisible(el) {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return rect.width > 20 && rect.height > 20 && style.display !== 'none' && style.visibility !== 'hidden';
          }
          function normalizeText(value) {
            return String(value || '').replace(/\\s+/g, ' ').trim();
          }
          function isOwnStatusLink(anchor) {
            try {
              const url = new URL(anchor.href);
              const host = url.hostname.replace(/^www\\./, '');
              if (host !== 'x.com' && host !== 'twitter.com') return false;
              return new RegExp('^/' + username + '/status/' + statusId + '(?:$|/)', 'i').test(url.pathname);
            } catch {
              return false;
            }
          }
          const articles = Array.from(document.querySelectorAll('article')).filter(isVisible);
          const article = articles.find((candidate) => (
            Array.from(candidate.querySelectorAll('a[href*="/status/"]')).some(isOwnStatusLink)
          )) || articles[0] || document.body;
          const articleText = article.innerText || '';
          const photoLinks = Array.from(article.querySelectorAll('a[href*="/photo/"]')).filter(isOwnStatusLink);
          const visibleMedia = Array.from(article.querySelectorAll('[data-testid="tweetPhoto"] img, img[src*="pbs.twimg.com/media"]')).filter(isVisible);
          return {
            url: window.location.href,
            hasExpectedText: expectedSnippet ? normalizeText(articleText).includes(normalizeText(expectedSnippet)) : true,
            mediaCount: photoLinks.length + visibleMedia.length
          };
        })())`,
        returnByValue: true,
      }, { sessionId });

      const verification = JSON.parse(result.result.value || '{}') as {
        url?: string;
        hasExpectedText?: boolean;
        mediaCount?: number;
      };

      if (text && !verification.hasExpectedText) {
        throw new Error(`Published X post did not show the expected text snippet on the matched status page: ${normalizedPostUrl}`);
      }
      if (resolvedImages.length > 0 && (verification.mediaCount || 0) < 1) {
        throw new Error(`Published X post did not show an image/photo link on the matched status article: ${normalizedPostUrl}`);
      }

      console.log(`[x-browser] Verified post: ${verification.url || normalizedPostUrl} (media=${verification.mediaCount || 0})`);
    };

    const editorFound = await waitForEditor();
    if (!editorFound) {
      if (headless) {
        if (options.checkLogin) {
          throw new Error('X editor not found during login check. Run tools/redbookctl x-login --headed --login-wait-ms 600000 for manual recovery.');
        }
        if (ownsBrowser && launchedProfileDir && launchedChromePath) {
          console.log('[x-browser] Headless mode cannot recover login. Opening a headed Chrome with the same profile for manual recovery...');
          try { await cdp!.send('Browser.close', {}, { timeoutMs: 5_000 }); } catch {}
          cdp.close();
          cdp = null;
          try { launchedChrome?.kill('SIGTERM'); } catch {}
          launchedChrome = null;

          const recoveryPort = await getFreePort();
          launchedChrome = spawn(launchedChromePath, buildChromeLaunchArgs({
            port: recoveryPort,
            profileDir: launchedProfileDir,
            url: X_COMPOSE_URL,
            headless: false,
          }), { stdio: 'ignore' });
          keepBrowserOpen = true;
          await waitForChromeDebugPort(recoveryPort, 30_000, { includeLastError: true });
          throw new Error('Opened headed Chrome for X login/verification recovery. Finish login in that window, then rerun the same command.');
        }
        throw new Error('X editor not found in headless mode. Run with --headed to restore login/verification state. The script will not submit without a visible composer.');
      }
      console.log('[x-browser] Editor not found. Please log in to X in the browser window.');
      console.log('[x-browser] Waiting for login/verification recovery. The browser will stay open if this times out.');
      const loginWaitMs = options.loginWaitMs ?? 10 * 60_000;
      const loggedIn = await waitForEditor(loginWaitMs);
      if (!loggedIn) {
        keepBrowserOpen = options.keepOpenOnLoginRequired ?? true;
        throw new Error('Timed out waiting for X login recovery. Browser left open for manual login; rerun the same command after the composer is available.');
      }
    }

    if (options.checkLogin) {
      const snapshot = await readLoginSnapshot();
      await requireExpectedAccount('X login check');
      console.log(`[x-browser] Login check passed: ${snapshot.accountText || snapshot.title || snapshot.url || 'X composer visible'}`);
      return;
    }

    await requireExpectedAccount(submit ? 'X submit' : 'X compose', submit);

    if (text) {
      console.log('[x-browser] Typing text...');
      await focusVisibleEditor();
      await cdp.send('Input.insertText', { text }, { sessionId });
      await sleep(500);
    }

    if (resolvedImages.length > 0) {
      await cdp.send('DOM.enable', {}, { sessionId });
    }

    for (const imagePath of resolvedImages) {
      console.log(`[x-browser] Uploading image: ${imagePath}`);

      // Use DOM.setFileInputFiles to bypass clipboard entirely
      const { root } = await cdp.send<{ root: { nodeId: number } }>('DOM.getDocument', {}, { sessionId });
      const { nodeId } = await cdp.send<{ nodeId: number }>('DOM.querySelector', {
        nodeId: root.nodeId,
        selector: 'input[type="file"]',
      }, { sessionId });

      if (nodeId) {
        await cdp.send('DOM.setFileInputFiles', { files: [imagePath], nodeId }, { sessionId });
      } else {
        // Fallback: clipboard paste via osascript
        console.warn('[x-browser] File input not found, falling back to clipboard paste...');
        if (copyImageToClipboard(imagePath)) {
          await sleep(500);
          await focusVisibleEditor();
          pasteFromClipboard('Google Chrome', 5, 500);
        }
      }

      console.log('[x-browser] Waiting for image upload...');
      await sleep(4000);
    }

    if (resolvedImages.length > 0) {
      const uploadedCount = await waitForComposerMedia(resolvedImages.length);
      if (uploadedCount < resolvedImages.length) {
        throw new Error(`Expected ${resolvedImages.length} attached image(s), but X composer only shows ${uploadedCount}. Refusing to submit a possible text-only post.`);
      }
      console.log(`[x-browser] Verified composer media attachment count: ${uploadedCount}`);
    }

    if (submit) {
      console.log('[x-browser] Waiting 7 seconds before submit...');
      await sleep(7000);
      console.log('[x-browser] Submitting post...');
      await cdp.send('Runtime.evaluate', {
        expression: `document.querySelector('[data-testid="tweetButton"]')?.click()`,
      }, { sessionId });
      const postUrl = await waitForPublishedPostUrl();
      console.log(`[x-browser] Post URL: ${postUrl}`);
      await verifyPublishedPost(postUrl);
      console.log('[x-browser] Post submitted and verified!');
    } else {
      console.log('[x-browser] Post composed (preview mode). Add --submit to post.');
      console.log('[x-browser] Browser will stay open for 30 seconds for preview...');
      await sleep(30_000);
    }
  } finally {
    if (cdp) {
      if (ownsBrowser && !keepBrowserOpen) {
        try { await cdp.send('Browser.close', {}, { timeoutMs: 5_000 }); } catch {}
      }
      cdp.close();
    }

    if (launchedChrome && !keepBrowserOpen) {
      setTimeout(() => {
        if (!launchedChrome?.killed) try { launchedChrome?.kill('SIGKILL'); } catch {}
      }, 2_000).unref?.();
      try { launchedChrome.kill('SIGTERM'); } catch {}
    } else if (keepBrowserOpen) {
      console.log('[x-browser] Keeping Chrome open for login recovery.');
    }
  }
}

function printUsage(): never {
  console.log(`Post to X (Twitter) using real Chrome browser

Usage:
  npx -y bun x-browser.ts [options] [text]

Options:
  --image <path>   Add image (can be repeated, max 4)
  --submit         Actually post (default: preview only)
  --profile <dir>  Chrome profile directory
  --cdp-endpoint <url>  Existing Chrome CDP endpoint (non-submit default: X_BROWSER_CDP_ENDPOINT or 127.0.0.1:9222)
  --new-browser    Force isolated Chrome/profile instead of reusing current Chrome CDP
  --headed         Open a visible browser for login/manual preview
  --headless       Force background mode (default; can also set X_BROWSER_HEADLESS=0)
  --check-login    Verify X composer/login state only; do not type or submit
  --expected-handle <handle>  Require the logged-in X account to match this handle
  --timeout-ms <ms>  How long to wait for the X composer before failing (default: 120000)
  --login-wait-ms <ms>  How long headed mode waits for manual login recovery (default: 600000)
  --close-on-login-required  Close launched browser even when login recovery times out
  --allow-longform-gallery  Allow long text with multiple images as a regular post gallery
  --help           Show this help

Examples:
  npx -y bun x-browser.ts "Hello from CLI!"
  npx -y bun x-browser.ts "Check this out" --image ./screenshot.png
  npx -y bun x-browser.ts "Post it!" --image a.png --image b.png --submit

Submit safety:
  --submit requires expected_handle/--expected-handle and checks the visible account
  before typing/uploading/clicking. Submit uses the configured publish profile unless
  --cdp-endpoint is explicitly provided.
`);
  process.exit(0);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) printUsage();

  const images: string[] = [];
  let submit = false;
  let profileDir: string | undefined;
  let cdpEndpoint: string | undefined;
  let newBrowser = false;
  let timeoutMs: number | undefined;
  let loginWaitMs: number | undefined;
  let keepOpenOnLoginRequired = true;
  let checkLogin = false;
  let expectedHandle: string | undefined;
  let allowLongformGallery = false;
  const headless = parseHeadlessFlag(args);
  const textParts: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--image' && args[i + 1]) {
      images.push(args[++i]!);
    } else if (arg === '--submit') {
      submit = true;
    } else if (arg === '--profile' && args[i + 1]) {
      profileDir = args[++i];
      newBrowser = true;
    } else if (arg === '--cdp-endpoint' && args[i + 1]) {
      cdpEndpoint = args[++i];
    } else if (arg === '--new-browser') {
      newBrowser = true;
    } else if (arg === '--check-login') {
      checkLogin = true;
    } else if (arg === '--allow-longform-gallery') {
      allowLongformGallery = true;
    } else if (arg === '--expected-handle' && args[i + 1]) {
      expectedHandle = args[++i];
    } else if (arg === '--timeout-ms' && args[i + 1]) {
      timeoutMs = Number(args[++i]);
      if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
        console.error(`Error: Invalid --timeout-ms: ${args[i]}`);
        process.exit(1);
      }
    } else if (arg === '--login-wait-ms' && args[i + 1]) {
      loginWaitMs = Number(args[++i]);
      if (!Number.isFinite(loginWaitMs) || loginWaitMs < 0) {
        console.error(`Error: Invalid --login-wait-ms: ${args[i]}`);
        process.exit(1);
      }
    } else if (arg === '--close-on-login-required') {
      keepOpenOnLoginRequired = false;
    } else if (arg === '--headless' || arg === '--headed') {
      continue;
    } else if (!arg.startsWith('-')) {
      textParts.push(arg);
    }
  }

  const text = textParts.join(' ').trim() || undefined;

  if (!checkLogin && !text && images.length === 0) {
    console.error('Error: Provide text or at least one image.');
    process.exit(1);
  }

  await postToX({
    text,
    images,
    submit,
    timeoutMs,
    profileDir,
    headless,
    cdpEndpoint,
    newBrowser,
    loginWaitMs,
    keepOpenOnLoginRequired,
    checkLogin,
    expectedHandle,
    allowLongformGallery,
  });
}

if (import.meta.main) {
  await main().catch((err) => {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
