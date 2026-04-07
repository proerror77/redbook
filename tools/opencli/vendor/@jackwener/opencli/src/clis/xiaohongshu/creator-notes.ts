/**
 * Xiaohongshu Creator Note List — per-note metrics from the creator backend.
 *
 * Navigates to the note manager page and extracts per-note data from
 * the rendered DOM. This approach bypasses the v2 API signature requirement.
 *
 * Returns: note title, publish date, views, likes, collects, comments.
 *
 * Requires: logged into creator.xiaohongshu.com in Chrome.
 */

import { cli, Strategy } from '../../registry.js';

cli({
  site: 'xiaohongshu',
  name: 'creator-notes',
  description: '小红书创作者笔记列表 + 每篇数据 (标题/日期/观看/点赞/收藏/评论)',
  domain: 'creator.xiaohongshu.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'limit', type: 'int', default: 20, help: 'Number of notes to return' },
  ],
  columns: ['rank', 'id', 'title', 'date', 'views', 'likes', 'collects', 'comments', 'url'],
  func: async (page, kwargs) => {
    const limit = kwargs.limit || 20;

    await page.goto('https://creator.xiaohongshu.com/new/note-manager');
    await page.wait(4);

    await page.autoScroll({ times: Math.ceil(limit / 10), delayMs: 1500 });

    const rawCards = await page.evaluate(`
      (() => Array.from(
        document.querySelectorAll('.note[data-impression], [class*="note-item"], [class*="noteItem"], [class*="card"]')
      ).map(card => {
        const linkEl = card.querySelector('a[href*="/publish/"], a[href*="/note/"], a[href*="/explore/"]');
        const metrics = Array.from(card.querySelectorAll('.icon_list span, [class*="icon_list"] span'))
          .map((el) => (el.textContent || '').trim())
          .filter(Boolean);
        return {
          text: card.innerText || '',
          href: linkEl?.href || linkEl?.getAttribute('href') || '',
          impression: card.getAttribute?.('data-impression') || '',
          className: card.className || '',
          titleText: card.querySelector('.title, [class*="title"]')?.textContent || '',
          dateText: card.querySelector('.time, [class*="time"]')?.textContent || '',
          metrics,
        };
      }))()
    `);

    let notes = Array.isArray(rawCards)
      ? rawCards
          .map((card: any) => {
            const text = String(card?.text || '');
            const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
            if (lines.length < 2) return null;

            const title = String(card?.titleText || lines[0]).trim();
            const dateLine = String(card?.dateText || lines.find((line) => line.includes('发布于')) || '');
            const dateMatch = dateLine.match(/发布于\s+(\d{4}年\d{2}月\d{2}日\s+\d{2}:\d{2})/);
            const metrics = Array.isArray(card?.metrics)
              ? card.metrics.map((value: string) => parseInt(String(value).replace(/[^\d]/g, ''), 10) || 0)
              : [];

            if (!title || title.includes('全部笔记')) return null;

            const href = String(card?.href || '');
            const idMatch = href.match(/\/(?:publish|explore|note)\/([a-zA-Z0-9]+)/);
            let noteId = idMatch ? idMatch[1] : '';
            const impression = String(card?.impression || '');
            if (!noteId && impression) {
              try {
                const parsed = JSON.parse(impression);
                noteId = String(parsed?.noteTarget?.value?.noteId || '');
              } catch {
                noteId = '';
              }
            }
            const url = noteId
              ? `https://www.xiaohongshu.com/explore/${noteId}`
              : (href ? new URL(href, 'https://creator.xiaohongshu.com').toString() : '');

            return {
              id: noteId,
              title: title.replace(/\s+/g, ' ').substring(0, 80),
              date: dateMatch ? dateMatch[1] : '',
              views: metrics[0] || 0,
              likes: metrics[1] || 0,
              collects: metrics[2] || 0,
              comments: metrics[3] || 0,
              url,
            };
          })
          .filter(Boolean)
      : [];

    if (notes.length === 0) {
      const allText = await page.evaluate('document.body.innerText');
      const notePattern = /(.+?)\s+发布于\s+(\d{4}年\d{2}月\d{2}日\s+\d{2}:\d{2})\s*(\d+)\s*(\d+)\s*(\d+)\s*(\d+)/g;
      notes = [];
      let match: RegExpExecArray | null;
      while ((match = notePattern.exec(String(allText || ''))) !== null) {
        notes.push({
          id: '',
          title: match[1].trim(),
          date: match[2],
          views: parseInt(match[3]) || 0,
          likes: parseInt(match[4]) || 0,
          collects: parseInt(match[5]) || 0,
          comments: parseInt(match[6]) || 0,
          url: '',
        });
      }
    }

    if (!Array.isArray(notes) || notes.length === 0) {
      throw new Error('No notes found. Are you logged into creator.xiaohongshu.com?');
    }

    return notes
      .slice(0, limit)
      .map((n: any, i: number) => ({
        rank: i + 1,
        id: n.id,
        title: n.title,
        date: n.date,
        views: n.views,
        likes: n.likes,
        collects: n.collects,
        comments: n.comments,
        url: n.url,
      }));
  },
});
