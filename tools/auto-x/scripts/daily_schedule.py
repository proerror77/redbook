#!/usr/bin/env python3
"""
X.com 每日日程 - 增强版
在 daily_research 基础上增加：发布提醒 + 数据回顾
"""

import sys
import argparse
from pathlib import Path
from datetime import datetime, timedelta

# 确保可以导入同目录模块
sys.path.insert(0, str(Path(__file__).parent))

from x_utils import (
    ensure_browser, save_report,
    print_colored, today_str, now_str,
    PROJECT_ROOT, ensure_dirs,
)


# ── 发布提醒 ──────────────────────────────────────────────

def generate_publish_reminder() -> str:
    """扫描内容管道，生成今日发布提醒"""
    print_colored("\n" + "=" * 50, 'cyan')
    print_colored("📋 发布提醒", 'cyan')
    print_colored("=" * 50, 'cyan')

    sections = []
    sections.append("## 📋 今日发布提醒\n")

    # 1. 待深化的选题
    pending_dir = PROJECT_ROOT / "01-内容生产" / "01-待深化的选题"
    pending_files = _list_content_files(pending_dir)
    if pending_files:
        sections.append("### 待深化的选题")
        for f in pending_files:
            sections.append(f"- 📝 `{f.name}` (修改于 {_file_date(f)})")
        sections.append("")
    else:
        sections.append("### 待深化的选题\n- （暂无）\n")

    # 2. 制作中的选题
    wip_dir = PROJECT_ROOT / "01-内容生产" / "02-制作中的选题"
    wip_files = _list_content_files(wip_dir)
    if wip_files:
        sections.append("### 制作中的选题（可发布）")
        for f in wip_files:
            sections.append(f"- 🔥 `{f.name}` (修改于 {_file_date(f)})")
        sections.append("")
    else:
        sections.append("### 制作中的选题\n- （暂无制作中内容）\n")

    # 3. 待处理选题数量
    record_path = PROJECT_ROOT / "01-内容生产" / "选题管理" / "00-选题记录.md"
    todo_count = _count_pending_topics(record_path)
    sections.append(f"### 选题池\n- 待处理选题: **{todo_count}** 条\n")

    # 4. 发布建议
    sections.append("### 今日建议")
    if wip_files:
        sections.append(f"- ✅ 有 {len(wip_files)} 篇制作中内容可以发布")
    elif pending_files:
        sections.append(f"- 💡 有 {len(pending_files)} 个选题待深化，建议今天完成 1 篇")
    else:
        sections.append("- 🔍 选题池较空，建议先做选题研究")
    sections.append("")

    result = '\n'.join(sections)
    print_colored(f"✓ 发布提醒已生成", 'green')
    return result


def _list_content_files(directory: Path) -> list:
    """列出目录下的内容文件（排除隐藏文件）"""
    if not directory.exists():
        return []
    return sorted(
        [f for f in directory.iterdir() if f.is_file() and not f.name.startswith('.')],
        key=lambda f: f.stat().st_mtime,
        reverse=True,
    )


def _file_date(f: Path) -> str:
    """获取文件修改日期"""
    mtime = datetime.fromtimestamp(f.stat().st_mtime)
    return mtime.strftime('%m-%d')


def _count_pending_topics(record_path: Path) -> int:
    """统计待处理选题数量"""
    if not record_path.exists():
        return 0
    content = record_path.read_text(encoding='utf-8')
    return content.count('- [ ]')


# ── 数据回顾 ──────────────────────────────────────────────

def generate_data_review() -> str:
    """回顾最近的发布数据"""
    print_colored("\n" + "=" * 50, 'cyan')
    print_colored("📊 数据回顾", 'cyan')
    print_colored("=" * 50, 'cyan')

    sections = []
    sections.append("## 📊 数据回顾\n")

    stats_path = PROJECT_ROOT / "04-内容数据统计" / "数据统计表.md"
    if not stats_path.exists():
        sections.append("（未找到数据统计表）\n")
        return '\n'.join(sections)

    content = stats_path.read_text(encoding='utf-8')

    # 解析各平台最近数据
    for platform, marker in [
        ("X.com", "## X.com 数据"),
        ("小红书", "## 小红书数据"),
        ("抖音", "## 抖音数据"),
        ("公众号", "## 公众号数据"),
    ]:
        rows = _extract_table_rows(content, marker)
        if rows:
            sections.append(f"### {platform} 最近数据")
            for row in rows[-3:]:  # 最近 3 条
                sections.append(f"- {row}")
            sections.append("")
        else:
            sections.append(f"### {platform}\n- （暂无数据，记得发布后记录！）\n")

    # 提醒
    yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    sections.append(f"### 提醒\n- 昨天 ({yesterday}) 发布的内容记得补录数据\n")

    result = '\n'.join(sections)
    print_colored(f"✓ 数据回顾已生成", 'green')
    return result


def _extract_table_rows(content: str, section_marker: str) -> list:
    """从 Markdown 表格中提取数据行"""
    rows = []
    in_section = False
    skip_header = 0

    for line in content.split('\n'):
        if section_marker in line:
            in_section = True
            skip_header = 0
            continue
        if in_section and line.startswith('##'):
            break  # 下一个 section
        if in_section and line.startswith('|'):
            skip_header += 1
            if skip_header <= 2:  # 跳过表头和分隔线
                continue
            cells = [c.strip() for c in line.split('|')[1:-1]]
            # 跳过空行
            if any(c and c != '' for c in cells):
                rows.append(' | '.join(cells))

    return rows


# ── 主流程 ────────────────────────────────────────────────

def run_daily_research(
    keywords: list,
    subreddits: list,
    *,
    browser_ok: bool,
    skip_x: bool = False,
    skip_timeline: bool = False,
    skip_trending: bool = False,
    skip_search: bool = False,
    skip_following: bool = False,
    skip_hn: bool = False,
    skip_reddit: bool = False,
    hn_limit: int = 30,
    reddit_limit: int = 25,
) -> tuple[str, str]:
    """
    运行每日研究，返回 (report, topics_source_for_append)。

    - X.com 分析依赖浏览器（agent-browser-session）
    - Hacker News / Reddit 分析不依赖浏览器
    - 追加到选题池时，只使用 X.com 相关部分，避免外部内容噪音
    """
    from daily_research import (
        run_timeline,
        run_trending,
        run_search,
        run_analyze_following,
        run_hackernews,
        run_reddit,
    )

    x_sections = []
    if browser_ok:
        if not skip_timeline:
            x_sections.append(run_timeline())
        if not skip_trending:
            x_sections.append(run_trending())
        if not skip_search:
            x_sections.append(run_search(keywords))
        if not skip_following:
            x_sections.append(run_analyze_following())
    else:
        if skip_x:
            x_sections.append("（按 --skip-x 已跳过 X.com 分析）\n")
        else:
            x_sections.append("（浏览器未连接，已跳过 X.com 分析）\n")

    external_sections = []
    if not skip_hn:
        external_sections.append(run_hackernews(hn_limit))
    if not skip_reddit:
        external_sections.append(run_reddit(subreddits, reddit_limit))

    report = '\n---\n\n'.join([s for s in (x_sections + external_sections) if s])
    topics_source = '\n---\n\n'.join([s for s in x_sections if browser_ok and s]) if browser_ok else ""
    return report, topics_source


def main():
    from daily_research import DEFAULT_KEYWORDS, DEFAULT_SUBREDDITS

    parser = argparse.ArgumentParser(description='X.com 每日日程')
    parser.add_argument('--skip-x', action='store_true', help='跳过所有 X.com 浏览器分析，适合 GitHub Actions/CI')
    parser.add_argument('--skip-timeline', action='store_true', help='跳过 X Pro 多列分析')
    parser.add_argument('--skip-trending', action='store_true')
    parser.add_argument('--skip-search', action='store_true')
    parser.add_argument('--skip-following', action='store_true')
    parser.add_argument('--skip-hn', action='store_true', help='跳过 Hacker News 分析')
    parser.add_argument('--skip-reddit', action='store_true', help='跳过 Reddit 监控')
    parser.add_argument('--hn-limit', type=int, default=30, help='HN 帖子数量（默认 30）')
    parser.add_argument('--reddit-limit', type=int, default=25, help='每个 subreddit 帖子数量（默认 25）')
    parser.add_argument('--subreddits', nargs='+', default=DEFAULT_SUBREDDITS, help='监控的 subreddits')
    parser.add_argument('--skip-research', action='store_true',
                        help='跳过研究，只生成提醒和回顾')
    parser.add_argument('--keywords', nargs='+',
                        default=DEFAULT_KEYWORDS)
    args = parser.parse_args()

    print_colored("\n" + "=" * 60, 'green')
    print_colored(f"  🌅 X.com 每日日程 - {today_str()}", 'green')
    print_colored("=" * 60, 'green')

    ensure_dirs()
    report_sections = []

    # Header
    header = (
        f"# X.com 每日日程 - {today_str()}\n\n"
        f"- 生成时间: {now_str()}\n"
        f"- 搜索关键词: {', '.join(args.keywords)}\n\n"
        f"- 监控 Subreddits: {', '.join(args.subreddits)}\n\n"
        f"---\n\n"
    )
    report_sections.append(header)

    # Part 1: 发布提醒（不需要浏览器）
    report_sections.append(generate_publish_reminder())
    report_sections.append("---\n")

    # Part 2: 数据回顾（不需要浏览器）
    report_sections.append(generate_data_review())
    report_sections.append("---\n")

    # Part 3: 每日研究（X.com 需要浏览器，HN/Reddit 不需要）
    if not args.skip_research:
        browser_ok = False
        if args.skip_x:
            print_colored("ℹ️ 已启用 --skip-x：跳过 X.com 浏览器分析，仅生成 HN/Reddit 研究", 'cyan')
        else:
            browser_ok = ensure_browser()
        if not args.skip_x and not browser_ok:
            print_colored("⚠️ 浏览器未连接：将跳过 X.com 研究，但仍会生成 HN/Reddit 部分", 'yellow')

        report_sections.append("## 🔍 每日研究\n\n")
        research, topics_source = run_daily_research(
            args.keywords,
            args.subreddits,
            browser_ok=browser_ok,
            skip_x=args.skip_x,
            skip_timeline=args.skip_timeline,
            skip_trending=args.skip_trending,
            skip_search=args.skip_search,
            skip_following=args.skip_following,
            skip_hn=args.skip_hn,
            skip_reddit=args.skip_reddit,
            hn_limit=args.hn_limit,
            reddit_limit=args.reddit_limit,
        )
        report_sections.append(research)

        # 追加选题到记录（只使用 X.com 部分，避免噪音）
        if topics_source:
            from daily_research import append_topics_to_record
            append_topics_to_record(topics_source)

    # 保存报告
    full_report = '\n'.join(report_sections)

    report_path = str(PROJECT_ROOT / "05-选题研究" / f"X-每日日程-{today_str()}.md")
    save_report(full_report, report_path)

    print_colored("\n" + "=" * 60, 'green')
    print_colored("  ✅ 每日日程完成！", 'green')
    print_colored(f"  📄 报告: {report_path}", 'cyan')
    print_colored("=" * 60, 'green')


if __name__ == '__main__':
    main()
