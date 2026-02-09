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

def run_daily_research(keywords: list, skip_trending=False,
                       skip_search=False, skip_following=False) -> str:
    """运行每日研究（复用 daily_research.py 的逻辑）"""
    from daily_research import run_trending, run_search, run_analyze_following

    sections = []

    if not skip_trending:
        sections.append(run_trending())

    if not skip_search:
        sections.append(run_search(keywords))

    if not skip_following:
        sections.append(run_analyze_following())

    return '\n---\n\n'.join(sections)


def main():
    parser = argparse.ArgumentParser(description='X.com 每日日程')
    parser.add_argument('--skip-trending', action='store_true')
    parser.add_argument('--skip-search', action='store_true')
    parser.add_argument('--skip-following', action='store_true')
    parser.add_argument('--skip-research', action='store_true',
                        help='跳过研究，只生成提醒和回顾')
    parser.add_argument('--keywords', nargs='+',
                        default=['AI tools', 'solopreneur', 'crypto alpha'])
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
        f"---\n\n"
    )
    report_sections.append(header)

    # Part 1: 发布提醒（不需要浏览器）
    report_sections.append(generate_publish_reminder())
    report_sections.append("---\n")

    # Part 2: 数据回顾（不需要浏览器）
    report_sections.append(generate_data_review())
    report_sections.append("---\n")

    # Part 3: 每日研究（需要浏览器）
    if not args.skip_research:
        if not ensure_browser():
            print_colored("⚠️ 浏览器未连接，跳过研究部分", 'yellow')
            report_sections.append("## 🔍 每日研究\n\n（浏览器未连接，已跳过）\n")
        else:
            report_sections.append("## 🔍 每日研究\n\n")
            research = run_daily_research(
                args.keywords,
                skip_trending=args.skip_trending,
                skip_search=args.skip_search,
                skip_following=args.skip_following,
            )
            report_sections.append(research)

            # 追加选题到记录
            from daily_research import append_topics_to_record
            append_topics_to_record(research)

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
