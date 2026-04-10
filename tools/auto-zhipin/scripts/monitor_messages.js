#!/usr/bin/env node
console.warn('[deprecated] monitor_messages.js 已切换为 current-tab 流程，自动转发到 chrome_monitor_queue.js');
require('./chrome_monitor_queue');
