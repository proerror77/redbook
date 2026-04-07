const {
  MANAGED_TAB_ROLE_KEY,
  createFrontWindowTab,
  evalFrontWindowTab,
  listFrontWindowTabs,
  navigateFrontWindowTab,
} = require('./chrome_current');

const DEFAULT_JOBS_URL = 'https://www.zhipin.com/web/geek/jobs';

function expectedRoleUrl(role, config = {}) {
  if (role === 'chat') {
    return config.chat?.url || 'https://www.zhipin.com/web/geek/chat?ka=header-message';
  }
  const searchUrls = Array.isArray(config.jobs?.searchUrls)
    ? config.jobs.searchUrls.filter(Boolean)
    : [];
  return searchUrls[0] || DEFAULT_JOBS_URL;
}

function urlMatchesRole(role, url, expectedUrl = '') {
  const value = String(url || '');
  if (!value) {
    return false;
  }
  if (role === 'chat') {
    return value.includes('/web/geek/chat');
  }
  return value.includes('/web/geek/jobs') || value.includes('/job_detail/');
}

function pickManagedTabCandidate(tabs, role, config = {}, options = {}) {
  const candidates = Array.isArray(tabs) ? tabs : [];
  const excluded = new Set(options.excludeTabIndices || []);
  const preferredTabIndex = Number(options.preferredTabIndex || 0);
  const expectedUrl = expectedRoleUrl(role, config);
  const available = candidates.filter((tab) => !excluded.has(Number(tab.tabIndex)));

  if (preferredTabIndex > 0) {
    const preferred = available.find((tab) => Number(tab.tabIndex) === preferredTabIndex);
    if (preferred && (preferred.role === role || urlMatchesRole(role, preferred.url, expectedUrl))) {
      return preferred;
    }
  }

  const roleOwned = available.find((tab) => tab.role === role);
  if (roleOwned) {
    return roleOwned;
  }

  return available.find((tab) => urlMatchesRole(role, tab.url, expectedUrl)) || null;
}

function markTabRole(tabIndex, role, chrome) {
  const api = chrome || { evalFrontWindowTab };
  return String(api.evalFrontWindowTab(tabIndex, `(() => {
    try {
      sessionStorage.setItem(${JSON.stringify(MANAGED_TAB_ROLE_KEY)}, ${JSON.stringify(role)});
      return sessionStorage.getItem(${JSON.stringify(MANAGED_TAB_ROLE_KEY)}) || '';
    } catch (error) {
      return '';
    }
  })()` ) || '').trim();
}

function ensureManagedTabs({ config = {}, store = null, waitMs = 1500, chrome = null } = {}) {
  const api = chrome || {
    createFrontWindowTab,
    evalFrontWindowTab,
    listFrontWindowTabs,
    navigateFrontWindowTab,
  };

  const existing = store?.getManagedTabs ? store.getManagedTabs() : {};
  const managedTabs = {};
  const usedTabIndices = new Set();
  let tabs = api.listFrontWindowTabs();

  for (const role of ['jobs', 'chat']) {
    const expectedUrl = expectedRoleUrl(role, config);
    let tab = pickManagedTabCandidate(tabs, role, config, {
      excludeTabIndices: Array.from(usedTabIndices),
      preferredTabIndex: existing[role]?.tabIndex,
    });

    if (!tab) {
      const createdTabIndex = api.createFrontWindowTab(expectedUrl, waitMs);
      tabs = api.listFrontWindowTabs();
      tab = tabs.find((item) => Number(item.tabIndex) === Number(createdTabIndex)) || {
        tabIndex: Number(createdTabIndex),
        url: expectedUrl,
        title: '',
        active: false,
        role: '',
      };
    }

    if (!urlMatchesRole(role, tab.url, expectedUrl)) {
      api.navigateFrontWindowTab(tab.tabIndex, expectedUrl, waitMs);
      tabs = api.listFrontWindowTabs();
      tab = tabs.find((item) => Number(item.tabIndex) === Number(tab.tabIndex)) || {
        ...tab,
        url: expectedUrl,
      };
    }

    const markedRole = markTabRole(tab.tabIndex, role, api) || role;
    tabs = api.listFrontWindowTabs();
    const refreshed = tabs.find((item) => Number(item.tabIndex) === Number(tab.tabIndex)) || tab;
    managedTabs[role] = {
      ...refreshed,
      role: markedRole,
      expectedUrl,
    };
    usedTabIndices.add(Number(tab.tabIndex));
  }

  if (store?.setManagedTabs) {
    store.setManagedTabs(managedTabs, { operation: 'ensureManagedTabs' });
  }

  return managedTabs;
}

module.exports = {
  DEFAULT_JOBS_URL,
  ensureManagedTabs,
  expectedRoleUrl,
  markTabRole,
  pickManagedTabCandidate,
  urlMatchesRole,
};
