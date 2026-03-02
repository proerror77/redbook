#!/usr/bin/env python3
"""
Hacker News 热门内容抓取和分析
使用 HN Official API 获取热门帖子和评论
"""

import sys
import requests
import argparse
from typing import List, Dict, Optional
from collections import Counter
from x_utils import (
    print_colored, today_str, now_str,
    PROJECT_ROOT, save_report
)


HN_API_BASE = "https://hacker-news.firebaseio.com/v0"
HN_ITEM_URL = "https://news.ycombinator.com/item?id={}"


def fetch_top_stories(limit: int = 30) -> List[int]:
    """获取 HN 首页热门帖子 ID 列表"""
    print_colored(f"获取 Top {limit} Stories...", 'yellow')
    try:
        response = requests.get(f"{HN_API_BASE}/topstories.json", timeout=10)
        response.raise_for_status()
        story_ids = response.json()[:limit]
        print_colored(f"✓ 获取到 {len(story_ids)} 条 Story IDs", 'green')
        return story_ids
    except Exception as e:
        print_colored(f"获取 Top Stories 失败: {e}", 'red')
        return []


def fetch_item(item_id: int) -> Optional[Dict]:
    """获取单个 item（story/comment）详情"""
    try:
        response = requests.get(f"{HN_API_BASE}/item/{item_id}.json", timeout=5)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print_colored(f"获取 item {item_id} 失败: {e}", 'red')
        return None


def fetch_stories_with_comments(story_ids: List[int], top_comments: int = 3) -> List[Dict]:
    """批量获取 stories 及其 top comments"""
    stories = []
    total = len(story_ids)

    for i, story_id in enumerate(story_ids, 1):
        print_colored(f"[{i}/{total}] 获取 Story {story_id}...", 'cyan')

        story = fetch_item(story_id)
        if not story or story.get('type') != 'story':
            continue

        # 提取基本信息
        story_data = {
            'id': story_id,
            'title': story.get('title', ''),
            'url': story.get('url', HN_ITEM_URL.format(story_id)),
            'score': story.get('score', 0),
            'by': story.get('by', 'unknown'),
            'time': story.get('time', 0),
            'descendants': story.get('descendants', 0),  # 总评论数
            'type_tag': _detect_story_type(story.get('title', '')),
            'comments': [],
            'hn_url': HN_ITEM_URL.format(story_id)
        }

        # 获取 top comments
        comment_ids = story.get('kids', [])[:top_comments]
        for cid in comment_ids:
            comment = fetch_item(cid)
            if comment and comment.get('text'):
                story_data['comments'].append({
                    'by': comment.get('by', 'unknown'),
                    'text': _clean_html(comment.get('text', '')),
                })

        stories.append(story_data)

    print_colored(f"✓ 共获取 {len(stories)} 条 stories", 'green')
    return stories


def _detect_story_type(title: str) -> str:
    """识别帖子类型标签"""
    title_lower = title.lower()
    if title_lower.startswith('show hn'):
        return 'Show HN'
    elif title_lower.startswith('ask hn'):
        return 'Ask HN'
    elif title_lower.startswith('tell hn'):
        return 'Tell HN'
    elif any(kw in title_lower for kw in ['ai', 'gpt', 'llm', 'claude', 'openai', 'machine learning']):
        return 'AI/ML'
    elif any(kw in title_lower for kw in ['crypto', 'bitcoin', 'blockchain', 'web3']):
        return 'Crypto/Web3'
    elif any(kw in title_lower for kw in ['startup', 'founder', 'vc', 'funding']):
        return 'Startup'
    elif any(kw in title_lower for kw in ['dev', 'code', 'programming', 'software']):
        return 'Dev Tools'
    else:
        return 'Other'


def _clean_html(text: str) -> str:
    """简单清理 HTML 标签（HN 评论是 HTML 格式）"""
    import re
    # 替换 <p> 为换行
    text = re.sub(r'<p>', '\n', text)
    # 移除所有 HTML 标签
    text = re.sub(r'<[^>]+>', '', text)
    # 解码 HTML entities
    import html
    text = html.unescape(text)
    return text.strip()


def analyze_hn_data(stories: List[Dict]) -> Dict:
    """分析 HN 数据"""
    print_colored("\n分析 HN 数据...", 'yellow')

    # 1. 按类型分类
    type_counter = Counter(s['type_tag'] for s in stories)

    # 2. 高互动帖子（评论数 > 50）
    hot_stories = sorted(
        [s for s in stories if s['descendants'] > 50],
        key=lambda x: x['descendants'],
        reverse=True
    )[:10]

    # 3. Show HN / Ask HN（创业机会）
    show_hn = [s for s in stories if s['type_tag'] == 'Show HN']
    ask_hn = [s for s in stories if s['type_tag'] == 'Ask HN']

    # 4. AI/ML 相关（热门技术趋势）
    ai_stories = [s for s in stories if s['type_tag'] == 'AI/ML']

    print_colored(f"✓ 识别 {len(type_counter)} 个类别", 'green')
    print_colored(f"✓ 发现 {len(hot_stories)} 个高互动帖子", 'green')

    return {
        'type_distribution': type_counter,
        'hot_stories': hot_stories,
        'show_hn': show_hn,
        'ask_hn': ask_hn,
        'ai_stories': ai_stories,
    }


def generate_hn_report(stories: List[Dict], analysis: Dict, output_file: Optional[str] = None) -> str:
    """生成 HN 分析报告"""
    print_colored("\n生成报告...", 'yellow')

    lines = []
    lines.append(f"# Hacker News 每日热点 - {today_str()}\n")
    lines.append(f"- 生成时间: {now_str()}")
    lines.append(f"- 分析帖子数: {len(stories)} 条\n")
    lines.append("---\n")

    # 1. 统计摘要
    lines.append("## 📊 统计摘要\n")
    lines.append(f"- **总帖子数**: {len(stories)} 条")
    lines.append(f"- **高互动帖子**: {len(analysis['hot_stories'])} 条（评论 > 50）")
    lines.append(f"- **Show HN**: {len(analysis['show_hn'])} 条")
    lines.append(f"- **Ask HN**: {len(analysis['ask_hn'])} 条")
    lines.append(f"- **AI/ML 相关**: {len(analysis['ai_stories'])} 条\n")
    lines.append("---\n")

    # 2. 类别分布
    lines.append("## 🏷 类别分布\n")
    for category, count in analysis['type_distribution'].most_common():
        lines.append(f"- **{category}**: {count} 条")
    lines.append("\n---\n")

    # 3. 高互动帖子（深度讨论）
    if analysis['hot_stories']:
        lines.append("## 🔥 高互动帖子（深度讨论）\n")
        for i, story in enumerate(analysis['hot_stories'][:10], 1):
            lines.append(f"### {i}. {story['title']}\n")
            lines.append(f"- **作者**: {story['by']}")
            lines.append(f"- **点赞**: {story['score']} | **评论**: {story['descendants']}")
            lines.append(f"- **类别**: {story['type_tag']}")
            lines.append(f"- **链接**: [{story['url']}]({story['url']})")
            lines.append(f"- **讨论**: {story['hn_url']}\n")

            # Top 评论
            if story['comments']:
                lines.append("**热门评论**:\n")
                for j, comment in enumerate(story['comments'][:2], 1):
                    comment_text = comment['text'][:200] + "..." if len(comment['text']) > 200 else comment['text']
                    lines.append(f"{j}. @{comment['by']}: {comment_text}\n")

            lines.append("---\n")

    # 4. Show HN（产品/项目展示）
    if analysis['show_hn']:
        lines.append("## 🚀 Show HN（创业项目）\n")
        for story in analysis['show_hn'][:5]:
            lines.append(f"### {story['title']}\n")
            lines.append(f"- 链接: [{story['url']}]({story['url']})")
            lines.append(f"- 讨论: {story['hn_url']}")
            lines.append(f"- 点赞: {story['score']} | 评论: {story['descendants']}\n")
        lines.append("---\n")

    # 5. Ask HN（问题/讨论）
    if analysis['ask_hn']:
        lines.append("## ❓ Ask HN（热门问题）\n")
        for story in analysis['ask_hn'][:5]:
            lines.append(f"### {story['title']}\n")
            lines.append(f"- 讨论: {story['hn_url']}")
            lines.append(f"- 点赞: {story['score']} | 评论: {story['descendants']}\n")
            if story['comments']:
                lines.append("**代表回答**:\n")
                for comment in story['comments'][:1]:
                    comment_text = comment['text'][:300] + "..." if len(comment['text']) > 300 else comment['text']
                    lines.append(f"> {comment_text}\n")
        lines.append("---\n")

    # 6. AI/ML 趋势
    if analysis['ai_stories']:
        lines.append("## 🤖 AI/ML 技术趋势\n")
        for story in analysis['ai_stories'][:5]:
            lines.append(f"- **{story['title']}** ({story['score']} ⬆️ | {story['descendants']} 💬)")
            lines.append(f"  - {story['url']}\n")
        lines.append("---\n")

    lines.append(f"\n*报告生成时间：{now_str()}*\n")

    report = '\n'.join(lines)

    # 保存报告
    if output_file is None:
        output_file = str(PROJECT_ROOT / "05-选题研究" / f"HN-每日热点-{today_str()}.md")

    save_report(report, output_file)

    return report


def main():
    parser = argparse.ArgumentParser(description='Hacker News 热门内容抓取')
    parser.add_argument('--limit', type=int, default=30,
                       help='抓取帖子数量（默认 30）')
    parser.add_argument('--comments', type=int, default=3,
                       help='每个帖子的评论数（默认 3）')
    parser.add_argument('--output', type=str,
                       help='输出文件路径（默认：05-选题研究/HN-每日热点-{日期}.md）')
    args = parser.parse_args()

    print_colored("\n🔥 Hacker News 热门内容抓取启动", 'green')
    print_colored(f"日期: {today_str()}\n", 'cyan')

    # 1. 获取 Top Stories IDs
    story_ids = fetch_top_stories(args.limit)
    if not story_ids:
        print_colored("未获取到 Stories，退出", 'red')
        sys.exit(1)

    # 2. 获取 Stories 详情和评论
    stories = fetch_stories_with_comments(story_ids, args.comments)
    if not stories:
        print_colored("未获取到 Stories 数据，退出", 'red')
        sys.exit(1)

    # 3. 分析数据
    analysis = analyze_hn_data(stories)

    # 4. 生成报告
    generate_hn_report(stories, analysis, args.output)

    print_colored("\n✅ HN 热门内容抓取完成！", 'green')


if __name__ == '__main__':
    main()
