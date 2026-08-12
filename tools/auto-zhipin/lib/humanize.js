'use strict';

// 拟人化点击模块。移植自 mrcxsy/boss-auto-apply (Apache-2.0)
// src/modules/anti-detection.js 的 Fitts' Law 贝塞尔轨迹与事件链思想，
// 精简为可测试的纯函数。

/**
 * Fitts' Law duration estimate.
 * @param {number} distance  — pixel distance to target
 * @param {number} targetWidth — width of target element
 * @returns {number} duration in ms
 */
function fittsDuration(distance, targetWidth) {
  const a = 80;  // ms base
  const b = 120; // ms/bit
  return a + b * Math.log2(distance / targetWidth + 1);
}

/**
 * Cubic Bézier path with guaranteed monotonicity in both x and y.
 *
 * Control points are placed strictly between from and to along each axis.
 * c1 sits in the first third of the segment, c2 in the second third, with
 * small bounded random jitter that cannot cross the c1≤c2 ordering.
 *
 * @param {{x:number,y:number}} from
 * @param {{x:number,y:number}} to
 * @param {number} steps
 * @returns {Array<{x:number,y:number}>}
 */
function bezierPath(from, to, steps) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  // Place control points at 1/3 and 2/3 of the segment, with a small jitter
  // that is clamped within a safe inner band so monotonicity is guaranteed.
  // Jitter range: ±8% of the segment length, capped to stay within the band.
  // jitterFrac must stay < 1/6 to prevent c1/c2 ordering inversion.
  const jitterFrac = 0.08;
  const jx = dx * jitterFrac * (Math.random() - 0.5) * 2;
  const jy = dy * jitterFrac * (Math.random() - 0.5) * 2;

  const c1 = {
    x: from.x + dx * (1 / 3) + jx,
    y: from.y + dy * (1 / 3) + jy,
  };
  const c2 = {
    x: from.x + dx * (2 / 3) - jx,
    y: from.y + dy * (2 / 3) - jy,
  };

  const path = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const mt = 1 - t;
    const x = mt * mt * mt * from.x
      + 3 * mt * mt * t * c1.x
      + 3 * mt * t * t * c2.x
      + t * t * t * to.x;
    const y = mt * mt * mt * from.y
      + 3 * mt * mt * t * c1.y
      + 3 * mt * t * t * c2.y
      + t * t * t * to.y;
    path.push({ x: Math.round(x), y: Math.round(y) });
  }

  // Hard-clamp to guarantee strict monotonicity despite floating-point rounding.
  // Each step's coordinate is clamped to be >= the previous step's coordinate
  // (when travelling in the positive direction) or <= (negative direction).
  const signX = dx >= 0 ? 1 : -1;
  const signY = dy >= 0 ? 1 : -1;
  for (let i = 1; i < path.length; i++) {
    if (signX >= 0 && path[i].x < path[i - 1].x) path[i].x = path[i - 1].x;
    if (signX < 0  && path[i].x > path[i - 1].x) path[i].x = path[i - 1].x;
    if (signY >= 0 && path[i].y < path[i - 1].y) path[i].y = path[i - 1].y;
    if (signY < 0  && path[i].y > path[i - 1].y) path[i].y = path[i - 1].y;
  }

  // Ensure the final point is exactly `to` (clamping may have shifted it).
  path[path.length - 1] = { x: to.x, y: to.y };
  return path;
}

/**
 * Build the full pointer→mouse→click event chain for a target element.
 * @param {EventTarget} target
 * @returns {Array<{type:string, init:object, target:EventTarget}>}
 */
function buildClickEvents(target) {
  const make = (type, extra = {}) => {
    const init = {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: 1,
      isPrimary: true,
      pointerType: 'mouse',
      pressure: type === 'pointerup' ? 0 : 0.5,
      clientX: 0,
      clientY: 0,
      ...extra,
    };
    return { type, init, target };
  };
  return [
    make('pointerdown', { pressure: 0.5 }),
    make('mousedown', { button: 0 }),
    make('pointerup', { pressure: 0 }),
    make('mouseup', { button: 0 }),
    make('click', { button: 0 }),
  ];
}

/** Module-level monotonic timestamp counter. */
let _lastTs = 0;

/**
 * Return a timestamp strictly greater than prevTs (and any previously returned value).
 * @param {number} prevTs
 * @returns {number}
 */
function monotonicTimestamp(prevTs) {
  const base = Math.max(prevTs || 0, _lastTs);
  const next = base + 0.1 + Math.random() * 0.5;
  _lastTs = next;
  return next;
}

/**
 * Execute a full humanized click on target:
 *   1. Bézier mouse-move trajectory
 *   2. Pointer/mouse/click event chain with monotonic timestamps
 *   3. Random inter-event delays
 *
 * @param {HTMLElement} target
 * @param {{ random?: Function, now?: Function, dispatchMove?: Function }} opts
 * @returns {Promise<void>}
 */
async function humanizedClick(target, opts = {}) {
  const random = opts.random || Math.random;
  const rect = target.getBoundingClientRect?.();
  const to = {
    x: rect ? Math.round(rect.left + rect.width / 2) : 0,
    y: rect ? Math.round(rect.top + rect.height / 2) : 0,
  };
  const from = { x: Math.round(random() * 400), y: Math.round(random() * 300) };
  const path = bezierPath(from, to, 12);
  const duration = fittsDuration(
    Math.hypot(to.x - from.x, to.y - from.y),
    rect ? rect.width : 50
  );
  const stepDelay = duration / path.length;

  for (const point of path) {
    if (opts.dispatchMove) {
      opts.dispatchMove(point);
    }
    await new Promise((r) => setTimeout(r, stepDelay));
  }

  const events = buildClickEvents(target);
  // Pick the most specific event constructor available (browser has PointerEvent/MouseEvent;
  // Node test environment has only Event — fall back gracefully).
  const eventCtorFor = (type) => {
    if (type === 'pointerdown' || type === 'pointerup') {
      return (typeof PointerEvent !== 'undefined') ? PointerEvent : Event;
    }
    if (type === 'mousedown' || type === 'mouseup' || type === 'click') {
      return (typeof MouseEvent !== 'undefined') ? MouseEvent : Event;
    }
    return Event;
  };

  // Thread the timestamp explicitly through the loop so monotonicity is
  // independent of module-level _lastTs state.
  let ts = monotonicTimestamp(0);
  for (const ev of events) {
    const event = new (eventCtorFor(ev.type))(ev.type, ev.init);
    Object.defineProperty(event, 'timeStamp', { value: ts, configurable: true });
    target.dispatchEvent(event);
    await new Promise((r) => setTimeout(r, 30 + random() * 50));
    ts = monotonicTimestamp(ts);
  }
}

module.exports = {
  fittsDuration,
  bezierPath,
  buildClickEvents,
  monotonicTimestamp,
  humanizedClick,
};
