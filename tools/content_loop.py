#!/usr/bin/env python3
"""Local challenge / emerge / draft loop for Redbook content work."""

from __future__ import annotations

import argparse
from datetime import date, datetime
from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
REPORTS_ROOT = ROOT / "docs" / "reports"

SOURCE_DIRS = [
    ROOT / "05-选题研究",
    ROOT / "x-to-markdown",
    ROOT / "wiki",
    ROOT / "tasks",
]

IGNORED_NAMES = {
    "index.md",
    "overview.md",
    "log.md",
    "todo.md",
}


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def read_text(path: Path, limit: int = 6000) -> str:
    text = path.read_text(encoding="utf-8", errors="ignore")
    return text[:limit]


def slugify(value: str) -> str:
    tokens = re.findall(r"[\u4e00-\u9fffA-Za-z0-9]+", value)
    slug = "-".join(tokens)[:80].strip("-")
    return slug or "content-loop"


def iter_candidate_files(limit: int) -> list[Path]:
    files: list[Path] = []
    for root in SOURCE_DIRS:
        if not root.exists():
            continue
        for path in root.rglob("*.md"):
            if path.name in {"AGENTS.md", "CLAUDE.md"}:
                continue
            if path.name in IGNORED_NAMES:
                continue
            if "docs/reports/content-loop-" in rel(path):
                continue
            files.append(path)
    files.sort(key=lambda path: path.stat().st_mtime, reverse=True)
    return files[:limit]


def score_file(path: Path, topic: str) -> int:
    text = f"{path.name}\n{read_text(path, limit=3000)}".lower()
    tokens = re.findall(r"[\u4e00-\u9fff]{2,}|[A-Za-z0-9_+-]+", topic.lower())
    score = 0
    if topic.lower() and topic.lower() in text:
        score += 10
    for token in tokens:
        if token in text:
            score += 2
    if "x-to-markdown" in rel(path):
        score += 1
    if "wiki/" in rel(path):
        score += 1
    return score


def collect_context(topic: str, limit: int) -> list[Path]:
    candidates = iter_candidate_files(limit=200)
    scored = [(score_file(path, topic), path) for path in candidates]
    scored = [item for item in scored if item[0] > 0]
    scored.sort(key=lambda item: (-item[0], item[1].stat().st_mtime * -1))
    if not scored:
        return candidates[:limit]
    return [path for _, path in scored[:limit]]


def extract_bullets(path: Path, max_items: int = 6) -> list[str]:
    text = read_text(path)
    bullets: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith(("- ", "1. ", "2. ", "3. ", "4. ", "5. ")):
            cleaned = re.sub(r"^[-*]\s+|^\d+\.\s+", "", stripped).strip()
            if cleaned and len(cleaned) > 8:
                bullets.append(cleaned[:180])
        if len(bullets) >= max_items:
            break
    if bullets:
        return bullets
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if len(p.strip()) > 30]
    return [p.replace("\n", " ")[:180] for p in paragraphs[:max_items]]


def build_challenge(topic: str, context: list[Path]) -> str:
    lines = [
        f"# Challenge Report: {topic}",
        "",
        f"日期：{date.today().isoformat()}",
        "",
        "## 用途",
        "",
        "用本地语料反问当前选题，逼出更具体、更原创、更可执行的观点。",
        "",
        "## 挑战问题",
        "",
        "1. 这件事里，哪一句判断只属于我们，而不是任何 AI 工具号都会说？",
        "2. 如果把所有二手信息删掉，我们还有哪一段亲身观察或真实工作流证据？",
        "3. 这个观点能不能落回 AI Agent / 企业导入 / 协作方式 / workflow 主线？",
        "4. 读者看完后会保存、转发、评论，还是只觉得信息正确？为什么？",
        "5. 这篇内容最容易变成洗稿的部分是哪一段？怎样换成我们的经验、反例或框架？",
        "6. 如果公开发布，这条内容会倒逼我们下一步做什么输入或实践？",
        "",
        "## 相关语料",
        "",
    ]
    for path in context:
        lines.append(f"### {rel(path)}")
        for bullet in extract_bullets(path, max_items=3):
            lines.append(f"- {bullet}")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def build_emerge(topic: str, context: list[Path]) -> str:
    lines = [
        f"# Emerge Report: {topic}",
        "",
        f"日期：{date.today().isoformat()}",
        "",
        "## 用途",
        "",
        "从已有材料里挖出还没被说清楚的隐性观点、反复出现的矛盾和可命名框架。",
        "",
        "## 可涌现方向",
        "",
    ]
    for index, path in enumerate(context, start=1):
        bullets = extract_bullets(path, max_items=4)
        lines.append(f"### {index}. {rel(path)}")
        lines.append("- 隐性主题：" + (bullets[0] if bullets else "待人工补充"))
        if len(bullets) > 1:
            lines.append("- 可命名概念：" + bullets[1])
        if len(bullets) > 2:
            lines.append("- 可转成内容的问题：" + bullets[2])
        lines.append("")
    lines.extend(
        [
            "## 人工续写提示",
            "",
            "- 我真正想反复说、但还没有命名的是：",
            "- 这个主题里最反直觉的一点是：",
            "- 我可以用自己的经历证明的是：",
            "- 这可以沉淀成一个长期框架：",
        ]
    )
    return "\n".join(lines).rstrip() + "\n"


def build_draft(topic: str, context: list[Path]) -> str:
    lines = [
        f"# Draft Seed: {topic}",
        "",
        f"日期：{date.today().isoformat()}",
        "",
        "## 用途",
        "",
        "把 challenge / emerge 的结果变成可进入 X、小红书、blog 的草稿种子。",
        "",
        "## 主判断",
        "",
        f"{topic} 不能只写成资讯或工具教程，要写成一个真实工作流变化：输入如何被积累，判断如何被挑战，输出如何倒逼下一轮输入。",
        "",
        "## X.com 结构",
        "",
        "1. 场景句：先写一个具体工作现场，而不是抽象结论。",
        "2. 判断句：说清楚这件事改变的是哪一个生产环节。",
        "3. 机制句：解释为什么它能形成原创，而不是洗稿。",
        "4. 反面句：指出大多数人只搭系统、不喂语料、不输出。",
        "5. 收束句：落到成长 → 原创 → 流量 → 反向输入。",
        "",
        "## 小红书结构",
        "",
        "1. 封面：不是「AI 写作神器」，而是「我终于知道为什么自己写不出原创了」。",
        "2. 第 1 页：空知识库的问题。",
        "3. 第 2 页：真实输入层：录音、阅读、日常想法。",
        "4. 第 3 页：处理层：本地 wiki / 素材库 / challenge / emerge / draft。",
        "5. 第 4 页：输出层：金句、观点、草稿、发布记录。",
        "6. 第 5 页：闭环：发布倒逼输入。",
        "",
        "## 素材摘取",
        "",
    ]
    for path in context:
        lines.append(f"### {rel(path)}")
        for bullet in extract_bullets(path, max_items=3):
            lines.append(f"- {bullet}")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def write_output(mode: str, topic: str, content: str) -> Path:
    REPORTS_ROOT.mkdir(parents=True, exist_ok=True)
    now = datetime.now().strftime("%Y%m%d-%H%M%S")
    path = REPORTS_ROOT / f"content-loop-{mode}-{slugify(topic)}-{now}.md"
    path.write_text(content, encoding="utf-8")
    return path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run local challenge/emerge/draft content loop.")
    parser.add_argument("mode", choices=["challenge", "emerge", "draft"])
    parser.add_argument("--topic", required=True)
    parser.add_argument("--limit", type=int, default=8)
    parser.add_argument("--print", action="store_true", dest="print_only")
    args = parser.parse_args(argv)

    context = collect_context(args.topic, limit=args.limit)
    if args.mode == "challenge":
        content = build_challenge(args.topic, context)
    elif args.mode == "emerge":
        content = build_emerge(args.topic, context)
    else:
        content = build_draft(args.topic, context)

    if args.print_only:
        print(content, end="")
        return 0

    path = write_output(args.mode, args.topic, content)
    print(f"saved: {rel(path)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
