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

test('humanizedClick dispatches 5 events in order with strictly increasing timeStamps', async () => {
  const { humanizedClick } = require('../lib/humanize.js');

  const dispatched = [];
  const target = {
    getBoundingClientRect: () => ({ left: 200, top: 200, width: 80, height: 40 }),
    dispatchEvent: (evt) => dispatched.push(evt),
  };

  // Inject deterministic random so test is stable.
  await humanizedClick(target, { random: () => 0.5 });

  // (a) 5 events dispatched in exact order
  const types = dispatched.map((e) => e.type);
  assert.deepEqual(types, ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']);

  // (b) timeStamp strictly increases across the sequence
  const timestamps = dispatched.map((e) => e.timeStamp);
  for (let i = 1; i < timestamps.length; i++) {
    assert.ok(
      timestamps[i] > timestamps[i - 1],
      `timeStamp[${i}]=${timestamps[i]} must be > timeStamp[${i - 1}]=${timestamps[i - 1]}`
    );
  }

  // (c) Event objects are constructed without crash in Node (fallback to base Event).
  //     Verify they are Event instances and that the buildClickEvents init fields
  //     survive on the descriptor objects returned by buildClickEvents.
  for (const evt of dispatched) {
    assert.ok(evt instanceof Event, 'dispatched item must be an Event instance');
  }
  const { buildClickEvents } = require('../lib/humanize.js');
  const chain = buildClickEvents(target);
  assert.ok(chain[0].init.pointerId === 1, 'init fields survive on descriptor objects');
  assert.ok(chain[2].init.pressure === 0, 'pointerup pressure is 0 in descriptor');
});
