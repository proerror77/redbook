#!/usr/bin/env python3
"""
X/Twitter 热门趋势抓取工具
使用 agent-browser 抓取 X.com Explore 页面的热门话题
"""

import sys
from x_utils import (
    ensure_browser, navigate, get_snapshot, scroll_and_collect,
    extract_tweets, dedupe_tweets, save_report,
    print_colored, today_str, now_str, snapshot_has_x_unavailable_markers,
    PROJECT_ROOT,
)

def _normalize_snapshot_line(line: str) -> str:
    line = line.strip()
    line = line.removeprefix("- text:").strip()
    line = line.removeprefix("- link ").strip()
    line = line.removeprefix("- 'link ").strip()
    line = line.strip("'\"")
    line = line.replace('" [ref=', ' [ref=')
    line = line.split(" [ref=", 1)[0].strip()
    line = line.removesuffix('":').strip()
    line = line.removesuffix(':').strip()
    line = line.strip("'\"")
    return line


def extract_trends(snapshot: str) -> list:
    """
    从 Explore 页面 snapshot 中提取趋势话题

    Returns:
        趋势列表 [{name, category, tweet_count, description}]
    """
    trends = []
    if not snapshot:
        return trends

    import re

    lines = snapshot.split('\n')
    trends = []
    seen = set()

    for line in lines:
        line = _normalize_snapshot_line(line)
        if not line:
            continue

        # Current X Chinese explore structure examples:
        # "美国 的趋势 Hornets 趋势 Magic，LaMelo Ball 更多"
        # "娱乐 趋势 Darlene 更多"
        # "科技 趋势 Apple TV 更多"
        # "美国 的趋势 #SmackDown 趋势 Sami，Jordynne Grace 更多"
        zh_match = re.match(r'^(?P<category>.+?)\s+(?:的趋势|趋势)\s+(?P<topic>.+?)(?:\s+更多)?$', line)
        if zh_match:
            category = zh_match.group('category').strip()
            topic = zh_match.group('topic').strip()
            topic = re.sub(r'\s+趋势.*$', '', topic).strip()
            topic = topic.removesuffix('更多').strip()
            key = (category, topic)
            if topic and key not in seen:
                seen.add(key)
                trends.append({
                    'name': topic,
                    'category': category,
                    'description': line,
                })
            continue

        # Legacy English structure
        if line.startswith('#') and len(line) > 1:
            key = ('hashtag', line)
            if key not in seen:
                seen.add(key)
                trends.append({'name': line, 'category': 'hashtag'})
            continue

        en_match = re.match(r'^(?:Trending in |Trending )(?P<category>.+?)\s+(?P<topic>.+)$', line, re.IGNORECASE)
        if en_match:
            category = en_match.group('category').strip()
            topic = en_match.group('topic').strip()
            key = (category, topic)
            if topic and key not in seen:
                seen.add(key)
                trends.append({
                    'name': topic,
                    'category': category,
                    'description': line,
                })
            continue

        # Optional post counts appended on some layouts
        count_match = re.search(r'([\d,.]+[KkMm]?)\s*(?:posts?|推文)', line)
        if count_match and trends:
            trends[-1].setdefault('tweet_count', count_match.group(1))

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

    initial_snapshot = get_snapshot()
    if snapshot_has_x_unavailable_markers(initial_snapshot):
        print_colored("X 热门趋势页当前不可用（登录墙/不存在页），跳过趋势抓取", 'yellow')
        return [], {}

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
