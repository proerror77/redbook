#!/usr/bin/env python3
"""Regression tests for redbook harness artifact verification."""

from __future__ import annotations

import tempfile
from pathlib import Path
import unittest

from tools.redbook_harness.verifier import HarnessVerifier


class ResearchReportVerifierTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tempdir.name)
        self.verifier = HarnessVerifier(self.root)

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def _write_report(self, relative_path: str, content: str) -> dict[str, str]:
        path = self.root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content.strip() + "\n", encoding="utf-8")
        return {
            "id": "artifact-1",
            "type": "research_report",
            "path": relative_path,
        }

    def test_accepts_wiki_query_report_shape(self) -> None:
        artifact = self._write_report(
            "docs/reports/wiki-query-内容创作-2026-04-08.md",
            """
# Wiki Query Report: 内容创作

日期：2026-04-08

## 查询主题

- Topic: `内容创作`
- 匹配页面数：3

## 研究来源

- `wiki/选题/内容创作与增长.md`
- `wiki/概念/系统化创作.md`

## 命中页面

- [内容创作与增长](/tmp/wiki/内容创作与增长.md) | score=14 | 选题与观众框架
- [系统化创作](/tmp/wiki/系统化创作.md) | score=11 | 可复用的创作流程
- [AI工具与效率](/tmp/wiki/AI工具与效率.md) | score=9 | 资料库与工作流判断

## 一句话结论

- 当前 wiki 已能稳定命中内容创作相关主题，可作为起草前研究入口。
            """,
        )

        result = self.verifier.verify_artifact({}, artifact)

        self.assertTrue(result["ok"], result["errors"])

    def test_accepts_wiki_lint_report_shape(self) -> None:
        artifact = self._write_report(
            "docs/reports/wiki-lint-2026-04-08.md",
            """
# Wiki Lint Report 2026-04-08

## 结论

- 当前 wiki 结构健康，可继续作为内容前置研究入口。

## 来源

- `wiki/index.md`
- `wiki/overview.md`
- `wiki/选题/`

## 摘要

- 内容页数量：13
- index 缺失页面：0
- index 悬挂引用：0

## index 缺失页面

- 无

## index 悬挂引用

- 无

## 孤立页面

- 无

## index 日期陈旧

- 无

## overview 状态

- 无
            """,
        )

        result = self.verifier.verify_artifact({}, artifact)

        self.assertTrue(result["ok"], result["errors"])

    def test_rejects_short_generic_research_report(self) -> None:
        artifact = self._write_report(
            "docs/reports/random-short-report.md",
            """
# Random Report

## 摘要

- 太短

## 备注

- 不应通过 research_report verifier
            """,
        )

        result = self.verifier.verify_artifact({}, artifact)

        self.assertFalse(result["ok"])


if __name__ == "__main__":
    unittest.main()
