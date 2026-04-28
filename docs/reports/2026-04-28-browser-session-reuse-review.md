# Browser Session Reuse Review

> Date: 2026-04-28
> Scope: Redbook browser login/session flows for X, 小红书, 微信, BOSS.

## Findings

1. The intended standard already exists: production browser work should use `interactive-browser`, reuse real Chrome/CDP, and escalate to headed only for login/CAPTCHA/manual confirmation.
2. The daily X research path was recently moved toward existing Chrome/CDP, but there was no single command to check current browser/login state before starting a workflow.
3. X regular posting still launched a fresh Chrome/profile by default, which caused repeated login/session work and focus/context churn.
4. Some other write surfaces still have private browser launchers, especially X video/quote/article and WeChat article scripts. They should be migrated next to the same shared session resolver.

## Fixes Applied

- Added `tools/browser-core/interactive/session.mjs`:
  - reads current Chrome CDP tabs only;
  - does not open pages;
  - reports reusable/needs-login/missing state for X, 小红书, 微信, and BOSS.
- Added `tools/redbookctl browser` as the default human/operator entrypoint for browser session health.
- Updated the main workflow docs so browser work starts with session inspection and avoids new profile/tab creation by default.
- Updated `/baoyu-post-to-x` regular post script:
  - first tries existing Chrome CDP (`X_BROWSER_CDP_ENDPOINT` or `127.0.0.1:9222`);
  - reuses an existing X tab when possible;
  - only launches an isolated Chrome when CDP is unavailable, `--profile` is supplied, or `--new-browser` is explicit;
  - does not close the user's real Chrome when it reuses CDP.

## Recommended Operating Pattern

Before X/XHS/WeChat/BOSS work:

```bash
tools/redbookctl browser
```

If the relevant site is `reusable`, continue with the site workflow. If it is `needs_login_or_verification`, switch to a deliberate headed login/verification step. If CDP is unavailable, start or reuse Chrome with:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --no-first-run
```

Do not start a fresh profile as the default recovery path.

## Remaining Work

- Port X video, quote, and article scripts to the same current-CDP resolver.
- Port WeChat browser scripts away from private Chrome launchers where current-tab/CDP reuse is sufficient.
- Add a small site-specific smoke for 小红书 creator center after the next real logged-in browser session is available.
