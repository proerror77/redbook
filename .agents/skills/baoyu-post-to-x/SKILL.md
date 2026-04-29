---
name: baoyu-post-to-x
description: Posts content and articles to X (Twitter). Supports regular posts with images/videos and X Articles (long-form Markdown). Uses real Chrome with CDP to bypass anti-automation. Use when user asks to "post to X", "tweet", "publish to Twitter", or "share on X".
---

# Post to X (Twitter)

Posts text, images, videos, and long-form articles to X via real Chrome browser (bypasses anti-bot detection).

## Browser Mode

- Mode: `interactive-browser`
- Standard: [docs/standards/browser-modes.md](/Users/proerror/Documents/redbook/docs/standards/browser-modes.md)
- Current status: this skill is a site-specific write layer. It may keep its X-specific page logic, but it should not be treated as the repo's generic browser foundation.
- Session default: reuse the existing Chrome/CDP endpoint (`X_BROWSER_CDP_ENDPOINT` or `127.0.0.1:9222`) and an existing X tab when possible. If CDP is unavailable, use `--profile`, `X_BROWSER_PROFILE_DIR`, or `default_profile` in `EXTEND.md` before falling back to `~/.local/share/x-browser-profile`.
- Default execution posture: `headless`. Use `--headed` only for first login, verification/CAPTCHA, or an intentional manual preview.
- Login recovery: when `--headed` is used and the composer is not available, keep the browser open and wait for manual login/verification instead of closing it.

## Script Directory

**Important**: All scripts are located in the `scripts/` subdirectory of this skill.

**Agent Execution Instructions**:
1. Determine this SKILL.md file's directory path as `SKILL_DIR`
2. Script path = `${SKILL_DIR}/scripts/<script-name>.ts`
3. Replace all `${SKILL_DIR}` in this document with the actual path

**Script Reference**:
| Script | Purpose |
|--------|---------|
| `scripts/x-browser.ts` | Regular posts (text + images) |
| `scripts/x-video.ts` | Video posts (text + video) |
| `scripts/x-quote.ts` | Quote tweet with comment |
| `scripts/x-article.ts` | Long-form article publishing (Markdown) |
| `scripts/md-to-html.ts` | Markdown → HTML conversion |
| `scripts/copy-to-clipboard.ts` | Copy content to clipboard |
| `scripts/paste-from-clipboard.ts` | Send real paste keystroke |

## Preferences (EXTEND.md)

Use Bash to check EXTEND.md existence (priority order):

```bash
# Check project-level first
test -f .baoyu-skills/baoyu-post-to-x/EXTEND.md && echo "project"

# Then user-level (cross-platform: $HOME works on macOS/Linux/WSL)
test -f "$HOME/.baoyu-skills/baoyu-post-to-x/EXTEND.md" && echo "user"
```

┌──────────────────────────────────────────────────┬───────────────────┐
│                       Path                       │     Location      │
├──────────────────────────────────────────────────┼───────────────────┤
│ .baoyu-skills/baoyu-post-to-x/EXTEND.md          │ Project directory │
├──────────────────────────────────────────────────┼───────────────────┤
│ $HOME/.baoyu-skills/baoyu-post-to-x/EXTEND.md    │ User home         │
└──────────────────────────────────────────────────┴───────────────────┘

┌───────────┬───────────────────────────────────────────────────────────────────────────┐
│  Result   │                                  Action                                   │
├───────────┼───────────────────────────────────────────────────────────────────────────┤
│ Found     │ Read, parse, apply settings                                               │
├───────────┼───────────────────────────────────────────────────────────────────────────┤
│ Not found │ Use defaults                                                              │
└───────────┴───────────────────────────────────────────────────────────────────────────┘

**EXTEND.md Supports**: Default Chrome profile (`default_profile`) | Expected X handle (`expected_handle`) | Auto-submit preference

## Prerequisites

- Google Chrome or Chromium
- `bun` runtime
- First run: log in to X manually (session saved)

## References

- **Regular Posts**: See `references/regular-posts.md` for manual workflow, troubleshooting, and technical details
- **X Articles**: See `references/articles.md` for long-form article publishing guide

---

## Regular Posts

Text + up to 4 images.

```bash
npx -y bun ${SKILL_DIR}/scripts/x-browser.ts "Hello!" --image ./photo.png          # Preview
npx -y bun ${SKILL_DIR}/scripts/x-browser.ts "Hello!" --image ./photo.png --submit  # Post
```

**Parameters**:
| Parameter | Description |
|-----------|-------------|
| `<text>` | Post content (positional) |
| `--image <path>` | Image file (repeatable, max 4) |
| `--submit` | Post (default: preview) |
| `--profile <dir>` | Custom Chrome profile |
| `--cdp-endpoint <url>` | Existing Chrome CDP endpoint to reuse |
| `--new-browser` | Force isolated Chrome/profile instead of current Chrome/CDP reuse |
| `--headed` | Open a visible browser for login or manual preview |
| `--headless` | Force background mode (default) |
| `--check-login` | Verify X composer/login state only; do not type or submit |
| `--expected-handle <handle>` | Require the logged-in X account to match this handle |
| `--timeout-ms <ms>` | How long to wait for the X composer before failing |
| `--login-wait-ms <ms>` | In headed mode, wait for manual login/verification recovery before failing (default: 600000) |
| `--close-on-login-required` | Close the launched browser even if login recovery times out |

**Image safety gate**:
- If `--image` is provided and the file does not exist, the script aborts before opening X.
- If images are provided but the composer does not show the same number of attached media, the script refuses to submit.
- After `--submit`, success is claimed only after a status URL is found and the status page shows the expected text plus a photo/media link.
- Do not report a post as published from script stdout alone; include the status URL or explain the verification blocker.

**Login recovery gate**:
- Before posting from an uncertain session, run `tools/redbookctl x-login`; it forces the configured publish profile and checks `expected_handle`.
- If headless mode cannot find a composer in a browser it launched, it opens a headed Chrome with the same profile for manual recovery and leaves it open.
- If headless mode cannot recover the active browser itself, rerun with `--headed`; the script will wait for login/verification and never submit until the composer is visible.
- If headed mode times out while waiting for login recovery, the launched browser stays open by default. Finish login manually, then rerun the same command.
- Use `--close-on-login-required` only for deliberate cleanup runs.

---

## Video Posts

Text + video file.

```bash
npx -y bun ${SKILL_DIR}/scripts/x-video.ts "Check this out!" --video ./clip.mp4          # Preview
npx -y bun ${SKILL_DIR}/scripts/x-video.ts "Amazing content" --video ./demo.mp4 --submit  # Post
```

**Parameters**:
| Parameter | Description |
|-----------|-------------|
| `<text>` | Post content (positional) |
| `--video <path>` | Video file (MP4, MOV, WebM) |
| `--submit` | Post (default: preview) |
| `--profile <dir>` | Custom Chrome profile |
| `--headed` | Open a visible browser for login or manual preview |
| `--headless` | Force background mode (default) |

**Limits**: Regular 140s max, Premium 60min. Processing: 30-60s.

---

## Quote Tweets

Quote an existing tweet with comment.

```bash
npx -y bun ${SKILL_DIR}/scripts/x-quote.ts https://x.com/user/status/123 "Great insight!"          # Preview
npx -y bun ${SKILL_DIR}/scripts/x-quote.ts https://x.com/user/status/123 "I agree!" --submit       # Post
```

**Parameters**:
| Parameter | Description |
|-----------|-------------|
| `<tweet-url>` | URL to quote (positional) |
| `<comment>` | Comment text (positional, optional) |
| `--submit` | Post (default: preview) |
| `--profile <dir>` | Custom Chrome profile |
| `--headed` | Open a visible browser for login or manual preview |
| `--headless` | Force background mode (default) |

---

## X Articles

Long-form Markdown articles (requires X Premium).

```bash
npx -y bun ${SKILL_DIR}/scripts/x-article.ts article.md                        # Preview
npx -y bun ${SKILL_DIR}/scripts/x-article.ts article.md --cover ./cover.jpg    # With cover
npx -y bun ${SKILL_DIR}/scripts/x-article.ts article.md --submit               # Publish
```

**Parameters**:
| Parameter | Description |
|-----------|-------------|
| `<markdown>` | Markdown file (positional) |
| `--cover <path>` | Cover image |
| `--title <text>` | Override title |
| `--submit` | Publish (default: preview) |
| `--headed` | Open a visible browser for login/manual preview or inline content-image paste |
| `--headless` | Force background mode (default; inline content images are rejected because they still require clipboard paste) |

**Frontmatter**: `title`, `cover_image` supported in YAML front matter.

---

## Notes

- First run or verification: rerun the same command with `--headed` and log in manually; subsequent publish runs default to headless.
- Before posting from a long-running session, run `tools/redbookctl browser` to confirm the current X tab is reusable instead of opening another browser.
- Always review the final text/assets before `--submit`; use `--headed` only when the browser itself must be the review surface.
- For image-backed content, text-only fallback is a failure mode, not a graceful degradation.
- Cross-platform: macOS, Linux, Windows

## Extension Support

Custom configurations via EXTEND.md. See **Preferences** section for paths and supported options.
