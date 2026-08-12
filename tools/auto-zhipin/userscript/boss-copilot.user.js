// ==UserScript==
// @name         BOSS Copilot Gate
// @namespace    https://github.com/redbook/auto-zhipin
// @version      0.7.0
// @description  标注 BOSS 职位卡片，自动沟通 gate 允许的岗位（可配置），Alt+A 为手动触发
// @match        https://www.zhipin.com/*
// @grant        GM_xmlhttpRequest
// @connect      127.0.0.1
// @run-at       document-idle
// ==/UserScript==

(function bootstrap(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root?.document) api.start(root);
})(typeof window === 'undefined' ? null : window, function createBossCopilot() {
  'use strict';

  // 拟人化点击模块。移植自 mrcxsy/boss-auto-apply (Apache-2.0)
  // 内联精简版：完整事件链 + 严格单调时间戳（原版贝塞尔轨迹已省略）

  /**
   * Build the full pointer→mouse→click event chain for a target element.
   * @param {EventTarget} target
   * @returns {Array<{type:string, init:object, target:EventTarget}>}
   */
  function buildClickEventsInternal(target) {
    const make = (type, extra = {}) => {
      const init = {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: 1,
        isPrimary: true,
        pointerType: 'mouse',
        pressure: type === 'pointerup' ? 0 : 0.5,
        clientX: 0,
        clientY: 0,
        ...extra,
      };
      return { type, init, target };
    };
    return [
      make('pointerdown', { pressure: 0.5 }),
      make('mousedown', { button: 0 }),
      make('pointerup', { pressure: 0 }),
      make('mouseup', { button: 0 }),
      make('click', { button: 0 }),
    ];
  }

  /**
   * Dispatch humanized click events on target with monotonic timestamps.
   * @param {HTMLElement} target
   * @returns {boolean} true if all events dispatched successfully
   */
  function humanizedDispatch(target) {
    const events = buildClickEventsInternal(target);
    const eventCtorFor = (type) => {
      if (type === 'pointerdown' || type === 'pointerup') {
        return (typeof PointerEvent !== 'undefined') ? PointerEvent : Event;
      }
      if (type === 'mousedown' || type === 'mouseup' || type === 'click') {
        return (typeof MouseEvent !== 'undefined') ? MouseEvent : Event;
      }
      return Event;
    };

    let ts = performance.now();
    for (const ev of events) {
      try {
        const event = new (eventCtorFor(ev.type))(ev.type, ev.init);
        Object.defineProperty(event, 'timeStamp', { value: ts, configurable: true });
        target.dispatchEvent(event);
        ts += 0.1 + Math.random() * 0.5; // monotonic increment
      } catch (error) {
        return false;
      }
    }
    return true;
  }

  const SERVER = 'http://127.0.0.1:8899';
  const AUTO_APPLY_ENABLED = true; // Will be gate-server-configurable in future
  const CARD_SELECTOR = [
    '.job-card-wrapper',
    '.job-card-body',
    '.job-list-box li',
    '.job-recommend-list li',
    '.recommend-job-card',
    '.job-card',
    'li',
  ].join(',');
  const DETAIL_SELECTOR = '.job-detail-box,.job-detail-container,.job-detail,.job-detail-section';
  const APPLY_BUTTON_SELECTORS = [
    // BOSS 新版按钮结构（2026-08 实测）：class 为 op-btn-chat / op-btn，页面级（inCard=false）
    'a.op-btn-chat',
    '.op-btn-chat',
    '.op-btn.btn-chat',
    // 旧版详情页按钮（保留兼容）
    '.job-op .btn-startchat',
    '.btn-startchat-wrap .btn-startchat',
    'a.btn.btn-startchat',
    'a[redirect-url*="/web/geek/chat"]',
    'a[ka*="chat"]',
    'a[data-url*="/friend/add"]',
  ];

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function firstText(root, selectors) {
    for (const selector of selectors) {
      const value = normalizeText(root?.querySelector?.(selector)?.innerText);
      if (value) return value;
    }
    return '';
  }

  function extractJob(anchor) {
    const root = anchor.closest(CARD_SELECTOR) || anchor;
    const tags = Array.from(root.querySelectorAll?.('.tag-list li,.job-info li,.job-card-tag') || [])
      .map((node) => normalizeText(node.innerText));
    const cardText = normalizeText(root.innerText);
    return {
      url: anchor.href || anchor.getAttribute?.('href') || '',
      title: firstText(root, ['.job-name', '.job-title', '[class*="job-name"]'])
        || normalizeText(anchor.innerText || anchor.textContent || anchor.getAttribute?.('aria-label')),
      company: firstText(root, ['.company-name', '.boss-name', '[class*="company-name"]']),
      salaryText: firstText(root, ['.salary', '.job-salary', '[class*="salary"]']),
      location: firstText(root, ['.job-area', '.job-location', '[class*="area"]']),
      experienceText: tags.find((text) => /经验|年|应届/.test(text)) || '',
      degreeText: tags.find((text) => /学历|不限|大专|本科|硕士|博士/.test(text)) || '',
      summary: cardText.slice(0, 500),
    };
  }

  function detailMatchesJob(text, job) {
    const haystack = normalizeText(text);
    const title = normalizeText(job?.title);
    const company = normalizeText(job?.company);
    return Boolean(title && haystack.includes(title) && (!company || haystack.includes(company)));
  }

  function isApplyVerified(url, beforeText, afterText) {
    const continueCount = (text) => (normalizeText(text).match(/继续沟通/g) || []).length;
    return String(url || '').includes('/web/geek/chat') || continueCount(afterText) > continueCount(beforeText);
  }

  function hasPageRisk(url, text) {
    return /\/web\/(?:user|passport)\/|_security_check|\/captcha|\/verify/i.test(String(url || ''))
      || /异常访问|访问受限|账号异常|验证码|安全验证|请先登录|403 Forbidden/i.test(normalizeText(text));
  }

  // 风控弹窗检测（内联副本，无 @require）——关键词移植自
  // mrcxsy/boss-auto-apply (Apache-2.0) src/modules/automation.js 的 __popupKeywords。
  const RISK_KW_INTERNAL = [
    '验证码', '安全验证', '安全检测', '人机验证', '操作太快', '频繁', '稍后再试',
    '休息一下', '封禁', '请完成', '请先完成', '账号异常', '异常访问',
    '访问受限', '403', '登录', '请先登录',
  ];

  function detectRiskPopupInternal(text) {
    const normalized = String(text || '');
    for (const keyword of RISK_KW_INTERNAL) {
      if (normalized.includes(keyword)) return { risk: true, reason: keyword };
    }
    return { risk: false, reason: '' };
  }

  function shouldThrottleInternal({ appliedToday, maxPerDay, lastAppliedAt: last, intervalSeconds }) {
    if (appliedToday >= maxPerDay) return true;
    const elapsed = Date.now() - (last || 0);
    if (elapsed < intervalSeconds * 1000) return true;
    return false;
  }

  function start(window) {
    if (window.__bossCopilotStarted) return;
    window.__bossCopilotStarted = true;

    const { document } = window;
    const states = new Map();
    let hovered = null;
    let scanning = false;
    let applying = false;
    let serverOnline = false;
    let todayApplied = 0;
    let lastResult = '等待扫描';
    let lastAppliedAt = 0;

    const style = document.createElement('style');
    style.textContent = `
      .boss-copilot-card { position: relative !important; }
      .boss-copilot-hovered { outline: 2px solid #20a162 !important; outline-offset: 2px; }
      .boss-copilot-badge { position: absolute; z-index: 50; top: 8px; right: 8px; max-width: 70%; padding: 3px 7px; border-radius: 4px; color: #fff; font: 12px/1.4 system-ui,sans-serif; box-shadow: 0 1px 4px #0003; pointer-events: none; }
      .boss-copilot-allow { background: #20a162; }
      .boss-copilot-block { background: #777; }
      .boss-copilot-offline { background: #d46b08; }
      #boss-copilot-panel { position: fixed; z-index: 2147483647; right: 16px; bottom: 16px; min-width: 210px; padding: 10px 12px; border-radius: 8px; color: #fff; background: #222e; font: 12px/1.6 system-ui,sans-serif; box-shadow: 0 3px 14px #0005; white-space: pre-line; }
    `;
    (document.head || document.documentElement).appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'boss-copilot-panel';
    document.body.appendChild(panel);

    function request(method, path, body) {
      return new Promise((resolve, reject) => {
        const gmRequest = typeof GM_xmlhttpRequest === 'function' ? GM_xmlhttpRequest : null;
        if (!gmRequest) {
          reject(new Error('GM_xmlhttpRequest unavailable'));
          return;
        }
        gmRequest({
          method,
          url: `${SERVER}${path}`,
          headers: body ? { 'Content-Type': 'application/json' } : {},
          data: body ? JSON.stringify(body) : undefined,
          timeout: 3000,
          onload(response) {
            try {
              const payload = JSON.parse(response.responseText || '{}');
              if (response.status < 200 || response.status >= 300) throw new Error(payload.error || `HTTP ${response.status}`);
              resolve(payload);
            } catch (error) {
              reject(error);
            }
          },
          onerror: () => reject(new Error('gate server offline')),
          ontimeout: () => reject(new Error('gate server timeout')),
        });
      });
    }

    function allowedCount() {
      return Array.from(states.values()).filter((state) => state.status === 'allow').length;
    }

    function renderPanel() {
      panel.textContent = [
        `BOSS Copilot ${serverOnline ? '在线' : '⚠ Server 未启动'}`,
        `今日已投：${todayApplied}`,
        `当前 allow：${allowedCount()}`,
        `上次操作：${lastResult}`,
        'Alt+A：沟通当前悬停岗位',
      ].join('\n');
    }

    function renderBadge(state, text, kind) {
      let badge = state.root.querySelector('.boss-copilot-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'boss-copilot-badge';
        state.root.appendChild(badge);
      }
      state.root.classList.add('boss-copilot-card');
      badge.className = `boss-copilot-badge boss-copilot-${kind}`;
      badge.textContent = text;
      state.root.classList.toggle('boss-copilot-hovered', hovered === state);
      renderPanel();
    }

    function bindHover(state) {
      state.root.__bossCopilotState = state;
      if (state.root.dataset.bossCopilotBound) return;
      state.root.dataset.bossCopilotBound = '1';
      state.root.addEventListener('mouseenter', () => {
        hovered = state.root.__bossCopilotState;
        state.root.classList.add('boss-copilot-hovered');
      });
      state.root.addEventListener('mouseleave', () => {
        if (hovered?.root === state.root) hovered = null;
        state.root.classList.remove('boss-copilot-hovered');
      });
    }

    async function refreshHealth() {
      try {
        const health = await request('GET', '/health');
        serverOnline = true;
        todayApplied = health.todaySuccessfulApplies || 0;
      } catch {
        serverOnline = false;
      }
      renderPanel();
      return serverOnline;
    }

    async function gateCard(state) {
      try {
        const gate = await request('POST', '/gate', { job: state.job });
        state.status = gate.allow ? 'allow' : 'block';
        state.reasons = gate.reasons || [];
        if (gate.allow) {
          renderBadge(state, `✓ 建议沟通${state.job.salaryText ? ` ${state.job.salaryText}` : ''}`, 'allow');
        } else {
          renderBadge(state, state.reasons[0] || '不建议沟通', 'block');
        }
      } catch {
        serverOnline = false;
        state.status = 'offline';
        renderBadge(state, 'Server 未启动', 'offline');
      }
    }

    async function scan() {
      if (scanning) return;
      scanning = true;
      try {
        const anchors = Array.from(document.querySelectorAll('a[href*="/job_detail/"]'));
        const seen = new Set();
        for (const anchor of anchors) {
          if (/查看更多信息/.test(normalizeText(anchor.innerText || anchor.textContent))) continue;
          const job = extractJob(anchor);
          if (!job.url || seen.has(job.url)) continue;
          seen.add(job.url);
          const root = anchor.closest(CARD_SELECTOR) || anchor;
          // Include the visible card summary so a SPA re-render cannot leave a
          // stale allow badge that disagrees with the click-time gate.
          const fingerprint = JSON.stringify(job);
          let state = states.get(job.url);
          if (!state || state.root !== root) {
            state = { anchor, fingerprint, job, root, status: 'pending', reasons: [] };
            states.set(job.url, state);
            bindHover(state);
          } else if (state.fingerprint !== fingerprint) {
            Object.assign(state, { anchor, fingerprint, job, status: 'pending', reasons: [] });
          }
          root.__bossCopilotState = state;
        }
        for (const [url, state] of states) {
          if (seen.has(url)) continue;
          if (hovered === state) hovered = null;
          states.delete(url);
        }

        if (!(await refreshHealth())) {
          for (const state of states.values()) {
            state.status = 'offline';
            renderBadge(state, 'Server 未启动', 'offline');
          }
          return;
        }

        await Promise.all(
          Array.from(states.values())
            .filter((state) => state.status === 'pending' || state.status === 'offline')
            .map(gateCard)
        );

        // 只读诊断探针：每次扫描对前 3 张 allow 卡上报按钮 DOM 结构（便于定位 detail_mismatch）
        if (AUTO_APPLY_ENABLED) {
          Array.from(states.values()).filter((s) => s.status === 'allow').slice(0, 3).forEach(probeButtonDom);
        }

        // Auto-apply: pick first allow state not already in flight
        if (AUTO_APPLY_ENABLED && !applying) {
          const allowStates = Array.from(states.values()).filter((s) => s.status === 'allow');
          if (allowStates.length > 0) {
            applyHovered(allowStates[0]);
          }
        }
      } finally {
        scanning = false;
      }
    }

    function isVisible(node) {
      if (!node || node.disabled || node.getAttribute('aria-disabled') === 'true') return false;
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    }

    function findButton(scope) {
      for (const selector of APPLY_BUTTON_SELECTORS) {
        const button = Array.from(scope.querySelectorAll(selector)).find(isVisible);
        if (button) return button;
      }
      return null;
    }

    // 只读探针：上报卡片内按钮查找结果，用于诊断 detail_mismatch 根因
    function probeButtonDom(state) {
      const result = { job: state.job.title, company: state.job.company, url: state.job.url };
      // 当前页面详情面板显示的岗位（从 job-detail-op 的整个详情容器向上找标题）
      const detailPanel = document.querySelector('.job-detail-op,.job-detail-container,.job-detail-box,[class*="job-detail"]');
      if (detailPanel) {
        const panelBox = detailPanel.closest('.job-detail-box,.job-detail-container,[class*="job-detail-box"],[class*="job-detail-container"]') || detailPanel.parentElement;
        result.detailPanelText = panelBox ? normalizeText(panelBox.innerText).slice(0, 200) : '';
        result.detailPanelCls = panelBox ? (panelBox.className || '') : '';
      } else {
        result.detailPanelText = '';
        result.detailPanelCls = '';
      }
      const root = state.root;
      // 卡片内每个选择器命中的元素数量与 class
      const cardHits = {};
      for (const selector of APPLY_BUTTON_SELECTORS) {
        const nodes = root.querySelectorAll(selector);
        cardHits[selector] = Array.from(nodes).map((n) => ({
          cls: n.className || n.getAttribute?.('class') || '',
          vis: isVisible(n),
          tag: n.tagName,
        }));
      }
      result.cardHits = cardHits;
      result.cardInnerText = (root.innerText || '').slice(0, 200);
      // 全局按钮 + 父容器上下文（确认它是悬浮球还是选中操作条）
      const globalBtn = findButton(document);
      if (globalBtn) {
        let ctx = { cls: globalBtn.className || '', tag: globalBtn.tagName, inCard: Boolean(globalBtn.closest && globalBtn.closest(CARD_SELECTOR)) };
        ctx.text = normalizeText(globalBtn.innerText || globalBtn.textContent).slice(0, 40);
        ctx.visible = isVisible(globalBtn);
        const parent = globalBtn.parentElement;
        ctx.parentCls = parent ? (parent.className || '') : '';
        ctx.parentText = parent ? normalizeText(parent.innerText).slice(0, 80) : '';
        const card = globalBtn.closest ? globalBtn.closest(CARD_SELECTOR) : null;
        ctx.nearestCardText = card ? normalizeText(card.innerText).slice(0, 100) : '';
        // 详情弹窗：按钮是否在一个详情容器里，以及该容器显示的岗位标题
        const detailBox = globalBtn.closest ? globalBtn.closest(DETAIL_SELECTOR) : null;
        if (detailBox) {
          ctx.detailText = normalizeText(detailBox.innerText).slice(0, 200);
          // 详情里的岗位标题
          const dt = detailBox.querySelector('.job-detail-header,.job-name,.job-title,.name');
          ctx.detailTitle = dt ? normalizeText(dt.innerText).slice(0, 60) : '';
        } else {
          ctx.detailText = '';
          ctx.detailTitle = '';
        }
        result.globalButton = ctx;
      } else {
        result.globalButton = null;
      }
      request('POST', '/debug-dom', { probe: result }).catch(() => {});
    }

    async function recordResult(state, success, reason) {
      try {
        const result = await request('POST', '/applied', { job: state.job, result: { success, reason } });
        todayApplied = result.todaySuccessfulApplies || todayApplied;
      } catch {
        serverOnline = false;
        lastResult = `${lastResult}；ledger 回写失败`;
      }
    }

    // 风控/页面异常停止时上报，由 gate server 推送飞书通知用户（静默失败不阻塞投递逻辑）
    function notifyRiskStopped(state, reason) {
      request('POST', '/paused', {
        reason,
        job: state ? { url: state.job.url, title: state.job.title, company: state.job.company } : {},
      }).catch(() => {});
    }

    async function waitForApplyEvidence(beforeText) {
      const deadline = Date.now() + 3000;
      while (Date.now() < deadline) {
        if (isApplyVerified(window.location.href, beforeText, document.body.innerText)) return true;
        await new Promise((resolve) => window.setTimeout(resolve, 100));
      }
      return false;
    }

    // 点击目标卡片，把该岗位载入右侧详情面板（BOSS 推荐流点卡片即内联展开详情，属正常用户操作），
    // 并等待详情面板切换到目标岗位（标题+公司匹配）。超时未切换返回 false，保留防误点保护。
    async function openDetailForJob(state, timeoutMs = 4000) {
      const clickTarget = (isVisible(state.anchor) && state.anchor) || (isVisible(state.root) && state.root);
      if (!clickTarget) return false;
      humanizedDispatch(clickTarget);
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const panel = document.querySelector(DETAIL_SELECTOR);
        if (panel && detailMatchesJob(panel.innerText, state.job)) return true;
        await new Promise((resolve) => window.setTimeout(resolve, 200));
      }
      return false;
    }

    async function applyHovered(targetState = null) {
      const state = targetState || hovered;
      if (!state || state.status !== 'allow' || applying) return;
      applying = true;
      try {
        if (!(await refreshHealth())) {
          state.status = 'offline';
          lastResult = 'Server 未启动，未点击';
          renderBadge(state, 'Server 未启动', 'offline');
          return;
        }
        if (hasPageRisk(window.location.href, document.body.innerText)) {
          state.status = 'block';
          lastResult = 'page_risk_detected';
          renderBadge(state, '页面异常，已停止', 'block');
          notifyRiskStopped(state, 'page_risk_detected');
          return;
        }

        // 风控弹窗检测
        const riskPopup = detectRiskPopupInternal(document.body.innerText);
        if (riskPopup.risk) {
          state.status = 'block';
          state.reasons = [`risk_popup_${riskPopup.reason}`];
          lastResult = `风控弹窗：${riskPopup.reason}，已暂停投递`;
          renderBadge(state, lastResult, 'block');
          // 上报暂停并通知用户（gate server 推送飞书），等待冷却
          notifyRiskStopped(state, `risk_popup_${riskPopup.reason}`);
          return;
        }

        // 节流检查
        if (shouldThrottleInternal({ appliedToday: todayApplied, maxPerDay: 120, lastAppliedAt, intervalSeconds: 45 })) {
          lastResult = '节流中，等待下一投递窗口';
          renderBadge(state, lastResult, 'block');
          return;
        }

        try {
          const latestGate = await request('POST', '/gate', { job: state.job });
          if (!latestGate.allow) {
            state.status = 'block';
            state.reasons = latestGate.reasons || [];
            lastResult = state.reasons[0] || 'gate_blocked_before_click';
            renderBadge(state, lastResult, 'block');
            return;
          }
        } catch {
          serverOnline = false;
          state.status = 'offline';
          lastResult = 'Server 未启动，未点击';
          renderBadge(state, 'Server 未启动', 'offline');
          return;
        }

        let detail = state.root;
        let button = findButton(state.root);
        if (!button) {
          // 新版 BOSS 推荐流：卡片内没有沟通按钮，详情在右侧面板。
          // 探针实测详情面板默认固定在某个岗位（如"基础平台负责人"），不跟随目标卡片；
          // 直接点全局"立即沟通"会投错岗，被 detailMatchesJob 防误点保护拦下（detail_mismatch）。
          // 正确做法：先点目标卡片把该岗位载入面板，等面板切换匹配后再点"立即沟通"。
          const opened = await openDetailForJob(state);
          detail = document.querySelector(DETAIL_SELECTOR);
          button = findButton(detail || document);
          if (!opened || !detail || !detailMatchesJob(detail.innerText, state.job)) {
            probeButtonDom(state); // 只读诊断：面板未切换到目标岗位时上报
            lastResult = 'detail_mismatch';
            state.status = 'failed';
            await recordResult(state, false, 'detail_mismatch');
            renderBadge(state, '详情与悬停岗位不一致', 'block');
            return;
          }
        }

        if (!button) {
          lastResult = 'button_not_found';
          state.status = 'failed';
          await recordResult(state, false, 'button_not_found');
          renderBadge(state, '未找到沟通按钮', 'block');
          return;
        }
        if (/继续沟通|已沟通/.test(normalizeText(button.innerText))) {
          state.status = 'block';
          lastResult = 'already_continuing';
          renderBadge(state, '已经沟通过', 'block');
          return;
        }

        const beforeText = document.body.innerText;
        const clickOk = humanizedDispatch(button);
        if (!clickOk) {
          lastResult = 'click_dispatch_failed';
          state.status = 'failed';
          await recordResult(state, false, 'click_dispatch_failed');
          renderBadge(state, '点击派发失败', 'block');
          return;
        }
        const success = await waitForApplyEvidence(beforeText);
        state.status = success ? 'applied' : 'failed';
        lastResult = success ? `已沟通：${state.job.title}` : 'button_click_not_verified';
        await recordResult(state, success, success ? undefined : 'button_click_not_verified');
        if (success) lastAppliedAt = Date.now();
        renderBadge(state, success ? '✓ 已沟通' : '点击未验证', success ? 'allow' : 'block');
      } finally {
        applying = false;
        renderPanel();
      }
    }

    document.addEventListener('keydown', (event) => {
      if (!event.altKey || event.code !== 'KeyA' || event.repeat) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName) || event.target?.isContentEditable) return;
      if (!hovered || hovered.status !== 'allow') return;
      event.preventDefault();
      applyHovered();
    });

    const rescan = () => window.setTimeout(scan, 0);
    for (const method of ['pushState', 'replaceState']) {
      const original = window.history[method];
      window.history[method] = function wrappedHistoryMethod(...args) {
        const result = original.apply(this, args);
        rescan();
        return result;
      };
    }
    window.addEventListener('popstate', rescan);
    window.addEventListener('hashchange', rescan);
    window.setInterval(scan, 5000);
    scan();
  }

  return {
    APPLY_BUTTON_SELECTORS,
    AUTO_APPLY_ENABLED,
    buildClickEventsInternal,
    detectRiskPopupInternal,
    detailMatchesJob,
    extractJob,
    hasPageRisk,
    humanizedDispatch,
    isApplyVerified,
    normalizeText,
    shouldThrottleInternal,
    start,
  };
});
