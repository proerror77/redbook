#!/usr/bin/env python3
"""
X/Twitter Timeline 抓取工具
自动抓取 Home feed，识别热门话题和高互动推文
"""

import argparse
from datetime import datetime
from collections import Counter
from pathlib import Path

from x_utils import (
    ensure_browser,
    navigate,
    scroll_and_collect,
    extract_tweets,
    save_report,
    print_colored,
    PROJECT_ROOT,
)


def analyze_timeline_topics(tweets):
    """
    分析 Timeline 中的热门话题

    识别规则：
    1. 高互动推文（likes > 50 或 retweets > 10）
    2. 重复出现的关键词（≥ 3 次）
    3. 多人讨论的话题（≥ 3 个不同作者）

    Args:
        tweets: 推文列表

    Returns:
        {
            'hot_tweets': 高互动推文列表,
            'hot_keywords': 高频关键词,
            'topics': 识别出的话题
        }
    """
    # 1. 筛选高互动推文
    hot_tweets = []
    for tweet in tweets:
        likes = tweet.get('likes', 0)
        retweets = tweet.get('retweets', 0)
        engagement = likes + retweets * 2  # 转发权重更高

        if likes > 50 or retweets > 10 or engagement > 100:
            tweet['engagement'] = engagement
            hot_tweets.append(tweet)

    # 按互动量排序
    hot_tweets.sort(key=lambda t: t.get('engagement', 0), reverse=True)

    # 2. 提取关键词（简单实现：提取 # 标签和常见关键词）
    keywords = []
    for tweet in tweets:
        content = tweet.get('content', '')
        # 提取 hashtag
        hashtags = [w for w in content.split() if w.startswith('#')]
        keywords.extend(hashtags)

        # 提取常见关键词（简单匹配）
        common_keywords = ['AI', 'agent', 'GPT', 'Claude', 'startup', 'crypto',
                          'Web3', 'SaaS', 'founder', 'product', 'code', 'dev',
                          'solopreneur', 'indie', 'builder', 'ship']
        for kw in common_keywords:
            if kw.lower() in content.lower():
                keywords.append(kw)

    # 统计高频关键词
    keyword_counts = Counter(keywords)
    hot_keywords = keyword_counts.most_common(10)

    # 3. 识别话题（多人讨论的关键词）
    topics = []
    for keyword, count in hot_keywords:
        if count >= 3:  # 至少 3 次提及
            # 找出讨论这个话题的作者
            authors = []
            related_tweets = []
            for tweet in tweets:
                content = tweet.get('content', '')
                if keyword.lower() in content.lower():
                    author = tweet.get('handle', 'unknown')
                    if author not in authors:
                        authors.append(author)
                        related_tweets.append(tweet)

            if len(authors) >= 2:  # 至少 2 个不同作者讨论
                topics.append({
                    'keyword': keyword,
                    'count': count,
                    'authors': authors,
                    'tweets': related_tweets[:3]  # 最多 3 条代表推文
                })

    # 按讨论人数排序
    topics.sort(key=lambda t: len(t['authors']), reverse=True)

    return {
        'hot_tweets': hot_tweets[:10],  # Top 10 高互动
        'hot_keywords': hot_keywords,
        'topics': topics[:5]  # Top 5 话题
    }


def generate_timeline_report(tweets, analysis, output_file=None):
    """
    生成 Timeline 分析报告（Markdown 格式）

    Args:
        tweets: 所有推文列表
        analysis: 话题分析结果
        output_file: 输出文件路径（可选）

    Returns:
        报告文本
    """
    today = datetime.now().strftime('%Y-%m-%d')

    lines = [
        f"# X.com Timeline 分析 - {today}",
        "",
        f"## 📊 统计摘要",
        "",
        f"- **抓取推文数**：{len(tweets)} 条",
        f"- **高互动推文**：{len(analysis['hot_tweets'])} 条",
        f"- **识别话题**：{len(analysis['topics'])} 个",
        f"- **高频关键词**：{len(analysis['hot_keywords'])} 个",
        "",
        "---",
        "",
    ]

    # 1. 热门话题（多人讨论）
    if analysis['topics']:
        lines.extend([
            "## 🔥 Timeline 热门话题",
            "",
            "> 基于多人讨论和高频关键词识别",
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
                content = tweet.get('content', '')[:200]  # 限制长度
                likes = tweet.get('likes', 0)
                retweets = tweet.get('retweets', 0)

                lines.extend([
                    f"- **@{handle}** ({author})",
                    f"  > {content}...",
                    f"  > ❤️ {likes:,} | 🔁 {retweets:,}",
                    "",
                ])

            # 选题建议
            score = min(10, 5 + len(authors))  # 基础 5 分 + 讨论人数
            recommendation = "✅ 推荐" if score >= 7 else "⚠️ 可选"
            lines.extend([
                f"**选题评分**：{recommendation}（{score}/10）",
                "",
                "---",
                "",
            ])

    # 2. 高互动推文（单独的热门）
    if analysis['hot_tweets']:
        lines.extend([
            "## ⭐ 高互动推文（单独热门）",
            "",
            "> 高点赞/转发但未形成多人讨论的推文",
            "",
        ])

        for i, tweet in enumerate(analysis['hot_tweets'][:5], 1):
            author = tweet.get('author', 'Unknown')
            handle = tweet.get('handle', '')
            content = tweet.get('content', '')[:300]
            likes = tweet.get('likes', 0)
            retweets = tweet.get('retweets', 0)
            engagement = tweet.get('engagement', 0)

            lines.extend([
                f"### {i}. @{handle} ({author})",
                "",
                f"> {content}",
                "",
                f"**互动数据**：❤️ {likes:,} | 🔁 {retweets:,} | 总互动 {engagement:,}",
                "",
                "---",
                "",
            ])

    # 3. 高频关键词云
    if analysis['hot_keywords']:
        lines.extend([
            "## 🏷 高频关键词",
            "",
        ])

        for keyword, count in analysis['hot_keywords'][:15]:
            lines.append(f"- `{keyword}` ({count} 次)")

        lines.extend(["", "---", ""])

    # 4. 总结建议
    lines.extend([
        "## 📋 选题建议",
        "",
    ])

    if analysis['topics']:
        lines.append("**推荐选题**（基于 Timeline 热点）：")
        lines.append("")
        for i, topic in enumerate(analysis['topics'][:3], 1):
            keyword = topic['keyword']
            authors_count = len(topic['authors'])
            score = min(10, 5 + authors_count)
            lines.append(f"{i}. **{keyword}**（评分 {score}/10）")
            lines.append(f"   - 热度：{authors_count} 人讨论")
            lines.append(f"   - 推荐理由：Timeline 中多人关注，有讨论基础")
            lines.append("")
    else:
        lines.extend([
            "今日 Timeline 未识别到明显的多人讨论话题。",
            "",
            "建议：",
            "1. 查看高互动推文，寻找单独的热点",
            "2. 结合 Following 分析和 Trending 数据",
            "3. 考虑深挖关键词搜索",
            "",
        ])

    lines.extend([
        "---",
        "",
        f"*报告生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*",
    ])

    report_text = '\n'.join(lines)

    # 保存到文件
    if output_file:
        save_report(report_text, output_file)

    return report_text


def main():
    parser = argparse.ArgumentParser(description='抓取 X.com Timeline 并分析热门话题')
    parser.add_argument('--scrolls', type=int, default=30,
                       help='滚动次数（默认 30 次，约 150-200 条推文）')
    parser.add_argument('--scroll-distance', type=int, default=1600,
                       help='每次向下滚动的像素距离（默认 1600，比旧版 800 更深）')
    parser.add_argument('--max-stale-rounds', type=int, default=6,
                       help='连续多少轮没有新增推文后提前停止（默认 6）')
    parser.add_argument('--output', type=str,
                       help='输出文件路径（默认：05-选题研究/X-Timeline-{日期}.md）')

    args = parser.parse_args()

    print_colored("\n============================================================", 'green')
    print_colored("  📱 X.com Timeline 分析", 'green')
    print_colored("============================================================", 'green')

    # 1. 检查 agent-browser-session 连接
    if not ensure_browser():
        return

    # 2. 打开真正的 x.com Home Timeline。
    # 不再复用 X Pro Deck；否则 X-Timeline 与 X-Pro 报告会重复。
    print_colored("\n打开 X.com Home Timeline...", 'yellow')
    navigate("https://x.com/home", wait=3.0)

    # 3. 滚动并收集推文
    print_colored(
        f"\n滚动收集数据（{args.scrolls} 次，每次 {args.scroll_distance}px）...",
        'yellow',
    )
    snapshots = scroll_and_collect(
        times=args.scrolls,
        wait=2.5,
        distance=args.scroll_distance,
        stop_when_stale=True,
        max_stale_rounds=args.max_stale_rounds,
    )

    # 4. 解析推文
    print_colored("\n解析推文数据...", 'yellow')
    all_tweets = []
    for snapshot in snapshots:
        tweets = extract_tweets(snapshot)
        all_tweets.extend(tweets)

    # 去重（基于 handle + content 的前 50 个字符）
    seen = set()
    unique_tweets = []
    for tweet in all_tweets:
        handle = tweet.get('handle', '')
        content = tweet.get('content', '')[:50]
        key = f"{handle}:{content}"
        if key not in seen:
            seen.add(key)
            unique_tweets.append(tweet)

    print_colored(f"✓ 共提取 {len(unique_tweets)} 条推文", 'green')

    # 5. 分析话题
    print_colored("\n分析热门话题...", 'yellow')
    analysis = analyze_timeline_topics(unique_tweets)

    print_colored(f"✓ 识别 {len(analysis['topics'])} 个热门话题", 'green')
    print_colored(f"✓ 发现 {len(analysis['hot_tweets'])} 条高互动推文", 'green')

    # 6. 生成报告
    today = datetime.now().strftime('%Y-%m-%d')
    if args.output:
        output_file = Path(args.output)
    else:
        output_file = PROJECT_ROOT / "05-选题研究" / f"X-Timeline-{today}.md"

    print_colored(f"\n生成报告...", 'yellow')
    generate_timeline_report(unique_tweets, analysis, output_file)

    print_colored(f"\n✓ 报告已保存：{output_file}", 'green')

    # 7. 输出摘要
    print_colored("\n" + "="*60, 'cyan')
    print_colored("  📊 分析摘要", 'cyan')
    print_colored("="*60, 'cyan')

    if analysis['topics']:
        print_colored("\n🔥 热门话题（多人讨论）：", 'yellow')
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
