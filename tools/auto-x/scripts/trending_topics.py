#!/usr/bin/env python3
"""
X/Twitter 热门趋势抓取工具
使用 agent-browser 抓取 X.com Explore 页面的热门话题
"""

import sys
from x_utils import (
    ensure_browser, navigate, get_snapshot, scroll_and_collect,
    extract_tweets, dedupe_tweets, save_report,
    print_colored, today_str, now_str,
    PROJECT_ROOT,
)


def extract_trends(snapshot: str) -> list:
    """
    从 Explore 页面 snapshot 中提取趋势话题

    Returns:
        趋势列表 [{name, category, tweet_count, description}]
    """
    trends = []
    if not snapshot:
        return trends

    lines = snapshot.split('\n')
    current_trend = {}

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # 趋势话题通常以 # 开头或包含 "Trending" 标记
        if line.startswith('#') and len(line) > 1:
            if current_trend.get('name'):
                trends.append(current_trend)
            current_trend = {'name': line}
            continue

        # 检测推文数量（如 "12.3K posts"）
        import re
        count_match = re.search(r'([\d,.]+[KkMm]?)\s*(?:posts?|推文)', line)
        if count_match and current_trend.get('name'):
            current_trend['tweet_count'] = count_match.group(1)
            continue

        # 检测分类（如 "Trending in Technology"）
        if 'trending' in line.lower():
            cat = line.replace('Trending in ', '').replace('Trending', '').strip()
            if cat:
                current_trend['category'] = cat
            elif not current_trend.get('name'):
                # 下一行可能是话题名
                pass
            continue

        # 收集描述文本
        if current_trend.get('name') and len(line) > 5:
            current_trend.setdefault('description', line)

    # 保存最后一个
    if current_trend.get('name'):
        trends.append(current_trend)

    return trends


def scrape_trending(top_n: int = 5) -> tuple:
    """
    抓取热门趋势并获取 Top N 话题的讨论

    Returns:
        (trends, topic_tweets) - 趋势列表和各话题的推文
    """
    print_colored("\n=== X/Twitter 热门趋势 ===", 'green')

    url = "https://x.com/explore/tabs/trending"
    print_colored(f"打开: {url}", 'yellow')
    navigate(url, wait=3.0)

    print_colored("收集趋势数据...", 'yellow')
    snapshots = scroll_and_collect(times=2, wait=2.0)

    all_trends = []
    for snap in snapshots:
        all_trends.extend(extract_trends(snap))

    # 去重（按 name）
    seen = set()
    unique_trends = []
    for t in all_trends:
        if t['name'] not in seen:
            seen.add(t['name'])
            unique_trends.append(t)

    print_colored(f"✓ 发现 {len(unique_trends)} 个趋势话题", 'green')

    # 对 Top N 趋势获取讨论推文
    topic_tweets = {}
    for trend in unique_trends[:top_n]:
        name = trend['name']
        print_colored(f"  获取话题讨论: {name}", 'cyan')
        from urllib.parse import quote_plus
        search_url = f"https://x.com/search?q={quote_plus(name)}&f=top"
        navigate(search_url, wait=2.5)
        snap = get_snapshot()
        tweets = extract_tweets(snap)
        topic_tweets[name] = tweets[:5]

    return unique_trends, topic_tweets


def generate_trending_report(trends: list, topic_tweets: dict) -> str:
    """生成热门趋势报告"""
    lines = [
        f"# X.com 每日热点 - {today_str()}",
        f"",
        f"- 抓取时间: {now_str()}",
        f"- 趋势话题数: {len(trends)}",
        f"",
        f"## 📈 趋势话题列表",
        f"",
    ]

    for i, t in enumerate(trends, 1):
        cat = t.get('category', '未分类')
        count = t.get('tweet_count', '?')
        desc = t.get('description', '')
        lines.append(f"### {i}. {t['name']}")
        lines.append(f"- 分类: {cat}")
        lines.append(f"- 讨论量: {count}")
        if desc:
            lines.append(f"- 描述: {desc}")
        lines.append("")

    return '\n'.join(lines) + '\n'


def main():
    top_n = int(sys.argv[1]) if len(sys.argv) > 1 else 5

    if not ensure_browser():
        sys.exit(1)

    trends, topic_tweets = scrape_trending(top_n)

    if not trends:
        print_colored("未抓取到趋势话题，请检查页面是否正常加载", 'red')
        sys.exit(1)

    report = generate_trending_report(trends, topic_tweets)
    path = str(PROJECT_ROOT / "05-选题研究" / f"X-每日热点-{today_str()}.md")
    save_report(report, path)
    print(report)


if __name__ == '__main__':
    main()
