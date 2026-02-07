#!/usr/bin/env python3
"""
X/Twitter 内容搜索和分析工具
使用 agent-browser 搜索热门话题，自动提取推文数据并生成分析报告
"""

import sys
from collections import Counter
from urllib.parse import quote_plus
from x_utils import (
    ensure_browser, navigate, scroll_and_collect,
    extract_tweets, dedupe_tweets, save_report,
    print_colored, today_str, now_str,
    PROJECT_ROOT, DAILY_DIR,
)


# 痛点关键词（复用 reddit_hack 的思路）
PAIN_KEYWORDS = [
    'wish', 'need', 'want', 'problem', 'issue', 'frustrating',
    'annoying', 'difficult', 'hard', 'impossible', 'missing',
    'lacking', 'should have', 'would be nice', 'hate',
    'struggling', 'broken', 'terrible', 'worst', 'painful',
    '希望', '需要', '想要', '问题', '困难', '烦人', '缺少',
]


def search_x_topic(query: str, scroll_times: int = 3) -> list:
    """
    搜索 X.com 话题并提取推文数据

    Args:
        query: 搜索关键词
        scroll_times: 滚动次数

    Returns:
        推文列表（按互动量排序）
    """
    print_colored(f"\n=== X/Twitter 话题搜索 ===", 'green')
    print_colored(f"搜索关键词: {query}", 'yellow')

    search_url = f"https://x.com/search?q={quote_plus(query)}&src=typed_query&f=top"
    print_colored(f"打开: {search_url}", 'yellow')
    navigate(search_url, wait=3.0)

    # 滚动收集
    print_colored(f"滚动收集数据（{scroll_times} 次）...", 'yellow')
    snapshots = scroll_and_collect(times=scroll_times, wait=2.0)

    # 提取推文
    all_tweets = []
    for snap in snapshots:
        tweets = extract_tweets(snap)
        all_tweets.extend(tweets)

    # 去重并排序
    unique = dedupe_tweets(all_tweets)
    unique.sort(key=lambda t: t.get('likes', 0), reverse=True)

    print_colored(f"✓ 共提取 {len(unique)} 条推文", 'green')
    return unique


def find_pain_points(tweets: list) -> list:
    """从推文中识别包含痛点关键词的内容"""
    results = []
    for t in tweets:
        content_lower = t.get('content', '').lower()
        matched = [kw for kw in PAIN_KEYWORDS if kw in content_lower]
        if matched:
            results.append({**t, 'pain_keywords': matched})
    return results


def generate_search_report(query: str, tweets: list, pain_points: list) -> str:
    """生成搜索分析报告"""
    lines = [
        f"# X.com 搜索分析: {query}",
        f"",
        f"- 搜索时间: {now_str()}",
        f"- 提取推文数: {len(tweets)}",
        f"- 痛点推文数: {len(pain_points)}",
        f"",
    ]

    # 热门推文 Top 10
    lines.append("## 🔥 热门推文 Top 10")
    lines.append("")
    top = tweets[:10]
    for i, t in enumerate(top, 1):
        content = t.get('content', '')[:150]
        lines.append(f"### {i}. @{t.get('handle', '?')} (❤️ {t.get('likes', 0)} | 🔁 {t.get('retweets', 0)})")
        lines.append(f"> {content}")
        lines.append("")

    # 痛点分析
    if pain_points:
        lines.append("## 💡 用户痛点")
        lines.append("")
        for i, p in enumerate(pain_points[:10], 1):
            kws = ', '.join(p.get('pain_keywords', []))
            content = p.get('content', '')[:120]
            lines.append(f"{i}. **@{p.get('handle', '?')}** (关键词: {kws})")
            lines.append(f"   > {content}")
            lines.append("")

    return '\n'.join(lines) + '\n'


def main():
    if len(sys.argv) < 2:
        print_colored("用法: python search_x.py <搜索关键词> [输出文件]", 'red')
        print("\n示例:")
        print("  python search_x.py 'AI tools'")
        print("  python search_x.py 'productivity' output.md")
        sys.exit(1)

    query = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None

    if not ensure_browser():
        sys.exit(1)

    tweets = search_x_topic(query)

    if not tweets:
        print_colored("未提取到推文数据，请检查页面是否正常加载", 'red')
        sys.exit(1)

    pain_points = find_pain_points(tweets)
    report = generate_search_report(query, tweets, pain_points)

    # 确定输出路径
    if output_file:
        path = output_file
    else:
        path = str(PROJECT_ROOT / "05-选题研究" / f"X-搜索-{query[:20]}-{today_str()}.md")

    save_report(report, path)
    print(report)


if __name__ == '__main__':
    main()
