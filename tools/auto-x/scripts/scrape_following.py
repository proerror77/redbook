#!/usr/bin/env python3
"""
X/Twitter 关注列表抓取工具
使用 agent-browser 抓取指定用户的关注列表，输出 JSON + Markdown 报告
"""

import sys
import json
from pathlib import Path
from x_utils import (
    ensure_browser, navigate, get_snapshot, scroll_and_collect,
    extract_users, dedupe_users, save_report, ensure_dirs,
    print_colored, today_str, now_str,
    DATA_DIR, PROJECT_ROOT,
)


DEFAULT_USERNAME = "0xcybersmile"
DEFAULT_SCROLL_TIMES = 5


def scrape_following(username: str, scroll_times: int = DEFAULT_SCROLL_TIMES) -> list:
    """
    抓取指定用户的关注列表

    Args:
        username: X.com 用户名
        scroll_times: 滚动次数（越多抓取越多）

    Returns:
        用户信息列表
    """
    print_colored(f"\n=== 抓取 @{username} 的关注列表 ===", 'green')

    # 打开关注列表页面
    url = f"https://x.com/{username}/following"
    print_colored(f"打开: {url}", 'yellow')
    navigate(url, wait=3.0)

    # 滚动并收集数据
    print_colored(f"滚动收集数据（{scroll_times} 次）...", 'yellow')
    snapshots = scroll_and_collect(times=scroll_times, wait=2.0)
    print_colored(f"收集到 {len(snapshots)} 个 snapshot", 'cyan')

    # 从所有 snapshot 中提取用户
    all_users = []
    for snap in snapshots:
        users = extract_users(snap)
        all_users.extend(users)

    # 去重
    unique_users = dedupe_users(all_users)

    # 过滤掉自己
    unique_users = [u for u in unique_users if u['username'].lower() != username.lower()]

    # 添加抓取时间
    for user in unique_users:
        user['scraped_at'] = today_str()

    print_colored(f"✓ 共发现 {len(unique_users)} 个关注账号", 'green')
    return unique_users


def save_following_json(users: list, output_path: str = None) -> str:
    """保存关注列表为 JSON"""
    ensure_dirs()
    path = Path(output_path) if output_path else DATA_DIR / "following.json"

    # 如果已有数据，合并去重
    existing = []
    if path.exists():
        try:
            existing = json.loads(path.read_text(encoding='utf-8'))
        except (json.JSONDecodeError, OSError):
            pass

    # 合并：新数据覆盖旧数据（按 username）
    merged = {u['username']: u for u in existing}
    for u in users:
        merged[u['username']] = u
    result = list(merged.values())

    path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print_colored(f"✓ JSON 已保存: {path} ({len(result)} 个账号)", 'green')
    return str(path)


def generate_report(users: list, username: str) -> str:
    """生成关注列表 Markdown 报告"""
    lines = [
        f"# @{username} 关注列表",
        f"",
        f"- 抓取时间: {now_str()}",
        f"- 关注账号数: {len(users)}",
        f"",
        f"## 关注列表",
        f"",
        f"| # | 用户名 | 显示名 | 简介 |",
        f"|---|--------|--------|------|",
    ]

    for i, u in enumerate(users, 1):
        bio = u.get('bio', '')[:80]
        if len(u.get('bio', '')) > 80:
            bio += '...'
        lines.append(
            f"| {i} | @{u['username']} | {u.get('display_name', '')} | {bio} |"
        )

    return '\n'.join(lines) + '\n'


def main():
    username = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_USERNAME
    scroll_times = int(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_SCROLL_TIMES

    if not ensure_browser():
        sys.exit(1)

    users = scrape_following(username, scroll_times)

    if not users:
        print_colored("未抓取到任何关注账号，请检查页面是否正常加载", 'red')
        sys.exit(1)

    # 保存 JSON
    save_following_json(users)

    # 生成并保存报告
    report = generate_report(users, username)
    report_path = PROJECT_ROOT / "05-选题研究" / f"X-关注列表-{username}-{today_str()}.md"
    save_report(report, str(report_path))


if __name__ == '__main__':
    main()
