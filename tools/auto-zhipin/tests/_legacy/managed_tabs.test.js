const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { ensureManagedTabs } = require('../lib/managed_tabs');
const { ZhipinStore } = require('../lib/store');

function makeStore() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zhipin-managed-tabs-'));
  return new ZhipinStore({
    dataDir: tempDir,
    ledgerPath: path.join(tempDir, 'ledger.json'),
    eventsPath: path.join(tempDir, 'events.jsonl'),
  });
}

test('ensureManagedTabs creates missing chat tab and persists ownership', () => {
  const store = makeStore();
  const tabs = [
    { tabIndex: 1, url: 'https://www.zhipin.com/web/geek/jobs', title: 'Jobs', active: true, role: '' },
  ];

  const chrome = {
    listFrontWindowTabs() {
      return tabs.map((tab) => ({ ...tab }));
    },
    createFrontWindowTab(url) {
      const tab = {
        tabIndex: tabs.length + 1,
        url,
        title: `Tab ${tabs.length + 1}`,
        active: false,
        role: '',
      };
      tabs.push(tab);
      return tab.tabIndex;
    },
    navigateFrontWindowTab(tabIndex, url) {
      const tab = tabs.find((item) => item.tabIndex === tabIndex);
      tab.url = url;
    },
    evalFrontWindowTab(tabIndex, source) {
      const tab = tabs.find((item) => item.tabIndex === tabIndex);
      const match = source.match(/"__codex_zhipin_managed_role",\s*"([^"]+)"/);
      tab.role = match ? match[1] : tab.role;
      return tab.role;
    },
  };

  const managedTabs = ensureManagedTabs({
    config: {
      jobs: { searchUrls: ['https://www.zhipin.com/web/geek/jobs?query=AI%20Agent'] },
      chat: { url: 'https://www.zhipin.com/web/geek/chat?ka=header-message' },
    },
    store,
    chrome,
  });

  assert.equal(managedTabs.jobs.tabIndex, 1);
  assert.equal(managedTabs.jobs.role, 'jobs');
  assert.equal(managedTabs.chat.tabIndex, 2);
  assert.equal(managedTabs.chat.role, 'chat');
  assert.equal(store.getManagedTabs().chat.tabIndex, 2);
});
