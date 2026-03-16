const test = require('node:test');
const assert = require('node:assert/strict');

const {
  findPinchTabNodeRef,
  inferPinchTabReadiness,
  parsePinchTabJsonOutput,
  parsePinchTabSnapshotText,
  pickPinchTabTab,
  pinchTabApplyOnActiveTab,
  pinchTabOpenConversation,
  pinchTabSendActiveReply,
  pinchTabSendResumeFromActiveConversation,
} = require('../lib/pinchtab');

test('parsePinchTabJsonOutput parses plain JSON output', () => {
  const result = parsePinchTabJsonOutput('{"status":"ok","mode":"dashboard"}');
  assert.deepEqual(result, { status: 'ok', mode: 'dashboard' });
});

test('parsePinchTabJsonOutput parses leading JSON with trailing hints', () => {
  const result = parsePinchTabJsonOutput(`{
  "tabId": "abc",
  "title": "Example Domain",
  "url": "https://example.com/"
}


💡 Next steps:
  pinchtab snap
`);

  assert.equal(result.tabId, 'abc');
  assert.equal(result.title, 'Example Domain');
});

test('inferPinchTabReadiness detects a ready chat page from snapshot cues', () => {
  assert.equal(
    inferPinchTabReadiness({
      mode: 'chat',
      snapshotText: '# BOSS直聘 | 3 nodes\ne0:link \"消息\"\ne1:button \"发送\"',
      readableText: '消息 简历 发送',
    }),
    true
  );
});

test('inferPinchTabReadiness detects a ready jobs page from text cues', () => {
  assert.equal(
    inferPinchTabReadiness({
      mode: 'jobs',
      snapshotText: '# 页面 | 1 nodes\ne0:button \"立即沟通\"',
      readableText: '职位描述 立即沟通',
    }),
    true
  );
});

test('inferPinchTabReadiness stays false on generic loading content', () => {
  assert.equal(
    inferPinchTabReadiness({
      mode: 'chat',
      snapshotText: '',
      readableText: '加载中，请稍候',
    }),
    false
  );
});

test('parsePinchTabSnapshotText extracts interactive refs from raw snapshot text', () => {
  const snapshot = parsePinchTabSnapshotText(`# 页面 | https://example.com | 3 nodes
e0:textbox
e1:button "发送"
e2:link "阿里巴巴 / AI Agent 工程师"
`);

  assert.equal(snapshot.title, '页面');
  assert.equal(snapshot.url, 'https://example.com');
  assert.deepEqual(snapshot.nodes, [
    { ref: 'e0', role: 'textbox', name: '' },
    { ref: 'e1', role: 'button', name: '发送' },
    { ref: 'e2', role: 'link', name: '阿里巴巴 / AI Agent 工程师' },
  ]);
});

test('findPinchTabNodeRef prefers exact label matches and allowed roles', () => {
  const ref = findPinchTabNodeRef([
    { ref: 'e0', role: 'link', name: '发送消息' },
    { ref: 'e1', role: 'button', name: '发送' },
    { ref: 'e2', role: 'button', name: '发送简历' },
  ], {
    texts: ['发送'],
    roles: ['button'],
  });

  assert.equal(ref, 'e1');
});

test('pickPinchTabTab prefers an exact URL match and falls back to latest page tab', () => {
  const exact = pickPinchTabTab([
    { id: 'tab-1', type: 'page', url: 'https://example.com/' },
    { id: 'tab-2', type: 'page', url: 'https://www.zhipin.com/web/geek/chat?ka=header-message' },
  ], {
    url: 'https://www.zhipin.com/web/geek/chat?ka=header-message',
  });

  assert.equal(exact.id, 'tab-2');

  const fallback = pickPinchTabTab([
    { id: 'tab-1', type: 'service_worker', url: 'https://example.com/sw.js' },
    { id: 'tab-2', type: 'page', url: 'about:blank' },
    { id: 'tab-3', type: 'page', url: 'https://example.com/' },
  ], {});

  assert.equal(fallback.id, 'tab-3');
});

test('pinchTabOpenConversation clicks the conversation node matched by title', async () => {
  const fetchCalls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options = {}) => {
    fetchCalls.push({ url, options });
    if (String(url).includes('/snapshot')) {
      return new Response(JSON.stringify({
        count: 2,
        nodes: [
          { ref: 'e0', role: 'button', name: '王女士 AI Agent 工程师' },
          { ref: 'e1', role: 'button', name: '李先生 产品经理' },
        ],
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: true, result: { clicked: true } }), { status: 200 });
  };

  try {
    const result = await pinchTabOpenConversation({ pinchtab: { baseUrl: 'http://127.0.0.1:9867' } }, {
      tabId: 'tab-1',
      conversation: { title: '王女士' },
    });

    assert.equal(result.ok, true);
    assert.equal(String(fetchCalls[1].url), 'http://127.0.0.1:9867/tabs/tab-1/action');
    assert.match(fetchCalls[1].options.body, /"ref":"e0"/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('pinchTabSendActiveReply fills textbox and clicks send', async () => {
  const fetchCalls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options = {}) => {
    fetchCalls.push({ url, options });
    if (String(url).includes('/snapshot')) {
      return new Response(JSON.stringify({
        count: 2,
        nodes: [
          { ref: 'e0', role: 'textbox', name: '' },
          { ref: 'e1', role: 'button', name: '发送' },
        ],
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: true, result: { ok: true } }), { status: 200 });
  };

  try {
    const result = await pinchTabSendActiveReply({ pinchtab: { baseUrl: 'http://127.0.0.1:9867' } }, {
      tabId: 'tab-1',
      text: '你好，我的简历已准备好。',
    });

    assert.equal(result.ok, true);
    assert.equal(String(fetchCalls[1].url), 'http://127.0.0.1:9867/tabs/tab-1/action');
    assert.match(fetchCalls[1].options.body, /"kind":"fill"/);
    assert.match(fetchCalls[1].options.body, /"value":"你好，我的简历已准备好。"/);
    assert.equal(String(fetchCalls[2].url), 'http://127.0.0.1:9867/tabs/tab-1/action');
    assert.match(fetchCalls[2].options.body, /"kind":"click"/);
    assert.match(fetchCalls[2].options.body, /"ref":"e1"/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('pinchTabSendResumeFromActiveConversation clicks the first matching resume button', async () => {
  const fetchCalls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options = {}) => {
    fetchCalls.push({ url, options });
    if (String(url).includes('/snapshot')) {
      return new Response(JSON.stringify({
        count: 3,
        nodes: [
          { ref: 'e0', role: 'button', name: '继续沟通' },
          { ref: 'e1', role: 'button', name: '发送简历' },
          { ref: 'e2', role: 'button', name: '关闭' },
        ],
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: true, result: { clicked: true } }), { status: 200 });
  };

  try {
    const result = await pinchTabSendResumeFromActiveConversation({ pinchtab: { baseUrl: 'http://127.0.0.1:9867' } }, {
      tabId: 'tab-1',
    });

    assert.equal(result.ok, true);
    assert.match(fetchCalls[1].options.body, /"ref":"e1"/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('pinchTabApplyOnActiveTab clicks apply button, fills greeting, and confirms send', async () => {
  const fetchCalls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options = {}) => {
    fetchCalls.push({ url, options });
    if (String(url).includes('/snapshot')) {
      const snapshotIndex = fetchCalls.filter((entry) => String(entry.url).includes('/snapshot')).length;
      if (snapshotIndex === 1) {
        return new Response(JSON.stringify({
          count: 1,
          nodes: [
            { ref: 'e0', role: 'button', name: '立即沟通' },
          ],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        count: 2,
        nodes: [
          { ref: 'e1', role: 'textbox', name: '' },
          { ref: 'e2', role: 'button', name: '发送' },
        ],
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: true, result: { ok: true } }), { status: 200 });
  };

  try {
    const result = await pinchTabApplyOnActiveTab({ pinchtab: { baseUrl: 'http://127.0.0.1:9867' } }, {
      tabId: 'tab-1',
      options: {
        dryRun: false,
        greeting: '你好，我认真看过岗位描述，想继续沟通。',
        buttonTextCandidates: ['立即沟通'],
      },
    });

    assert.equal(result.ok, true);
    assert.match(fetchCalls[1].options.body, /"ref":"e0"/);
    assert.match(fetchCalls[3].options.body, /"kind":"fill"/);
    assert.match(fetchCalls[4].options.body, /"ref":"e2"/);
  } finally {
    global.fetch = originalFetch;
  }
});
