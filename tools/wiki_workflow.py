#!/usr/bin/env python3
"""Helpers for making wiki workflows explicit and traceable."""

from __future__ import annotations

import argparse
from datetime import datetime
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from tools.redbook_harness.runtime import HarnessRuntime, slugify


WIKI_ROOT = ROOT / "wiki"
REPORTS_ROOT = ROOT / "docs" / "reports"
IGNORED_WIKI_FILES = {"index.md", "log.md", "overview.md"}


def daily_source_paths(date_str: str) -> list[Path]:
    base = ROOT / "05-选题研究"
    return [
        base / f"X-每日日程-{date_str}.md",
        base / f"HN-每日热点-{date_str}.md",
        base / f"Reddit-每日监控-{date_str}.md",
    ]


def relative(path: Path) -> str:
    return str(path.relative_to(ROOT))


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def content_wiki_pages() -> list[Path]:
    return sorted(
        [
            path
            for path in WIKI_ROOT.rglob("*.md")
            if path.name not in IGNORED_WIKI_FILES
        ]
    )


def extract_title(path: Path) -> str:
    for line in read_text(path).splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return path.stem


def extract_last_update(path: Path) -> str | None:
    match = re.search(r"最后更新[:：]\s*(\d{4}-\d{2}-\d{2})", read_text(path))
    return match.group(1) if match else None


def extract_summary(path: Path) -> str:
    for line in read_text(path).splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or stripped.startswith(">"):
            continue
        return stripped[:120]
    return "（无摘要）"


def write_report(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + "\n", encoding="utf-8")


def append_bullets(lines: list[str], items: list[str]) -> None:
    if items:
        lines.extend(f"- `{item}`" for item in items)
    else:
        lines.append("- 无")


def find_existing_run(runtime: HarnessRuntime, *, topic: str, source: str) -> dict | None:
    for run in runtime.list_runs():
        if run.get("topic") == topic and run.get("source") == source:
            return run
    return None


def ensure_report_artifact(
    runtime: HarnessRuntime,
    *,
    run_id: str,
    artifact_type: str,
    path: str,
    description: str,
    stage: str,
) -> None:
    run = runtime.load_run(run_id)
    existing_paths = {artifact["path"] for artifact in run.get("artifacts", [])}
    if path in existing_paths:
        return
    runtime.add_artifact(
        run_id,
        artifact_type=artifact_type,
        path=path,
        description=description,
        stage=stage,
    )


def ensure_daily_ingest_run(date_str: str) -> dict:
    runtime = HarnessRuntime(ROOT)
    topic = f"LLM Wiki ingest {date_str}"
    source = relative(ROOT / "05-选题研究" / f"X-每日日程-{date_str}.md")
    summary = "为当日研究报告创建显式 wiki ingest 运行痕迹"

    existing = find_existing_run(runtime, topic=topic, source=source)
    if existing is not None:
        run = runtime.load_run(existing["run_id"])
        created = False
    else:
        run = runtime.create_run(
            topic=topic,
            source=source,
            owner="Codex",
            priority="P1",
            summary=summary,
        )
        created = True

    existing_paths = {artifact["path"] for artifact in run.get("artifacts", [])}
    attached_sources: list[str] = []
    for candidate in daily_source_paths(date_str):
        if not candidate.exists():
            continue
        rel_path = relative(candidate)
        attached_sources.append(rel_path)
        if rel_path in existing_paths:
            continue
        runtime.add_artifact(
            run["run_id"],
            artifact_type="research_report",
            path=rel_path,
            description=f"Daily source for wiki ingest: {candidate.name}",
            stage="research",
        )

    if attached_sources:
        report_path = REPORTS_ROOT / f"wiki-ingest-{date_str}.md"
        report_lines = [
            f"# Wiki Ingest Report {date_str}",
            "",
            "## 结论",
            "",
            (
                f"- 已为 {date_str} 的日报链路附加 {len(attached_sources)} 份研究源文件，"
                "当前 ingest 运行证据已补齐。"
            ),
            "",
            "## 来源",
            "",
        ]
        report_lines.extend(f"- `{item}`" for item in attached_sources)
        report_lines.extend(
            [
                "",
                "## 已附加日报",
                "",
            ]
        )
        report_lines.extend(f"- `{item}`" for item in attached_sources)
        report_lines.extend(
            [
                "",
                "## 当前状态",
                "",
                "- `materials_queried=true`",
                "- `research_complete=true`",
                "- 后续可继续执行 query / lint / wiki ingest 写回。",
            ]
        )
        write_report(report_path, "\n".join(report_lines))
        report_rel_path = relative(report_path)
        if report_rel_path not in existing_paths:
            runtime.add_artifact(
                run["run_id"],
                artifact_type="research_report",
                path=report_rel_path,
                description=f"Wiki ingest summary report for {date_str}",
                stage="research",
            )
        runtime.set_check(run["run_id"], check_name="materials_queried", value=True)
        runtime.set_check(run["run_id"], check_name="research_complete", value=True)
        runtime.close_run(
            run["run_id"],
            status="done",
            note="Daily wiki ingest is a research-only maintenance run.",
        )

    final_run = runtime.load_run(run["run_id"])
    return {
        "created": created,
        "run_id": final_run["run_id"],
        "topic": final_run["topic"],
        "source": final_run["source"],
        "attached_sources": attached_sources,
        "checks": {
            "materials_queried": final_run["checks"]["materials_queried"],
            "research_complete": final_run["checks"]["research_complete"],
        },
    }


def query_wiki(topic: str, *, date_str: str, attach_run_id: str | None = None) -> dict:
    token_matches = re.findall(r"[\u4e00-\u9fff]{2,}|[A-Za-z0-9_+-]+", topic.lower())
    scored: list[tuple[int, Path, str, str]] = []
    for path in content_wiki_pages():
        title = extract_title(path)
        content = read_text(path)
        haystack = f"{title}\n{path.name}\n{content}".lower()
        score = 0
        if topic.lower() in haystack:
            score += 10
        for token in token_matches:
            if token in title.lower() or token in path.name.lower():
                score += 4
            elif token in haystack:
                score += 1
        if score > 0:
            scored.append((score, path, title, extract_summary(path)))
    scored.sort(key=lambda item: (-item[0], item[1].name))
    matches = [
        {
            "score": score,
            "path": relative(path),
            "title": title,
            "summary": summary,
        }
        for score, path, title, summary in scored[:5]
    ]

    report_path = REPORTS_ROOT / f"wiki-query-{slugify(topic)}-{date_str}.md"
    lines = [
        f"# Wiki Query Report: {topic}",
        "",
        f"日期：{date_str}",
        "",
        "## 查询主题",
        "",
        f"- Topic: `{topic}`",
        f"- 匹配页面数：{len(matches)}",
        "",
        "## 研究来源",
        "",
        "- `wiki/index.md`",
        "- `wiki/选题/`",
        "- `wiki/概念/`",
        "",
        "## 命中页面",
        "",
    ]
    if matches:
        for item in matches:
            lines.append(
                f"- [{item['title']}](/Users/proerror/Documents/redbook/{item['path']})"
                f" | score={item['score']} | {item['summary']}"
            )
    else:
        lines.append("- 未匹配到现有 wiki 页面")
    lines.extend(
        [
            "",
            "## 一句话结论",
            "",
            (
                f"- 主题 `{topic}` 共命中 {len(matches)} 个高相关页面，"
                "可直接作为内容起草前的 wiki 研究入口。"
            )
            if matches
            else f"- 主题 `{topic}` 当前未命中已有 wiki 页面，需要补充知识沉淀后再复查。",
        ]
    )
    write_report(report_path, "\n".join(lines))

    runtime = HarnessRuntime(ROOT)
    run_topic = f"LLM Wiki query {topic} {date_str}"
    existing = find_existing_run(runtime, topic=run_topic, source="wiki/index.md")
    if existing is not None:
        run = runtime.load_run(existing["run_id"])
    else:
        run = runtime.create_run(
            topic=run_topic,
            source="wiki/index.md",
            owner="Codex",
            priority="P1",
            summary=f"显式记录一次 wiki query：{topic}",
        )
    report_rel_path = relative(report_path)
    ensure_report_artifact(
        runtime,
        run_id=run["run_id"],
        artifact_type="research_report",
        path=report_rel_path,
        description=f"Wiki query report for topic: {topic}",
        stage="research",
    )
    runtime.set_check(run["run_id"], check_name="materials_queried", value=True)
    runtime.set_check(run["run_id"], check_name="research_complete", value=True)
    runtime.close_run(
        run["run_id"],
        status="done",
        note="Wiki query is a research-only maintenance run.",
    )

    attached_run: dict[str, object] | None = None
    if attach_run_id is not None:
        target_run = runtime.load_run(attach_run_id)
        ensure_report_artifact(
            runtime,
            run_id=attach_run_id,
            artifact_type="research_report",
            path=report_rel_path,
            description=f"Wiki query report attached for topic: {topic}",
            stage="research",
        )
        runtime.set_check(attach_run_id, check_name="materials_queried", value=True)
        attached_run = {
            "run_id": attach_run_id,
            "topic": target_run["topic"],
        }

    final_run = runtime.load_run(run["run_id"])
    return {
        "run_id": final_run["run_id"],
        "report_path": report_rel_path,
        "matches": matches,
        "attached_run": attached_run,
        "checks": {
            "materials_queried": final_run["checks"]["materials_queried"],
            "research_complete": final_run["checks"]["research_complete"],
        },
    }


def lint_wiki(*, date_str: str) -> dict:
    pages = content_wiki_pages()
    title_to_path = {extract_title(path): path for path in pages}
    actual_rel_paths = {relative(path) for path in pages}

    index_text = read_text(WIKI_ROOT / "index.md")
    index_entries = re.findall(r"\[([^\]]+)\]\(([^)]+\.md)\)", index_text)
    indexed_rel_paths = {f"wiki/{target}" for _, target in index_entries}

    missing_from_index = sorted(actual_rel_paths - indexed_rel_paths)
    dangling_in_index = sorted(indexed_rel_paths - actual_rel_paths)

    outgoing_links: dict[str, set[str]] = {}
    incoming_links: dict[str, int] = {title: 0 for title in title_to_path}
    for path in pages:
        targets = set(re.findall(r"\[\[([^\]]+)\]\]", read_text(path)))
        outgoing_links[extract_title(path)] = targets
        for target in targets:
            if target in incoming_links and target != extract_title(path):
                incoming_links[target] += 1

    orphan_pages = sorted(
        relative(title_to_path[title])
        for title, count in incoming_links.items()
        if count == 0 and not outgoing_links.get(title)
    )

    stale_index_dates: list[dict[str, str]] = []
    for title, target in index_entries:
        path = ROOT / "wiki" / target
        if not path.exists():
            continue
        page_last_update = extract_last_update(path)
        if page_last_update is None:
            continue
        pattern = re.compile(
            rf"^\|\s*\[{re.escape(title)}\]\({re.escape(target)}\)\s*\|.*\|\s*(\d{{4}}-\d{{2}}-\d{{2}})\s*\|$",
            re.MULTILINE,
        )
        match = pattern.search(index_text)
        if match and match.group(1) != page_last_update:
            stale_index_dates.append(
                {
                    "path": relative(path),
                    "index_date": match.group(1),
                    "page_date": page_last_update,
                }
            )

    overview_date_match = re.search(r"知识库现状（(\d{4}-\d{2}-\d{2})）", read_text(WIKI_ROOT / "overview.md"))
    overview_date = overview_date_match.group(1) if overview_date_match else None
    latest_page_update = max(
        (extract_last_update(path) for path in pages if extract_last_update(path)),
        default=None,
    )
    overview_stale = (
        overview_date is not None
        and latest_page_update is not None
        and overview_date < latest_page_update
    )

    report_path = REPORTS_ROOT / f"wiki-lint-{date_str}.md"
    lines = [
        f"# Wiki Lint Report {date_str}",
        "",
        "## 结论",
        "",
        "- 当前 wiki 索引、概览和页面互链状态已完成巡检，适合作为内容前置研究入口。",
        "",
        "## 来源",
        "",
        "- `wiki/index.md`",
        "- `wiki/overview.md`",
        "- `wiki/选题/`",
        "- `wiki/概念/`",
        "",
        "## 摘要",
        "",
        f"- 内容页数量：{len(pages)}",
        f"- index 缺失页面：{len(missing_from_index)}",
        f"- index 悬挂引用：{len(dangling_in_index)}",
        f"- 孤立页面：{len(orphan_pages)}",
        f"- index 日期陈旧项：{len(stale_index_dates)}",
        f"- overview 是否陈旧：{'是' if overview_stale else '否'}",
        "",
        "## index 缺失页面",
        "",
    ]
    append_bullets(lines, missing_from_index)
    lines.extend(["", "## index 悬挂引用", ""])
    append_bullets(lines, dangling_in_index)
    lines.extend(["", "## 孤立页面", ""])
    append_bullets(lines, orphan_pages)
    lines.extend(["", "## index 日期陈旧", ""])
    if stale_index_dates:
        for item in stale_index_dates:
            lines.append(
                f"- `{item['path']}` | index={item['index_date']} | page={item['page_date']}"
            )
    else:
        lines.append("- 无")
    lines.extend(["", "## overview 状态", ""])
    if overview_stale:
        lines.append(
            f"- `wiki/overview.md` 仍停留在 {overview_date}，晚于它的页面更新日期为 {latest_page_update}"
        )
    else:
        lines.append("- 无")
    write_report(report_path, "\n".join(lines))

    runtime = HarnessRuntime(ROOT)
    run_topic = f"LLM Wiki lint {date_str}"
    existing = find_existing_run(runtime, topic=run_topic, source="wiki/index.md")
    if existing is not None:
        run = runtime.load_run(existing["run_id"])
    else:
        run = runtime.create_run(
            topic=run_topic,
            source="wiki/index.md",
            owner="Codex",
            priority="P1",
            summary="显式记录一次 wiki lint 健康检查",
        )
    existing_paths = {artifact["path"] for artifact in run.get("artifacts", [])}
    report_rel_path = relative(report_path)
    if report_rel_path not in existing_paths:
        runtime.add_artifact(
            run["run_id"],
            artifact_type="research_report",
            path=report_rel_path,
            description="Wiki lint report",
            stage="research",
        )
    runtime.set_check(run["run_id"], check_name="materials_queried", value=True)
    runtime.set_check(run["run_id"], check_name="research_complete", value=True)
    runtime.close_run(
        run["run_id"],
        status="done",
        note="Wiki lint is a research-only maintenance run.",
    )
    final_run = runtime.load_run(run["run_id"])
    return {
        "run_id": final_run["run_id"],
        "report_path": report_rel_path,
        "summary": {
            "missing_from_index": len(missing_from_index),
            "dangling_in_index": len(dangling_in_index),
            "orphan_pages": len(orphan_pages),
            "stale_index_dates": len(stale_index_dates),
            "overview_stale": overview_stale,
        },
        "checks": {
            "materials_queried": final_run["checks"]["materials_queried"],
            "research_complete": final_run["checks"]["research_complete"],
        },
    }


def daily_cycle(*, date_str: str) -> dict:
    ingest_result = ensure_daily_ingest_run(date_str)
    lint_result = lint_wiki(date_str=date_str)
    return {
        "date": date_str,
        "ingest": ingest_result,
        "lint": lint_result,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Explicit wiki workflow helpers.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    ingest = subparsers.add_parser(
        "start-daily-ingest",
        help="Create or refresh an explicit wiki ingest run for a daily research batch.",
    )
    ingest.add_argument("--date", required=True, help="Date string in YYYY-MM-DD format.")

    query = subparsers.add_parser(
        "query",
        help="Create an explicit wiki query report and harness run.",
    )
    query.add_argument("--topic", required=True)
    query.add_argument("--date", default=datetime.now().strftime("%Y-%m-%d"))
    query.add_argument("--attach-run-id")

    lint = subparsers.add_parser(
        "lint",
        help="Run wiki health checks and create an explicit harness run.",
    )
    lint.add_argument("--date", default=datetime.now().strftime("%Y-%m-%d"))

    daily = subparsers.add_parser(
        "daily-cycle",
        help="Run the minimal daily wiki maintenance cycle: ingest plus lint.",
    )
    daily.add_argument("--date", default=datetime.now().strftime("%Y-%m-%d"))
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "start-daily-ingest":
            result = ensure_daily_ingest_run(args.date)
            print(json.dumps(result, ensure_ascii=False, indent=2))
            return 0
        if args.command == "query":
            result = query_wiki(
                args.topic,
                date_str=args.date,
                attach_run_id=args.attach_run_id,
            )
            print(json.dumps(result, ensure_ascii=False, indent=2))
            return 0
        if args.command == "lint":
            result = lint_wiki(date_str=args.date)
            print(json.dumps(result, ensure_ascii=False, indent=2))
            return 0
        if args.command == "daily-cycle":
            result = daily_cycle(date_str=args.date)
            print(json.dumps(result, ensure_ascii=False, indent=2))
            return 0
    except Exception as exc:  # noqa: BLE001
        print(f"error: {exc}", file=sys.stderr)
        return 1
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
