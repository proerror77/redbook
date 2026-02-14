#!/usr/bin/env python3
"""
X/Twitter 自动化工具 - 共享工具模块
提供 actionbook 浏览器交互封装、数据解析、报告生成等通用功能
"""

import subprocess
import re
import json
import time
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional

import os

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
    执行 actionbook browser 命令并返回输出

    Args:
        command: 浏览器子命令（如 'open "url"', 'snapshot', 'eval "window.scrollBy(0,800)"'）
        timeout: 超时时间（秒）

    Returns:
        命令的 stdout 输出
    """
    full_cmd = f"actionbook browser {command}"
    env = {**os.environ, 'PATH': f"{Path.home()}/.local/bin:{os.environ.get('PATH', '')}"}
    try:
        result = subprocess.run(
            full_cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=env,
        )
        if result.returncode != 0 and result.stderr:
            print_colored(f"actionbook 警告: {result.stderr.strip()}", 'yellow')
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        print_colored(f"actionbook 命令超时 ({timeout}s): {command}", 'red')
        return ""
    except FileNotFoundError:
        print_colored("错误: 未找到 actionbook，请确认已安装", 'red')
        return ""


def ensure_browser() -> bool:
    """
    检查 actionbook 浏览器连接状态

    Returns:
        True 如果连接正常
    """
    output = run_ab("snapshot", timeout=10)
    # 检查是否有有效的 accessibility tree 输出（而不是简单查找 "error"）
    if not output or len(output) < 100 or "- generic:" not in output:
        print_colored("actionbook 未连接，请先启动 Chrome 并连接:", 'red')
        print_colored('  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" '
                      '--remote-debugging-port=9222 '
                      '--user-data-dir="$HOME/.local/share/chrome-debug-profile" '
                      '--no-first-run &', 'yellow')
        print_colored('  actionbook browser connect 9222', 'yellow')
        return False
    print_colored("✓ actionbook 已连接", 'green')
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
        run_ab('eval "window.scrollBy(0, 800)"')
        time.sleep(wait)
    # 最后一次滚动后再取一次
    final = get_snapshot()
    if final:
        snapshots.append(final)
    return snapshots


def extract_tweets(snapshot: str) -> List[Dict]:
    """
    从 actionbook snapshot 文本中解析推文数据

    actionbook 的 accessibility tree 结构：
    - article:
      - @handle 和显示名
      - text: 推文内容
      - 互动数据（X 回复、Y 次转帖、Z 喜欢）

    Args:
        snapshot: actionbook snapshot 输出文本

    Returns:
        推文字典列表 [{author, handle, content, likes, retweets, replies}]
    """
    tweets = []
    if not snapshot:
        return tweets

    # 按 article 分割（每条推文是一个 article）
    articles = re.split(r'^\s*-\s*article:', snapshot, flags=re.MULTILINE)

    for article in articles[1:]:  # 跳过第一个空分割
        tweet = {
            'author': '',
            'handle': '',
            'content': '',
            'likes': 0,
            'retweets': 0,
            'replies': 0,
        }

        lines = article.split('\n')
        text_lines = []
        found_handle = False
        in_content = False

        for i, line in enumerate(lines):
            stripped = line.strip()

            # 1. 提取 @handle
            if not found_handle:
                handle_match = re.search(r'@(\w{1,15})', stripped)
                if handle_match:
                    tweet['handle'] = handle_match.group(1)
                    found_handle = True
                    # 向上查找显示名（通常在 handle 上方的 text: 行）
                    for j in range(i-1, max(0, i-10), -1):
                        prev_line = lines[j].strip()
                        if prev_line.startswith('- text:'):
                            author_text = prev_line.replace('- text:', '').strip()
                            if author_text and not author_text.startswith('@'):
                                tweet['author'] = author_text
                                break
                    continue

            # 2. 提取推文内容（handle 之后的 text: 行）
            if found_handle and not in_content:
                if stripped.startswith('- text:'):
                    content_text = stripped.replace('- text:', '').strip()
                    # 排除 UI 元素和作者名
                    if (content_text
                        and not content_text.startswith('@')
                        and not content_text in ['主页', '探索', '通知', '聊天', '书签']
                        and len(content_text) > 10):  # 推文至少 10 字符
                        in_content = True
                        text_lines.append(content_text)
                        # 继续收集多行内容（直到遇到互动数据）
                        for k in range(i+1, len(lines)):
                            next_line = lines[k].strip()
                            if next_line.startswith('- text:'):
                                next_text = next_line.replace('- text:', '').strip()
                                # 检查是否是互动数据的开始
                                if '回复' in next_text or '转帖' in next_text or '喜欢' in next_text:
                                    break
                                if next_text and len(next_text) > 5:
                                    text_lines.append(next_text)
                            elif '回复' in next_line or '转帖' in next_line:
                                break

            # 3. 提取互动数据
            # 格式：X 回复、Y 次转帖、Z 喜欢
            if '次转帖' in stripped or '喜欢' in stripped or '回复' in stripped:
                # 提取回复数
                replies_match = re.search(r'(\d[\d,]*)\s*回复', stripped)
                if replies_match:
                    tweet['replies'] = _parse_number(replies_match.group(1))

                # 提取转发数
                retweets_match = re.search(r'(\d[\d,]*)\s*次转帖', stripped)
                if retweets_match:
                    tweet['retweets'] = _parse_number(retweets_match.group(1))

                # 提取点赞数
                likes_match = re.search(r'(\d[\d,]*)\s*喜欢', stripped)
                if likes_match:
                    tweet['likes'] = _parse_number(likes_match.group(1))

        # 组装推文内容
        if text_lines:
            tweet['content'] = ' '.join(text_lines).strip()

        # 只保存有效推文（有 handle 和内容）
        if tweet['handle'] and tweet['content']:
            if not tweet['author']:
                tweet['author'] = tweet['handle']
            tweets.append(tweet)

    return tweets

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
