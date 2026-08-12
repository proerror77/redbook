#!/usr/bin/env node
// Serve the BOSS Copilot userscript on a local port so Tampermonkey can
// auto-update its installed copy.
//
// The installed Tampermonkey script has its update source pinned to
//   http://127.0.0.1:8898/boss-copilot.user.js
// That server used to exist but was dropped, so the browser kept running the
// old script (manual Alt+A apply only, no auto-apply). This file restores the
// endpoint by serving the current userscript from this repo, unchanged.
//
// Run (or have the launchd supervisor run it):
//   node scripts/serve_userscript.js          # defaults to 8898, the file path above
//   node scripts/serve_userscript.js --port 8898
//   curl http://127.0.0.1:8898/boss-copilot.user.js
//
// Never listens on anything but 127.0.0.1.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('../lib/utils');

const DEFAULT_PORT = 8898;
const DEFAULT_HOST = '127.0.0.1';
const USESCRIPT_PATH = path.join(__dirname, '..', 'userscript', 'boss-copilot.user.js');

function main() {
  const args = parseArgs(process.argv.slice(2));
  const port = Number(args.port || DEFAULT_PORT);

  const server = http.createServer((request, response) => {
    if (request.url === '/boss-copilot.user.js') {
      // Read fresh on every request so a repo edit (version bump etc.) is
      // picked up without restarting this server.
      const body = fs.readFileSync(USESCRIPT_PATH, 'utf8');
      response.writeHead(200, {
        // application/javascript + inline: Chrome renders the script in the tab instead of
        // downloading it, which lets Tampermonkey's install/update bar appear. text/plain makes
        // Chrome treat .user.js as a download and no update prompt ever shows.
        'Content-Type': 'application/javascript; charset=utf-8',
        'Content-Disposition': 'inline',
        'Content-Length': Buffer.byteLength(body),
        'Cache-Control': 'no-store', // Tampermonkey checks for updates; never serve a stale copy
      });
      response.end(body);
      return;
    }
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('not found');
  });

  server.listen(port, DEFAULT_HOST, () => {
    console.log(`userscript server on http://${DEFAULT_HOST}:${port} -> ${USESCRIPT_PATH}`);
  });

  process.on('SIGINT', () => {
    server.close(() => process.exit(0));
  });
}

if (require.main === module) {
  main();
}

module.exports = { DEFAULT_PORT, USESCRIPT_PATH, main };
