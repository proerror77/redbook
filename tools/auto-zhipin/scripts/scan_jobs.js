#!/usr/bin/env node
console.warn('[deprecated] scan_jobs.js 已切换为 current-tab 流程，自动转发到 chrome_collect_queue.js');
require('./chrome_collect_queue');
