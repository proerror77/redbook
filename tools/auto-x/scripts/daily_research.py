#!/usr/bin/env python3
"""
X/Twitter 每日研究主流程
一键执行所有研究任务，生成综合报告并更新选题记录
"""

import sys
import argparse
from pathlib import Path
from x_utils import (
    ensure_browser, save_report,
    print_colored, today_str, now_str,
    PROJECT_ROOT, DAILY_DIR, ensure_dirs,
)


# 默认搜索关键词
DEFAULT_KEYWORDS = ['AI tools', 'solopreneur', 'crypto alpha']

# 默认监控的 subreddits
DEFAULT_SUBREDDITS = ['SaaS', 'Entrepreneur', 'startups', 'webdev']

def _norm_topic(t: str) -> str:
    return t.strip().casefold()


def _extract_topics_for_record(text: str) -> list[str]:
    """
    Extract "topic-like" items for the topic pool.

    We intentionally avoid naive "**...**" extraction because many reports
    bold stats headings like "**Deck 列数**" which are NOT topics.
    """
    import re

    candidates: list[str] = []

    # Prefer numbered lists with bold topics, e.g. "1. **AI**（评分 9/10）"
    candidates.extend(
        re.findall(r'^\s*\d+\.\s*\*\*(.+?)\*\*', text, flags=re.MULTILINE)
    )

    # Fallback: topic headings like "### 话题 1: AI"
    candidates.extend(
        re.findall(r'^###\s*话题\s*\d+\s*:\s*(.+?)\s*$', text, flags=re.MULTILINE)
    )

    seen: set[str] = set()
    unique: list[str] = []
    for raw in candidates:
        t = raw.strip()
        if not t:
            continue
        if t.startswith('@'):
            # Handles are not topic ideas.
            continue
        if len(t) < 2:
            continue
        key = _norm_topic(t)
        if key in seen:
            continue
        seen.add(key)
        unique.append(t)
        if len(unique) >= 5:
            break
    return unique


def run_timeline() -> str:
    """运行 X Pro 多列分析，返回报告文本"""
    print_colored("\n" + "=" * 50, 'green')
    print_colored("📊 Priority 1: X Pro 多列分析（最高优先级）", 'green')
    print_colored("=" * 50, 'green')
    try:
        from scrape_xpro_columns import (
            identify_columns,
            scroll_column,
            merge_and_deduplicate,
            analyze_xpro_topics,
            generate_xpro_report
        )
        from x_utils import navigate, run_ab, extract_tweets

        # 打开 X Pro AI Deck
        print_colored("\n打开 X Pro AI Deck...", 'yellow')
        navigate("https://pro.x.com/i/decks/2022466575597736041", wait=3.0)

        # 识别列配置
        print_colored("\n识别 Deck 列配置...", 'yellow')
        initial_snapshot = run_ab('snapshot', timeout=30)
        columns = identify_columns(initial_snapshot)

        if columns:
            print_colored(f"✓ 发现 {len(columns)} 列", 'green')
        else:
            print_colored("未识别到任何列，使用默认配置", 'yellow')
            columns = [{"name": "AI Deck", "type": "mixed"}]

        # 滚动收集推文
        print_colored(f"\n滚动收集数据（30 次）...", 'yellow')
        snapshots = scroll_column("all", times=30, wait=2.5)

        # 解析推文
        print_colored("\n解析推文数据...", 'yellow')
        all_tweets = []
        for snapshot in snapshots:
            tweets = extract_tweets(snapshot)
            all_tweets.extend(tweets)

        # 去重
        unique_tweets = merge_and_deduplicate(all_tweets)
        print_colored(f"✓ 共提取 {len(unique_tweets)} 条推文", 'green')

        # 分析跨列话题
        print_colored("\n分析跨列热门话题...", 'yellow')
        analysis = analyze_xpro_topics(unique_tweets, columns)

        print_colored(f"✓ 识别 {len(analysis['topics'])} 个热门话题", 'green')
        print_colored(f"✓ 发现 {len(analysis['hot_tweets'])} 条高互动推文", 'green')

        # 生成报告（不保存到单独文件，只返回文本）
        return generate_xpro_report(unique_tweets, columns, analysis, output_file=None)

    except Exception as e:
        print_colored(f"X Pro 多列分析失败: {e}", 'red')
        import traceback
        traceback.print_exc()
        return f"（X Pro 多列分析失败: {e}）\n"


def run_trending() -> str:
    """运行热门趋势抓取，返回报告文本"""
    print_colored("\n" + "=" * 50, 'green')
    print_colored("📈 Step 1: 抓取热门趋势", 'green')
    print_colored("=" * 50, 'green')
    try:
        from trending_topics import scrape_trending, generate_trending_report
        trends, topic_tweets = scrape_trending(top_n=5)
        if trends:
            return generate_trending_report(trends, topic_tweets)
        return "（未获取到趋势数据）\n"
    except Exception as e:
        print_colored(f"热门趋势抓取失败: {e}", 'red')
        return f"（热门趋势抓取失败: {e}）\n"


def run_search(keywords: list) -> str:
    """运行关键词搜索，返回报告文本"""
    print_colored("\n" + "=" * 50, 'green')
    print_colored("🔍 Step 2: 搜索领域关键词", 'green')
    print_colored("=" * 50, 'green')

    sections = []
    try:
        from search_x import search_x_topic, find_pain_points, generate_search_report
        for kw in keywords:
            print_colored(f"\n搜索: {kw}", 'yellow')
            tweets = search_x_topic(kw, scroll_times=2)
            pain_points = find_pain_points(tweets)
            report = generate_search_report(kw, tweets, pain_points)
            sections.append(report)
    except Exception as e:
        print_colored(f"关键词搜索失败: {e}", 'red')
        sections.append(f"（关键词搜索失败: {e}）\n")

    return '\n---\n\n'.join(sections)


def run_analyze_following() -> str:
    """运行关注者分析，返回报告文本"""
    print_colored("\n" + "=" * 50, 'green')
    print_colored("👥 Step 3: 分析关注者动态", 'green')
    print_colored("=" * 50, 'green')
    try:
        from analyze_following import load_following, analyze_following, generate_analysis_report
        users = load_following()
        if not users:
            return "（未找到关注列表数据，跳过）\n"
        result = analyze_following(users, sample_size=5)
        return generate_analysis_report(result)
    except Exception as e:
        print_colored(f"关注者分析失败: {e}", 'red')
        return f"（关注者分析失败: {e}）\n"


def run_hackernews(limit: int = 30) -> str:
    """运行 Hacker News 热门分析，返回报告文本"""
    print_colored("\n" + "=" * 50, 'green')
    print_colored("🔥 Step 4: Hacker News 热门分析（无需浏览器）", 'green')
    print_colored("=" * 50, 'green')
    try:
        from scrape_hackernews import (
            fetch_top_stories,
            fetch_stories_with_comments,
            analyze_hn_data,
            generate_hn_report
        )

        # 1. 获取 Top Stories
        story_ids = fetch_top_stories(limit)
        if not story_ids:
            return "（未获取到 HN Stories）\n"

        # 2. 获取详情和评论
        stories = fetch_stories_with_comments(story_ids, top_comments=3)
        if not stories:
            return "（未获取到 HN 数据）\n"

        # 3. 分析数据
        analysis = analyze_hn_data(stories)

        # 4. 生成报告（不保存到单独文件，只返回文本）
        return generate_hn_report(stories, analysis, output_file=None)

    except Exception as e:
        print_colored(f"Hacker News 分析失败: {e}", 'red')
        import traceback
        traceback.print_exc()
        return f"（Hacker News 分析失败: {e}）\n"


def run_reddit(subreddits: list, limit: int = 25) -> str:
    """运行 Reddit 热门监控，返回报告文本"""
    print_colored("\n" + "=" * 50, 'green')
    print_colored("🔍 Step 5: Reddit 热门监控（无需浏览器）", 'green')
    print_colored("=" * 50, 'green')
    try:
        from scrape_reddit import (
            fetch_subreddit_hot,
            categorize_post,
            analyze_reddit_data,
            generate_reddit_report
        )

        # 1. 获取所有 subreddits 的热门帖子
        all_posts = []
        for subreddit in subreddits:
            posts = fetch_subreddit_hot(subreddit, limit)
            all_posts.extend(posts)

        if not all_posts:
            return "（未获取到 Reddit 帖子）\n"

        # 2. 分类帖子
        print_colored("分类帖子...", 'yellow')
        for post in all_posts:
            post['category'] = categorize_post(
                post['title'],
                post['subreddit'],
                post['link_flair_text']
            )

        # 3. 分析数据
        analysis = analyze_reddit_data(all_posts)

        # 4. 生成报告（不保存到单独文件，只返回文本）
        return generate_reddit_report(all_posts, analysis, output_file=None)

    except Exception as e:
        print_colored(f"Reddit 监控失败: {e}", 'red')
        import traceback
        traceback.print_exc()
        return f"（Reddit 监控失败: {e}）\n"


def append_topics_to_record(report: str):
    """从报告中提取选题建议，追加到选题记录"""
    record_path = PROJECT_ROOT / "01-内容生产" / "选题管理" / "00-选题记录.md"
    if not record_path.exists():
        return

    import re

    topics = _extract_topics_for_record(report)
    if not topics:
        return

    content = record_path.read_text(encoding='utf-8')
    header = f"### X 每日研究发现 ({today_str()})"

    lines = content.splitlines(keepends=True)
    header_idx = -1
    for i, line in enumerate(lines):
        if line.rstrip('\n') == header:
            header_idx = i  # pick the last occurrence if duplicated

    # Collect existing topics for today (if section exists)
    existing: set[str] = set()
    section_end = len(lines)
    if header_idx != -1:
        for j in range(header_idx + 1, len(lines)):
            if lines[j].startswith("### "):
                section_end = j
                break
        for j in range(header_idx + 1, section_end):
            m = re.match(r'^\s*-\s*\[[ xX]\]\s*(.+?)\s*\|\s*X\s*每日研究\s*\|', lines[j])
            if m:
                existing.add(_norm_topic(m.group(1)))

    to_add = [t for t in topics if _norm_topic(t) not in existing]
    if not to_add:
        print_colored("✓ 今日选题已存在，跳过追加", 'green')
        return

    new_lines = [f"- [ ] {t} | X 每日研究 | {today_str()}\n" for t in to_add]

    if header_idx == -1:
        # Append a fresh section to end of file.
        entry = "\n\n" + header + "\n" + "".join(new_lines)
        record_path.write_text(content + entry, encoding='utf-8')
    else:
        # Insert before trailing blank lines + next header (or EOF), keeping section grouped.
        insert_at = section_end
        while insert_at > header_idx + 1 and lines[insert_at - 1].strip() == "":
            insert_at -= 1
        lines[insert_at:insert_at] = new_lines
        record_path.write_text("".join(lines), encoding='utf-8')

    print_colored(f"✓ 已追加 {len(to_add)} 条选题到选题记录", 'green')


def main():
    parser = argparse.ArgumentParser(description='X.com 每日研究')
    parser.add_argument('--skip-timeline', action='store_true', help='跳过 Timeline 分析')
    parser.add_argument('--skip-trending', action='store_true', help='跳过热门趋势')
    parser.add_argument('--skip-search', action='store_true', help='跳过关键词搜索')
    parser.add_argument('--skip-following', action='store_true', help='跳过关注者分析')
    parser.add_argument('--skip-hn', action='store_true', help='跳过 Hacker News 分析')
    parser.add_argument('--skip-reddit', action='store_true', help='跳过 Reddit 监控')
    parser.add_argument('--hn-limit', type=int, default=30, help='HN 帖子数量（默认 30）')
    parser.add_argument('--reddit-limit', type=int, default=25, help='每个 subreddit 帖子数量（默认 25）')
    parser.add_argument('--subreddits', nargs='+', default=DEFAULT_SUBREDDITS, help='监控的 subreddits')
    parser.add_argument('--keywords', nargs='+', default=DEFAULT_KEYWORDS, help='搜索关键词')
    args = parser.parse_args()

    print_colored("\n🚀 X.com 每日研究启动", 'green')
    print_colored(f"日期: {today_str()}\n", 'cyan')

    # 无需浏览器的部分：HN + Reddit（可以先运行）
    hn_section = None
    reddit_section = None

    if not args.skip_hn:
        hn_section = run_hackernews(args.hn_limit)

    if not args.skip_reddit:
        reddit_section = run_reddit(args.subreddits, args.reddit_limit)

    # X.com 相关需要浏览器
    if not ensure_browser():
        print_colored("\n⚠️  浏览器未连接，跳过 X.com 分析", 'yellow')
        print_colored("仅生成 Hacker News + Reddit 报告\n", 'yellow')

        # 仅 HN + Reddit 报告
        sections = []
        if hn_section:
            sections.append(hn_section)
        if reddit_section:
            sections.append(reddit_section)

        if sections:
            header = (
                f"# 每日研究报告 - {today_str()}\n\n"
                f"- 生成时间: {now_str()}\n\n"
                f"---\n\n"
            )
            full_report = header + '\n---\n\n'.join(sections)
            report_path = str(PROJECT_ROOT / "05-选题研究" / f"综合研究-{today_str()}.md")
            save_report(full_report, report_path)
            print_colored("\n✅ Hacker News + Reddit 研究完成！", 'green')
            print_colored(f"报告: {report_path}", 'cyan')
        return

    ensure_dirs()
    sections = []

    # Priority 1: X Pro 多列分析（最高优先级）
    if not args.skip_timeline:
        sections.append(run_timeline())

    # Step 1: 热门趋势
    if not args.skip_trending:
        sections.append(run_trending())

    # Step 2: 关键词搜索
    if not args.skip_search:
        sections.append(run_search(args.keywords))

    # Step 3: 关注者分析（可选）
    if not args.skip_following:
        sections.append(run_analyze_following())

    # Step 4: Hacker News 分析（已在前面运行）
    if hn_section:
        sections.append(hn_section)

    # Step 5: Reddit 监控（已在前面运行）
    if reddit_section:
        sections.append(reddit_section)

    # 汇总报告
    print_colored("\n" + "=" * 50, 'green')
    print_colored("📝 汇总每日研究报告", 'green')
    print_colored("=" * 50, 'green')

    header = (
        f"# X.com 每日研究报告 - {today_str()}\n\n"
        f"- 生成时间: {now_str()}\n"
        f"- 搜索关键词: {', '.join(args.keywords)}\n"
        f"- 监控 Subreddits: {', '.join(args.subreddits)}\n\n"
        f"---\n\n"
    )
    full_report = header + '\n---\n\n'.join(sections)

    # 保存报告
    report_path = str(PROJECT_ROOT / "05-选题研究" / f"X-每日研究-{today_str()}.md")
    save_report(full_report, report_path)

    # 存档到 daily 目录
    archive_path = str(DAILY_DIR / f"{today_str()}.md")
    save_report(full_report, archive_path)

    # 追加选题到记录
    append_topics_to_record(full_report)

    print_colored("\n✅ 每日研究完成！", 'green')
    print_colored(f"报告: {report_path}", 'cyan')


if __name__ == '__main__':
    main()
