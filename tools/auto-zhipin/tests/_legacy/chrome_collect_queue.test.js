const test = require('node:test');
const assert = require('node:assert/strict');

const {
  autoLoadMoreJobs,
  buildCollectOptions,
} = require('../scripts/chrome_collect_queue');

test('buildCollectOptions prefers CLI overrides and keeps scroll defaults', () => {
  const options = buildCollectOptions({
    jobs: {
      maxJobsPerRun: 60,
      scrollRounds: 8,
      scrollWaitMs: 1500,
      scrollStableRounds: 3,
    },
  }, {
    limit: '12',
    waitMs: '5000',
    scrolls: '4',
    scrollWaitMs: '900',
    scrollStableRounds: '2',
  });

  assert.deepEqual(options, {
    limit: 12,
    waitMs: 5000,
    scrollRounds: 4,
    scrollWaitMs: 900,
    scrollStableRounds: 2,
  });
});

test('autoLoadMoreJobs stops once anchor count plateaus', async () => {
  const feedStates = [
    { anchorCount: 10, scrollTop: 0, scrollHeight: 2000, viewportHeight: 800 },
    { anchorCount: 16, scrollTop: 1200, scrollHeight: 3200, viewportHeight: 800 },
    { anchorCount: 16, scrollTop: 2400, scrollHeight: 3200, viewportHeight: 800 },
    { anchorCount: 16, scrollTop: 2400, scrollHeight: 3200, viewportHeight: 800 },
  ];
  let inspectIndex = 0;
  let waitCalls = 0;
  const adapter = {
    async evaluate(script) {
      if (script.includes('anchorCount')) {
        const state = feedStates[Math.min(inspectIndex, feedStates.length - 1)];
        inspectIndex += 1;
        return JSON.stringify(state);
      }
      return JSON.stringify({ ok: true });
    },
    async waitMs() {
      waitCalls += 1;
    },
  };

  const result = await autoLoadMoreJobs(adapter, {
    scrollRounds: 6,
    scrollWaitMs: 1000,
    scrollStableRounds: 2,
  });

  assert.equal(result.initialAnchorCount, 10);
  assert.equal(result.finalAnchorCount, 16);
  assert.equal(result.roundsCompleted, 3);
  assert.equal(result.stoppedByPlateau, true);
  assert.equal(waitCalls, 3);
});
