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


def append_topics_to_record(report: str):
    """从报告中提取选题建议，追加到选题记录"""
    record_path = PROJECT_ROOT / "01-内容生产" / "选题管理" / "00-选题记录.md"
    if not record_path.exists():
        return

    # 提取报告中的关键词作为选题线索
    import re
    topics = re.findall(r'\*\*(.+?)\*\*', report)
    if not topics:
        return

    # 去重取前5个
    seen = set()
    unique = []
    for t in topics:
        if t not in seen and len(t) > 2:
            seen.add(t)
            unique.append(t)
    unique = unique[:5]

    if not unique:
        return

    entry = f"\n\n### X 每日研究发现 ({today_str()})\n"
    for t in unique:
        entry += f"- [ ] {t} | X 每日研究 | {today_str()}\n"

    with open(record_path, 'a', encoding='utf-8') as f:
        f.write(entry)

    print_colored(f"✓ 已追加 {len(unique)} 条选题到选题记录", 'green')


def main():
    parser = argparse.ArgumentParser(description='X.com 每日研究')
    parser.add_argument('--skip-timeline', action='store_true', help='跳过 Timeline 分析')
    parser.add_argument('--skip-trending', action='store_true', help='跳过热门趋势')
    parser.add_argument('--skip-search', action='store_true', help='跳过关键词搜索')
    parser.add_argument('--skip-following', action='store_true', help='跳过关注者分析')
    parser.add_argument('--keywords', nargs='+', default=DEFAULT_KEYWORDS, help='搜索关键词')
    args = parser.parse_args()

    print_colored("\n🚀 X.com 每日研究启动", 'green')
    print_colored(f"日期: {today_str()}\n", 'cyan')

    if not ensure_browser():
        sys.exit(1)

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

    # 汇总报告
    print_colored("\n" + "=" * 50, 'green')
    print_colored("📝 汇总每日研究报告", 'green')
    print_colored("=" * 50, 'green')

    header = (
        f"# X.com 每日研究报告 - {today_str()}\n\n"
        f"- 生成时间: {now_str()}\n"
        f"- 搜索关键词: {', '.join(args.keywords)}\n\n"
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