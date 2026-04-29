const test = require('node:test');
const assert = require('node:assert/strict');

const {
  scoreCandidatePage,
  selectBossPage,
} = require('../scripts/opencli_apply_current_tab');

function fakePage({ url, title = '', hasFocus = false, visibilityState = 'hidden' }) {
  return {
    url() {
      return url;
    },
    async evaluate() {
      return { title, hasFocus, visibilityState };
    },
  };
}

function fakeBrowser(pages) {
  return {
    contexts() {
      return [{ pages: () => pages }];
    },
  };
}

test('scoreCandidatePage excludes verify pages from normal apply candidates', () => {
  const score = scoreCandidatePage({
    isBoss: true,
    isVerify: true,
    url: 'https://www.zhipin.com/web/user/safe/verify.html',
    title: 'BOSS 安全验证',
    hasFocus: true,
    visibilityState: 'visible',
    index: 0,
  });

  assert.equal(score, Number.NEGATIVE_INFINITY);
});

test('selectBossPage returns active verify page instead of silently choosing another BOSS tab', async () => {
  const verifyPage = fakePage({
    url: 'https://www.zhipin.com/web/user/safe/verify.html',
    title: 'BOSS 安全验证',
    hasFocus: true,
    visibilityState: 'visible',
  });
  const jobPage = fakePage({
    url: 'https://www.zhipin.com/job_detail/ok.html',
    title: 'AI Agent 工程师',
    hasFocus: false,
    visibilityState: 'hidden',
  });

  const selected = await selectBossPage(fakeBrowser([jobPage, verifyPage]));

  assert.equal(selected.page, verifyPage);
  assert.equal(selected.isVerify, true);
  assert.equal(selected.score, Number.POSITIVE_INFINITY);
});

