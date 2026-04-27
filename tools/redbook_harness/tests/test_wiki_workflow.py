#!/usr/bin/env python3
"""Regression tests for explicit wiki workflow helpers."""

from __future__ import annotations

import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch

from tools.redbook_harness.runtime import HarnessRuntime
import tools.wiki_workflow as wiki_workflow


class DailyIngestWorkflowTests(unittest.TestCase):
    def test_daily_ingest_writes_summary_artifact_that_satisfies_gate(self) -> None:
        with tempfile.TemporaryDirectory() as tempdir:
            root = Path(tempdir)
            report_path = root / "05-选题研究" / "X-每日日程-2026-04-08.md"
            report_path.parent.mkdir(parents=True, exist_ok=True)
            report_path.write_text(
                """
# X.com 每日日程 - 2026-04-08

## 📋 发布提醒

- 制作中选题 1 篇

## 📊 数据回顾

- 最近一条小红书已发布

## 🔍 每日研究

- 今天的研究信号已整理
                """.strip()
                + "\n",
                encoding="utf-8",
            )

            with patch.object(wiki_workflow, "ROOT", root), patch.object(
                wiki_workflow,
                "REPORTS_ROOT",
                root / "docs" / "reports",
            ), patch.object(
                wiki_workflow,
                "WIKI_ROOT",
                root / "wiki",
            ):
                result = wiki_workflow.ensure_daily_ingest_run("2026-04-08")

            runtime = HarnessRuntime(root)
            run = runtime.load_run(result["run_id"])
            artifact_paths = {artifact["path"] for artifact in run["artifacts"]}

            self.assertIn("docs/reports/wiki-ingest-2026-04-08.md", artifact_paths)
            self.assertTrue(runtime.stage_gate_report(run)["ready"])
            self.assertEqual(run["status"], "done")
            self.assertIn("closed_at", run)


if __name__ == "__main__":
    unittest.main()
