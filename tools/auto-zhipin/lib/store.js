const fs = require('node:fs');
const path = require('node:path');
const { DATA_DIR, EVENTS_PATH, LEDGER_PATH } = require('./paths');
const { nowIso, stableHash, makeApplicationIdentity } = require('./utils');
const { isCircuitBreakerActive } = require('./site_health');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonAtomic(filePath, value) {
  ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2));
  fs.renameSync(tempPath, filePath);
}

function appendJsonLine(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`);
}

function formatSaveContext(context = {}) {
  const entries = Object.entries(context)
    .filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (!entries.length) {
    return '';
  }

  return entries
    .map(([key, value]) => {
      const formatted = typeof value === 'string'
        ? value
        : JSON.stringify(value);
      return `${key}=${formatted}`;
    })
    .join(', ');
}

function makeDefaultLedger() {
  return {
    version: 4,
    updatedAt: null,
    siteHealth: null,
    conversations: {},
    messages: {},
    drafts: {},
    jobs: {},
    applications: {},
    actions: {},
    runs: {},
    supervisor: {
      lock: null,
      checkpoint: null,
      managedTabs: {},
      updatedAt: null,
    },
  };
}

function upgradeLedgerSchema(ledger) {
  return {
    ...makeDefaultLedger(),
    ...(ledger || {}),
    conversations: { ...((ledger && ledger.conversations) || {}) },
    messages: { ...((ledger && ledger.messages) || {}) },
    drafts: { ...((ledger && ledger.drafts) || {}) },
    jobs: { ...((ledger && ledger.jobs) || {}) },
    applications: { ...((ledger && ledger.applications) || {}) },
    actions: { ...((ledger && ledger.actions) || {}) },
    runs: { ...((ledger && ledger.runs) || {}) },
    supervisor: {
      lock: (ledger && ledger.supervisor && ledger.supervisor.lock) || null,
      checkpoint: (ledger && ledger.supervisor && ledger.supervisor.checkpoint) || null,
      managedTabs: { ...(((ledger && ledger.supervisor && ledger.supervisor.managedTabs) || {})) },
      updatedAt: (ledger && ledger.supervisor && ledger.supervisor.updatedAt) || null,
    },
    siteHealth: (ledger && ledger.siteHealth) || null,
    version: 4,
  };
}

class ZhipinStore {
  constructor(options = {}) {
    this.dataDir = options.dataDir || DATA_DIR;
    this.ledgerPath = options.ledgerPath || LEDGER_PATH;
    this.eventsPath = options.eventsPath || EVENTS_PATH;
    ensureDir(this.dataDir);
    this.ledger = upgradeLedgerSchema(readJson(this.ledgerPath, makeDefaultLedger()));
  }

  startRun(kind, meta = {}) {
    const runId = stableHash(`${kind}:${nowIso()}:${Math.random()}`);
    this.ledger.runs[runId] = {
      id: runId,
      kind,
      meta,
      startedAt: nowIso(),
      endedAt: null,
      status: 'running',
    };
    this.touch();
    this.event('run_started', { id: runId, kind, meta });
    return runId;
  }

  finishRun(runId, status, meta = {}) {
    if (!this.ledger.runs[runId]) {
      return;
    }
    this.ledger.runs[runId].endedAt = nowIso();
    this.ledger.runs[runId].status = status;
    this.ledger.runs[runId].result = meta;
    this.touch();
    this.event('run_finished', { id: runId, status, meta });
  }

  touch() {
    this.ledger.updatedAt = nowIso();
  }

  event(type, payload) {
    appendJsonLine(this.eventsPath, {
      timestamp: nowIso(),
      type,
      payload,
    });
  }

  getSiteHealth() {
    return this.ledger.siteHealth || null;
  }

  setSiteHealth(siteHealth) {
    const previous = this.ledger.siteHealth || {};
    const status = siteHealth?.status || previous.status || 'unknown';
    this.ledger.siteHealth = {
      ...previous,
      ...siteHealth,
      status,
      updatedAt: nowIso(),
      restrictedAt: status === 'restricted' ? nowIso() : previous.restrictedAt || null,
    };
    this.touch();
    this.event('site_health_updated', this.ledger.siteHealth);
  }

  getActiveRestriction(nowMs = Date.now()) {
    const siteHealth = this.getSiteHealth();
    if (!isCircuitBreakerActive(siteHealth, nowMs)) {
      return null;
    }
    return siteHealth;
  }

  upsertConversation(conversation) {
    const id = conversation.id || stableHash(JSON.stringify(conversation));
    const existing = this.ledger.conversations[id] || {};
    this.ledger.conversations[id] = {
      ...existing,
      ...conversation,
      id,
      updatedAt: nowIso(),
    };
    this.touch();
    return id;
  }

  upsertMessage(message) {
    const id = message.id || stableHash(JSON.stringify(message));
    const isNew = !this.ledger.messages[id];
    this.ledger.messages[id] = {
      ...this.ledger.messages[id],
      ...message,
      id,
      updatedAt: nowIso(),
    };
    this.touch();
    if (isNew) {
      this.event('message_seen', this.ledger.messages[id]);
    }
    return { id, isNew };
  }

  upsertDraft(draft) {
    const id = draft.id || stableHash(`${draft.conversationId}:${draft.messageId}:${draft.text}`);
    this.ledger.drafts[id] = {
      ...this.ledger.drafts[id],
      ...draft,
      id,
      updatedAt: nowIso(),
    };
    this.touch();
    this.event('draft_updated', this.ledger.drafts[id]);
    return id;
  }

  getPendingDrafts() {
    return Object.values(this.ledger.drafts).filter((draft) => !draft.sentAt && !draft.dismissedAt);
  }

  markDraftSent(draftId, meta = {}) {
    if (!this.ledger.drafts[draftId]) {
      return;
    }
    this.ledger.drafts[draftId].sentAt = nowIso();
    this.ledger.drafts[draftId].sendMeta = meta;
    this.touch();
    this.event('draft_sent', this.ledger.drafts[draftId]);
  }

  upsertJob(job) {
    const id = job.id || stableHash(job.url || JSON.stringify(job));
    this.ledger.jobs[id] = {
      ...this.ledger.jobs[id],
      ...job,
      id,
      identityKey: job.identityKey || makeApplicationIdentity(job),
      updatedAt: nowIso(),
    };
    this.touch();
    return id;
  }

  upsertApplication(application) {
    const id = application.jobId;
    if (!id) {
      throw new Error('application.jobId is required');
    }
    this.ledger.applications[id] = {
      ...this.ledger.applications[id],
      ...application,
      identityKey: application.identityKey || makeApplicationIdentity(application),
      updatedAt: nowIso(),
    };
    this.touch();
    this.event('application_updated', this.ledger.applications[id]);
  }

  findApplicationByIdentity(target = {}, statuses = []) {
    const identityKey = target.identityKey || makeApplicationIdentity(target);
    if (!identityKey) {
      return null;
    }

    return Object.values(this.ledger.applications).find((application) => {
      const applicationIdentity = application.identityKey || makeApplicationIdentity(application);
      if (applicationIdentity !== identityKey) {
        return false;
      }
      if (!statuses.length) {
        return true;
      }
      return statuses.includes(application.status);
    }) || null;
  }

  upsertAction(action) {
    const existing = action.dedupeKey
      ? Object.values(this.ledger.actions).find((item) => item.dedupeKey === action.dedupeKey)
      : null;
    const id = existing?.id
      || action.id
      || action.dedupeKey
      || stableHash(`${action.type}:${action.conversationId}:${action.messageId}:${JSON.stringify(action.payload || {})}`);

    this.ledger.actions[id] = {
      ...existing,
      ...this.ledger.actions[id],
      ...action,
      id,
      status: action.status || existing?.status || 'pending',
      createdAt: existing?.createdAt || action.createdAt || nowIso(),
      updatedAt: nowIso(),
    };
    this.touch();
    this.event('action_updated', this.ledger.actions[id]);
    return id;
  }

  getPendingActions() {
    return Object.values(this.ledger.actions)
      .filter((action) => action.status === 'pending' || action.status === 'in_progress')
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  markActionStatus(actionId, status, result = {}) {
    if (!this.ledger.actions[actionId]) {
      return;
    }
    this.ledger.actions[actionId].status = status;
    this.ledger.actions[actionId].result = result;
    this.ledger.actions[actionId].updatedAt = nowIso();
    if (status === 'completed' || status === 'failed' || status === 'skipped') {
      this.ledger.actions[actionId].executedAt = nowIso();
    }
    this.touch();
    this.event('action_status_changed', this.ledger.actions[actionId]);
  }

  save(context = {}) {
    try {
      writeJsonAtomic(this.ledgerPath, this.ledger);
    } catch (error) {
      const contextText = formatSaveContext(context);
      const wrapped = new Error(
        [
          `Failed to save ledger at ${this.ledgerPath}`,
          contextText ? `context: ${contextText}` : '',
          `cause: ${error.message || String(error)}`,
        ].filter(Boolean).join(' | ')
      );
      wrapped.code = error.code;
      wrapped.cause = error;
      throw wrapped;
    }
  }

  getSupervisorState() {
    return {
      lock: this.ledger.supervisor?.lock || null,
      checkpoint: this.ledger.supervisor?.checkpoint || null,
      managedTabs: { ...((this.ledger.supervisor && this.ledger.supervisor.managedTabs) || {}) },
      updatedAt: this.ledger.supervisor?.updatedAt || null,
    };
  }

  getSupervisorCheckpoint() {
    return this.ledger.supervisor?.checkpoint || null;
  }

  setSupervisorCheckpoint(checkpoint, meta = {}) {
    this.ledger.supervisor = this.ledger.supervisor || makeDefaultLedger().supervisor;
    this.ledger.supervisor.checkpoint = checkpoint
      ? {
        ...(this.ledger.supervisor.checkpoint || {}),
        ...checkpoint,
        updatedAt: nowIso(),
      }
      : null;
    this.ledger.supervisor.updatedAt = nowIso();
    this.touch();
    this.event('supervisor_checkpoint_updated', {
      checkpoint: this.ledger.supervisor.checkpoint,
      meta,
    });
    return this.ledger.supervisor.checkpoint;
  }

  getManagedTabs() {
    return { ...((this.ledger.supervisor && this.ledger.supervisor.managedTabs) || {}) };
  }

  setManagedTabs(managedTabs, meta = {}) {
    this.ledger.supervisor = this.ledger.supervisor || makeDefaultLedger().supervisor;
    this.ledger.supervisor.managedTabs = {
      ...managedTabs,
    };
    this.ledger.supervisor.updatedAt = nowIso();
    this.touch();
    this.event('supervisor_managed_tabs_updated', {
      managedTabs: this.ledger.supervisor.managedTabs,
      meta,
    });
    return this.ledger.supervisor.managedTabs;
  }

  acquireSupervisorLock(owner, options = {}) {
    if (!owner) {
      throw new Error('supervisor lock owner is required');
    }

    const ttlMs = Math.max(1000, Number(options.ttlMs || 0) || 60 * 1000);
    const nowMs = Number(options.nowMs || Date.now());
    const existingLock = this.ledger.supervisor?.lock || null;
    const existingExpiresAtMs = existingLock?.expiresAt ? Date.parse(existingLock.expiresAt) : 0;
    const isFresh = existingLock && existingExpiresAtMs > nowMs;

    if (isFresh && existingLock.owner !== owner) {
      return {
        acquired: false,
        reason: 'already_locked',
        lock: existingLock,
      };
    }

    const lock = {
      owner,
      ttlMs,
      acquiredAt: existingLock?.owner === owner && existingLock.acquiredAt
        ? existingLock.acquiredAt
        : new Date(nowMs).toISOString(),
      heartbeatAt: new Date(nowMs).toISOString(),
      expiresAt: new Date(nowMs + ttlMs).toISOString(),
    };

    this.ledger.supervisor = this.ledger.supervisor || makeDefaultLedger().supervisor;
    this.ledger.supervisor.lock = lock;
    this.ledger.supervisor.updatedAt = nowIso();
    this.touch();
    this.event('supervisor_lock_acquired', lock);
    return {
      acquired: true,
      reason: existingLock ? 'lock_refreshed' : 'lock_created',
      lock,
    };
  }

  heartbeatSupervisorLock(owner, options = {}) {
    const lock = this.ledger.supervisor?.lock || null;
    if (!lock || lock.owner !== owner) {
      return null;
    }
    const nowMs = Number(options.nowMs || Date.now());
    const ttlMs = Math.max(1000, Number(options.ttlMs || lock.ttlMs || 60 * 1000));
    lock.ttlMs = ttlMs;
    lock.heartbeatAt = new Date(nowMs).toISOString();
    lock.expiresAt = new Date(nowMs + ttlMs).toISOString();
    this.ledger.supervisor.updatedAt = nowIso();
    this.touch();
    this.event('supervisor_lock_heartbeat', lock);
    return lock;
  }

  releaseSupervisorLock(owner, meta = {}) {
    const lock = this.ledger.supervisor?.lock || null;
    if (!lock || lock.owner !== owner) {
      return false;
    }
    this.ledger.supervisor.lock = null;
    this.ledger.supervisor.updatedAt = nowIso();
    this.touch();
    this.event('supervisor_lock_released', {
      owner,
      meta,
    });
    return true;
  }

  getTodaySuccessfulApplies(date = new Date()) {
    const isoDate = new Date(date).toISOString().slice(0, 10);
    return Object.values(this.ledger.applications || {}).filter((application) => {
      return application.status === 'applied'
        && String(application.appliedAt || '').startsWith(isoDate);
    }).length;
  }

  summary() {
    const applications = Object.values(this.ledger.applications);
    const drafts = Object.values(this.ledger.drafts);
    const actions = Object.values(this.ledger.actions);
    return {
      siteHealthStatus: this.ledger.siteHealth?.status || 'unknown',
      conversations: Object.keys(this.ledger.conversations).length,
      messages: Object.keys(this.ledger.messages).length,
      jobs: Object.keys(this.ledger.jobs).length,
      applications: applications.length,
      applied: applications.filter((item) => item.status === 'applied').length,
      matched: applications.filter((item) => item.status === 'matched').length,
      skipped: applications.filter((item) => item.status === 'skipped').length,
      pendingDrafts: drafts.filter((item) => !item.sentAt && !item.dismissedAt).length,
      pendingActions: actions.filter((item) => item.status === 'pending' || item.status === 'in_progress').length,
      supervisorLock: this.ledger.supervisor?.lock ? 'locked' : 'idle',
      todaySuccessfulApplies: this.getTodaySuccessfulApplies(),
    };
  }
}

module.exports = {
  ZhipinStore,
  makeDefaultLedger,
  readJson,
  upgradeLedgerSchema,
  writeJsonAtomic,
};
