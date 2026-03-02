#!/usr/bin/env python3
"""
Reddit 热门内容监控
监控多个 subreddits 的热门帖子，发现创业机会和技术趋势
"""

import sys
import requests
import argparse
from typing import List, Dict, Optional
from collections import Counter
from datetime import datetime
from x_utils import (
    print_colored, today_str, now_str,
    PROJECT_ROOT, save_report
)


# 默认监控的 subreddits
DEFAULT_SUBREDDITS = [
    'SaaS',
    'Entrepreneur',
    'startups',
    'webdev',
    'programming',
    'MachineLearning',
    'artificial',
]


def fetch_subreddit_hot(subreddit: str, limit: int = 25) -> List[Dict]:
    """获取 subreddit 热门帖子"""
    url = f"https://www.reddit.com/r/{subreddit}/hot.json?limit={limit}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }

    print_colored(f"  获取 r/{subreddit} 热门帖子...", 'cyan')

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        posts = data.get('data', {}).get('children', [])

        results = []
        for post in posts:
            post_data = post.get('data', {})
            results.append({
                'id': post_data.get('id', ''),
                'subreddit': subreddit,
                'title': post_data.get('title', ''),
                'author': post_data.get('author', 'unknown'),
                'score': post_data.get('score', 0),
                'num_comments': post_data.get('num_comments', 0),
                'url': f"https://www.reddit.com{post_data.get('permalink', '')}",
                'created': datetime.fromtimestamp(
                    post_data.get('created_utc', 0)
                ).strftime('%Y-%m-%d %H:%M:%S'),
                'selftext': post_data.get('selftext', '')[:500],  # 帖子正文（限制长度）
                'link_flair_text': post_data.get('link_flair_text', ''),  # 标签
            })

        print_colored(f"    ✓ 获取 {len(results)} 条帖子", 'green')
        return results

    except Exception as e:
        print_colored(f"    ✗ 获取失败: {e}", 'red')
        return []


def fetch_post_comments(post_url: str, limit: int = 5) -> List[Dict]:
    """获取帖子的 top comments（痛点挖掘）"""
    json_url = post_url.rstrip('/') + '/.json'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }

    try:
        response = requests.get(json_url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()

        # data[1] 是评论数据
        if len(data) < 2:
            return []

        comments_data = data[1].get('data', {}).get('children', [])
        comments = []

        for comment in comments_data[:limit]:
            if comment.get('kind') != 't1':
                continue

            comment_data = comment.get('data', {})
            body = comment_data.get('body', '')

            if body and len(body) > 20:  # 过滤太短的评论
                comments.append({
                    'author': comment_data.get('author', 'unknown'),
                    'body': body[:300],  # 限制长度
                    'score': comment_data.get('score', 0),
                })

        return comments

    except Exception as e:
        return []


def detect_pain_points(text: str) -> bool:
    """检测文本是否包含痛点关键词"""
    pain_keywords = [
        'wish', 'need', 'want', 'problem', 'issue', 'frustrating',
        'annoying', 'difficult', 'hard', 'impossible', 'missing',
        'lacking', 'should have', 'would be nice', 'hate',
        'struggle', 'challenging', 'pain', 'bottleneck',
    ]
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in pain_keywords)


def categorize_post(title: str, subreddit: str, flair: str) -> str:
    """分类帖子"""
    title_lower = title.lower()

    # 按 flair 优先分类
    if flair:
        flair_lower = flair.lower()
        if 'question' in flair_lower or 'help' in flair_lower:
            return 'Question/Help'
        elif 'show' in flair_lower or 'launch' in flair_lower:
            return 'Show/Launch'
        elif 'discussion' in flair_lower:
            return 'Discussion'

    # 按标题关键词分类
    if any(kw in title_lower for kw in ['ai', 'gpt', 'llm', 'ml', 'machine learning', 'chatgpt']):
        return 'AI/ML'
    elif any(kw in title_lower for kw in ['saas', 'startup', 'mvp', 'launch', 'product']):
        return 'SaaS/Startup'
    elif any(kw in title_lower for kw in ['dev', 'code', 'programming', 'framework', 'library']):
        return 'Development'
    elif any(kw in title_lower for kw in ['marketing', 'growth', 'seo', 'traffic']):
        return 'Marketing/Growth'
    elif any(kw in title_lower for kw in ['how to', 'question', 'help', 'advice', '?']):
        return 'Question/Help'
    else:
        return 'Other'


def analyze_reddit_data(posts: List[Dict]) -> Dict:
    """分析 Reddit 数据"""
    print_colored("\n分析 Reddit 数据...", 'yellow')

    # 1. 按类别分类
    categories = Counter(p['category'] for p in posts)

    # 2. 按 subreddit 统计
    subreddit_stats = Counter(p['subreddit'] for p in posts)

    # 3. 高互动帖子（评论数 > 50 或点赞 > 100）
    hot_posts = sorted(
        [p for p in posts if p['num_comments'] > 50 or p['score'] > 100],
        key=lambda x: x['score'] + x['num_comments'],
        reverse=True
    )[:10]

    # 4. Show/Launch 类型（创业项目）
    show_posts = [p for p in posts if p['category'] == 'Show/Launch']

    # 5. Question/Help 类型（用户痛点）
    question_posts = sorted(
        [p for p in posts if p['category'] == 'Question/Help'],
        key=lambda x: x['score'],
        reverse=True
    )[:10]

    # 6. AI/ML 相关
    ai_posts = [p for p in posts if p['category'] == 'AI/ML']

    print_colored(f"✓ 识别 {len(categories)} 个类别", 'green')
    print_colored(f"✓ 覆盖 {len(subreddit_stats)} 个 subreddits", 'green')
    print_colored(f"✓ 发现 {len(hot_posts)} 个高互动帖子", 'green')

    return {
        'categories': categories,
        'subreddit_stats': subreddit_stats,
        'hot_posts': hot_posts,
        'show_posts': show_posts,
        'question_posts': question_posts,
        'ai_posts': ai_posts,
    }


def generate_reddit_report(posts: List[Dict], analysis: Dict, output_file: Optional[str] = None) -> str:
    """生成 Reddit 分析报告"""
    print_colored("\n生成报告...", 'yellow')

    lines = []
    lines.append(f"# Reddit 每日监控 - {today_str()}\n")
    lines.append(f"- 生成时间: {now_str()}")
    lines.append(f"- 监控帖子数: {len(posts)} 条\n")
    lines.append("---\n")

    # 1. 统计摘要
    lines.append("## 📊 统计摘要\n")
    lines.append(f"- **总帖子数**: {len(posts)} 条")
    lines.append(f"- **高互动帖子**: {len(analysis['hot_posts'])} 条")
    lines.append(f"- **Show/Launch**: {len(analysis['show_posts'])} 条")
    lines.append(f"- **Question/Help**: {len(analysis['question_posts'])} 条")
    lines.append(f"- **AI/ML 相关**: {len(analysis['ai_posts'])} 条\n")
    lines.append("---\n")

    # 2. Subreddit 分布
    lines.append("## 🏷 Subreddit 分布\n")
    for subreddit, count in analysis['subreddit_stats'].most_common():
        lines.append(f"- **r/{subreddit}**: {count} 条")
    lines.append("\n---\n")

    # 3. 类别分布
    lines.append("## 📂 类别分布\n")
    for category, count in analysis['categories'].most_common():
        lines.append(f"- **{category}**: {count} 条")
    lines.append("\n---\n")

    # 4. 高互动帖子
    if analysis['hot_posts']:
        lines.append("## 🔥 高互动帖子（深度讨论）\n")
        for i, post in enumerate(analysis['hot_posts'][:10], 1):
            lines.append(f"### {i}. {post['title']}\n")
            lines.append(f"- **来源**: r/{post['subreddit']}")
            lines.append(f"- **作者**: u/{post['author']}")
            lines.append(f"- **点赞**: {post['score']} | **评论**: {post['num_comments']}")
            lines.append(f"- **类别**: {post['category']}")
            if post.get('link_flair_text'):
                lines.append(f"- **标签**: {post['link_flair_text']}")
            lines.append(f"- **链接**: {post['url']}\n")

            # 正文摘要
            if post['selftext']:
                lines.append(f"**内容摘要**: {post['selftext'][:200]}...\n")

            lines.append("---\n")

    # 5. Show/Launch（创业项目）
    if analysis['show_posts']:
        lines.append("## 🚀 Show/Launch（创业项目）\n")
        for post in analysis['show_posts'][:5]:
            lines.append(f"### {post['title']}\n")
            lines.append(f"- **来源**: r/{post['subreddit']}")
            lines.append(f"- **链接**: {post['url']}")
            lines.append(f"- **点赞**: {post['score']} | **评论**: {post['num_comments']}\n")
            if post['selftext']:
                lines.append(f"**描述**: {post['selftext'][:200]}...\n")
        lines.append("---\n")

    # 6. Question/Help（痛点问题）
    if analysis['question_posts']:
        lines.append("## ❓ Question/Help（用户痛点）\n")
        for post in analysis['question_posts'][:10]:
            has_pain = detect_pain_points(post['title'] + ' ' + post['selftext'])
            pain_indicator = "🔴 痛点" if has_pain else ""

            lines.append(f"### {post['title']} {pain_indicator}\n")
            lines.append(f"- **来源**: r/{post['subreddit']}")
            lines.append(f"- **链接**: {post['url']}")
            lines.append(f"- **点赞**: {post['score']} | **评论**: {post['num_comments']}\n")

            if post['selftext']:
                lines.append(f"**问题描述**: {post['selftext'][:200]}...\n")

        lines.append("---\n")

    # 7. AI/ML 趋势
    if analysis['ai_posts']:
        lines.append("## 🤖 AI/ML 技术趋势\n")
        for post in analysis['ai_posts'][:5]:
            lines.append(f"- **{post['title']}** ({post['score']} ⬆️ | {post['num_comments']} 💬)")
            lines.append(f"  - r/{post['subreddit']}: {post['url']}\n")
        lines.append("---\n")

    lines.append(f"\n*报告生成时间：{now_str()}*\n")

    report = '\n'.join(lines)

    # 保存报告
    if output_file is None:
        output_file = str(PROJECT_ROOT / "05-选题研究" / f"Reddit-每日监控-{today_str()}.md")

    save_report(report, output_file)

    return report


def main():
    parser = argparse.ArgumentParser(description='Reddit 热门内容监控')
    parser.add_argument('--subreddits', nargs='+', default=DEFAULT_SUBREDDITS,
                       help='监控的 subreddits 列表')
    parser.add_argument('--limit', type=int, default=25,
                       help='每个 subreddit 的帖子数量（默认 25）')
    parser.add_argument('--output', type=str,
                       help='输出文件路径（默认：05-选题研究/Reddit-每日监控-{日期}.md）')
    args = parser.parse_args()

    print_colored("\n🔍 Reddit 热门内容监控启动", 'green')
    print_colored(f"日期: {today_str()}", 'cyan')
    print_colored(f"监控 subreddits: {', '.join(args.subreddits)}\n", 'cyan')

    # 1. 获取所有 subreddits 的热门帖子
    all_posts = []
    for subreddit in args.subreddits:
        posts = fetch_subreddit_hot(subreddit, args.limit)
        all_posts.extend(posts)

    if not all_posts:
        print_colored("未获取到帖子数据，退出", 'red')
        sys.exit(1)

    print_colored(f"\n✓ 共获取 {len(all_posts)} 条帖子", 'green')

    # 2. 分类帖子
    print_colored("\n分类帖子...", 'yellow')
    for post in all_posts:
        post['category'] = categorize_post(
            post['title'],
            post['subreddit'],
            post['link_flair_text']
        )

    # 3. 分析数据
    analysis = analyze_reddit_data(all_posts)

    # 4. 生成报告
    generate_reddit_report(all_posts, analysis, args.output)

    print_colored("\n✅ Reddit 监控完成！", 'green')


if __name__ == '__main__':
    main()
