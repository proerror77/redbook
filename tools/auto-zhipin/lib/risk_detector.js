'use strict';

// 风控检测与节流模块。弹窗关键词移植自
// mrcxsy/boss-auto-apply (Apache-2.0) src/modules/automation.js 的 __popupKeywords。

const RISK_KEYWORDS = [
  '验证码', '安全验证', '安全检测', '人机验证', '操作太快', '频繁', '稍后再试',
  '休息一下', '封禁', '请完成', '请先完成', '账号异常', '异常访问',
  '访问受限', '403', '登录', '请先登录',
];

function detectRiskPopup(text) {
  const normalized = String(text || '');
  for (const keyword of RISK_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return { risk: true, reason: keyword };
    }
  }
  return { risk: false, reason: '' };
}

function shouldThrottle({ appliedToday, maxPerDay, lastAppliedAt, intervalSeconds }) {
  if (appliedToday >= maxPerDay) return true;
  const elapsed = Date.now() - (lastAppliedAt || 0);
  if (elapsed < intervalSeconds * 1000) return true;
  return false;
}

module.exports = { detectRiskPopup, shouldThrottle, RISK_KEYWORDS };
