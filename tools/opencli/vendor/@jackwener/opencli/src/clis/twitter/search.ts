import { cli, Strategy } from '../../registry.js';

cli({
  site: 'twitter',
  name: 'search',
  description: 'Search Twitter/X for tweets',
  domain: 'x.com',
  strategy: Strategy.INTERCEPT,
  browser: true,
  args: [
    { name: 'query', type: 'string', required: true },
    { name: 'limit', type: 'int', default: 15 },
  ],
  columns: ['id', 'author', 'text', 'likes', 'views', 'url'],
  func: async (page, kwargs) => {
    const query = kwargs.query;
    const encodedQuery = encodeURIComponent(query);
    await page.goto(`https://x.com/search?q=${encodedQuery}&src=typed_query&f=top`);
    await page.wait(5);
    await page.autoScroll({ times: 2, delayMs: 2000 });

    const results = await page.evaluate(`
      (() => {
        const articles = Array.from(document.querySelectorAll('article'));
        return articles.map((article) => {
          const userText = article.querySelector('[data-testid="User-Name"]')?.innerText || '';
          const authorMatch = userText.match(/@([A-Za-z0-9_]+)/);
          const tweetText = Array.from(article.querySelectorAll('[data-testid="tweetText"]'))
            .map((el) => el.innerText)
            .join('\\n')
            .trim();
          const statusHref = Array.from(article.querySelectorAll('a[href*="/status/"]'))
            .map((a) => a.getAttribute('href') || '')
            .find((href) => /\\/status\\/\\d+$/.test(href));
          const idMatch = statusHref?.match(/\\/status\\/(\\d+)$/);

          return {
            id: idMatch ? idMatch[1] : '',
            author: authorMatch ? authorMatch[1] : 'unknown',
            text: tweetText,
            likes: article.querySelector('[data-testid="like"]')?.innerText || '0',
            views: article.querySelector('[data-testid="analytics"]')?.innerText || '0',
            url: statusHref ? new URL(statusHref, window.location.origin).toString() : '',
          };
        });
      })()
    `);

    if (!Array.isArray(results)) return [];
    return results
      .filter((item: any) => item.id && item.text)
      .slice(0, kwargs.limit);
  }
});
