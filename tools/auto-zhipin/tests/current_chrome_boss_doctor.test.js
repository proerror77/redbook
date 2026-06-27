const test = require('node:test');
const assert = require('node:assert/strict');

const { assessCdpPorts } = require('../scripts/current_chrome_boss_doctor');

test('doctor does not allow existing-page CDP scripts for an empty endpoint', () => {
  const assessment = assessCdpPorts([
    { port: 9225, available: true, pages: 0, bossPages: [] },
  ]);

  assert.equal(assessment.hasEndpoint, true);
  assert.equal(assessment.hasInspectablePage, false);
  assert.equal(assessment.hasBossPage, false);
  assert.equal(assessment.okToUseCdpScripts, false);
  assert.match(assessment.diagnosis, /no inspectable pages/i);
});

test('doctor only allows existing-page CDP scripts when a BOSS page is visible', () => {
  const assessment = assessCdpPorts([
    { port: 9224, available: true, pages: 2, bossPages: [{ url: 'https://www.zhipin.com/web/geek/jobs' }] },
  ]);

  assert.equal(assessment.hasEndpoint, true);
  assert.equal(assessment.hasInspectablePage, true);
  assert.equal(assessment.hasBossPage, true);
  assert.deepEqual(assessment.usableBossPorts, [9224]);
  assert.equal(assessment.okToUseCdpScripts, true);
});
