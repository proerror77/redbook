const fs = require('node:fs');
const path = require('node:path');

const { ROOT_DIR } = require('./paths');
const { nowIso } = require('./utils');

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatDateStamp(date = new Date()) {
  const value = new Date(date);
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function resolveProjectRoot(projectRoot) {
  return projectRoot || path.resolve(ROOT_DIR, '..', '..');
}

function resolveDailyReportPath(options = {}) {
  const projectRoot = resolveProjectRoot(options.projectRoot);
  const dateLabel = formatDateStamp(options.date || new Date());
  return path.join(projectRoot, '05-选题研究', `求职日报-${dateLabel}.md`);
}

function toBulletList(items, formatter, empty = '- 无') {
  if (!items.length) {
    return empty;
  }
  return items.map((item) => `- ${formatter(item)}`).join('\n');
}

function buildDailyReportMarkdown(options = {}) {
  const attempted = Array.isArray(options.attempted) ? options.attempted : [];
  const pendingDrafts = Array.isArray(options.pendingDrafts) ? options.pendingDrafts : [];
  const pendingActions = Array.isArray(options.pendingActions) ? options.pendingActions : [];
  const summary = options.summary || {};
  const siteHealth = options.siteHealth || {};
  const dateLabel = options.dateLabel || formatDateStamp(new Date());
  const succeeded = attempted.filter((item) => item.ok);
  const failed = attempted.filter((item) => !item.ok);

  return `# 求职日报 ${dateLabel}

生成时间：${nowIso()}

## 总览
- 累计已投递：${summary.applied || 0}
- 当前 matched：${summary.matched || 0}
- 当前 skipped：${summary.skipped || 0}
- 本轮成功：${succeeded.length}
- 本轮失败：${failed.length}
- 待处理草稿：${summary.pendingDrafts ?? pendingDrafts.length}
- 待执行动作：${summary.pendingActions ?? pendingActions.length}
- 站点状态：${siteHealth.status || 'unknown'}${siteHealth.reason ? ` (${siteHealth.reason})` : ''}

## 本轮成功
${toBulletList(
  succeeded,
  (item) => `${item.company || '未匹配公司'} / ${item.candidate || item.title || '未命名岗位'} | mode=${item.mode || 'unknown'}${item.greetingSource ? ` | greeting=${item.greetingSource}` : ''}`,
)}

## 本轮失败
${toBulletList(
  failed,
  (item) => `${item.company || '未匹配公司'} / ${item.candidate || item.title || '未命名岗位'} | mode=${item.mode || 'unknown'}${item.reasons?.length ? ` | reasons=${item.reasons.join(',')}` : ''}${item.reason ? ` | reason=${item.reason}` : ''}`,
)}

## 待处理草稿
${toBulletList(
  pendingDrafts,
  (item) => `${item.conversationTitle || item.conversationId || 'unknown'} | ${item.intent || 'draft'} | ${item.text || ''}`,
)}

## 待执行动作
${toBulletList(
  pendingActions,
  (item) => `${item.conversationTitle || item.conversationId || 'unknown'} | ${item.type || 'unknown'} | ${item.status || 'pending'}`,
)}
`;
}

function writeDailyReport(options = {}) {
  const reportPath = options.reportPath || resolveDailyReportPath(options);
  const markdown = buildDailyReportMarkdown({
    ...options,
    dateLabel: options.dateLabel || formatDateStamp(options.date || new Date()),
  });
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, markdown);
  return {
    reportPath,
    markdown,
  };
}

module.exports = {
  buildDailyReportMarkdown,
  formatDateStamp,
  resolveDailyReportPath,
  writeDailyReport,
};
