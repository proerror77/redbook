const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const AUTH_DIR = path.join(ROOT_DIR, '.auth');
const PROFILE_DIR = path.join(AUTH_DIR, 'profile');
const CONFIG_EXAMPLE_PATH = path.join(ROOT_DIR, 'config.example.json');
const CONFIG_LOCAL_PATH = path.join(ROOT_DIR, 'config.local.json');
const LEDGER_PATH = path.join(DATA_DIR, 'ledger.json');
const EVENTS_PATH = path.join(DATA_DIR, 'events.jsonl');

module.exports = {
  ROOT_DIR,
  DATA_DIR,
  AUTH_DIR,
  PROFILE_DIR,
  CONFIG_EXAMPLE_PATH,
  CONFIG_LOCAL_PATH,
  LEDGER_PATH,
  EVENTS_PATH,
};
