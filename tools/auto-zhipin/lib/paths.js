const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const AUTH_DIR = path.join(ROOT_DIR, '.auth');
const PROFILE_DIR = path.join(AUTH_DIR, 'profile');
const CONFIG_EXAMPLE_PATH = path.join(ROOT_DIR, 'config.example.json');
const CONFIG_LOCAL_PATH = path.join(ROOT_DIR, 'config.local.json');
const LEDGER_PATH = path.join(DATA_DIR, 'ledger.json');
const EVENTS_PATH = path.join(DATA_DIR, 'events.jsonl');
const OPENCLI_CHAT_TRIAGE_PATH = path.join(DATA_DIR, 'opencli-chat-triage-latest.json');
const OPENCLI_CHAT_TRIAGE_OVERRIDES_PATH = path.join(DATA_DIR, 'opencli-chat-triage-overrides.json');
const CHROME_MESSAGE_TRIAGE_PATH = path.join(DATA_DIR, 'chrome-message-triage-latest.json');
const CHROME_MESSAGE_TRIAGE_REPORT_PATH = path.join(DATA_DIR, 'chrome-message-triage-report.md');
const SUPERVISOR_SNAPSHOT_PATH = path.join(DATA_DIR, 'supervisor-snapshot.json');
const SUPERVISOR_DASHBOARD_PATH = path.join(DATA_DIR, 'supervisor-dashboard.md');

module.exports = {
  ROOT_DIR,
  DATA_DIR,
  AUTH_DIR,
  PROFILE_DIR,
  CONFIG_EXAMPLE_PATH,
  CONFIG_LOCAL_PATH,
  LEDGER_PATH,
  EVENTS_PATH,
  CHROME_MESSAGE_TRIAGE_PATH,
  CHROME_MESSAGE_TRIAGE_REPORT_PATH,
  OPENCLI_CHAT_TRIAGE_PATH,
  OPENCLI_CHAT_TRIAGE_OVERRIDES_PATH,
  SUPERVISOR_SNAPSHOT_PATH,
  SUPERVISOR_DASHBOARD_PATH,
};
