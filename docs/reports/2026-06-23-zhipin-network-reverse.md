# BOSS Zhipin Network Reverse Notes

> Date: 2026-06-23
> Scope: `https://www.zhipin.com/shanghai/?ka=header-home`
> Mode: non-CDP, non-MITM first pass

## Goal

Find a browser/network inspection path for BOSS that does not depend on Chrome DevTools/CDP and identify the page's observable network and anti-automation surface.

## Reverse Skills Available

- `js-reverse`: best fit for front-end request chains, telemetry scripts, signature/risk fields, XHR/fetch/WebSocket tracing.
- `api-security`: useful after endpoint inventory exists; not the first tool for browser detection.
- `browser-automation`: useful for generic browser automation, but BOSS should not use a fresh Playwright/CDP profile as the default path.
- `browser-trace`: useful only as CDP-backed diagnostic evidence; it can pollute this exact BOSS detection question.
- `zhipin`: project-specific workflow; requires real Chrome/extension first, CDP only as fallback or diagnosis.

## Local Tool State

- `mitmproxy`: not installed.
- `tshark` / Wireshark CLI: not installed.
- `tcpdump`: installed, but current user cannot open BPF devices.
- `verge-mihomo`: active and listening on `*:7897`.
- Clash fake-ip is active:
  - `www.zhipin.com -> 198.18.0.90`
  - `static.zhipin.com -> 198.18.0.91`
  - `img.bosszhipin.com -> 198.18.0.92`
  - `logapi.zhipin.com -> 198.18.0.93`
  - `shink.zhipin.com -> 198.18.0.94`
  - `z.zhipin.com -> 198.18.0.95`

Current path is therefore:

```text
Chrome / curl -> 127.0.0.1:7897 -> verge-mihomo -> target host
```

Mihomo REST `/connections` is not available in the current runtime config because `external-controller` is blank.

## HTTP/TLS Snapshot

Request:

```text
GET https://www.zhipin.com/shanghai/?ka=header-home
```

Observed:

- HTTP/2 200
- TLSv1.3
- Cipher: `AEAD-AES256-GCM-SHA384`
- Certificate CN: `*.zhipin.com`
- Issuer: GlobalSign RSA OV SSL CA 2018
- Response headers include:
  - `server-info: boss-alb`
  - `process-stage: Stage-Outbound`
  - `set-cookie: lastCity=101020100`

## First-Load Host Inventory

Important hosts referenced by the public home page:

- `www.zhipin.com`
- `static.zhipin.com`
- `img.bosszhipin.com`
- `logapi.zhipin.com`
- `shink.zhipin.com`
- `z.zhipin.com`
- `app.zhipin.com`
- `m.zhipin.com`

Important scripts:

- `https://static.zhipin.com/assets/sdk/apm/patas.2.0.2.min.js`
- `https://static.zhipin.com/assets/sdk/warlock/warlockdata.min.2.2.15.js`
- `https://img.bosszhipin.com/static/zhipin/geek/sdk/browser-check-v2.js`

Fallback Warlock script URLs:

- `https://z.zhipin.com/assets/zhipin/sdk/datastar/warlockdata.min.2.2.15.js`
- `https://logapi.zhipin.com/dap/jssdk/warlockdata.min.2.2.15.js`

## Telemetry / Risk Endpoints

From HTML and downloaded JS:

- `https://shink.zhipin.com/wapi/dapCommon/json`
- `https://logapi.zhipin.com/dap/api/json`
- `https://warlock.zhipin.com/wapi/warlock/cross/event/visible/client/fetch`
- `https://apm-fe.zhipin.com`
- `/wapi/zpApm/actionLog/fe/common.json`
- `/wapi/zpApm/httpMetrics/getConfig`
- `/wapi/zpApm/httpMetrics/report`
- `/wapi/zpCommon/actionLog`

`/wapi/dapCommon/json` responds to `HEAD`/`GET` with `405` and allows `PUT, POST`, matching telemetry upload behavior.

## Script Findings

`browser-check-v2.js`

- Small compatibility check only.
- Checks user agent and modern JS syntax support.
- Redirects old/unsupported browsers to `/web/common/nonsupport*.html`.
- No visible webdriver/CDP/devtools detection in this file.

`warlockdata.min.2.2.15.js`

- Telemetry/behavior SDK.
- Wraps or observes `XMLHttpRequest`.
- Uses `navigator.sendBeacon`.
- Uses cookies, localStorage, sessionStorage.
- Contains visibility/focus/keyboard/click style event collection.
- Fetches circle/visibility tracking config from Warlock endpoints.

`patas.2.0.2.min.js`

- APM / performance / network metrics SDK.
- Wraps or measures `fetch`, `XMLHttpRequest`, `sendBeacon`.
- Builds request metrics: method, path, status, duration, headers, sizes.
- Detects browser family including `Chrome Headless` via user agent.
- Reports to APM endpoints including `apm-fe.zhipin.com` and `/wapi/zpApm/*`.

## Current Interpretation

The obvious first-load scripts do not show a simple "CDP present -> go back" check.

The stronger hypothesis is:

1. Fresh automation profiles / headless-like fingerprints trigger telemetry/risk scoring.
2. CDP-driven browsing changes page lifecycle, input, navigation, or target stability.
3. BOSS reacts indirectly through risk/navigation logic, seen earlier as `target_url_mismatch` and `trace_unstable_navigation`, not as a single static `if (devtools)` branch in `browser-check-v2.js`.

## Chrome NetLog Capture

Implemented a reusable non-CDP capture helper:

```bash
cd /Users/proerror/Documents/redbook/tools/auto-zhipin
npm run boss:netlog -- capture --ms 20000
npm run boss:netlog -- analyze --file /path/to/zhipin.netlog.json
npm run boss:netlog -- self-test
```

Script:

- `tools/auto-zhipin/scripts/zhipin_netlog.js`

Captured artifact:

- `tmp/zhipin-reverse/netlog/zhipin-2026-06-23T02-24-48-396Z.netlog.json`
- `tmp/zhipin-reverse/netlog/zhipin-2026-06-23T02-24-48-396Z.summary.json`
- `tmp/zhipin-reverse/netlog/zhipin-2026-06-23T02-26-58-770Z.netlog.json`
- `tmp/zhipin-reverse/netlog/zhipin-2026-06-23T02-26-58-770Z.summary.json`

Validation:

- `node --check tools/auto-zhipin/scripts/zhipin_netlog.js`
- `node tools/auto-zhipin/scripts/zhipin_netlog.js self-test`

Observed in the 20s public-page capture:

- NetLog event count: `63488`
- BOSS-related hosts:
  - `www.zhipin.com`
  - `img.bosszhipin.com`
  - `static.zhipin.com`
  - `apm-fe.zhipin.com`
  - `res.zhipin.com`
  - `docdownload.zhipin.com`
  - `logapi.zhipin.com`
- BOSS-related event families:
  - `HOST_RESOLVER_MANAGER_REQUEST`
  - `URL_REQUEST_START_JOB`
  - `HTTP_STREAM_JOB_CONTROLLER`
  - `HTTP_TRANSACTION_HTTP2_SEND_REQUEST_HEADERS`
  - `HTTP2_SESSION_SEND_HEADERS`
  - `CORS_REQUEST`
  - `COOKIE_INCLUSION_STATUS`
  - `HTTP_TRANSACTION_READ_RESPONSE_HEADERS`
- Proxy path visible in NetLog:
  - `socks5://127.0.0.1:7897`
  - `PROXY 127.0.0.1:7897`
  - `Proxy-Connection: keep-alive`
- BOSS homepage response headers visible in NetLog:
  - `HTTP/1.1 200`
  - `content-type: text/html;charset=utf-8`
  - `set-cookie: lastCity=101020100`
  - `process-stage: Stage-Outbound`
  - `server-info: boss-alb`

Important negative result:

- This no-CDP temporary-profile capture did not show a BOSS-owned redirect/back loop.
- Redirect entries in this capture were Google/Chrome background traffic, not BOSS page navigation.

### Remote-Debugging Port Control

Ran a second public-page capture with Chrome launched with a remote-debugging port, but without attaching DevTools/CDP:

```bash
npm run boss:netlog -- capture --ms 20000 --remote-debugging-port 19333
```

Observed:

- BOSS homepage still returned `HTTP/1.1 200`.
- BOSS response still included `process-stage: Stage-Outbound` and `server-info: boss-alb`.
- No BOSS-owned redirect/back loop appeared in NetLog.
- Additional telemetry hosts/endpoints appeared in this sample:
  - `shink.zhipin.com`
  - `shink.zhipin.com/wapi/dapCommon/json`
  - `t.zhipin.com/_.gif`
  - `t.zhipin.com/e.gif`
  - `t.zhipin.com/f.gif`
- The `t.zhipin.com/*.gif` telemetry URLs carried trace-style fields:
  - `pk=cpc_job_index_shanghai`
  - `traceCode=...`
  - `kauid=...`
  - `appname=zhipin_web_geek_jsp`
  - `traceStep=MAIN_OK`

This is not enough to claim "remote-debugging flag equals detection". It is a useful candidate diff to repeat against a normal capture and against a real DevTools/CDP-attach capture if needed.

Interpretation:

- Chrome NetLog is a good next default for BOSS connection/request metadata.
- It is not enough for decrypted telemetry body analysis.
- For the specific "DevTools/CDP causes infinite back" symptom, the useful comparison matrix is:
  1. same URL, same NetLog helper, normal temporary Chrome profile;
  2. same URL, same NetLog helper, Chrome launched with a remote-debugging port but no DevTools attach;
  3. same URL, only if explicitly approved, actual DevTools/CDP attach as a controlled diagnostic.

## Recommended Next Capture Paths

### 1. Chrome NetLog

Use this first if the goal is connection and request metadata without CDP. This is now implemented as `npm run boss:netlog`.

Pros:

- No CDP.
- No TLS MITM certificate.
- Captures DNS, proxy, QUIC/H2, socket reuse, redirects, errors.

Cons:

- Does not decrypt HTTPS response/request bodies.
- For the already logged-in ordinary Chrome tab, best started manually through `chrome://net-export` so Codex does not touch that tab through CDP.

### 2. MITM proxy

Use only if request/response bodies are needed.

Pros:

- Shows XHR/fetch bodies and headers.
- Good for endpoint schemas and telemetry payload shape.

Cons:

- Requires installing local CA certificate.
- Changes TLS characteristics and can itself trigger risk controls.
- Should be scoped to BOSS and stopped immediately after capture.

### 3. CDP Network

Use only as a comparison/control, not primary evidence.

Pros:

- Easiest request body capture.

Cons:

- This is the suspicious path under investigation.
- Can change the behavior being measured.

## Artifacts

- `/tmp/zhipin.html`
- `/tmp/zhipin.headers`
- `tmp/zhipin-reverse/browser-check-v2.js`
- `tmp/zhipin-reverse/patas.2.0.2.min.js`
- `tmp/zhipin-reverse/warlockdata.min.2.2.15.js`
