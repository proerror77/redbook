const fs = require('node:fs');

const { SUPERVISOR_DASHBOARD_PATH, SUPERVISOR_SNAPSHOT_PATH } = require('./paths');
const { nowIso } = require('./utils');

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function buildRoleOrder(nextRole = 'jobs') {
  return String(nextRole || '').toLowerCase() === 'chat'
    ? ['chat', 'jobs']
    : ['jobs', 'chat'];
}

function computeRoleBudgetMs({ budgetMs, elapsedMs, remainingRoles }) {
  const remainingBudgetMs = Math.max(0, Number(budgetMs || 0) - Number(elapsedMs || 0));
  const rolesLeft = Math.max(1, Number(remainingRoles || 1));
  return Math.max(1000, Math.floor(remainingBudgetMs / rolesLeft));
}

function resolveNextRole({ roleOrder, results, fallback = 'jobs' }) {
  const orderedRoles = Array.isArray(roleOrder) && roleOrder.length
    ? roleOrder
    : buildRoleOrder(fallback);
  const firstIncomplete = (results || []).find((item) => item?.status === 'budget_exhausted');
  if (firstIncomplete?.role) {
    return firstIncomplete.role;
  }

  const lastResult = (results || [])[results.length - 1];
  if (!lastResult?.role) {
    return orderedRoles[0] || fallback;
  }

  return lastResult.role === 'jobs' ? 'chat' : 'jobs';
}

function buildSupervisorSnapshot({ store, tickResult }) {
  const supervisor = store.getSupervisorState();
  return {
    generatedAt: nowIso(),
    summary: store.summary(),
    supervisor,
    tickResult,
  };
}

function buildSupervisorDashboard(snapshot) {
  const summary = snapshot.summary || {};
  const checkpoint = snapshot.supervisor?.checkpoint || {};
  const managedTabs = snapshot.supervisor?.managedTabs || {};
  const jobsTargetCount = Number(checkpoint.jobsTargetCount || 0);
  const jobsLastTargetIndex = Number(checkpoint.jobsLastTargetIndex || 0);
  const jobsTargetPosition = jobsTargetCount > 0
    ? `${jobsLastTargetIndex + 1}/${jobsTargetCount}`
    : 'n/a';

  return [
    '# Zhipin Supervisor Dashboard',
    '',
    `- Generated: ${snapshot.generatedAt || ''}`,
    `- Supervisor status: ${checkpoint.status || 'unknown'}`,
    `- Next role: ${checkpoint.nextRole || 'jobs'}`,
    `- Active role: ${checkpoint.activeRole || 'none'}`,
    `- Today successful applies: ${summary.todaySuccessfulApplies || 0}`,
    `- Applied total: ${summary.applied || 0}`,
    `- Pending drafts: ${summary.pendingDrafts || 0}`,
    `- Pending actions: ${summary.pendingActions || 0}`,
    `- Jobs target: ${checkpoint.jobsLastTargetUrl || 'n/a'}`,
    `- Jobs target slot: ${jobsTargetPosition}`,
    `- Jobs tab: ${managedTabs.jobs?.tabIndex || 'missing'} ${managedTabs.jobs?.url || ''}`,
    `- Chat tab: ${managedTabs.chat?.tabIndex || 'missing'} ${managedTabs.chat?.url || ''}`,
    '',
    '## Last Tick',
    '',
    `- Status: ${snapshot.tickResult?.status || 'unknown'}`,
    `- Roles: ${(snapshot.tickResult?.results || []).map((item) => `${item.role}:${item.status || 'ok'}`).join(', ') || 'none'}`,
  ].join('\n');
}

function persistSupervisorArtifacts(snapshot, options = {}) {
  const snapshotPath = options.snapshotPath || SUPERVISOR_SNAPSHOT_PATH;
  const dashboardPath = options.dashboardPath || SUPERVISOR_DASHBOARD_PATH;
  fs.writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  fs.writeFileSync(dashboardPath, `${buildSupervisorDashboard(snapshot)}\n`, 'utf8');
  return { snapshotPath, dashboardPath };
}

function runSupervisorTick({
  store,
  config,
  ensureManagedTabs,
  activateTab,
  runJobsPhase,
  runChatPhase,
  owner = `pid:${process.pid}`,
  nowMs = () => Date.now(),
}) {
  if (!config.supervisor?.enabled) {
    return { status: 'disabled', results: [] };
  }

  if (config.supervisor?.pause) {
    store.setSupervisorCheckpoint({
      status: 'paused',
      activeRole: null,
      nextRole: store.getSupervisorCheckpoint()?.nextRole || 'jobs',
      pausedAt: nowIso(),
    }, { reason: 'config_pause' });
    return { status: 'paused', results: [] };
  }

  const lockResult = store.acquireSupervisorLock(owner, {
    ttlMs: Number(config.supervisor?.lockTtlMs || config.supervisor?.tickBudgetMs || 60 * 1000),
    nowMs: nowMs(),
  });
  if (!lockResult.acquired) {
    return {
      status: 'skipped_locked',
      reason: lockResult.reason,
      lock: lockResult.lock,
      results: [],
    };
  }

  const checkpoint = store.getSupervisorCheckpoint() || {};
  const roleOrder = buildRoleOrder(checkpoint.nextRole || 'jobs');
  const budgetMs = Math.max(1000, Number(config.supervisor?.tickBudgetMs || 10 * 60 * 1000));
  const startedAtMs = nowMs();
  let managedTabs = {};
  const results = [];

  try {
    managedTabs = ensureManagedTabs();
    store.setSupervisorCheckpoint({
      status: 'running',
      activeRole: null,
      nextRole: roleOrder[0],
      tickStartedAt: new Date(startedAtMs).toISOString(),
      managedTabs,
      failedAt: null,
      error: null,
    }, { phase: 'start' });

    for (const role of roleOrder) {
      const elapsedMs = nowMs() - startedAtMs;
      if (elapsedMs >= budgetMs) {
        results.push({ role, status: 'budget_exhausted' });
        break;
      }

      if (role === 'jobs'
        && Number(config.supervisor?.dailySuccessfulAppliesTarget || 0) > 0
        && store.getTodaySuccessfulApplies() >= Number(config.supervisor.dailySuccessfulAppliesTarget)) {
        results.push({ role, status: 'daily_target_reached' });
        continue;
      }

      const tab = managedTabs[role];
      if (!tab?.tabIndex) {
        results.push({ role, status: 'missing_tab' });
        continue;
      }

      const roleBudgetMs = computeRoleBudgetMs({
        budgetMs,
        elapsedMs,
        remainingRoles: roleOrder.length - results.length,
      });
      activateTab(tab);
      store.heartbeatSupervisorLock(owner, {
        ttlMs: Number(config.supervisor?.lockTtlMs || budgetMs),
        nowMs: nowMs(),
      });
      store.setSupervisorCheckpoint({
        status: 'running',
        activeRole: role,
        nextRole: role === 'jobs' ? 'chat' : 'jobs',
        managedTabs,
        lastRoleStartedAt: nowIso(),
        roleBudgetMs,
      }, { role });

      const phaseResult = role === 'jobs'
        ? runJobsPhase({ tab, managedTabs, checkpoint: store.getSupervisorCheckpoint() || {}, budgetMs: roleBudgetMs })
        : runChatPhase({ tab, managedTabs, checkpoint: store.getSupervisorCheckpoint() || {}, budgetMs: roleBudgetMs });
      const checkpointPatch = isObject(phaseResult?.checkpoint)
        ? phaseResult.checkpoint
        : {};
      const result = {
        role,
        roleBudgetMs,
        ...(phaseResult || {}),
      };
      delete result.checkpoint;
      results.push(result);

      store.setSupervisorCheckpoint({
        ...checkpointPatch,
        status: 'running',
        activeRole: null,
        nextRole: role === 'jobs' ? 'chat' : 'jobs',
        managedTabs,
        lastRole: role,
        lastRoleResult: result,
        lastRoleFinishedAt: nowIso(),
      }, { role, status: result.status || 'ok' });
    }

    store.setSupervisorCheckpoint({
      status: 'idle',
      activeRole: null,
      nextRole: resolveNextRole({
        roleOrder,
        results,
        fallback: checkpoint.nextRole || 'jobs',
      }),
      managedTabs,
      lastTickFinishedAt: nowIso(),
      lastTickResults: results,
      failedAt: null,
      error: null,
    }, { phase: 'finish' });

    return {
      status: 'ok',
      managedTabs,
      results,
      summary: store.summary(),
    };
  } catch (error) {
    store.setSupervisorCheckpoint({
      status: 'failed',
      activeRole: null,
      nextRole: checkpoint.nextRole || 'jobs',
      managedTabs,
      failedAt: nowIso(),
      error: error.message || String(error),
    }, { phase: 'failed' });
    throw error;
  } finally {
    store.releaseSupervisorLock(owner, { phase: 'tick_end' });
  }
}

module.exports = {
  buildRoleOrder,
  computeRoleBudgetMs,
  resolveNextRole,
  buildSupervisorDashboard,
  buildSupervisorSnapshot,
  persistSupervisorArtifacts,
  runSupervisorTick,
};
