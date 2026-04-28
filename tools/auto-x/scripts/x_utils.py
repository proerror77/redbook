#!/usr/bin/env python3
"""
X/Twitter 自动化工具 - 共享工具模块。

浏览器策略：
- 优先复用用户已登录的本机 Chrome CDP 会话（默认 127.0.0.1:9222）。
- 如果没有可用 CDP，再落到 agent-browser-session adapter。
- 默认强制 AGENT_BROWSER_HEADED=false；只有登录、验证码或人工视觉确认才应切 headed。
"""

import subprocess
import re
import json
import time
import urllib.request
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional

import os

# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
AUTO_X_DIR = Path(__file__).parent.parent
DATA_DIR = AUTO_X_DIR / "data"
DAILY_DIR = DATA_DIR / "daily"
DEFAULT_CDP_PORT = 9222
DEFAULT_TABNAME = os.environ.get("AUTO_X_AGENT_BROWSER_TABNAME", "redbook-autox")

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


def run_abs_result(command: str, timeout: int = 30) -> dict:
    """
    执行 agent-browser-session 命令并返回结构化结果

    Returns:
        {
            'ok': bool,
            'stdout': str,
            'stderr': str,
            'returncode': int,
        }
    """
    cdp_port = _detect_local_cdp_port()
    full_cmd = _build_agent_browser_command(command, cdp_port)
    env = {
        **os.environ,
        'PATH': f"/opt/homebrew/bin:{Path.home()}/.local/bin:{os.environ.get('PATH', '')}",
        'AGENT_BROWSER_HEADED': os.environ.get('AGENT_BROWSER_HEADED', 'false'),
    }
    try:
        result = subprocess.run(
            full_cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=env,
        )
        stdout = result.stdout.strip()
        stderr = result.stderr.strip()
        if result.returncode != 0 and stderr:
            print_colored(f"agent-browser-session 警告: {stderr}", 'yellow')
        return {
            'ok': result.returncode == 0,
            'stdout': stdout,
            'stderr': stderr,
            'returncode': result.returncode,
        }
    except subprocess.TimeoutExpired:
        print_colored(f"agent-browser-session 命令超时 ({timeout}s): {command}", 'red')
        return {
            'ok': False,
            'stdout': '',
            'stderr': f"timeout after {timeout}s",
            'returncode': -1,
        }
    except FileNotFoundError:
        print_colored("错误: 未找到 agent-browser-session，请确认已安装", 'red')
        return {
            'ok': False,
            'stdout': '',
            'stderr': 'agent-browser-session not found',
            'returncode': -1,
        }


def run_abs(command: str, timeout: int = 30) -> str:
    """
    执行 agent-browser-session 命令并返回输出

    Args:
        command: 子命令（如 'open "url"', 'snapshot', 'scroll down 800'）
        timeout: 超时时间（秒）

    Returns:
        命令的 stdout 输出
    """
    return run_abs_result(command, timeout=timeout)['stdout']


def _detect_local_cdp_port() -> Optional[int]:
    """
    Prefer the user's already-logged-in Chrome session when a local CDP port is available.

    Resolution order:
    1. AUTO_X_AGENT_BROWSER_CDP_PORT / AGENT_BROWSER_CDP_PORT
    2. default 9222 if reachable
    """
    raw_port = os.environ.get("AUTO_X_AGENT_BROWSER_CDP_PORT") or os.environ.get("AGENT_BROWSER_CDP_PORT")
    candidates = []
    if raw_port:
        try:
            candidates.append(int(raw_port))
        except ValueError:
            pass
    candidates.append(DEFAULT_CDP_PORT)

    seen = set()
    for port in candidates:
        if port in seen:
            continue
        seen.add(port)
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/json/version", timeout=1.5) as resp:
                if resp.status == 200:
                    return port
        except Exception:
            continue
    return None


def _build_agent_browser_command(command: str, cdp_port: Optional[int]) -> str:
    prefix = "agent-browser-session"
    if cdp_port is not None:
        prefix += f" --cdp {cdp_port}"
        if DEFAULT_TABNAME:
            prefix += f" --tabname {DEFAULT_TABNAME}"
    return f"{prefix} {command}"


# 向后兼容别名
run_ab = run_abs


def ensure_browser() -> bool:
    """
    检查 agent-browser-session 是否可用

    Returns:
        True 如果连接正常
    """
    cdp_port = _detect_local_cdp_port()
    if cdp_port is not None:
        print_colored(f"✓ browser mode: logged-in Chrome/CDP {cdp_port}; headed only if that Chrome is already visible", 'green')
    else:
        print_colored("✓ browser mode: agent-browser-session adapter with AGENT_BROWSER_HEADED=false", 'green')

    snapshot = run_abs_result("snapshot -c -d 2", timeout=15)
    if _snapshot_looks_ready(snapshot['stdout']):
        print_colored("✓ agent-browser-session 已就绪", 'green')
        return True

    if _is_recoverable_browser_failure(snapshot):
        print_colored("检测到浏览器会话失稳，尝试自动恢复...", 'yellow')
        if _recover_browser_session():
            recovered = run_abs_result("snapshot -c -d 2", timeout=15)
            if _snapshot_looks_ready(recovered['stdout']):
                print_colored("✓ agent-browser-session 已自动恢复", 'green')
                return True

    print_colored("agent-browser-session 未就绪。可能是会话卡在失效 frame 或 daemon 启动失败：", 'red')
    print_colored("  先执行: agent-browser-session kill", 'yellow')
    print_colored("  再执行: agent-browser-session open https://x.com/home", 'yellow')
    print_colored("  最后确认: agent-browser-session snapshot -c -d 2", 'yellow')
    return False


def _snapshot_looks_ready(output: str) -> bool:
    """
    判断 snapshot 输出是否像一个可用页面

    兼容 agent-browser-session 不同版本的输出，不再依赖旧的 `- document:` 形态。
    """
    if not output:
        return False

    normalized = output.strip()
    if not normalized or normalized in {'Empty page', 'about:blank'}:
        return False

    valid_markers = (
        '- document',
        '[ref=',
        '- heading',
        '- button',
        '- link',
        '- main',
        '- navigation',
        '- banner',
        '- region',
        '- textbox',
    )
    return any(marker in normalized for marker in valid_markers)


def snapshot_has_x_unavailable_markers(output: str) -> bool:
    """
    Detect X/Twitter pages that are technically rendered but not usable for research.

    Typical cases:
    - login wall / marketing landing page
    - "this page doesn't exist" / deleted route
    """
    if not output:
        return True

    normalized = output.strip().lower()
    markers = (
        "新鲜事一网打尽",
        "登录",
        "注册",
        "唔...该页面不存在",
        "该页面不存在",
        "page doesn't exist",
        "try searching for something else",
    )
    return any(marker.lower() in normalized for marker in markers)


def _is_recoverable_browser_failure(result: dict) -> bool:
    """
    判断是否是可通过重建 session 恢复的错误
    """
    combined = f"{result.get('stdout', '')}\n{result.get('stderr', '')}".lower()
    recoverable_markers = (
        'frame was detached',
        'daemon failed to start',
        'empty page',
        'waiting for locator',
    )
    return any(marker in combined for marker in recoverable_markers)


def _recover_browser_session() -> bool:
    """
    尝试把 agent-browser-session 从坏掉的 frame / daemon 状态中拉回到稳定的 X 页面
    """
    cdp_port = _detect_local_cdp_port()
    if cdp_port is None:
        run_abs_result("kill", timeout=10)
        time.sleep(1.0)

    open_result = run_abs_result('open "https://x.com/home"', timeout=45)
    if not open_result['ok']:
        return False

    time.sleep(2.0)
    url_result = run_abs_result("get url", timeout=10)
    current_url = url_result['stdout'].strip()
    if current_url and current_url != 'https://x.com/home' and 'x.com' not in current_url:
        run_abs_result('open "https://x.com/home"', timeout=45)
        time.sleep(2.0)

    return True


def navigate(url: str, wait: float = 2.0) -> None:
    """
    打开页面并等待加载

    Args:
        url: 目标 URL
        wait: 加载后等待时间（秒）
    """
    run_abs(f'open "{url}"', timeout=30)
    time.sleep(wait)


def get_snapshot() -> str:
    """
    获取当前页面的 accessibility tree snapshot

    Returns:
        页面 snapshot 文本
    """
    return run_abs("snapshot", timeout=15)


def _tweet_key(tweet: Dict) -> str:
    """Return a stable-enough key for de-duplicating timeline snapshots."""
    handle = tweet.get('handle', '')
    content = tweet.get('content', '')[:80]
    return f"{handle}:{content}"


def scroll_and_collect(
    times: int = 3,
    wait: float = 2.0,
    distance: int = 800,
    stop_when_stale: bool = False,
    max_stale_rounds: int = 5,
) -> List[str]:
    """
    滚动页面并收集每次滚动后的 snapshot

    Args:
        times: 滚动次数
        wait: 每次滚动后等待时间（秒）
        distance: 每次向下滚动的像素距离
        stop_when_stale: 若连续多轮没有新增推文，提前停止
        max_stale_rounds: 允许连续无新增推文的最大轮数

    Returns:
        所有 snapshot 文本的列表
    """
    snapshots = []
    seen_tweet_keys = set()
    stale_rounds = 0
    for i in range(times):
        snapshot = get_snapshot()
        if snapshot:
            snapshots.append(snapshot)
            tweets = extract_tweets(snapshot)
            new_count = 0
            for tweet in tweets:
                key = _tweet_key(tweet)
                if key and key not in seen_tweet_keys:
                    seen_tweet_keys.add(key)
                    new_count += 1

            if stop_when_stale:
                if new_count == 0:
                    stale_rounds += 1
                else:
                    stale_rounds = 0
                if stale_rounds >= max_stale_rounds:
                    print_colored(
                        f"连续 {stale_rounds} 轮没有新增推文，提前停止滚动",
                        'yellow',
                    )
                    break

        run_abs(f'scroll down {distance}')
        time.sleep(wait)
    # 最后一次滚动后再取一次
    final = get_snapshot()
    if final:
        snapshots.append(final)
    return snapshots


def extract_tweets(snapshot: str) -> List[Dict]:
    """
    从 agent-browser-session snapshot 文本中解析推文数据

    agent-browser-session 的 accessibility tree 结构：
    - article:
      - @handle 和显示名
      - text: 推文内容
      - 互动数据（X 回复、Y 次转帖、Z 喜欢）

    Args:
        snapshot: agent-browser-session snapshot 输出文本

    Returns:
        推文字典列表 [{author, handle, content, likes, retweets, replies}]
    """
    tweets = []
    if not snapshot:
        return tweets

    articles = _extract_article_blocks(snapshot)

    for article in articles:
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

            if i == 0:
                _populate_tweet_from_article_header(tweet, stripped)

            # 1. 提取 @handle
            if not found_handle:
                handle_match = re.search(r'^-\s*link\s+"@(\w{1,15})"', stripped)
                if not handle_match:
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
                    if not tweet['author']:
                        tweet['author'] = _extract_author_from_line(stripped, tweet['handle'])
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
        elif lines:
            tweet['content'] = _extract_content_from_header(lines[0], tweet['handle'])

        # 只保存有效推文（有 handle 和内容）
        if tweet['handle'] and tweet['content']:
            if not tweet['author']:
                tweet['author'] = tweet['handle']
            tweets.append(tweet)

    return tweets


def _extract_article_blocks(snapshot: str) -> List[str]:
    """提取每个 article 的完整文本块，兼容新版 `- article "..."` 形态。"""
    lines = snapshot.splitlines()
    blocks = []
    current_block: List[str] = []
    article_indent: Optional[int] = None

    for line in lines:
        article_match = re.match(r"^(\s*)-\s*['\"]?article\b.*$", line)
        if article_match:
            if current_block:
                blocks.append('\n'.join(current_block).strip())
            current_block = [line]
            article_indent = len(article_match.group(1))
            continue

        if current_block:
            peer_match = re.match(r"^(\s*)-\s+", line)
            if peer_match and article_indent is not None and len(peer_match.group(1)) <= article_indent:
                blocks.append('\n'.join(current_block).strip())
                current_block = []
                article_indent = None

            if current_block:
                current_block.append(line)

    if current_block:
        blocks.append('\n'.join(current_block).strip())

    return blocks


def _populate_tweet_from_article_header(tweet: Dict, header_line: str) -> None:
    """从 article 头行补齐作者、handle 和互动数据。"""
    handle_match = re.search(r'@(\w{1,15})', header_line)
    if handle_match and not tweet['handle']:
        tweet['handle'] = handle_match.group(1)

    if tweet['handle'] and not tweet['author']:
        tweet['author'] = _extract_author_from_line(header_line, tweet['handle'])

    replies_match = re.search(r'(\d[\d,.]*)\s*回复', header_line)
    if replies_match:
        tweet['replies'] = _parse_number(replies_match.group(1))

    retweets_match = re.search(r'(\d[\d,.]*)\s*次转帖', header_line)
    if retweets_match:
        tweet['retweets'] = _parse_number(retweets_match.group(1))

    likes_match = re.search(r'(\d[\d,.]*)\s*喜欢', header_line)
    if likes_match:
        tweet['likes'] = _parse_number(likes_match.group(1))


def _extract_author_from_line(line: str, handle: str) -> str:
    """从 article/link 行里提取作者显示名。"""
    text = re.sub(r"^\s*-\s*['\"]?article\s+\"?", "", line)
    text = re.sub(r'^\s*-\s*link\s+"?', '', text)
    before_handle = text.split(f"@{handle}", 1)[0]
    author = before_handle.replace("认证账号", "").strip(" '\":")
    return author


def _extract_content_from_header(header_line: str, handle: str) -> str:
    """当 article 子节点没有可用 text 时，从头行回退提取正文。"""
    if not handle:
        return ""

    text = re.sub(r"^\s*-\s*['\"]?article\s+\"?", "", header_line).strip()
    if f"@{handle}" not in text:
        return ""

    content = text.split(f"@{handle}", 1)[1].strip()
    content = re.sub(r'^(?:\d{1,2}月\d{1,2}日|昨天|今天|刚刚)\s*', '', content)
    content = re.sub(r'\d[\d,.]*\s*回复.*$', '', content).strip(" '\":,，")
    return content


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
