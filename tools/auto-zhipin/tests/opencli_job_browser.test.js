const test = require('node:test');
const assert = require('node:assert/strict');

const { requireBossCoreModule } = require('../lib/opencli_core');

test('shared job-browser module is available from opencli boss core', () => {
  const jobBrowser = requireBossCoreModule('job-browser');
  assert.equal(typeof jobBrowser.extractJobsFromPage, 'function');
  assert.equal(typeof jobBrowser.extractJobDetailMeta, 'function');
  assert.equal(typeof jobBrowser.applyOnActiveJobDetail, 'function');
  assert.equal(typeof jobBrowser.buildClickApplyScript, 'function');
  assert.equal(typeof jobBrowser.selectJobCard, 'function');
  assert.equal(typeof jobBrowser.buildSelectJobCardScript, 'function');
});

test('buildClickApplyScript prioritizes BOSS start-chat CTA selectors', () => {
  const { buildClickApplyScript } = requireBossCoreModule('job-browser');
  const script = buildClickApplyScript();

  assert.equal(script.includes('.job-op .btn-startchat'), true);
  assert.equal(script.includes('a.op-btn.op-btn-chat'), true);
  assert.equal(script.includes('a[ka*="chat"]'), true);
  assert.equal(script.includes('a[data-url*="/friend/add"]'), true);
  assert.equal(script.includes('generic-actionable'), true);
});

test('buildSelectJobCardScript targets job_detail anchors from results pages', () => {
  const { buildSelectJobCardScript } = requireBossCoreModule('job-browser');
  const script = buildSelectJobCardScript('https://www.zhipin.com/job_detail/demo.html');

  assert.equal(script.includes('a[href*="/job_detail/"]'), true);
  assert.equal(script.includes('job_card_not_found'), true);
  assert.equal(script.includes('.job-card-wrapper'), true);
});

test('extractJobDetailMeta parses serialized payloads', async () => {
  const { extractJobDetailMeta } = requireBossCoreModule('job-browser');
  const adapter = {
    async evaluate() {
      return JSON.stringify({
        url: 'https://www.zhipin.com/job_detail/demo.html',
        title: 'AI Agent 工程师',
        salaryText: '30-50K',
        bodyText: '职位描述 继续沟通',
      });
    },
  };

  const meta = await extractJobDetailMeta(adapter);
  assert.equal(meta.title, 'AI Agent 工程师');
  assert.equal(meta.salaryText, '30-50K');
  assert.equal(meta.url, 'https://www.zhipin.com/job_detail/demo.html');
});

test('applyOnActiveJobDetail short-circuits already continuing jobs', async () => {
  const { applyOnActiveJobDetail } = requireBossCoreModule('job-browser');
  const adapter = {
    async evaluate() {
      return JSON.stringify({
        url: 'https://www.zhipin.com/job_detail/demo.html',
        bodyText: '继续沟通',
      });
    },
  };

  const result = await applyOnActiveJobDetail(adapter, {});
  assert.equal(result.ok, true);
  assert.equal(result.mode, 'already_continuing');
  assert.equal(result.url, 'https://www.zhipin.com/job_detail/demo.html');
  assert.equal(result.action, 'apply');
  assert.equal(result.status, 'success');
});

test('applyOnActiveJobDetail returns dry-run result after clicking apply', async () => {
  const { applyOnActiveJobDetail } = requireBossCoreModule('job-browser');
  let callCount = 0;
  const adapter = {
    async evaluate() {
      callCount += 1;
      if (callCount === 1) {
        return JSON.stringify({
          url: 'https://www.zhipin.com/job_detail/demo.html',
          bodyText: '职位描述',
        });
      }
      return JSON.stringify({
        ok: true,
        text: '立即沟通',
      });
    },
  };

  const result = await applyOnActiveJobDetail(adapter, { dryRun: true });
  assert.equal(result.ok, true);
  assert.equal(result.dryRun, true);
  assert.equal(result.mode, 'clicked_apply');
  assert.equal(result.button, '立即沟通');
  assert.equal(result.url, 'https://www.zhipin.com/job_detail/demo.html');
  assert.equal(result.action, 'apply');
  assert.equal(result.status, 'success');
});

test('applyOnActiveJobDetail returns standardized result fields and fires lifecycle hooks', async () => {
  const { applyOnActiveJobDetail } = requireBossCoreModule('job-browser');
  let callCount = 0;
  const events = [];
  const adapter = {
    async evaluate() {
      callCount += 1;
      if (callCount === 1) {
        return JSON.stringify({
          url: 'https://www.zhipin.com/job_detail/demo.html',
          bodyText: '职位描述',
        });
      }
      return JSON.stringify({
        ok: true,
        text: '立即沟通',
      });
    },
  };

  const result = await applyOnActiveJobDetail(adapter, {
    dryRun: true,
    hooks: {
      async beforeAction(action, context) {
        events.push(['before', action, context.url]);
      },
      async afterAction(action, actionResult) {
        events.push(['after', action, actionResult.status]);
      },
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.action, 'apply');
  assert.equal(result.status, 'success');
  assert.equal(result.reason, null);
  assert.deepEqual(result.normalized, {
    url: 'https://www.zhipin.com/job_detail/demo.html',
    button: '立即沟通',
  });
  assert.deepEqual(events, [
    ['before', 'apply', 'https://www.zhipin.com/job_detail/demo.html'],
    ['after', 'apply', 'success'],
  ]);
});
