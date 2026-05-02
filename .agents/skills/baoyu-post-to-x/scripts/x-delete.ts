import { spawn } from 'node:child_process';
import process from 'node:process';
import {
  buildChromeLaunchArgs,
  CHROME_CANDIDATES_FULL,
  CdpConnection,
  findChromeExecutable,
  getDefaultProfileDir,
  getExpectedXHandle,
  getFreePort,
  maybeGetBrowserWebSocketUrl,
  normalizeXHandle,
  parseHeadlessFlag,
  resolveHeadlessMode,
  sleep,
  waitForChromeDebugPort,
} from './x-utils.js';

type Options = {
  urls: string[];
  expectedHandle?: string;
  profileDir?: string;
  cdpEndpoint?: string;
  headless?: boolean;
  dryRun?: boolean;
};

function usage(): never {
  console.log(`Delete own X posts via Chrome CDP

Usage:
  npx -y bun x-delete.ts --url https://x.com/handle/status/123 [--url ...]

Options:
  --url <url>              X status URL to delete; repeatable
  --expected-handle <h>    Required publishing account guard
  --profile <dir>          Chrome profile directory
  --cdp-endpoint <url>     Existing Chrome CDP endpoint
  --headed                 Use visible Chrome
  --headless               Use headless Chrome (default)
  --dry-run                Verify target only; do not delete
`);
  process.exit(0);
}

function parseArgs(args: string[]): Options {
  if (args.includes('--help') || args.includes('-h')) usage();
  const urls: string[] = [];
  let expectedHandle: string | undefined;
  let profileDir: string | undefined;
  let cdpEndpoint: string | undefined;
  let dryRun = false;
  const headless = parseHeadlessFlag(args);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--url' && args[i + 1]) urls.push(args[++i]!);
    else if (arg === '--expected-handle' && args[i + 1]) expectedHandle = args[++i]!;
    else if (arg === '--profile' && args[i + 1]) profileDir = args[++i]!;
    else if (arg === '--cdp-endpoint' && args[i + 1]) cdpEndpoint = args[++i]!;
    else if (arg === '--dry-run') dryRun = true;
    else if (arg === '--headed' || arg === '--headless') continue;
    else if (!arg.startsWith('-')) urls.push(arg);
  }

  if (urls.length === 0) {
    console.error('Error: provide at least one --url.');
    process.exit(1);
  }

  return { urls, expectedHandle, profileDir, cdpEndpoint, headless, dryRun };
}

function expectedUsername(options: Options): string {
  const handle = options.expectedHandle
    ? normalizeXHandle(options.expectedHandle)
    : getExpectedXHandle();
  if (!handle) {
    throw new Error('Delete requires --expected-handle or expected_handle in EXTEND.md.');
  }
  return handle.replace(/^@/, '').toLowerCase();
}

function normalizeOwnStatusUrl(rawUrl: string, username: string): { url: string; id: string } {
  const parsed = new URL(rawUrl);
  const host = parsed.hostname.replace(/^www\./, '');
  if (host !== 'x.com' && host !== 'twitter.com') {
    throw new Error(`Not an X status URL: ${rawUrl}`);
  }
  const match = parsed.pathname.match(new RegExp(`^/${username}/status/(\\d+)`, 'i'));
  if (!match) {
    throw new Error(`Refusing to delete a status URL that is not owned by @${username}: ${rawUrl}`);
  }
  return { url: `https://x.com/${username}/status/${match[1]}`, id: match[1] };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const username = expectedUsername(options);
  const targets = options.urls.map((url) => normalizeOwnStatusUrl(url, username));
  const headless = resolveHeadlessMode(options.headless);

  let cdp: CdpConnection | null = null;
  let launchedChrome: ReturnType<typeof spawn> | null = null;
  let ownsBrowser = false;

  try {
    let wsUrl = await maybeGetBrowserWebSocketUrl(options.cdpEndpoint);
    if (!wsUrl) {
      const profileDir = options.profileDir ?? getDefaultProfileDir();
      const chromePath = findChromeExecutable(CHROME_CANDIDATES_FULL);
      if (!chromePath) throw new Error('Chrome not found. Set X_BROWSER_CHROME_PATH env var.');
      const port = await getFreePort();
      launchedChrome = spawn(chromePath, buildChromeLaunchArgs({
        port,
        profileDir,
        url: targets[0]!.url,
        headless,
      }), { stdio: 'ignore' });
      ownsBrowser = true;
      wsUrl = await waitForChromeDebugPort(port, 30_000, { includeLastError: true });
    }

    cdp = await CdpConnection.connect(wsUrl, 30_000, { defaultTimeoutMs: 15_000 });
    const { targetInfos } = await cdp.send<{ targetInfos: Array<{ targetId: string; type: string; url: string }> }>('Target.getTargets');
    let pageTarget = targetInfos.find((target) => target.type === 'page' && /https?:\/\/(x|twitter)\.com\//.test(target.url));
    if (!pageTarget) {
      const created = await cdp.send<{ targetId: string }>('Target.createTarget', { url: targets[0]!.url });
      pageTarget = { targetId: created.targetId, type: 'page', url: targets[0]!.url };
    }

    const { sessionId } = await cdp.send<{ sessionId: string }>('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });
    await cdp.send('Page.enable', {}, { sessionId });
    await cdp.send('Runtime.enable', {}, { sessionId });
    await cdp.send('Input.setIgnoreInputEvents', { ignore: false }, { sessionId });

    const account = await cdp.send<{ result: { value?: string } }>('Runtime.evaluate', {
      expression: `JSON.stringify((function() {
        const button = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
        return button ? button.innerText.replace(/\\s+/g, ' ').trim() : '';
      })())`,
      returnByValue: true,
    }, { sessionId });
    const accountText = String(JSON.parse(account.result.value || '""') || '').toLowerCase();
    if (accountText && !accountText.includes(`@${username}`)) {
      throw new Error(`Wrong X account. Expected @${username}; saw ${accountText}.`);
    }

    for (const target of targets) {
      console.log(`[x-delete] Opening ${target.url}`);
      await cdp.send('Page.navigate', { url: target.url }, { sessionId, timeoutMs: 5_000 });
      await sleep(4_000);

      const snapshot = await cdp.send<{ result: { value?: string } }>('Runtime.evaluate', {
        expression: `JSON.stringify((function() {
          const username = ${JSON.stringify(username)};
          const statusId = ${JSON.stringify(target.id)};
          function isVisible(el) {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
          }
          function isTargetLink(anchor) {
            try {
              const url = new URL(anchor.href);
              const host = url.hostname.replace(/^www\\./, '');
              return (host === 'x.com' || host === 'twitter.com')
                && new RegExp('^/' + username + '/status/' + statusId + '(?:$|/)', 'i').test(url.pathname);
            } catch {
              return false;
            }
          }
          const articles = Array.from(document.querySelectorAll('article')).filter(isVisible);
          const article = articles.find((candidate) => Array.from(candidate.querySelectorAll('a[href*="/status/"]')).some(isTargetLink));
          return {
            url: window.location.href,
            title: document.title,
            found: Boolean(article),
            articleText: article ? article.innerText.slice(0, 240) : '',
            bodyText: document.body.innerText.slice(0, 240),
          };
        })())`,
        returnByValue: true,
      }, { sessionId });
      const state = JSON.parse(snapshot.result.value || '{}') as { found?: boolean; bodyText?: string; articleText?: string };
      if (!state.found) {
        console.log(`[x-delete] Target not visible; treating as already absent: ${target.url}`);
        continue;
      }
      console.log(`[x-delete] Target visible: ${(state.articleText || '').replace(/\s+/g, ' ').slice(0, 120)}`);
      if (options.dryRun) continue;

      const deleteClicked = await cdp.send<{ result: { value?: string } }>('Runtime.evaluate', {
        expression: `(async function() {
          const username = ${JSON.stringify(username)};
          const statusId = ${JSON.stringify(target.id)};
          function isVisible(el) {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
          }
          function isTargetLink(anchor) {
            try {
              const url = new URL(anchor.href);
              const host = url.hostname.replace(/^www\\./, '');
              return (host === 'x.com' || host === 'twitter.com')
                && new RegExp('^/' + username + '/status/' + statusId + '(?:$|/)', 'i').test(url.pathname);
            } catch {
              return false;
            }
          }
          const articles = Array.from(document.querySelectorAll('article')).filter(isVisible);
          const article = articles.find((candidate) => Array.from(candidate.querySelectorAll('a[href*="/status/"]')).some(isTargetLink));
          if (!article) return 'target_article_not_found';
          const moreButton = article.querySelector('[data-testid="caret"], button[aria-label*="More"], button[aria-label*="更多"]');
          if (!moreButton) return 'more_button_not_found';
          moreButton.click();
          await new Promise((resolve) => setTimeout(resolve, 800));
          const menuItems = Array.from(document.querySelectorAll('[role="menuitem"], [data-testid="Dropdown"] div[role="button"]'));
          const deleteItem = menuItems.find((item) => /delete|删除/i.test(item.innerText || item.getAttribute('aria-label') || ''));
          if (!deleteItem) return 'delete_menuitem_not_found:' + menuItems.map((item) => (item.innerText || item.getAttribute('aria-label') || '').trim()).filter(Boolean).slice(0, 8).join('|');
          deleteItem.click();
          await new Promise((resolve) => setTimeout(resolve, 800));
          const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]')
            || Array.from(document.querySelectorAll('button, [role="button"]')).find((button) => /delete|删除/i.test(button.innerText || button.getAttribute('aria-label') || ''));
          if (!confirm) return 'confirm_button_not_found';
          confirm.click();
          return 'clicked';
        })()`,
        awaitPromise: true,
        returnByValue: true,
      }, { sessionId, timeoutMs: 8_000 });
      if (deleteClicked.result.value !== 'clicked') {
        throw new Error(`Unable to delete ${target.url}: ${deleteClicked.result.value || 'unknown'}`);
      }

      await sleep(3_000);
      await cdp.send('Page.navigate', { url: target.url }, { sessionId, timeoutMs: 5_000 });
      await sleep(3_000);
      const verify = await cdp.send<{ result: { value?: boolean } }>('Runtime.evaluate', {
        expression: `(function() {
          const statusId = ${JSON.stringify(target.id)};
          return !Array.from(document.querySelectorAll('a[href*="/status/"]')).some((anchor) => anchor.href.includes('/status/' + statusId));
        })()`,
        returnByValue: true,
      }, { sessionId });
      if (!verify.result.value) {
        throw new Error(`Delete verification failed; status still appears visible: ${target.url}`);
      }
      console.log(`[x-delete] Deleted and verified absent: ${target.url}`);
    }
  } finally {
    if (cdp) {
      if (ownsBrowser) {
        try { await cdp.send('Browser.close', {}, { timeoutMs: 5_000 }); } catch {}
      }
      cdp.close();
    }
    if (launchedChrome) {
      setTimeout(() => {
        if (!launchedChrome?.killed) try { launchedChrome?.kill('SIGKILL'); } catch {}
      }, 2_000).unref?.();
      try { launchedChrome.kill('SIGTERM'); } catch {}
    }
  }
}

await main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
