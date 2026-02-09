#!/usr/bin/env python3
"""
X/Twitter 自动化工具 - 共享工具模块
提供 agent-browser 交互封装、数据解析、报告生成等通用功能
"""

import subprocess
import re
import json
import time
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional


# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
AUTO_X_DIR = Path(__file__).parent.parent
DATA_DIR = AUTO_X_DIR / "data"
DAILY_DIR = DATA_DIR / "daily"

# 颜色输出
COLORS = {
    'red': '\033[0;31m',
    'green': '\033[0;32m',
    'yellow': '\033[1;33m',
    'blue': '\033[0;34m',
    'cyan': '\033[0;36m',
    'nc': '\033[0m',
}


def print_colored(text: str, color: str = 'nc'):
    """打印彩色文本"""
    print(f"{COLORS.get(color, '')}{text}{COLORS['nc']}")


def run_ab(command: str, timeout: int = 30) -> str:
    """
    执行 agent-browser 命令并返回输出

    Args:
        command: agent-browser 子命令（如 'open "url"', 'snapshot', 'scroll down 800'）
        timeout: 超时时间（秒）

    Returns:
        命令的 stdout 输出
    """
    full_cmd = f"agent-browser {command}"
    try:
        result = subprocess.run(
            full_cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode != 0 and result.stderr:
            print_colored(f"agent-browser 警告: {result.stderr.strip()}", 'yellow')
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        print_colored(f"agent-browser 命令超时 ({timeout}s): {command}", 'red')
        return ""
    except FileNotFoundError:
        print_colored("错误: 未找到 agent-browser，请确认已安装", 'red')
        return ""


def ensure_browser() -> bool:
    """
    检查 agent-browser 连接状态

    Returns:
        True 如果连接正常
    """
    output = run_ab("snapshot", timeout=10)
    if not output or "unknown" in output.lower() or "error: no" in output.lower():
        print_colored("agent-browser 未连接，请先启动 Chrome 并连接:", 'red')
        print_colored('  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" '
                      '--remote-debugging-port=9222 '
                      '--user-data-dir="$HOME/.local/share/chrome-debug-profile" '
                      '--no-first-run &', 'yellow')
        print_colored('  agent-browser connect 9222', 'yellow')
        return False
    print_colored("✓ agent-browser 已连接", 'green')
    return True


def navigate(url: str, wait: float = 2.0) -> None:
    """
    打开页面并等待加载

    Args:
        url: 目标 URL
        wait: 加载后等待时间（秒）
    """
    run_ab(f'open "{url}"', timeout=30)
    time.sleep(wait)


def get_snapshot() -> str:
    """
    获取当前页面的 accessibility tree snapshot

    Returns:
        页面 snapshot 文本
    """
    return run_ab("snapshot", timeout=15)


def scroll_and_collect(times: int = 3, wait: float = 2.0) -> List[str]:
    """
    滚动页面并收集每次滚动后的 snapshot

    Args:
        times: 滚动次数
        wait: 每次滚动后等待时间（秒）

    Returns:
        所有 snapshot 文本的列表
    """
    snapshots = []
    for i in range(times):
        snapshot = get_snapshot()
        if snapshot:
            snapshots.append(snapshot)
        run_ab("scroll down 800")
        time.sleep(wait)
    # 最后一次滚动后再取一次
    final = get_snapshot()
    if final:
        snapshots.append(final)
    return snapshots


def extract_tweets(snapshot: str) -> List[Dict]:
    """
    从 agent-browser snapshot 文本中解析推文数据

    snapshot 的 accessibility tree 通常包含类似结构：
    - 用户名/显示名
    - 推文正文
    - 互动数据（回复、转发、点赞）

    Args:
        snapshot: agent-browser snapshot 输出文本

    Returns:
        推文字典列表 [{author, handle, content, likes, retweets, replies}]
    """
    tweets = []
    if not snapshot:
        return tweets

    lines = snapshot.split('\n')
    current_tweet = {}
    content_lines = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # 匹配 @handle 格式（推文作者）
        handle_match = re.search(r'@(\w{1,15})', line)

        # 匹配互动数据：数字 + replies/reposts/likes
        likes_match = re.search(r'(\d[\d,.]*)\s*(?:likes?|Likes?)', line)
        retweets_match = re.search(r'(\d[\d,.]*)\s*(?:reposts?|Reposts?|retweets?)', line)
        replies_match = re.search(r'(\d[\d,.]*)\s*(?:replies?|Replies?)', line)

        # 检测推文边界：当遇到新的 handle 且已有内容时，保存上一条
        if handle_match and content_lines and current_tweet.get('handle'):
            current_tweet['content'] = ' '.join(content_lines).strip()
            if current_tweet['content']:
                tweets.append(current_tweet)
            current_tweet = {}
            content_lines = []

        if handle_match and not current_tweet.get('handle'):
            current_tweet['handle'] = handle_match.group(1)
            # 尝试从同一行提取显示名（handle 前面的文本）
            before_handle = line[:handle_match.start()].strip()
            if before_handle:
                current_tweet['author'] = before_handle
            else:
                current_tweet['author'] = handle_match.group(1)

        if likes_match:
            current_tweet['likes'] = _parse_number(likes_match.group(1))
        if retweets_match:
            current_tweet['retweets'] = _parse_number(retweets_match.group(1))
        if replies_match:
            current_tweet['replies'] = _parse_number(replies_match.group(1))

        # 收集内容行（排除明显的 UI 元素）
        if (current_tweet.get('handle')
                and not handle_match
                and not likes_match
                and not retweets_match
                and not _is_ui_element(line)):
            content_lines.append(line)

    # 保存最后一条推文
    if current_tweet.get('handle') and content_lines:
        current_tweet['content'] = ' '.join(content_lines).strip()
        if current_tweet['content']:
            tweets.append(current_tweet)

    # 填充默认值
    for tweet in tweets:
        tweet.setdefault('author', tweet.get('handle', ''))
        tweet.setdefault('likes', 0)
        tweet.setdefault('retweets', 0)
        tweet.setdefault('replies', 0)
        tweet.setdefault('content', '')

    return tweets


def _parse_number(text: str) -> int:
    """解析数字字符串，支持逗号分隔（如 1,234）"""
    try:
        return int(text.replace(',', '').replace('.', ''))
    except (ValueError, AttributeError):
        return 0


def _is_ui_element(line: str) -> bool:
    """判断是否为 UI 元素（非推文内容）"""
    ui_patterns = [
        'Follow', 'Following', 'More', 'Share', 'Bookmark',
        'Copy link', 'Show more', 'Show this thread',
        'Promoted', 'Ad', 'Verified', 'Subscribe',
    ]
    stripped = line.strip()
    return stripped in ui_patterns or len(stripped) < 2


def extract_users(snapshot: str) -> List[Dict]:
    """
    从 snapshot 中提取用户信息（用于关注列表页面）

    Returns:
        用户字典列表 [{username, display_name, bio}]
    """
    users = []
    if not snapshot:
        return users

    lines = snapshot.split('\n')
    current_user = {}
    bio_lines = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        handle_match = re.search(r'@(\w{1,15})', line)

        if handle_match:
            # 保存上一个用户
            if current_user.get('username'):
                current_user['bio'] = ' '.join(bio_lines).strip()
                users.append(current_user)
                bio_lines = []

            current_user = {
                'username': handle_match.group(1),
                'display_name': line[:handle_match.start()].strip() or handle_match.group(1),
            }
        elif current_user.get('username') and not _is_ui_element(line):
            bio_lines.append(line)

    # 保存最后一个用户
    if current_user.get('username'):
        current_user['bio'] = ' '.join(bio_lines).strip()
        users.append(current_user)

    return users


def dedupe_tweets(tweets: List[Dict]) -> List[Dict]:
    """按 handle+content 前50字符去重"""
    seen = set()
    result = []
    for t in tweets:
        key = f"{t.get('handle', '')}:{t.get('content', '')[:50]}"
        if key not in seen:
            seen.add(key)
            result.append(t)
    return result


def dedupe_users(users: List[Dict]) -> List[Dict]:
    """按 username 去重"""
    seen = set()
    result = []
    for u in users:
        if u['username'] not in seen:
            seen.add(u['username'])
            result.append(u)
    return result


def today_str() -> str:
    """返回今日日期字符串 YYYY-MM-DD"""
    return datetime.now().strftime('%Y-%m-%d')


def now_str() -> str:
    """返回当前时间字符串"""
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')


def save_report(content: str, path: str) -> None:
    """保存 Markdown 报告到文件"""
    filepath = Path(path)
    filepath.parent.mkdir(parents=True, exist_ok=True)
    filepath.write_text(content, encoding='utf-8')
    print_colored(f"✓ 报告已保存: {filepath}", 'green')


def ensure_dirs():
    """确保数据目录存在"""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    DAILY_DIR.mkdir(parents=True, exist_ok=True)
