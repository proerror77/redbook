const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildHistoryPullUrl,
  extractHistoryContextLines,
  extractReadableStringsFromBase64Chunk,
  findLatestHistoryPullUrl,
  parseHistoryPayload,
  parseHistoryPullUrl,
} = require('../lib/chat_history');

test('parseHistoryPullUrl reads secretId, type, and lastId from a history url', () => {
  const result = parseHistoryPullUrl(
    'https://www.zhipin.com/wapi/zpmsg/history/pull?type=0&lastId=999999999999999&secretId=test-secret'
  );

  assert.deepEqual(result, {
    url: 'https://www.zhipin.com/wapi/zpmsg/history/pull?type=0&lastId=999999999999999&secretId=test-secret',
    type: 0,
    lastId: '999999999999999',
    secretId: 'test-secret',
  });
});

test('buildHistoryPullUrl writes a lastId=0 history url for the given secretId', () => {
  const result = buildHistoryPullUrl({
    secretId: 'abc+/=',
    lastId: 0,
    type: 0,
  });

  assert.equal(
    result,
    'https://www.zhipin.com/wapi/zpmsg/history/pull?type=0&lastId=0&secretId=abc%2B%2F%3D'
  );
});

test('findLatestHistoryPullUrl returns the last matching history url in resource entries', () => {
  const result = findLatestHistoryPullUrl([
    'https://www.zhipin.com/wapi/zpmsg/history/pull?type=0&lastId=0&secretId=first',
    'https://www.zhipin.com/wapi/zpmsg/other',
    'https://www.zhipin.com/wapi/zpmsg/history/pull?type=0&lastId=42&secretId=second',
  ]);

  assert.equal(
    result,
    'https://www.zhipin.com/wapi/zpmsg/history/pull?type=0&lastId=42&secretId=second'
  );
});

test('extractReadableStringsFromBase64Chunk recovers utf8 fragments from encoded payloads', () => {
  const chunk = Buffer.concat([
    Buffer.from([0, 1, 2, 3]),
    Buffer.from('可以聊一下岗位细节', 'utf8'),
    Buffer.from([0, 4, 5, 6]),
    Buffer.from('https://example.com/job', 'utf8'),
    Buffer.from([0, 7, 8]),
    Buffer.from('麻烦发我一版简历', 'utf8'),
  ]).toString('base64');

  const result = extractReadableStringsFromBase64Chunk(chunk);

  assert.ok(result.some((item) => item.includes('可以聊一下岗位细节')));
  assert.ok(result.some((item) => item.includes('麻烦发我一版简历')));
});

test('extractHistoryContextLines keeps message-like lines and drops metadata noise', () => {
  const result = extractHistoryContextLines([
    'securityId',
    'jobview',
    'https://www.zhipin.com/job_detail/123.html',
    'AI Agent应用开发工程师',
    '可以，方便的话发我一版简历',
    '我这边主要做 AI Agent / RAG / workflow 落地',
    '100-180K',
    'bossId',
    '由你发起的沟通',
    '方便的话可以直接聊一下项目经历',
  ], { limit: 4 });

  assert.deepEqual(result, [
    '可以，方便的话发我一版简历',
    '我这边主要做 AI Agent / RAG / workflow 落地',
    '方便的话可以直接聊一下项目经历',
  ]);
});

test('parseHistoryPayload returns compact context lines from zpData.stringList', () => {
  const chunk = Buffer.concat([
    Buffer.from([0, 1, 2]),
    Buffer.from('可以发我一版简历吗', 'utf8'),
    Buffer.from([0, 3]),
    Buffer.from('我这边主要做 AI Agent 落地', 'utf8'),
  ]).toString('base64');

  const result = parseHistoryPayload({
    zpData: {
      secretId: 'secret-1',
      lastId: 123,
      hasMore: true,
      stringList: [chunk],
    },
  }, { limit: 3 });

  assert.equal(result.secretId, 'secret-1');
  assert.equal(result.lastId, 123);
  assert.equal(result.hasMore, true);
  assert.deepEqual(result.contextLines, [
    '可以发我一版简历吗',
    '我这边主要做 AI Agent 落地',
  ]);
});
