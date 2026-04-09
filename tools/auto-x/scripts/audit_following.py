#!/usr/bin/env python3
"""
X/Twitter following 全量巡检工具

能力：
1. 可选先重新抓取完整 following 列表
2. 轮巡每个账号主页，判断是否失效 / 受限 / 不活跃
3. 输出“今日新动态 + unfollow 候选”报告和结构化 JSON

注意：
- 默认只生成候选清单，不直接 unfollow
- 真正 unfollow 应使用独立脚本并经过用户确认
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import date, datetime
from pathlib import Path
from typing import Any

from x_utils import (
    DATA_DIR,
    PROJECT_ROOT,
    ensure_browser,
    now_str,
    print_colored,
    run_abs,
    save_report,
    today_str,
    _extract_article_blocks,
)


DEFAULT_USERNAME = "0xcybersmile"
DEFAULT_SCROLL_TIMES = 130
DEFAULT_INACTIVE_DAYS = 60
DEFAULT_STALE_DAYS = 120
DEFAULT_WAIT_SECONDS = 1.2
DEFAULT_OUTPUT_JSON = DATA_DIR / "following_audit_latest.json"

NOT_FOUND_MARKERS = (
    "唔...该页面不存在",
    "this account doesn’t exist",
    "this account doesn't exist",
    "try searching for something else",
)
SUSPENDED_MARKERS = (
    "账号已被冻结",
    "account suspended",
    "has been suspended",
)
PROTECTED_MARKERS = (
    "这些帖文已受保护",
    "these posts are protected",
    "仅已获批准的关注者可查看",
)
NO_POSTS_MARKERS = (
    "还没有发过帖子",
    "hasn’t posted",
    "hasn't posted",
    "还没有帖子",
)

MONTHS = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}


def load_following(path: str | None = None, scraped_at: str | None = None) -> list[dict[str, Any]]:
    """加载 following 列表，可按 scraped_at 过滤。"""
    source = Path(path) if path else DATA_DIR / "following.json"
    rows = json.loads(source.read_text(encoding="utf-8"))
    if scraped_at:
        filtered = [row for row in rows if row.get("scraped_at") == scraped_at]
        if filtered:
            return filtered
    return rows


def estimate_days_since_label(label: str, today: date | None = None) -> int | None:
    """把 X 资料页上的时间标签换算为距今天数。"""
    if not label:
        return None

    today = today or date.today()
    normalized = re.sub(r"\s+", " ", label.strip()).lower()
    normalized = normalized.replace("前", "").strip()

    if normalized in {"刚刚", "现在", "today"}:
        return 0
    if normalized in {"昨天", "yesterday"}:
        return 1

    minute_match = re.search(r"(\d+)\s*(?:分钟|mins?|m)\b", normalized)
    if minute_match:
        return 0

    hour_match = re.search(r"(\d+)\s*(?:小时|hours?|hrs?|h)\b", normalized)
    if hour_match:
        return 0

    day_match = re.search(r"(\d+)\s*(?:天|days?|d)\b", normalized)
    if day_match:
        return int(day_match.group(1))

    zh_month_day = re.search(r"(\d{1,2})月(\d{1,2})日", normalized)
    if zh_month_day:
        month = int(zh_month_day.group(1))
        day = int(zh_month_day.group(2))
        year = today.year
        try_date = date(year, month, day)
        if try_date > today:
            try_date = date(year - 1, month, day)
        return (today - try_date).days

    en_month_day = re.search(r"\b([a-z]{3,9})\.?\s+(\d{1,2})\b", normalized)
    if en_month_day:
        month = MONTHS.get(en_month_day.group(1)[:3])
        if month:
            day = int(en_month_day.group(2))
            year = today.year
            try_date = date(year, month, day)
            if try_date > today:
                try_date = date(year - 1, month, day)
            return (today - try_date).days

    full_ymd = re.search(r"(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})", normalized)
    if full_ymd:
        try_date = date(int(full_ymd.group(1)), int(full_ymd.group(2)), int(full_ymd.group(3)))
        return (today - try_date).days

    return None


def _extract_latest_label_from_article(article: str) -> str | None:
    header = article.splitlines()[0].strip()
    patterns = [
        r"@[\w_]{1,15}\s+((?:\d+\s*分钟(?:\s*前)?)|(?:\d+\s*小时(?:\s*前)?)|(?:\d+\s*天(?:\s*前)?)|昨天|今天|刚刚)",
        r"@[\w_]{1,15}\s+((?:\d+[mhd])|yesterday|today)",
        r"@[\w_]{1,15}\s+(\d{1,2}月\d{1,2}日)",
        r"@[\w_]{1,15}\s+([A-Za-z]{3,9}\s+\d{1,2})",
        r"@[\w_]{1,15}\s+(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})",
    ]
    for pattern in patterns:
        match = re.search(pattern, header, flags=re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def _extract_sample_texts(article: str, limit: int = 2) -> list[str]:
    samples: list[str] = []
    for line in article.splitlines():
        stripped = line.strip()
        if not stripped.startswith("- text:"):
            continue
        text = stripped.replace("- text:", "", 1).strip().strip('"')
        if not text:
            continue
        if len(text) < 8:
            continue
        if text in {"已置顶", "Pinned"}:
            continue
        samples.append(text)
        if len(samples) >= limit:
            break
    return samples


def _pick_activity_article(snapshot: str) -> str | None:
    articles = _extract_article_blocks(snapshot)
    if not articles:
        return None

    non_pinned = [article for article in articles if "已置顶" not in article.lower() and "pinned" not in article.lower()]
    if non_pinned:
        return non_pinned[0]
    return articles[0]


def classify_profile_snapshot(
    snapshot: str,
    *,
    username: str,
    today: date | None = None,
    inactive_days: int = DEFAULT_INACTIVE_DAYS,
    stale_days: int = DEFAULT_STALE_DAYS,
) -> dict[str, Any]:
    """根据资料页 snapshot 判断账号状态。"""
    today = today or date.today()
    lowered = snapshot.lower()

    result: dict[str, Any] = {
        "username": username,
        "profile_url": f"https://x.com/{username}",
        "status": "unknown",
        "latest_post_label": None,
        "latest_post_days": None,
        "sample_texts": [],
        "reason": "",
        "unfollow_recommended": False,
        "review_required": False,
    }

    if any(marker in lowered for marker in [m.lower() for m in NOT_FOUND_MARKERS]):
        result.update(
            status="not_found",
            reason="账号页返回不存在/失效提示",
            unfollow_recommended=True,
        )
        return result

    if any(marker in lowered for marker in [m.lower() for m in SUSPENDED_MARKERS]):
        result.update(
            status="suspended",
            reason="账号页显示已被冻结/暂停",
            unfollow_recommended=True,
        )
        return result

    if any(marker in lowered for marker in [m.lower() for m in PROTECTED_MARKERS]):
        result.update(
            status="protected",
            reason="账号受保护，无法公开审计 timeline",
            review_required=True,
        )
        return result

    if any(marker in lowered for marker in [m.lower() for m in NO_POSTS_MARKERS]):
        result.update(
            status="no_posts",
            reason="账号存在但没有可见帖子",
            unfollow_recommended=True,
        )
        return result

    article = _pick_activity_article(snapshot)
    if not article:
        result.update(
            status="no_recent_articles",
            reason="资料页没有识别到可解析的 article",
            review_required=True,
        )
        return result

    latest_label = _extract_latest_label_from_article(article)
    latest_days = estimate_days_since_label(latest_label or "", today=today)
    samples = _extract_sample_texts(article)

    result["latest_post_label"] = latest_label
    result["latest_post_days"] = latest_days
    result["sample_texts"] = samples

    if latest_days is None:
        result.update(
            status="unknown_activity",
            reason="识别到帖子，但无法稳定解析最新时间标签",
            review_required=True,
        )
        return result

    if latest_days >= stale_days:
        result.update(
            status="inactive",
            reason=f"最近一条可见动态距今 {latest_days} 天",
            unfollow_recommended=True,
        )
        return result

    if latest_days >= inactive_days:
        result.update(
            status="quiet",
            reason=f"最近一条可见动态距今 {latest_days} 天",
            review_required=True,
        )
        return result

    result.update(
        status="active",
        reason=f"最近一条可见动态距今 {latest_days} 天",
    )
    return result


def audit_profile(
    username: str,
    *,
    inactive_days: int,
    stale_days: int,
    wait_seconds: float,
) -> dict[str, Any]:
    """真实打开账号主页并做判定。"""
    url = f"https://x.com/{username}"
    run_abs(f'open "{url}"', timeout=40)
    time.sleep(wait_seconds)
    current_url = run_abs("get url", timeout=10).strip()
    if username.lower() not in current_url.lower():
        run_abs(f'open "{url}"', timeout=40)
        time.sleep(wait_seconds)

    snapshot = run_abs("snapshot -c -d 5", timeout=20)
    if not _extract_article_blocks(snapshot):
        run_abs("scroll down 900", timeout=10)
        time.sleep(0.8)
        second_snapshot = run_abs("snapshot -c -d 5", timeout=20)
        if second_snapshot:
            snapshot = second_snapshot

    result = classify_profile_snapshot(
        snapshot,
        username=username,
        today=date.today(),
        inactive_days=inactive_days,
        stale_days=stale_days,
    )
    result["audited_at"] = now_str()
    return result


def build_summary(results: list[dict[str, Any]]) -> dict[str, Any]:
    """构造聚合统计。"""
    summary = {
        "total": len(results),
        "active": 0,
        "quiet": 0,
        "inactive": 0,
        "not_found": 0,
        "suspended": 0,
        "protected": 0,
        "no_posts": 0,
        "unknown": 0,
        "unfollow_candidates": 0,
        "review_candidates": 0,
        "fresh_updates": 0,
    }

    for row in results:
        status = row.get("status", "unknown")
        if status in summary:
            summary[status] += 1
        else:
            summary["unknown"] += 1
        if row.get("unfollow_recommended"):
            summary["unfollow_candidates"] += 1
        if row.get("review_required"):
            summary["review_candidates"] += 1
        latest_days = row.get("latest_post_days")
        if isinstance(latest_days, int) and latest_days <= 1:
            summary["fresh_updates"] += 1

    return summary


def generate_report(
    username: str,
    results: list[dict[str, Any]],
    *,
    inactive_days: int,
    stale_days: int,
) -> str:
    """生成 following 审计 Markdown 报告。"""
    summary = build_summary(results)
    fresh = [row for row in results if isinstance(row.get("latest_post_days"), int) and row["latest_post_days"] <= 1]
    unfollow = [row for row in results if row.get("unfollow_recommended")]
    review = [row for row in results if row.get("review_required")]

    fresh = sorted(fresh, key=lambda row: row.get("latest_post_days", 999))[:30]
    unfollow = sorted(
        unfollow,
        key=lambda row: (row.get("status") not in {"not_found", "suspended"}, row.get("latest_post_days") or 9999),
    )
    review = sorted(review, key=lambda row: row.get("latest_post_days") or 9999)

    lines = [
        f"# X following 全量巡检 - {today_str()}",
        "",
        "## 来源",
        f"- following 来源: `https://x.com/{username}/following`",
        f"- 轮巡账号数: {summary['total']}",
        f"- 生成时间: {now_str()}",
        "",
        "## 一句话结论",
        f"- 当前已轮巡 following 账号 **{summary['total']}** 个；其中有新动态账号 **{summary['fresh_updates']}** 个，建议 unfollow 的强候选 **{summary['unfollow_candidates']}** 个，需要人工复核的安静账号 **{summary['review_candidates']}** 个。",
        "",
        "## 巡检规则",
        f"- `active`: 最近一条可见动态 < {inactive_days} 天",
        f"- `quiet`: 最近一条可见动态 >= {inactive_days} 天，先人工复核",
        f"- `inactive`: 最近一条可见动态 >= {stale_days} 天，列入 unfollow 候选",
        "- `not_found` / `suspended` / `no_posts`: 直接列入 unfollow 强候选",
        "",
        "## 汇总",
        f"- active: {summary['active']}",
        f"- quiet: {summary['quiet']}",
        f"- inactive: {summary['inactive']}",
        f"- not_found: {summary['not_found']}",
        f"- suspended: {summary['suspended']}",
        f"- protected: {summary['protected']}",
        f"- no_posts: {summary['no_posts']}",
        f"- unknown / 需复核: {summary['unknown']}",
        "",
        "## 今日有新动态",
    ]

    if fresh:
        for row in fresh:
            sample = (row.get("sample_texts") or [""])[0]
            lines.append(
                f"- `@{row['username']}` | 最近动态: `{row.get('latest_post_label')}` | {sample[:120]}"
            )
    else:
        lines.append("- 今日没有识别到 1 天内的新动态账号。")

    lines.extend(["", "## Unfollow 强候选"])
    if unfollow:
        for row in unfollow[:200]:
            extra = f" | 最近动态: `{row['latest_post_label']}`" if row.get("latest_post_label") else ""
            lines.append(f"- `@{row['username']}` | `{row['status']}` | {row['reason']}{extra}")
    else:
        lines.append("- 本轮没有强候选。")

    lines.extend(["", "## 待人工复核"])
    if review:
        for row in review[:200]:
            extra = f" | 最近动态: `{row['latest_post_label']}`" if row.get("latest_post_label") else ""
            lines.append(f"- `@{row['username']}` | `{row['status']}` | {row['reason']}{extra}")
    else:
        lines.append("- 本轮没有待人工复核账号。")

    lines.extend(["", "## 参考链接", f"- https://x.com/{username}/following"])
    return "\n".join(lines) + "\n"


def save_audit_json(
    username: str,
    results: list[dict[str, Any]],
    *,
    output_path: Path = DEFAULT_OUTPUT_JSON,
    inactive_days: int,
    stale_days: int,
) -> Path:
    payload = {
        "username": username,
        "generated_at": now_str(),
        "inactive_days": inactive_days,
        "stale_days": stale_days,
        "summary": build_summary(results),
        "results": results,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return output_path


def load_existing_audit(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    return payload.get("results", [])


def main() -> None:
    parser = argparse.ArgumentParser(description="巡检 X following 活跃度并生成 unfollow 候选")
    parser.add_argument("--username", default=DEFAULT_USERNAME)
    parser.add_argument("--scroll-times", type=int, default=DEFAULT_SCROLL_TIMES)
    parser.add_argument("--inactive-days", type=int, default=DEFAULT_INACTIVE_DAYS)
    parser.add_argument("--stale-days", type=int, default=DEFAULT_STALE_DAYS)
    parser.add_argument("--wait-seconds", type=float, default=DEFAULT_WAIT_SECONDS)
    parser.add_argument("--limit", type=int, default=0, help="只审计前 N 个账号，0 表示全量")
    parser.add_argument("--following-json", default=None, help="指定 following.json 路径")
    parser.add_argument("--scraped-at", default=today_str(), help="只使用某次抓取日期的 following")
    parser.add_argument("--full-scrape", action="store_true", help="审计前先重新抓取完整 following")
    parser.add_argument("--resume", action="store_true", help="从现有审计结果继续")
    parser.add_argument("--save-every", type=int, default=25, help="每处理 N 个账号落盘一次")
    args = parser.parse_args()

    if not ensure_browser():
        sys.exit(1)

    if args.full_scrape:
        from scrape_following import (
            scrape_following,
            save_following_json,
            generate_report as generate_following_report,
        )

        print_colored("\n=== 先重抓完整 following ===", "green")
        users = scrape_following(args.username, args.scroll_times)
        save_following_json(users, args.following_json)
        following_report = generate_following_report(users, args.username)
        following_report_path = PROJECT_ROOT / "05-选题研究" / f"X-关注列表-{args.username}-{today_str()}.md"
        save_report(following_report, str(following_report_path))

    following = load_following(args.following_json, scraped_at=args.scraped_at)
    if args.limit > 0:
        following = following[: args.limit]

    print_colored(f"\n=== 审计 @{args.username} 的 following ===", "green")
    print_colored(f"待审计账号数: {len(following)}", "yellow")

    results: list[dict[str, Any]] = []
    if args.resume:
        results = load_existing_audit(DEFAULT_OUTPUT_JSON)
        done = {row.get("username") for row in results}
        following = [row for row in following if row.get("username") not in done]
        print_colored(f"resume 模式：跳过已完成账号 {len(done)} 个", "yellow")

    total = len(following)
    for idx, user in enumerate(following, 1):
        username = user["username"]
        print_colored(f"[{idx}/{total}] 审计 @{username}", "cyan")
        try:
            result = audit_profile(
                username,
                inactive_days=args.inactive_days,
                stale_days=args.stale_days,
                wait_seconds=args.wait_seconds,
            )
            results.append(result)
        except Exception as exc:  # pragma: no cover - runtime protection
            print_colored(f"审计 @{username} 失败: {exc}", "red")
            results.append(
                {
                    "username": username,
                    "profile_url": f"https://x.com/{username}",
                    "status": "error",
                    "latest_post_label": None,
                    "latest_post_days": None,
                    "sample_texts": [],
                    "reason": f"审计异常: {exc}",
                    "unfollow_recommended": False,
                    "review_required": True,
                    "audited_at": now_str(),
                }
            )

        if args.save_every > 0 and len(results) % args.save_every == 0:
            save_audit_json(
                args.username,
                results,
                inactive_days=args.inactive_days,
                stale_days=args.stale_days,
            )
            partial_report = generate_report(
                args.username,
                results,
                inactive_days=args.inactive_days,
                stale_days=args.stale_days,
            )
            partial_report_path = PROJECT_ROOT / "05-选题研究" / f"X-following-巡检-{today_str()}.md"
            save_report(partial_report, str(partial_report_path))
            print_colored(f"已中途落盘 {len(results)} 条审计结果", "yellow")

    json_path = save_audit_json(
        args.username,
        results,
        inactive_days=args.inactive_days,
        stale_days=args.stale_days,
    )
    report = generate_report(
        args.username,
        results,
        inactive_days=args.inactive_days,
        stale_days=args.stale_days,
    )
    report_path = PROJECT_ROOT / "05-选题研究" / f"X-following-巡检-{today_str()}.md"
    save_report(report, str(report_path))

    summary = build_summary(results)
    print_colored("\n=== 巡检完成 ===", "green")
    print_colored(f"报告: {report_path}", "cyan")
    print_colored(f"JSON: {json_path}", "cyan")
    print_colored(
        f"active={summary['active']} | 新动态={summary['fresh_updates']} | 强候选={summary['unfollow_candidates']} | 待复核={summary['review_candidates']}",
        "green",
    )


if __name__ == "__main__":
    main()
