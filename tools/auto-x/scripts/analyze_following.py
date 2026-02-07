#!/usr/bin/env python3
"""
X/Twitter 关注者话题分析工具
分析关注列表中用户的最近推文，提取热门话题和关键词
"""

import sys
import json
import re
from collections import Counter
from x_utils import (
    ensure_browser, navigate, get_snapshot,
    extract_tweets, save_report,
    print_colored, today_str, now_str,
    DATA_DIR, PROJECT_ROOT,
)


# 话题分类关键词
TOPIC_CATEGORIES = {
    'AI': ['ai', 'gpt', 'llm', 'chatgpt', 'claude', 'openai', 'agent',
           'machine learning', 'deep learning', 'neural', 'transformer',
           'prompt', 'copilot', 'gemini', 'midjourney', 'stable diffusion'],
    'Crypto': ['crypto', 'bitcoin', 'btc', 'eth', 'ethereum', 'solana',
               'sol', 'defi', 'nft', 'web3', 'blockchain', 'token',
               'wallet', 'dex', 'memecoin'],
    '创业': ['startup', 'founder', 'saas', 'mrr', 'revenue', 'launch',
             'product', 'mvp', 'indie', 'solopreneur', 'bootstrap',
             'build in public', 'ship', 'customer'],
    '效率': ['productivity', 'workflow', 'automation', 'tool', 'hack',
             'efficiency', 'notion', 'obsidian', 'cursor', 'vscode'],
    '编程': ['code', 'coding', 'programming', 'developer', 'dev',
             'javascript', 'python', 'rust', 'typescript', 'react',
             'nextjs', 'api', 'deploy', 'github', 'open source'],
}

DEFAULT_SAMPLE_SIZE = 10


def load_following(path: str = None) -> list:
    """加载关注列表 JSON"""
    fpath = path or str(DATA_DIR / "following.json")
    try:
        with open(fpath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print_colored(f"无法加载关注列表: {e}", 'red')
        print_colored("请先运行 scrape_following.py 抓取关注列表", 'yellow')
        return []


def scrape_user_tweets(username: str) -> list:
    """抓取单个用户的最近推文"""
    url = f"https://x.com/{username}"
    navigate(url, wait=2.5)
    snap = get_snapshot()
    tweets = extract_tweets(snap)
    return tweets


def categorize_text(text: str) -> dict:
    """对文本进行话题分类，返回各分类的匹配次数"""
    text_lower = text.lower()
    counts = {}
    for category, keywords in TOPIC_CATEGORIES.items():
        matches = sum(1 for kw in keywords if kw in text_lower)
        if matches > 0:
            counts[category] = matches
    return counts


def analyze_following(users: list, sample_size: int = DEFAULT_SAMPLE_SIZE) -> dict:
    """
    分析关注者的推文话题

    Args:
        users: 关注者列表
        sample_size: 采样数量

    Returns:
        分析结果字典
    """
    print_colored(f"\n=== 分析关注者话题 ===", 'green')

    sampled = users[:sample_size]
    print_colored(f"采样 {len(sampled)} / {len(users)} 个账号", 'yellow')

    all_tweets = []
    all_text = []
    user_topics = {}

    for i, user in enumerate(sampled, 1):
        username = user['username']
        print_colored(f"  [{i}/{len(sampled)}] 分析 @{username}...", 'cyan')
        tweets = scrape_user_tweets(username)
        all_tweets.extend(tweets)

        # 合并该用户所有推文文本
        user_text = ' '.join(t.get('content', '') for t in tweets)
        all_text.append(user_text)
        user_topics[username] = categorize_text(user_text)

    # 全局关键词频率
    combined = ' '.join(all_text).lower()
    word_freq = Counter()
    for category, keywords in TOPIC_CATEGORIES.items():
        for kw in keywords:
            count = combined.count(kw)
            if count > 0:
                word_freq[kw] = count

    # 全局分类统计
    category_totals = Counter()
    for cats in user_topics.values():
        for cat, count in cats.items():
            category_totals[cat] += count

    return {
        'total_users': len(sampled),
        'total_tweets': len(all_tweets),
        'word_freq': word_freq.most_common(20),
        'category_totals': category_totals.most_common(),
        'user_topics': user_topics,
    }


def generate_analysis_report(result: dict) -> str:
    """生成关注者话题分析报告"""
    lines = [
        f"# X.com 关注者话题分析报告",
        f"",
        f"## 分析概要",
        f"- 分析账号数: {result['total_users']}",
        f"- 分析推文数: {result['total_tweets']}",
        f"- 分析时间: {now_str()}",
        f"",
    ]

    # 热门关键词 Top 10
    lines.append("## 🔥 热门话题 Top 10")
    lines.append("")
    for i, (word, count) in enumerate(result['word_freq'][:10], 1):
        # 找出哪些用户提到了这个词
        mentioned_by = [
            u for u, cats in result['user_topics'].items()
            if any(word in kw for cat_kws in TOPIC_CATEGORIES.values() for kw in cat_kws
                   if kw == word)
        ]
        users_str = ', '.join(f"@{u}" for u in mentioned_by[:3])
        lines.append(f"{i}. **{word}** - 出现 {count} 次 | {users_str}")
    lines.append("")

    # 话题分类统计
    lines.append("## 📊 话题分类")
    lines.append("")
    for cat, total in result['category_totals']:
        lines.append(f"### {cat} 相关 (提及 {total} 次)")
        # 列出该分类下活跃的用户
        active = [u for u, cats in result['user_topics'].items() if cat in cats]
        if active:
            lines.append(f"- 活跃账号: {', '.join(f'@{u}' for u in active[:5])}")
        lines.append("")

    # 选题建议
    lines.append("## 💡 选题建议")
    lines.append("")
    if result['category_totals']:
        top_cat = result['category_totals'][0][0]
        lines.append(f"- 关注者最关注的领域是 **{top_cat}**，建议围绕此方向产出内容")
    if len(result['word_freq']) >= 3:
        top_words = [w for w, _ in result['word_freq'][:3]]
        lines.append(f"- 高频关键词: {', '.join(top_words)}，可作为选题切入点")
    lines.append("")

    return '\n'.join(lines)


def main():
    sample_size = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SAMPLE_SIZE
    following_path = sys.argv[2] if len(sys.argv) > 2 else None

    if not ensure_browser():
        sys.exit(1)

    users = load_following(following_path)
    if not users:
        sys.exit(1)

    result = analyze_following(users, sample_size)
    report = generate_analysis_report(result)

    path = str(PROJECT_ROOT / "05-选题研究" / f"X-关注者话题分析-{today_str()}.md")
    save_report(report, path)
    print(report)


if __name__ == '__main__':
    main()
