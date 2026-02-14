#!/usr/bin/env python3
"""
X Pro (TweetDeck) 多列抓取工具
抓取 X Pro Deck 中的所有列，识别热门话题
"""

import argparse
import re
from datetime import datetime
from pathlib import Path
from collections import Counter

from x_utils import (
    ensure_browser,
    navigate,
    run_ab,
    extract_tweets,
    save_report,
    print_colored,
    PROJECT_ROOT,
)


def identify_columns(snapshot: str) -> list:
    """
    识别 X Pro Deck 中的所有列

    Args:
        snapshot: X Pro 页面的 snapshot 文本

    Returns:
        列名列表 [{"name": "主页", "type": "timeline"}, ...]
    """
    columns = []
    lines = snapshot.split('\n')

    for i, line in enumerate(lines):
        # 匹配列标题：heading "列 - {列名}"
        match = re.search(r'heading "列 - (.+?)"', line)
        if match:
            column_name = match.group(1)

            # 确定列类型（向下查找几行）
            column_type = "timeline"  # 默认
            for j in range(i+1, min(i+20, len(lines))):
                next_line = lines[j]
                if 'heading "列表"' in next_line:
                    column_type = "list"
                    break
                elif 'heading "个人资料"' in next_line:
                    column_type = "profile"
                    break
                elif 'heading "搜索"' in next_line:
                    column_type = "search"
                    break

            columns.append({
                "name": column_name,
                "type": column_type,
            })
            print_colored(f"  发现列：{column_name}（{column_type}）", 'cyan')

    return columns


def scroll_column(column_name: str, times: int = 10, wait: float = 2.5) -> list:
    """
    滚动指定列并收集 snapshots

    注意：X Pro 的滚动需要先聚焦到列，然后滚动
    由于 actionbook 无法精确聚焦特定列，这个版本只滚动整个页面

    Args:
        column_name: 列名（暂时未使用，未来可以改进）
        times: 滚动次数
        wait: 每次滚动后等待时间

    Returns:
        snapshots 列表
    """
    import time

    snapshots = []
    for i in range(times):
        print_colored(f"  滚动 {i+1}/{times}...", 'yellow')

        # 滚动页面
        run_ab('eval "window.scrollBy(0, 800)"', timeout=5)
        time.sleep(wait)

        # 获取 snapshot
        snapshot = run_ab('snapshot', timeout=30)
        if snapshot:
            snapshots.append(snapshot)

    return snapshots


def extract_tweets_by_column(snapshot: str, column_name: str) -> list:
    """
    从 snapshot 中提取指定列的推文

    由于 X Pro 的多列布局，需要识别每列的边界
    当前简化版本：提取所有推文，并标记来源列（基于推文位置猜测）

    Args:
        snapshot: 完整的 snapshot 文本
        column_name: 列名

    Returns:
        推文列表，每条推文带有 'source_column' 字段
    """
    # 简化版本：先提取所有推文
    all_tweets = extract_tweets(snapshot)

    # 为每条推文添加来源列（暂时标记为 "未知"，未来改进）
    for tweet in all_tweets:
        tweet['source_column'] = "混合"  # 暂时无法精确区分列

    return all_tweets


def merge_and_deduplicate(all_tweets: list) -> list:
    """
    合并多个 snapshot 的推文并去重

    Args:
        all_tweets: 所有推文列表

    Returns:
        去重后的推文列表
    """
    seen = set()
    unique_tweets = []

    for tweet in all_tweets:
        handle = tweet.get('handle', '')
        content = tweet.get('content', '')[:50]
        key = f"{handle}:{content}"

        if key not in seen:
            seen.add(key)
            unique_tweets.append(tweet)

    return unique_tweets


def analyze_xpro_topics(tweets: list, columns: list) -> dict:
    """
    分析 X Pro 多列的热门话题

    Args:
        tweets: 推文列表
        columns: 列信息列表

    Returns:
        分析结果字典
    """
    # 1. 按来源列分组
    tweets_by_column = {}
    for col in columns:
        tweets_by_column[col['name']] = []
    tweets_by_column['混合'] = []

    for tweet in tweets:
        source = tweet.get('source_column', '混合')
        if source in tweets_by_column:
            tweets_by_column[source].append(tweet)
        else:
            tweets_by_column['混合'].append(tweet)

    # 2. 提取关键词（所有列）
    keywords = []
    for tweet in tweets:
        content = tweet.get('content', '')
        # 提取 hashtag
        hashtags = [w for w in content.split() if w.startswith('#')]
        keywords.extend(hashtags)

        # 提取常见关键词
        common_keywords = ['AI', 'agent', 'GPT', 'Claude', 'startup', 'crypto',
                          'Web3', 'SaaS', 'founder', 'product', 'code', 'dev',
                          'solopreneur', 'indie', 'builder', 'ship']
        for kw in common_keywords:
            if kw.lower() in content.lower():
                keywords.append(kw)

    keyword_counts = Counter(keywords)
    hot_keywords = keyword_counts.most_common(15)

    # 3. 识别话题（多人讨论）
    topics = []
    for keyword, count in hot_keywords:
        if count >= 3:
            authors = []
            related_tweets = []
            for tweet in tweets:
                content = tweet.get('content', '')
                if keyword.lower() in content.lower():
                    author = tweet.get('handle', 'unknown')
                    if author not in authors:
                        authors.append(author)
                        related_tweets.append(tweet)

            if len(authors) >= 2:
                topics.append({
                    'keyword': keyword,
                    'count': count,
                    'authors': authors,
                    'tweets': related_tweets[:3]
                })

    topics.sort(key=lambda t: len(t['authors']), reverse=True)

    # 4. 高互动推文
    hot_tweets = []
    for tweet in tweets:
        likes = tweet.get('likes', 0)
        retweets = tweet.get('retweets', 0)
        engagement = likes + retweets * 2

        if likes > 50 or retweets > 10 or engagement > 100:
            tweet['engagement'] = engagement
            hot_tweets.append(tweet)

    hot_tweets.sort(key=lambda t: t.get('engagement', 0), reverse=True)

    return {
        'tweets_by_column': tweets_by_column,
        'hot_keywords': hot_keywords,
        'topics': topics[:5],
        'hot_tweets': hot_tweets[:10],
    }


def generate_xpro_report(tweets: list, columns: list, analysis: dict, output_file: str = None) -> str:
    """
    生成 X Pro 多列分析报告

    Args:
        tweets: 所有推文列表
        columns: 列信息列表
        analysis: 分析结果
        output_file: 输出文件路径

    Returns:
        报告文本
    """
    today = datetime.now().strftime('%Y-%m-%d')

    lines = [
        f"# X Pro 多列分析 - {today}",
        "",
        f"## 📊 统计摘要",
        "",
        f"- **Deck 列数**：{len(columns)} 列",
        f"- **抓取推文数**：{len(tweets)} 条",
        f"- **高互动推文**：{len(analysis['hot_tweets'])} 条",
        f"- **识别话题**：{len(analysis['topics'])} 个",
        "",
        "---",
        "",
    ]

    # 列统计
    lines.extend([
        "## 📋 Deck 列配置",
        "",
    ])

    for i, col in enumerate(columns, 1):
        col_name = col['name']
        col_type = col['type']
        col_tweets = analysis['tweets_by_column'].get(col_name, [])

        lines.extend([
            f"### {i}. {col_name}（{col_type}）",
            "",
            f"- **推文数**：{len(col_tweets)} 条",
            "",
        ])

    lines.extend(["---", ""])

    # 热门话题
    if analysis['topics']:
        lines.extend([
            "## 🔥 跨列热门话题",
            "",
            "> 基于所有列的推文识别",
            "",
        ])

        for i, topic in enumerate(analysis['topics'], 1):
            keyword = topic['keyword']
            count = topic['count']
            authors = topic['authors']
            tweets_list = topic['tweets']

            lines.extend([
                f"### 话题 {i}: {keyword}",
                "",
                f"- **热度**：{len(authors)} 人讨论，提及 {count} 次",
                f"- **讨论者**：{', '.join(['@' + a for a in authors[:5]])}",
                "",
                "**代表推文**：",
                "",
            ])

            for tweet in tweets_list[:3]:
                author = tweet.get('author', 'Unknown')
                handle = tweet.get('handle', '')
                content = tweet.get('content', '')[:200]
                likes = tweet.get('likes', 0)
                retweets = tweet.get('retweets', 0)
                source = tweet.get('source_column', '未知')

                lines.extend([
                    f"- **@{handle}** ({author}) - 来源：{source}",
                    f"  > {content}...",
                    f"  > ❤️ {likes:,} | 🔁 {retweets:,}",
                    "",
                ])

            score = min(10, 5 + len(authors))
            recommendation = "✅ 推荐" if score >= 7 else "⚠️ 可选"
            lines.extend([
                f"**选题评分**：{recommendation}（{score}/10）",
                "",
                "---",
                "",
            ])

    # 高互动推文
    if analysis['hot_tweets']:
        lines.extend([
            "## ⭐ 高互动推文",
            "",
            "> 跨所有列的高互动推文",
            "",
        ])

        for i, tweet in enumerate(analysis['hot_tweets'][:5], 1):
            author = tweet.get('author', 'Unknown')
            handle = tweet.get('handle', '')
            content = tweet.get('content', '')[:300]
            likes = tweet.get('likes', 0)
            retweets = tweet.get('retweets', 0)
            engagement = tweet.get('engagement', 0)
            source = tweet.get('source_column', '未知')

            lines.extend([
                f"### {i}. @{handle} ({author}) - 来源：{source}",
                "",
                f"> {content}",
                "",
                f"**互动数据**：❤️ {likes:,} | 🔁 {retweets:,} | 总互动 {engagement:,}",
                "",
                "---",
                "",
            ])

    # 高频关键词
    if analysis['hot_keywords']:
        lines.extend([
            "## 🏷 高频关键词",
            "",
        ])

        for keyword, count in analysis['hot_keywords'][:15]:
            lines.append(f"- `{keyword}` ({count} 次)")

        lines.extend(["", "---", ""])

    # 选题建议
    lines.extend([
        "## 📋 选题建议",
        "",
    ])

    if analysis['topics']:
        lines.append("**推荐选题**（基于跨列热点）：")
        lines.append("")
        for i, topic in enumerate(analysis['topics'][:3], 1):
            keyword = topic['keyword']
            authors_count = len(topic['authors'])
            score = min(10, 5 + authors_count)
            lines.append(f"{i}. **{keyword}**（评分 {score}/10）")
            lines.append(f"   - 热度：{authors_count} 人讨论")
            lines.append(f"   - 推荐理由：多列中均有讨论，覆盖面广")
            lines.append("")
    else:
        lines.extend([
            "今日未识别到明显的跨列话题。",
            "",
            "建议：查看各列的高互动推文，寻找单独热点。",
            "",
        ])

    lines.extend([
        "---",
        "",
        f"*报告生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*",
    ])

    report_text = '\n'.join(lines)

    if output_file:
        save_report(report_text, output_file)

    return report_text


def main():
    parser = argparse.ArgumentParser(description='抓取 X Pro Deck 多列并分析')
    parser.add_argument('--deck-url', type=str,
                       default='https://pro.x.com/i/decks/2022466575597736041',
                       help='X Pro Deck URL')
    parser.add_argument('--scrolls', type=int, default=30,
                       help='滚动次数（默认 30 次）')
    parser.add_argument('--output', type=str,
                       help='输出文件路径（默认：05-选题研究/X-Pro-{日期}.md）')

    args = parser.parse_args()

    print_colored("\n============================================================", 'green')
    print_colored("  📊 X Pro 多列分析", 'green')
    print_colored("============================================================", 'green')

    # 1. 检查浏览器连接
    if not ensure_browser():
        return

    # 2. 打开 X Pro Deck
    print_colored(f"\n打开 X Pro Deck...", 'yellow')
    navigate(args.deck_url, wait=3.0)

    # 3. 识别列
    print_colored("\n识别 Deck 列配置...", 'yellow')
    initial_snapshot = run_ab('snapshot', timeout=30)
    columns = identify_columns(initial_snapshot)

    if not columns:
        print_colored("未识别到任何列！", 'red')
        return

    print_colored(f"✓ 发现 {len(columns)} 列", 'green')

    # 4. 滚动并收集推文（当前版本：滚动整个页面，未来可改进为单独滚动每列）
    print_colored(f"\n滚动收集数据（{args.scrolls} 次）...", 'yellow')
    snapshots = scroll_column("all", times=args.scrolls, wait=2.5)

    # 5. 解析推文
    print_colored("\n解析推文数据...", 'yellow')
    all_tweets = []
    for snapshot in snapshots:
        tweets = extract_tweets(snapshot)
        all_tweets.extend(tweets)

    # 去重
    unique_tweets = merge_and_deduplicate(all_tweets)
    print_colored(f"✓ 共提取 {len(unique_tweets)} 条推文", 'green')

    # 6. 分析话题
    print_colored("\n分析跨列热门话题...", 'yellow')
    analysis = analyze_xpro_topics(unique_tweets, columns)

    print_colored(f"✓ 识别 {len(analysis['topics'])} 个热门话题", 'green')
    print_colored(f"✓ 发现 {len(analysis['hot_tweets'])} 条高互动推文", 'green')

    # 7. 生成报告
    today = datetime.now().strftime('%Y-%m-%d')
    if args.output:
        output_file = Path(args.output)
    else:
        output_file = PROJECT_ROOT / "05-选题研究" / f"X-Pro-{today}.md"

    print_colored(f"\n生成报告...", 'yellow')
    generate_xpro_report(unique_tweets, columns, analysis, output_file)

    print_colored(f"\n✓ 报告已保存：{output_file}", 'green')

    # 8. 输出摘要
    print_colored("\n" + "="*60, 'cyan')
    print_colored("  📊 分析摘要", 'cyan')
    print_colored("="*60, 'cyan')

    print_colored(f"\n📋 Deck 配置：{len(columns)} 列", 'yellow')
    for col in columns:
        col_tweets = analysis['tweets_by_column'].get(col['name'], [])
        print_colored(f"  - {col['name']}（{col['type']}）: {len(col_tweets)} 条推文", 'cyan')

    if analysis['topics']:
        print_colored("\n🔥 跨列热门话题：", 'yellow')
        for i, topic in enumerate(analysis['topics'][:3], 1):
            keyword = topic['keyword']
            count = len(topic['authors'])
            print_colored(f"  {i}. {keyword}（{count} 人讨论）", 'cyan')

    if analysis['hot_tweets']:
        print_colored("\n⭐ 高互动推文：", 'yellow')
        for i, tweet in enumerate(analysis['hot_tweets'][:3], 1):
            handle = tweet.get('handle', '')
            likes = tweet.get('likes', 0)
            print_colored(f"  {i}. @{handle}（❤️ {likes:,}）", 'cyan')

    print_colored("\n" + "="*60 + "\n", 'cyan')


if __name__ == "__main__":
    main()
