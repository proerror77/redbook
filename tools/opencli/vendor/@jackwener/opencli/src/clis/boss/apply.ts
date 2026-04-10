import { createRequire } from 'node:module';
import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';
import { createBrowserAdapter, formatActionRow, sleepMs } from './_helpers.js';

const require = createRequire(import.meta.url);
const jobBrowser = require('../../shared/boss/job-browser.cjs');

cli({
  site: 'boss',
  name: 'apply',
  description: 'BOSS直聘在当前职位详情页执行投递/立即沟通',
  domain: 'www.zhipin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'url', required: true, help: 'Job detail URL from boss search results' },
    { name: 'greeting', help: 'Optional greeting to send after clicking apply' },
    { name: 'dry_run', type: 'bool', default: false, help: 'Click the primary apply button only, without confirming' },
  ],
  columns: ['ok', 'action', 'status', 'reason', 'mode', 'button', 'confirm', 'url'],
  func: async (page: IPage | null, kwargs) => {
    if (!page) {
      throw new Error('Browser page required');
    }
    await page.goto(kwargs.url);
    await sleepMs(1200);
    const adapter = createBrowserAdapter(page);
    const initialMeta = await jobBrowser.extractJobDetailMeta(adapter);
    if (!String(initialMeta.url || '').includes('/job_detail/')) {
      const selectResult = await jobBrowser.selectJobCard(adapter, kwargs.url);
      if (!selectResult.ok) {
        return [formatActionRow({
          ...selectResult,
          action: 'apply',
          status: selectResult.reason === 'job_card_not_found' ? 'not_found' : 'failed',
          reason: selectResult.reason || 'job_card_select_failed',
        }, {
          button: '',
          confirm: '',
          url: kwargs.url,
        })];
      }
      await sleepMs(1200);
    }
    const result = await jobBrowser.applyOnActiveJobDetail(adapter, {
      greeting: kwargs.greeting || '',
      dryRun: Boolean(kwargs.dry_run),
    });
    return [formatActionRow(result, {
      button: result.button || '',
      confirm: result.confirm || '',
      url: result.url || kwargs.url,
    })];
  },
});
