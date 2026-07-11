const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

const { buildServer } = require('../scripts/userscript_gate_server');
const { ZhipinStore } = require('../lib/store');
const { DEFAULT_CONFIG } = require('../lib/config');

function withServer(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve(port);
    });
  });
}

function request(port, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path: urlPath,
        headers: payload
          ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
          : {},
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, body: data ? JSON.parse(data) : null });
        });
      }
    );
    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function makeStore() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zhipin-gate-server-'));
  return new ZhipinStore({
    dataDir: tempDir,
    ledgerPath: path.join(tempDir, 'ledger.json'),
    eventsPath: path.join(tempDir, 'events.jsonl'),
  });
}

test('GET /health reports ok and today count', async () => {
  const store = makeStore();
  const server = buildServer({ store, config: DEFAULT_CONFIG, getTriage: () => null });
  const port = await withServer(server);
  try {
    const { statusCode, body } = await request(port, 'GET', '/health');
    assert.equal(statusCode, 200);
    assert.equal(body.ok, true);
    assert.equal(body.todaySuccessfulApplies, 0);
  } finally {
    server.close();
  }
});

test('POST /gate allows a matching candidate and blocks a blacklisted company', async () => {
  const store = makeStore();
  const server = buildServer({ store, config: DEFAULT_CONFIG, getTriage: () => null });
  const port = await withServer(server);
  try {
    const allowed = await request(port, 'POST', '/gate', {
      job: {
        url: 'https://www.zhipin.com/job_detail/allowed.html',
        title: 'AI Agent 应用架构师',
        company: '一家 AI 创业公司',
        salaryText: '40-60K',
        experienceText: '3-5年',
        degreeText: '本科',
        summary: 'AI Agent RAG 工作流自动化',
      },
    });
    assert.equal(allowed.statusCode, 200);
    assert.equal(allowed.body.allow, true);
    assert.deepEqual(allowed.body.reasons, []);

    const blocked = await request(port, 'POST', '/gate', {
      job: {
        url: 'https://www.zhipin.com/job_detail/blocked.html',
        title: 'AI 解决方案架构师',
        company: '字节跳动',
        salaryText: '50-80K',
        experienceText: '3-5年',
        degreeText: '本科',
        summary: '企业 AI 应用落地',
      },
    });
    assert.equal(blocked.statusCode, 200);
    assert.equal(blocked.body.allow, false);
    assert.ok(blocked.body.reasons.some((reason) => reason.startsWith('company_blacklisted')));
  } finally {
    server.close();
  }
});

test('POST /gate allows an AI product lead from the title alone', async () => {
  const store = makeStore();
  const server = buildServer({
    store,
    config: require('../lib/config').loadConfig(path.join(__dirname, '..', 'config.local.json')).config,
    getTriage: () => null,
  });
  const port = await withServer(server);
  try {
    const { body } = await request(port, 'POST', '/gate', {
      job: {
        url: 'https://www.zhipin.com/job_detail/ai-product-lead.html',
        title: 'AI产品负责人',
        company: '蓝色光标数字营销机构',
        salaryText: '70-86K',
        summary: 'AI产品负责人',
      },
    });
    assert.equal(body.allow, true);
    assert.deepEqual(body.reasons, []);
  } finally {
    server.close();
  }
});

test('POST /gate rejects missing url with 400', async () => {
  const store = makeStore();
  const server = buildServer({ store, config: DEFAULT_CONFIG, getTriage: () => null });
  const port = await withServer(server);
  try {
    const { statusCode, body } = await request(port, 'POST', '/gate', { job: { title: 'no url' } });
    assert.equal(statusCode, 400);
    assert.match(body.error, /job\.url is required/);
  } finally {
    server.close();
  }
});

test('POST /gate blocks a duplicate identity that was already applied', async () => {
  const store = makeStore();
  store.upsertApplication({
    jobId: 'https://www.zhipin.com/job_detail/first.html',
    url: 'https://www.zhipin.com/job_detail/first.html',
    title: 'AI Agent 应用架构师',
    company: '一家 AI 创业公司',
    status: 'applied',
    appliedAt: new Date().toISOString(),
  });

  const server = buildServer({ store, config: DEFAULT_CONFIG, getTriage: () => null });
  const port = await withServer(server);
  try {
    const { body } = await request(port, 'POST', '/gate', {
      job: {
        url: 'https://www.zhipin.com/job_detail/second.html',
        title: 'AI Agent 应用架构师',
        company: '一家 AI 创业公司',
        salaryText: '40-60K',
        experienceText: '3-5年',
        degreeText: '本科',
      },
    });
    assert.equal(body.allow, false);
    assert.ok(body.reasons.some((reason) => reason.startsWith('duplicate_applied')));
  } finally {
    server.close();
  }
});

test('POST /applied records a successful application and updates today count', async () => {
  const store = makeStore();
  const server = buildServer({ store, config: DEFAULT_CONFIG, getTriage: () => null });
  const port = await withServer(server);
  try {
    const { statusCode, body } = await request(port, 'POST', '/applied', {
      job: {
        url: 'https://www.zhipin.com/job_detail/applied-one.html',
        title: 'AI Agent 应用架构师',
        company: '一家 AI 创业公司',
        salaryText: '40-60K',
      },
      result: { success: true },
    });
    assert.equal(statusCode, 200);
    assert.equal(body.ok, true);
    assert.equal(body.todaySuccessfulApplies, 1);

    const application = store.findApplicationByUrl('https://www.zhipin.com/job_detail/applied-one.html');
    assert.equal(application.status, 'applied');
    assert.equal(application.source, 'userscript_hotkey_apply');
  } finally {
    server.close();
  }
});

test('POST /applied records a failed click without incrementing today count', async () => {
  const store = makeStore();
  const server = buildServer({ store, config: DEFAULT_CONFIG, getTriage: () => null });
  const port = await withServer(server);
  try {
    const { body } = await request(port, 'POST', '/applied', {
      job: {
        url: 'https://www.zhipin.com/job_detail/failed-one.html',
        title: 'AI Agent 应用架构师',
        company: '一家 AI 创业公司',
      },
      result: { success: false, reason: 'button_not_found' },
    });
    assert.equal(body.todaySuccessfulApplies, 0);

    const application = store.findApplicationByUrl('https://www.zhipin.com/job_detail/failed-one.html');
    assert.equal(application.status, 'failed');
    assert.deepEqual(application.reasons, ['button_not_found']);
  } finally {
    server.close();
  }
});

test('unknown route returns 404', async () => {
  const store = makeStore();
  const server = buildServer({ store, config: DEFAULT_CONFIG, getTriage: () => null });
  const port = await withServer(server);
  try {
    const { statusCode } = await request(port, 'GET', '/nope');
    assert.equal(statusCode, 404);
  } finally {
    server.close();
  }
});
