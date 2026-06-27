#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const repo = '/Users/proerror/Documents/redbook/tools/auto-zhipin';
const { ZhipinStore, normalizeApplicationUrl } = require('../lib/store.js');
const { checkPreApplyCandidate } = require('../lib/opencli_apply_queue.js');
const { loadConfig } = require('../lib/config.js');
const { nowIso, makeApplicationIdentity } = require('../lib/utils.js');

const args = process.argv.slice(2);
const live = args.includes('--live');
const focus = args.includes('--focus') || valueAfter('--focus') === 'true';
const sourceUrl = valueAfter('--source-url') || 'https://www.zhipin.com/web/geek/jobs?query=AI%20Agent&city=101020100';
const targetSuccesses = Number(valueAfter('--target-successes') || 5);
const maxReviewed = Number(valueAfter('--max-reviewed') || 120);
const scrolls = Number(valueAfter('--scrolls') || 5);
const store = new ZhipinStore({ ledgerPath: `${repo}/data/ledger.json` });
const config = loadConfig().config;

if (live && process.env.BOSS_ENABLE_LIVE_APPLY !== '1') {
  throw new Error('live native feed apply requires BOSS_ENABLE_LIVE_APPLY=1 and --live');
}

function valueAfter(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : '';
}

function osa(src) {
  return execFileSync('osascript', ['-l', 'JavaScript', '-e', src], {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  });
}

function q(value) {
  return JSON.stringify(value);
}

function pageEval(js, waitSeconds = 0) {
  let src = "const Chrome = Application('Google Chrome');\nconst tab = Chrome.windows[0].activeTab();\n";
  if (waitSeconds) src += `delay(${waitSeconds});\n`;
  src += 'let res = {};\n';
  src += `try { res.value = tab.execute({javascript: ${q(`JSON.stringify((() => { ${js} })())`)}}); } catch (e) { res.error = String(e); }\n`;
  src += 'JSON.stringify(res);\n';
  const outer = JSON.parse(osa(src));
  if (outer.error) throw new Error(outer.error);
  return JSON.parse(outer.value || 'null');
}

function navigate(url, waitSeconds = 4) {
  const src = [
    "const Chrome = Application('Google Chrome');",
    "if (!Chrome.running()) throw new Error('Google Chrome is not running');",
    "if (Chrome.windows.length === 0) throw new Error('No Google Chrome windows are available');",
    focus ? 'Chrome.activate();' : '',
    'const tab = Chrome.windows[0].activeTab();',
    `tab.url = ${q(url)};`,
    `delay(${waitSeconds});`,
    'JSON.stringify({title: tab.title(), url: tab.url()});',
  ].join('\n');
  return JSON.parse(osa(src));
}

function priority(meta) {
  const text = [meta.title, meta.company, meta.salaryText, meta.summary].join(' ');
  let score = 0;
  if (/AI|人工智能|大模型|AIGC|LLM|智能体|Agent|算法|生成式/i.test(text)) score += 4;
  if (/负责人|总监|Head|Leader|Lead|合伙人|联合创始人|战略|平台|产品负责人|技术负责人|架构|专家/i.test(text)) score += 4;
  if (/100\s*-\s*|90\s*-\s*|80\s*-\s*|70\s*-\s*|60\s*-\s*|50\s*-\s*|45\s*-\s*|40\s*-\s*/.test(text)) score += 2;
  if (/实习|外包|销售|客服|运营专员|助理|低代码实施|教师|主播|股票老师/i.test(text)) score -= 5;
  return score;
}

function collectLinks() {
  navigate(sourceUrl, 5);
  const health = pageEval("return {login:/sonic/.test(document.body?.innerText || ''), url:location.href, title:document.title, text:(document.body?.innerText || '').replace(/\\s+/g, ' ').slice(0, 500)};", 1);
  if (!health.login) throw new Error(`BOSS login marker not found: ${JSON.stringify(health)}`);

  for (let i = 0; i < scrolls; i += 1) {
    pageEval("window.scrollBy(0, Math.max(700, window.innerHeight * 0.9)); return {y:scrollY, links:document.querySelectorAll('a[href*=\\\"/job_detail/\\\"]').length};", 1);
  }

  const links = pageEval("const abs = href => { try { return new URL(href, location.href).href; } catch { return ''; } }; const seen = new Set(); const out = []; for (const a of Array.from(document.querySelectorAll('a[href*=\\\"/job_detail/\\\"]'))) { const href = abs(a.getAttribute('href') || a.href || ''); if (!href || seen.has(href)) continue; seen.add(href); const card = a.closest('.job-card-wrapper,.job-card-body,.job-card-left,.job-list-box li,.job-recommend-list li,.recommend-job-card,.job-card,.job-primary,li,div') || a; const text = (card.innerText || a.innerText || '').replace(/\\s+/g, ' ').trim(); out.push({ href, text: text.slice(0, 360) }); } return out;", 1);
  return { health, links };
}

function cardMeta(link) {
  const text = String(link.text || '');
  const salaryText = (text.match(/\d+\s*-\s*\d+K(?:[·.．]\d+薪)?|\d+K以上|\d+K\+?/i) || [''])[0];
  const title = (text.split(/\s+/).filter(Boolean)[0] || '');
  return { title, company: '', salaryText, summary: text };
}

function detailMeta() {
  return pageEval("const txt = (document.body && document.body.innerText || '').replace(/\\s+/g, ' ').trim(); const m = (document.title || '').match(/^「(.+)招聘」_(.+)招聘-BOSS直聘$/); const title = m ? m[1] : ((document.title || '').replace(/招聘.*$/, '').replace(/^「|」.*$/g, '').trim()); const company = m ? m[2] : ((txt.match(/公司基本信息 ([^ ]+)/) || [,''])[1]); const salary = ((txt.match(/招聘中 [^ ]+ (\\d+\\s*-\\s*\\d+K(?:[·.．]\\d+薪)?)/) || txt.match(/\\d+\\s*-\\s*\\d+K(?:[·.．]\\d+薪)?/) || [])[1] || (txt.match(/\\d+\\s*-\\s*\\d+K(?:[·.．]\\d+薪)?/) || [''])[0] || ''); const clickable = Array.from(document.querySelectorAll('a,button')).map((el, i) => ({ i, text: (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0,80), cls: el.className && String(el.className).slice(0,120), href: el.href || '' })).filter(x => x.text); return { url: location.href, title, company, salary, text: txt.slice(0, 2200), clickable };", 1);
}

function clickChat() {
  return pageEval("const btns = Array.from(document.querySelectorAll('a.btn-startchat,button.btn-startchat,a,button')).filter(el => /立即沟通/.test((el.innerText || el.textContent || '').replace(/\\s+/g, ' '))); const target = btns.find(el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden'; }) || btns[0]; if (!target) return { clicked:false, count: btns.length }; target.click(); return { clicked:true, count: btns.length, text:(target.innerText || target.textContent || '').replace(/\\s+/g,' ').trim(), cls:String(target.className || '') };");
}

function hardBlocked(text) {
  return /验证码|安全验证|滑块|访问受限|请求过于频繁|账号异常|环境存在风险|登录后|请登录|403|Forbidden/.test(text || '');
}

function run() {
  const lockOwner = `boss-native-feed-apply:${process.pid}`;
  let lockAcquired = false;
  let runId = null;
  let out = null;

  try {
    if (live) {
      const lockResult = store.acquireSupervisorLock(lockOwner, { ttlMs: config.supervisor?.lockTtlMs || 20 * 60 * 1000 });
      if (!lockResult.acquired) {
        throw new Error(`BOSS supervisor is already locked by ${lockResult.lock?.owner || 'unknown'}`);
      }
      lockAcquired = true;
      runId = store.startRun('boss-native-feed-apply', {
        sourceUrl,
        targetSuccesses,
        maxReviewed,
        focus,
      });
      store.save({ operation: 'boss-native-feed-apply', phase: 'lock_acquired', runId });
    }

    const { health, links } = collectLinks();
    out = {
      live,
      focus,
      sourceUrl,
      health,
      scannedLinks: links.length,
      reviewed: 0,
      duplicate: 0,
      lowPriority: 0,
      gateSkipped: 0,
      results: [],
    };
    const seen = new Set();

    for (const link of links) {
      const url = normalizeApplicationUrl(link.href);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      if (store.findApplicationByUrl(url, ['applied', 'skipped', 'deduped'])) { out.duplicate++; continue; }
      const card = cardMeta(link);
      if (priority(card) < 4) { out.lowPriority++; continue; }

      out.reviewed++;
      navigate(url, 4);
      const detail = detailMeta();
      const app = {
        jobId: normalizeApplicationUrl(detail.url || url),
        url: normalizeApplicationUrl(detail.url || url),
        title: detail.title || card.title,
        company: detail.company || card.company,
        salaryText: detail.salary || card.salaryText,
        summary: detail.text.slice(0, 600),
      };
      app.identityKey = makeApplicationIdentity(app);
      const gate = checkPreApplyCandidate({ store, config, application: app, triage: { blockedEntries: [] } });
      const chatTexts = detail.clickable.filter((x) => /立即沟通|继续沟通|开聊|沟通/.test(x.text)).slice(0, 8);

      if (hardBlocked(detail.text)) {
        out.results.push({ status: 'hard_stop_blocked', app, chatTexts });
        out.hardStop = { reason: 'native_feed_apply_blocked_text', app };
        break;
      }
      if (!gate.allow || !/立即沟通/.test(chatTexts.map((x) => x.text).join(' ')) || /继续沟通|已沟通|已投递/.test(chatTexts.map((x) => x.text).join(' '))) {
        out.gateSkipped++;
        continue;
      }

      if (!live) {
        out.results.push({ status: 'dry_run_candidate', title: app.title, company: app.company, salaryText: app.salaryText, url: app.url, gate: gate.reasons });
      } else {
        const click = clickChat();
        const after = detailMeta();
        const afterTexts = after.clickable.filter((x) => /立即沟通|继续沟通|开聊|沟通|已向|发送/.test(x.text)).slice(0, 12);
        const success = /继续沟通|已向BOSS发送消息|已发送|沟通中/.test([after.text, JSON.stringify(afterTexts)].join(' '));
        const record = {
          ...app,
          status: success ? 'applied' : 'failed',
          appliedAt: success ? nowIso() : undefined,
          failedAt: success ? undefined : nowIso(),
          reasons: success ? [] : ['native_feed_apply_not_verified'],
          applyResult: { backend: 'boss-native-feed-apply', click, afterTexts, success },
          source: 'boss-native-feed-apply',
        };
        store.upsertJob({ id: app.jobId, url: app.url, title: app.title, company: app.company, salaryText: app.salaryText, identityKey: app.identityKey, collectedAt: nowIso(), source: 'boss-native-feed-apply' });
        store.upsertApplication(record);
        store.save({ operation: 'boss-native-feed-apply', url: app.url, success });
        out.results.push({ status: success ? 'applied' : 'not_verified', title: app.title, company: app.company, salaryText: app.salaryText, url: app.url, afterTexts });
        if (!success) break;
      }

      if (out.results.filter((r) => live ? r.status === 'applied' : r.status === 'dry_run_candidate').length >= targetSuccesses) break;
      if (out.reviewed >= maxReviewed) break;
    }

    if (runId) {
      store.finishRun(runId, out.hardStop ? 'blocked' : 'completed', {
        applied: out.results.filter((item) => item.status === 'applied').length,
        hardStop: out.hardStop || null,
      });
      store.save({ operation: 'boss-native-feed-apply', phase: 'finish', runId });
    }
    return out;
  } catch (error) {
    if (runId) {
      store.finishRun(runId, 'failed', { error: error.message || String(error) });
      store.save({ operation: 'boss-native-feed-apply', phase: 'failed', runId });
    }
    throw error;
  } finally {
    if (lockAcquired) {
      store.releaseSupervisorLock(lockOwner, { operation: 'boss-native-feed-apply' });
      store.save({ operation: 'boss-native-feed-apply', phase: 'lock_released', runId });
    }
  }
}

console.log(JSON.stringify(run(), null, 2));
