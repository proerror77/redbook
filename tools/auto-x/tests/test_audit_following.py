#!/usr/bin/env python3
"""Regression tests for following audit classification."""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path
import unittest


SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPT_DIR))

import audit_following  # noqa: E402


class EstimateDaysSinceLabelTests(unittest.TestCase):
    def test_supports_recent_chinese_labels(self) -> None:
        today = date(2026, 4, 9)
        self.assertEqual(audit_following.estimate_days_since_label("7小时 前", today), 0)
        self.assertEqual(audit_following.estimate_days_since_label("昨天", today), 1)

    def test_supports_month_day_labels(self) -> None:
        today = date(2026, 4, 9)
        self.assertEqual(audit_following.estimate_days_since_label("4月7日", today), 2)
        self.assertEqual(audit_following.estimate_days_since_label("Apr 7", today), 2)


class ClassifyProfileTests(unittest.TestCase):
    def test_classifies_not_found_profile(self) -> None:
        snapshot = """
  - main:
    - text: 唔...该页面不存在。请尝试搜索别的内容。
        """.strip()

        result = audit_following.classify_profile_snapshot(
            snapshot,
            username="ghost_account",
            today=date(2026, 4, 9),
            inactive_days=60,
            stale_days=120,
        )

        self.assertEqual(result["status"], "not_found")
        self.assertTrue(result["unfollow_recommended"])

    def test_classifies_suspended_profile(self) -> None:
        snapshot = """
  - main:
    - text: 账号已被冻结
        """.strip()

        result = audit_following.classify_profile_snapshot(
            snapshot,
            username="suspended_account",
            today=date(2026, 4, 9),
            inactive_days=60,
            stale_days=120,
        )

        self.assertEqual(result["status"], "suspended")
        self.assertTrue(result["unfollow_recommended"])

    def test_classifies_recently_active_profile(self) -> None:
        snapshot = """
  - main:
    - article "OpenAI Developers 认证账号 @OpenAIDevs 4小时 前 Codex brings your work context together" [ref=e1]:
      - text: Codex brings your work context together.
        """.strip()

        result = audit_following.classify_profile_snapshot(
            snapshot,
            username="OpenAIDevs",
            today=date(2026, 4, 9),
            inactive_days=60,
            stale_days=120,
        )

        self.assertEqual(result["status"], "active")
        self.assertEqual(result["latest_post_days"], 0)
        self.assertFalse(result["unfollow_recommended"])

    def test_classifies_inactive_profile(self) -> None:
        snapshot = """
  - main:
    - article "Some Builder @somebuilder 1月1日 Shipping notes from the last launch" [ref=e1]:
      - text: Shipping notes from the last launch.
        """.strip()

        result = audit_following.classify_profile_snapshot(
            snapshot,
            username="somebuilder",
            today=date(2026, 4, 9),
            inactive_days=60,
            stale_days=90,
        )

        self.assertEqual(result["status"], "inactive")
        self.assertGreaterEqual(result["latest_post_days"], 90)
        self.assertTrue(result["unfollow_recommended"])

    def test_prefers_non_pinned_article_for_activity(self) -> None:
        snapshot = """
  - main:
    - article "已置顶 Some Builder @somebuilder 1月1日 Shipping notes from the last launch" [ref=e1]:
      - text: Shipping notes from the last launch.
    - article "Some Builder @somebuilder 4月8日 New product update" [ref=e2]:
      - text: New product update.
        """.strip()

        result = audit_following.classify_profile_snapshot(
            snapshot,
            username="somebuilder",
            today=date(2026, 4, 9),
            inactive_days=60,
            stale_days=90,
        )

        self.assertEqual(result["status"], "active")
        self.assertEqual(result["latest_post_label"], "4月8日")


if __name__ == "__main__":
    unittest.main()
