#!/usr/bin/env python3
"""
Reddit JSON Hack - 发现创业机会的工具
从 Reddit 讨论中提取用户痛点和需求
"""

import json
import requests
import sys
from typing import List, Dict
from datetime import datetime

def fetch_reddit_json(url: str) -> Dict:
    """获取 Reddit 帖子的 JSON 数据"""
    if not url.endswith('.json'):
        url = url.rstrip('/') + '/.json'

    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"错误: 无法获取数据 - {e}")
        sys.exit(1)

def extract_pain_points(data: Dict) -> List[Dict]:
    """从 Reddit 数据中提取痛点和需求"""
    pain_points = []

    # 关键词列表（用于识别痛点）
    pain_keywords = [
        'wish', 'need', 'want', 'problem', 'issue', 'frustrating',
        'annoying', 'difficult', 'hard', 'impossible', 'missing',
        'lacking', 'should have', 'would be nice', 'hate',
        '希望', '需要', '想要', '问题', '困难', '烦人', '缺少'
    ]

    def process_comments(comments, depth=0):
        """递归处理评论"""
        if not isinstance(comments, list):
            return

        for item in comments:
            if item.get('kind') != 't1':  # t1 是评论类型
                continue

            comment_data = item.get('data', {})
            body = comment_data.get('body', '').lower()
            author = comment_data.get('author', 'unknown')
            score = comment_data.get('score', 0)

            # 检查是否包含痛点关键词
            has_pain_keyword = any(keyword in body for keyword in pain_keywords)

            if has_pain_keyword and score > 0:  # 只保留有点赞的评论
                pain_points.append({
                    'author': author,
                    'content': comment_data.get('body', ''),
                    'score': score,
                    'depth': depth,
                    'created': datetime.fromtimestamp(
                        comment_data.get('created_utc', 0)
                    ).strftime('%Y-%m-%d %H:%M:%S')
                })

            # 递归处理回复
            replies = comment_data.get('replies', {})
            if isinstance(replies, dict):
                reply_data = replies.get('data', {})
                children = reply_data.get('children', [])
                process_comments(children, depth + 1)

    # 处理帖子数据
    if isinstance(data, list) and len(data) > 1:
        comments_data = data[1].get('data', {}).get('children', [])
        process_comments(comments_data)

    return pain_points

def analyze_pain_points(pain_points: List[Dict]) -> Dict:
    """分析痛点，生成创业机会报告"""
    if not pain_points:
        return {
            'total_count': 0,
            'high_score_count': 0,
            'opportunities': []
        }

    # 按点赞数排序
    sorted_points = sorted(pain_points, key=lambda x: x['score'], reverse=True)

    # 识别高价值痛点（点赞数 > 10）
    high_value = [p for p in sorted_points if p['score'] > 10]

    return {
        'total_count': len(pain_points),
        'high_score_count': len(high_value),
        'top_pain_points': sorted_points[:10],  # 前10个最受关注的痛点
        'opportunities': high_value[:5]  # 前5个最有价值的机会
    }

def generate_report(url: str, analysis: Dict, output_file: str = None):
    """生成创业机会报告"""
    report = f"""# Reddit 创业机会分析报告

## 数据来源
- URL: {url}
- 分析时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 统计摘要
- 发现痛点总数: {analysis['total_count']}
- 高价值痛点数: {analysis['high_score_count']} (点赞 > 10)

## 🔥 Top 5 创业机会

"""

    for i, opp in enumerate(analysis.get('opportunities', []), 1):
        report += f"""### 机会 {i} (👍 {opp['score']})
**用户**: {opp['author']}
**时间**: {opp['created']}
**内容**:
```
{opp['content']}
```

**潜在价值**:
- 用户痛点明确
- 社区认可度高（{opp['score']} 点赞）
- 可考虑开发相关产品或服务

---

"""

    report += f"""## 📊 所有痛点列表

"""

    for i, point in enumerate(analysis.get('top_pain_points', []), 1):
        report += f"""{i}. **[{point['score']} 👍]** {point['author']}: {point['content'][:100]}...

"""

    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"✓ 报告已保存到: {output_file}")
    else:
        print(report)

def main():
    if len(sys.argv) < 2:
        print("用法: python reddit_hack.py <reddit_url> [output_file]")
        print("示例: python reddit_hack.py https://www.reddit.com/r/SaaS/comments/xxx report.md")
        sys.exit(1)

    url = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None

    print(f"正在分析 Reddit 讨论...")
    print(f"URL: {url}")
    print()

    # 获取数据
    data = fetch_reddit_json(url)

    # 提取痛点
    pain_points = extract_pain_points(data)

    # 分析痛点
    analysis = analyze_pain_points(pain_points)

    # 生成报告
    generate_report(url, analysis, output_file)

if __name__ == '__main__':
    main()
