#!/usr/bin/env python3
"""
抓取指定 X 用户的最近推文
支持关键词筛选和数量限制
"""

import argparse
from pathlib import Path
import sys

# 添加父目录到 path 以导入 x_utils
sys.path.insert(0, str(Path(__file__).parent))
from x_utils import (
    ensure_browser, navigate, scroll_and_collect,
    extract_tweets, dedupe_tweets, save_report,
    today_str, print_colored, PROJECT_ROOT
)


def filter_by_keywords(tweets, keywords):
    """
    根据关键词筛选推文

    Args:
        tweets: 推文列表
        keywords: 关键词列表（不区分大小写）

    Returns:
        筛选后的推文列表
    """
    if not keywords:
        return tweets

    filtered = []
    keywords_lower = [k.lower() for k in keywords]

    for tweet in tweets:
        content_lower = tweet.get('content', '').lower()
        if any(keyword in content_lower for keyword in keywords_lower):
            tweet['matched_keywords'] = [
                k for k in keywords
                if k.lower() in content_lower
            ]
            filtered.append(tweet)

    return filtered


def scrape_user_tweets(username, scroll_times=10, keywords=None, limit=None):
    """
    抓取指定用户的推文

    Args:
        username: X 用户名（不含 @）
        scroll_times: 滚动次数（每次约加载 3-5 条推文）
        keywords: 关键词列表（可选）
        limit: 最大推文数量（可选）

    Returns:
        推文列表
    """
    print_colored(f"\n=== 抓取 @{username} 的推文 ===", 'cyan')

    # 1. 打开用户页面
    url = f"https://x.com/{username}"
    print_colored(f"打开页面: {url}", 'blue')
    navigate(url, wait=3)

    # 2. 滚动收集推文
    print_colored(f"滚动 {scroll_times} 次收集推文...", 'blue')
    snapshots = scroll_and_collect(times=scroll_times, wait=2.0)

    # 3. 解析推文
    all_tweets = []
    for snapshot in snapshots:
        tweets = extract_tweets(snapshot)
        all_tweets.extend(tweets)

    # 去重
    all_tweets = dedupe_tweets(all_tweets)
    print_colored(f"✓ 收集到 {len(all_tweets)} 条推文（去重后）", 'green')

    # 4. 关键词筛选
    if keywords:
        filtered = filter_by_keywords(all_tweets, keywords)
        print_colored(f"✓ 关键词筛选后保留 {len(filtered)} 条推文", 'green')
        all_tweets = filtered

    # 5. 数量限制
    if limit and len(all_tweets) > limit:
        all_tweets = all_tweets[:limit]
        print_colored(f"✓ 限制数量为 {limit} 条", 'green')

    # 按互动量排序
    all_tweets.sort(key=lambda t: t.get('likes', 0) + t.get('retweets', 0), reverse=True)

    return all_tweets


def generate_report(username, tweets, keywords=None):
    """生成 Markdown 报告"""
    report = f"# @{username} 推文收集\n\n"
    report += f"**收集时间**: {today_str()}\n"
    report += f"**推文数量**: {len(tweets)} 条\n"

    if keywords:
        report += f"**关键词筛选**: {', '.join(keywords)}\n"

    report += "\n---\n\n"

    # 统计信息
    total_likes = sum(t.get('likes', 0) for t in tweets)
    total_retweets = sum(t.get('retweets', 0) for t in tweets)
    total_replies = sum(t.get('replies', 0) for t in tweets)

    report += "## 📊 互动统计\n\n"
    report += f"- 总点赞数: {total_likes:,}\n"
    report += f"- 总转发数: {total_retweets:,}\n"
    report += f"- 总回复数: {total_replies:,}\n"
    report += f"- 平均点赞: {total_likes // len(tweets) if tweets else 0}\n"

    if keywords:
        # 关键词分布
        keyword_counts = {}
        for tweet in tweets:
            for kw in tweet.get('matched_keywords', []):
                keyword_counts[kw] = keyword_counts.get(kw, 0) + 1

        report += "\n## 🔍 关键词分布\n\n"
        for kw, count in sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True):
            report += f"- **{kw}**: {count} 条推文\n"

    report += "\n---\n\n"
    report += "## 📝 推文列表\n\n"

    # 推文列表
    for i, tweet in enumerate(tweets, 1):
        engagement = tweet.get('likes', 0) + tweet.get('retweets', 0)
        report += f"### {i}. @{tweet.get('handle', username)}"

        if keywords and tweet.get('matched_keywords'):
            matched = ', '.join(tweet['matched_keywords'])
            report += f" 🔍 `{matched}`"

        report += "\n\n"
        report += f"**互动**: ❤️ {tweet.get('likes', 0):,} | 🔁 {tweet.get('retweets', 0):,} | 💬 {tweet.get('replies', 0):,}\n\n"

        # 推文内容
        content = tweet.get('content', '')
        # 将内容分段，保持可读性
        lines = content.split('. ')
        for line in lines:
            if line.strip():
                report += f"> {line.strip()}\n"

        report += "\n"

        # 高互动推文标记
        if engagement > 100:
            report += "🔥 **高互动推文**\n\n"

        report += "---\n\n"

    return report


def main():
    parser = argparse.ArgumentParser(
        description='抓取指定 X 用户的最近推文',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
示例:
  # 抓取 @karry_viber 最近 30 条关于 AI/Claude 的推文
  python3 scrape_user_tweets.py karry_viber --keywords ai claude openclaw --limit 30

  # 抓取 @elonmusk 所有推文（默认滚动 10 次）
  python3 scrape_user_tweets.py elonmusk

  # 自定义滚动次数和输出文件
  python3 scrape_user_tweets.py sama --scroll 20 --output sama_tweets.md
        '''
    )

    parser.add_argument('username', help='X 用户名（不含 @）')
    parser.add_argument('--keywords', nargs='+', help='关键词筛选（多个关键词用空格分隔）')
    parser.add_argument('--limit', type=int, help='最大推文数量')
    parser.add_argument('--scroll', type=int, default=10, help='滚动次数（默认 10 次，约 30-50 条推文）')
    parser.add_argument('--output', help='输出文件路径（默认保存到 05-选题研究/）')

    args = parser.parse_args()

    # 检查浏览器连接
    if not ensure_browser():
        sys.exit(1)

    # 抓取推文
    tweets = scrape_user_tweets(
        username=args.username,
        scroll_times=args.scroll,
        keywords=args.keywords,
        limit=args.limit
    )

    if not tweets:
        print_colored("未找到符合条件的推文", 'yellow')
        sys.exit(0)

    # 生成报告
    report = generate_report(
        username=args.username,
        tweets=tweets,
        keywords=args.keywords
    )

    # 保存报告
    if args.output:
        output_path = args.output
    else:
        # 默认保存到 05-选题研究/
        keywords_suffix = '-' + '-'.join(args.keywords) if args.keywords else ''
        filename = f"X-用户推文-@{args.username}{keywords_suffix}-{today_str()}.md"
        output_path = PROJECT_ROOT / "05-选题研究" / filename

    save_report(report, str(output_path))

    print_colored(f"\n✅ 完成！收集 {len(tweets)} 条推文", 'green')


if __name__ == '__main__':
    main()
