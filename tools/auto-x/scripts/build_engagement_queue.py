#!/usr/bin/env python3
"""
Build a semi-automated X engagement queue.

This script scans X search results for account-relevant topics, scores candidate
posts, and writes human-reviewable comment drafts. It never posts comments.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable
from urllib.parse import quote_plus

sys.path.insert(0, str(Path(__file__).parent))

from search_x import search_x_topic  # noqa: E402
from x_utils import PROJECT_ROOT, ensure_browser, today_str  # noqa: E402


DEFAULT_QUERIES = [
    "AI agent",
    "coding agent",
    "Claude Code",
    "Codex",
    "Cursor AI",
    "AI workflow",
    "OpenAI agents",
    "Kimi coding",
]

THEME_TERMS = {
    "agent": 10,
    "agents": 10,
    "coding": 9,
    "code": 8,
    "workflow": 10,
    "workflows": 10,
    "developer": 7,
    "developers": 7,
    "cursor": 9,
    "codex": 9,
    "claude": 8,
    "openai": 8,
    "kimi": 7,
    "gemini": 6,
    "cloudflare": 7,
    "mcp": 7,
    "runtime": 8,
    "sandbox": 7,
    "tool": 4,
    "tools": 4,
    "模型": 7,
    "工作流": 10,
    "智能体": 10,
    "编程": 8,
    "开发者": 7,
    "上下文": 7,
}

RISK_TERMS = {
    "trump",
    "biden",
    "israel",
    "iran",
    "palestine",
    "nato",
    "war",
    "election",
    "maga",
    "nsfw",
    "porn",
    "airdrop",
    "giveaway",
    "memecoin",
    "政治",
    "战争",
    "空投",
    "抽奖",
}


@dataclass
class Candidate:
    handle: str
    content: str
    likes: int
    retweets: int
    query: str
    search_url: str
    language: str
    score: int
    reasons: list[str]
    risks: list[str]
    comments: list[str]


def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def detect_language(text: str) -> str:
    cjk = len(re.findall(r"[\u4e00-\u9fff]", text))
    ascii_letters = len(re.findall(r"[A-Za-z]", text))
    return "zh" if cjk >= ascii_letters else "en"


def engagement_score(likes: int, retweets: int) -> int:
    total = likes + retweets * 2
    if total >= 10_000:
        return 20
    if total >= 2_000:
        return 17
    if total >= 500:
        return 14
    if total >= 100:
        return 10
    if total >= 20:
        return 6
    return 3


def theme_score(content: str) -> tuple[int, list[str]]:
    lower = content.lower()
    score = 0
    reasons: list[str] = []
    for term, weight in THEME_TERMS.items():
        if term.lower() in lower or term in content:
            score += weight
            reasons.append(f"主题匹配:{term}")
    return min(score, 35), reasons[:6]


def risk_penalty(content: str) -> tuple[int, list[str]]:
    lower = content.lower()
    risks = [term for term in RISK_TERMS if term in lower or term in content]
    return min(len(risks) * 10, 30), risks


def conversation_space(content: str) -> tuple[int, list[str]]:
    reasons: list[str] = []
    score = 8
    if any(marker in content for marker in ("?", "？", "why", "how", "为什么", "怎么")):
        score += 5
        reasons.append("有问题/讨论入口")
    if any(marker in content.lower() for marker in ("not", "isn't", "不是", "真正", "其实", "instead")):
        score += 5
        reasons.append("有反差判断可接")
    if len(content) > 220:
        score += 4
        reasons.append("信息密度足够")
    return min(score, 20), reasons


def make_comments(content: str, language: str) -> list[str]:
    lower = content.lower()

    if language == "en":
        if "cursor" in lower or "coding" in lower or "code" in lower:
            return [
                "This matters more than IDE UX.\n\nAI coding won't be won by faster autocomplete alone. It will be won by whoever owns the feedback loop inside real engineering workflows.",
                "The real line is whether coding agents can enter real repos, CI, and review flows.\n\nIf they stay in demo land, model gains will get commoditized fast.",
                "This is bigger than model benchmarks.\n\nThe winner is whoever controls the daily entry point for developers and turns that into workflow data.",
            ]
        if "memory" in lower or "context" in lower:
            return [
                "The valuable part is not \"saving tokens\".\n\nOnce agents enter real work, memory becomes the layer that preserves decisions, context, and responsibility.",
                "I think memory is slowly moving from feature to infrastructure.\n\nWithout searchable, auditable, recoverable context, agents won't really make it into production.",
            ]
        if "agent" in lower or "workflow" in lower:
            return [
                "This is really the shift from personal tool to workflow role.\n\nThe question is no longer just whether the model is smart, but whether it has permissions, memory, context, and delivery boundaries.",
                "What still feels underrated here is runtime.\n\nAgents don't enter production just by answering well. They need recovery, observability, handoff, and auditability.",
                "This feels like the transition from chatbot to coworker.\n\nThe difference isn't UI. It's whether the agent can stay inside a goal long enough to actually move it forward.",
            ]
        if "image" in lower or "visual" in lower:
            return [
                "The competition here is no longer pure image quality.\n\nThe bigger question is whether image generation plugs into a full visual workflow: research, copy, layout, assets, publish.",
                "Single-shot generation is already table stakes.\n\nThe real product layer is the ability to run an entire visual production chain consistently.",
            ]
        return [
            "This feels more important than the headline itself.\n\nThe real change is that the capability is starting to become part of a reusable workflow, not just a one-off feature.",
            "I think the interesting part here is structural.\n\nEntry point, context, and workflow are starting to matter more than isolated capability.",
        ]

    if "cursor" in lower or "coding" in lower or "code" in lower or "编程" in content:
        return [
            "这点其实比 IDE 体验更关键。\n\nAI coding 最后拼的不是谁补全更快，而是谁能拿到真实工程流里的反馈数据。\n\n入口只是第一层，workflow data 才是护城河。",
            "我觉得这里真正的分水岭是：coding agent 能不能进真实 repo、真实 CI、真实 review 流程。\n\n只停在 demo 里，模型再强也很快会被追平。",
            "这事不能只看模型 benchmark。\n\n谁掌握工程师每天工作的入口，谁才更接近下一代 coding platform。",
        ]

    if "memory" in lower or "context" in lower or "上下文" in content or "记忆" in content:
        return [
            "这点真正值钱的是“续得上”。\n\nagent 一旦进真实工作流，记忆就不是省 token，而是能不能保留决策、上下文和责任边界。",
            "我觉得长期看，memory 会从小功能变成基础设施。\n\n没有可检索、可审计、可恢复的上下文，agent 很难真的进生产。",
        ]

    if "agent" in lower or "workflow" in lower or "智能体" in content or "工作流" in content:
        return [
            "这点其实说明 agent 正在从“个人工具”变成“工作流角色”。\n\n关键不只是模型更聪明，而是它有没有权限、记忆、上下文和交付边界。",
            "我觉得真正被低估的是运行时。\n\nagent 要进生产，不是能回答就够了，还得能恢复、观察、接管、审计。",
            "这方向很像从 chatbot 到 coworker 的过渡。\n\n差别不是 UI，而是它能不能长期待在一个目标里持续推进。",
        ]

    if "image" in lower or "视觉" in content or "图像" in content:
        return [
            "图像模型真正的竞争不只是画质了。\n\n下一步是能不能接进完整视觉工作流：研究、文案、排版、出图、多尺寸、发布。",
            "单次出图已经不稀奇。\n\n能稳定把一整套视觉素材生产链跑完，才会变成真正的产品能力。",
        ]

    return [
        "这点很关键。\n\n真正变化不是单个功能变强，而是它开始进入真实工作流，变成可复用的生产环节。",
        "我觉得这里最值得看的不是表面新闻，而是底层结构变了：入口、数据、工作流开始比单点能力更重要。",
    ]


def score_tweet(tweet: dict, query: str) -> Candidate:
    content = clean_text(tweet.get("content", ""))
    likes = int(tweet.get("likes", 0) or 0)
    retweets = int(tweet.get("retweets", 0) or 0)
    handle = tweet.get("handle", "?")
    language = detect_language(content)

    theme, theme_reasons = theme_score(content)
    engagement = engagement_score(likes, retweets)
    space, space_reasons = conversation_space(content)
    penalty, risks = risk_penalty(content)

    score = max(0, theme + engagement + space + 15 - penalty)
    reasons = theme_reasons + [f"互动分:{engagement}", f"评论空间:{space}"] + space_reasons

    return Candidate(
        handle=handle,
        content=content,
        likes=likes,
        retweets=retweets,
        query=query,
        search_url=f"https://x.com/search?q={quote_plus(query)}&src=typed_query&f=top",
        language=language,
        score=score,
        reasons=reasons,
        risks=risks,
        comments=make_comments(content, language),
    )


def dedupe(candidates: Iterable[Candidate]) -> list[Candidate]:
    seen: set[str] = set()
    result: list[Candidate] = []
    for item in candidates:
        key = item.content[:160].casefold()
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result


def render_markdown(candidates: list[Candidate]) -> str:
    lines = [
        f"# X 互动队列 - {today_str()}",
        "",
        "> 半自动互动候选。默认不自动发布评论，先人工确认。",
        "",
        "## 使用规则",
        "",
        "- 每天选 5-8 条高质量评论即可",
        "- 优先保留像真人的短判断",
        "- 不要连续评论同一账号太多条",
        "- 避免政治争吵和纯 crypto shill",
        "- 用搜索链接打开候选，再从页面进入原帖回复",
        "",
        "## 候选",
        "",
    ]

    for index, item in enumerate(candidates, 1):
        risk_text = ", ".join(item.risks) if item.risks else "无明显风险"
        reason_text = "；".join(item.reasons[:8])
        lines.extend(
            [
                f"### {index}. @{item.handle} | score {item.score}",
                "",
                f"- 来源关键词：`{item.query}`",
                f"- 搜索链接：{item.search_url}",
                f"- 语言：`{item.language}`",
                f"- 互动：❤️ {item.likes} / 🔁 {item.retweets}",
                f"- 风险：{risk_text}",
                f"- 推荐理由：{reason_text}",
                "",
                "> " + item.content[:500],
                "",
                "推荐评论：",
                "",
            ]
        )
        for comment_index, comment in enumerate(item.comments[:3], 1):
            lines.extend([f"**{comment_index}.**", "", comment, ""])
        lines.append("---")
        lines.append("")

    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build X engagement queue")
    parser.add_argument("--query", action="append", dest="queries", help="Search query; repeatable")
    parser.add_argument("--limit", type=int, default=8, help="Number of candidates to keep")
    parser.add_argument("--scrolls", type=int, default=2, help="Scroll count per query")
    parser.add_argument("--min-score", type=int, default=42, help="Minimum score")
    args = parser.parse_args()

    if not ensure_browser():
        raise SystemExit(1)

    queries = args.queries or DEFAULT_QUERIES
    candidates: list[Candidate] = []

    for query in queries:
        tweets = search_x_topic(query, scroll_times=args.scrolls)
        candidates.extend(score_tweet(tweet, query) for tweet in tweets)

    ranked = [
        item
        for item in sorted(dedupe(candidates), key=lambda item: item.score, reverse=True)
        if item.score >= args.min_score
    ][: args.limit]

    output_dir = PROJECT_ROOT / "05-选题研究"
    md_path = output_dir / f"X-互动队列-{today_str()}.md"
    json_path = output_dir / f"X-互动队列-{today_str()}.json"

    md_path.write_text(render_markdown(ranked), encoding="utf-8")
    json_path.write_text(
        json.dumps([asdict(item) for item in ranked], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"wrote {md_path}")
    print(f"wrote {json_path}")
    print(f"candidates: {len(ranked)}")


if __name__ == "__main__":
    main()
