const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { ZhipinStore } = require('../lib/store');
const {
  buildRoleOrder,
  buildSupervisorDashboard,
  buildSupervisorSnapshot,
  computeRoleBudgetMs,
  resolveNextRole,
  runSupervisorTick,
} = require('../lib/supervisor');
const { resolveJobsTarget } = require('../scripts/chrome_supervisor');

function makeStore() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zhipin-supervisor-'));
  return new ZhipinStore({
    dataDir: tempDir,
    ledgerPath: path.join(tempDir, 'ledger.json'),
    eventsPath: path.join(tempDir, 'events.jsonl'),
  });
}

test('buildRoleOrder starts from the checkpoint role', () => {
  assert.deepEqual(buildRoleOrder('jobs'), ['jobs', 'chat']);
  assert.deepEqual(buildRoleOrder('chat'), ['chat', 'jobs']);
});

test('computeRoleBudgetMs splits remaining budget across remaining roles', () => {
  assert.equal(computeRoleBudgetMs({ budgetMs: 60_000, elapsedMs: 0, remainingRoles: 2 }), 30_000);
  assert.equal(computeRoleBudgetMs({ budgetMs: 60_000, elapsedMs: 2_000, remainingRoles: 1 }), 58_000);
});

test('resolveNextRole keeps an exhausted role at the front of the next tick', () => {
  assert.equal(resolveNextRole({
    roleOrder: ['jobs', 'chat'],
    results: [{ role: 'jobs', status: 'ok' }, { role: 'chat', status: 'budget_exhausted' }],
  }), 'chat');
});

test('runSupervisorTick exits early when paused', () => {
  const store = makeStore();
  const result = runSupervisorTick({
    store,
    config: { supervisor: { enabled: true, pause: true } },
    ensureManagedTabs: () => { throw new Error('should not run'); },
    activateTab: () => {},
    runJobsPhase: () => ({}),
    runChatPhase: () => ({}),
  });

  assert.equal(result.status, 'paused');
  assert.equal(store.getSupervisorCheckpoint().status, 'paused');
});

test('runSupervisorTick locks, runs jobs then chat, and records checkpoint', () => {
  const store = makeStore();
  const activations = [];
  const phases = [];
  let nowMs = 1_000;

  const result = runSupervisorTick({
    store,
    config: {
      supervisor: {
        enabled: true,
        pause: false,
        tickBudgetMs: 60_000,
        lockTtlMs: 60_000,
        dailySuccessfulAppliesTarget: 130,
      },
    },
    ensureManagedTabs: () => ({
      jobs: { tabIndex: 2, url: 'jobs' },
      chat: { tabIndex: 3, url: 'chat' },
    }),
    activateTab: (tab) => activations.push(tab.tabIndex),
    runJobsPhase: ({ budgetMs }) => {
      phases.push('jobs');
      nowMs += 2_000;
      return {
        status: 'ok',
        checkpoint: {
          jobsNextTargetIndex: 1,
          jobsLastTargetUrl: 'jobs?q=agent',
        },
        budgetMsSeen: budgetMs,
      };
    },
    runChatPhase: ({ budgetMs }) => {
      phases.push('chat');
      nowMs += 1_000;
      return {
        status: 'ok',
        checkpoint: {
          chatLastRunAt: '2026-03-20T00:00:00.000Z',
        },
        budgetMsSeen: budgetMs,
      };
    },
    nowMs: () => nowMs,
  });

  assert.equal(result.status, 'ok');
  assert.deepEqual(phases, ['jobs', 'chat']);
  assert.deepEqual(activations, [2, 3]);
  assert.equal(store.getSupervisorCheckpoint().status, 'idle');
  assert.equal(store.getSupervisorCheckpoint().jobsNextTargetIndex, 1);
  assert.equal(store.getSupervisorCheckpoint().jobsLastTargetUrl, 'jobs?q=agent');
  assert.equal(store.getSupervisorCheckpoint().chatLastRunAt, '2026-03-20T00:00:00.000Z');
  assert.equal(result.results[0].roleBudgetMs, 30_000);
  assert.equal(result.results[1].roleBudgetMs, 58_000);
  assert.equal(store.getSupervisorState().lock, null);
});

test('buildSupervisorSnapshot and dashboard include supervisor state', () => {
  const store = makeStore();
  store.setSupervisorCheckpoint({
    status: 'idle',
    nextRole: 'jobs',
    jobsLastTargetUrl: 'https://www.zhipin.com/web/geek/jobs?query=AI%20Agent',
    jobsLastTargetIndex: 1,
    jobsTargetCount: 3,
  });
  store.setManagedTabs({
    jobs: { tabIndex: 2, url: 'jobs' },
    chat: { tabIndex: 3, url: 'chat' },
  });
  const snapshot = buildSupervisorSnapshot({
    store,
    tickResult: { status: 'ok', results: [{ role: 'jobs', status: 'ok' }] },
  });
  const dashboard = buildSupervisorDashboard(snapshot);

  assert.match(dashboard, /Supervisor status: idle/);
  assert.match(dashboard, /Jobs target: https:\/\/www\.zhipin\.com\/web\/geek\/jobs\?query=AI%20Agent/);
  assert.match(dashboard, /Jobs target slot: 2\/3/);
  assert.match(dashboard, /Jobs tab: 2 jobs/);
});

test('resolveJobsTarget rotates through configured search urls from checkpoint', () => {
  const target = resolveJobsTarget({
    config: {
      jobs: {
        searchUrls: [
          'https://www.zhipin.com/web/geek/jobs?query=AI%20Agent',
          'https://www.zhipin.com/web/geek/jobs?query=AI%20应用',
          'https://www.zhipin.com/web/geek/jobs?query=AI%20架构师',
        ],
      },
    },
    checkpoint: {
      jobsNextTargetIndex: 2,
    },
  });

  assert.equal(target.targetIndex, 2);
  assert.equal(target.targetUrl, 'https://www.zhipin.com/web/geek/jobs?query=AI%20架构师');
  assert.equal(target.nextTargetIndex, 0);
  assert.equal(target.cycleSize, 3);
});
