const { isCircuitBreakerActive } = require('./site_health');
const { inspectChatPage, inspectPageHealth } = require('./zhipin');

function toHealthRecord(state) {
  if (state.kind === 'chat_ready') {
    return {
      status: 'healthy',
      reason: null,
      recoveryAt: null,
    };
  }

  if (state.kind === 'loading') {
    return {
      status: 'caution',
      reason: state.reason || 'page_not_ready',
      recoveryAt: null,
    };
  }

  return {
    status: state.kind,
    reason: state.reason || null,
    recoveryAt: state.recoveryAt || null,
  };
}

function formatGuardError(result) {
  if (result.status === 'restricted' && result.recoveryAt) {
    return `site restricted: ${result.reason}; retry after ${result.recoveryAt}`;
  }
  return `site blocked: ${result.reason}`;
}

async function inspectHealthForMode(page, mode, readySelectors = []) {
  if (mode === 'chat') {
    return toHealthRecord(await inspectChatPage(page));
  }

  return inspectPageHealth(page, readySelectors);
}

async function enforceRuntimeGuard({ page, store, mode = 'page', readySelectors = [] }) {
  const previous = typeof store.getSiteHealth === 'function' ? store.getSiteHealth() : null;
  if (previous && isCircuitBreakerActive(previous)) {
    return {
      blocked: true,
      status: 'restricted',
      reason: previous.reason,
      recoveryAt: previous.recoveryAt || null,
      source: 'stored',
    };
  }

  const title = await page.title().catch(() => '');
  const state = await inspectHealthForMode(page, mode, readySelectors);
  if (typeof store.setSiteHealth === 'function') {
    store.setSiteHealth({
      ...state,
      sourceUrl: page.url(),
      title,
    });
  }

  const recoveredFromRestriction = Boolean(
    previous
    && previous.status === 'restricted'
    && !isCircuitBreakerActive(previous)
    && state.status === 'healthy'
  );

  return {
    blocked: state.status === 'auth_gate' || state.status === 'restricted',
    status: state.status,
    reason: state.reason,
    recoveryAt: state.recoveryAt || null,
    source: 'page',
    recoveredFromRestriction,
    probeOnly: recoveredFromRestriction,
  };
}

module.exports = {
  classifySiteHealth,
  enforceRuntimeGuard,
  formatGuardError,
  isCircuitBreakerActive,
};
