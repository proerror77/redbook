#!/usr/bin/env python3
"""Regression tests for agent-browser-session health checks."""

from __future__ import annotations

import sys
from pathlib import Path
import unittest
from unittest.mock import patch


SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPT_DIR))

import x_utils  # noqa: E402


class SnapshotValidationTests(unittest.TestCase):
    def test_accepts_new_snapshot_shape_without_document_node(self) -> None:
        snapshot = """
  - banner:
    - heading "X" [ref=e6] [level=1]:
  - main:
    - textbox "帖子文本" [ref=e11]
    - region "你的主页时间线" [ref=e13]:
        """.strip()

        self.assertTrue(x_utils._snapshot_looks_ready(snapshot))

    def test_rejects_empty_page_output(self) -> None:
        self.assertFalse(x_utils._snapshot_looks_ready("Empty page"))

    def test_detects_detached_frame_as_recoverable(self) -> None:
        result = {
            "ok": False,
            "stdout": "",
            "stderr": "locator.ariaSnapshot: Frame was detached",
            "returncode": 1,
        }
        self.assertTrue(x_utils._is_recoverable_browser_failure(result))

    def test_extract_tweets_accepts_new_article_shape(self) -> None:
        snapshot = """
    - region "搜索时间线" [ref=e29]:
      - article "meng shao 认证账号 @shao__meng 2月4日 该用 Skills 还是 MCP？ 1 回复、7 次转帖、21 喜欢、26 书签、3601 次观看" [ref=e48]:
        - link "meng shao 认证账号" [ref=e49]:
        - link "@shao__meng" [ref=e50]:
        - link "2月4日" [ref=e51]:
        - text: 该用 Skills 还是 MCP？如果你也有这个困惑，可以看看
        - link "@llama_index" [ref=e54]:
        - text: 这篇文章，从 Skills 和 MCP 的本质特征出发，结合 LlamaIndex 的实践给出选择建议。
      - 'article "Vikas Singh 认证账号 @vikas_ai_ 4月2日 Paid Tools vs Free Alternatives 31 回复、43 次转帖、101 喜欢、30 书签、1654 次观看"':
        - link "Vikas Singh 认证账号" [ref=e59]:
        - link "@vikas_ai_" [ref=e60]:
        - link "4月2日" [ref=e61]:
        - text: "Paid Tools vs Free Alternatives 1. Research Paid:"
        - link "ChatGPT.com" [ref=e64]:
        - text: "Free:"
        - link "Deepseek.com" [ref=e65]:
        """.strip()

        tweets = x_utils.extract_tweets(snapshot)

        self.assertEqual(len(tweets), 2)
        self.assertEqual(tweets[0]["handle"], "shao__meng")
        self.assertEqual(tweets[0]["author"], "meng shao")
        self.assertEqual(tweets[0]["retweets"], 7)
        self.assertEqual(tweets[0]["likes"], 21)
        self.assertIn("Skills", tweets[0]["content"])
        self.assertEqual(tweets[1]["handle"], "vikas_ai_")
        self.assertEqual(tweets[1]["likes"], 101)
        self.assertNotIn("用户 来自任何人", tweets[1]["content"])


class EnsureBrowserTests(unittest.TestCase):
    @patch("x_utils.print_colored")
    @patch("x_utils._recover_browser_session", return_value=True)
    @patch("x_utils.run_abs_result")
    def test_ensure_browser_recovers_after_detached_frame(
        self,
        mock_run_abs_result,
        _mock_recover,
        _mock_print,
    ) -> None:
        mock_run_abs_result.side_effect = [
            {
                "ok": False,
                "stdout": "",
                "stderr": "locator.ariaSnapshot: Frame was detached",
                "returncode": 1,
            },
            {
                "ok": True,
                "stdout": '- main:\\n  - button "发帖" [ref=e12]',
                "stderr": "",
                "returncode": 0,
            },
        ]

        self.assertTrue(x_utils.ensure_browser())


if __name__ == "__main__":
    unittest.main()
