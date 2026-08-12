// tests/humanize.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  fittsDuration,
  bezierPath,
  buildClickEvents,
  monotonicTimestamp,
} = require('../lib/humanize.js');

test('fittsDuration follows Fitts Law and scales with distance', () => {
  const near = fittsDuration(100, 50);
  const far = fittsDuration(800, 50);
  assert.ok(far > near, 'longer distance should take longer');
  assert.ok(near > 0 && near < 2000);
});

test('bezierPath returns smooth interpolated points between endpoints', () => {
  const path = bezierPath({ x: 0, y: 0 }, { x: 100, y: 100 }, 10);
  assert.equal(path.length, 10);
  assert.deepEqual(path[0], { x: 0, y: 0 });
  assert.deepEqual(path[path.length - 1], { x: 100, y: 100 });
  // monotonic in both axes
  for (let i = 1; i < path.length; i++) {
    assert.ok(path[i].x >= path[i - 1].x);
    assert.ok(path[i].y >= path[i - 1].y);
  }
});

test('buildClickEvents returns full pointer+mouse+click chain', () => {
  const target = { dispatchEvent: () => {} };
  const events = buildClickEvents(target);
  const types = events.map((e) => e.type);
  assert.deepEqual(types, ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']);
  assert.ok(events[0].init.pointerId === 1);
});

test('monotonicTimestamp never returns same or lower value', () => {
  const ts = monotonicTimestamp(100);
  assert.ok(ts > 100);
  assert.ok(monotonicTimestamp(ts) > ts);
});
