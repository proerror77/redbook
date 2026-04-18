#!/usr/bin/env node

console.log(
  'bootstrap_auth.js 已废弃。请改用 `npm run boss:login`，'
  + '它会通过 Playwright CLI + 持久化 profile 打开 BOSS 页面；登录完成后再运行 '
  + '`chrome:collect / chrome:monitor / boss:apply`。'
);
