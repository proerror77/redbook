#!/usr/bin/env python3
"""Regression tests for Xiaohongshu note stat import helper."""

from __future__ import annotations

import tempfile
from pathlib import Path
import unittest

from openpyxl import Workbook

import tools.import_xhs_note_stats as import_xhs_note_stats


def build_sample_workbook(path: Path) -> None:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Sheet1"
    sheet.append(["最多导出排序后前1000条笔记"] * 13)
    sheet.append(
        [
            "笔记标题",
            "首次发布时间",
            "体裁",
            "曝光",
            "观看量",
            "封面点击率",
            "点赞",
            "评论",
            "收藏",
            "涨粉",
            "分享",
            "人均观看时长",
            "弹幕",
        ]
    )
    sheet.append(
        [
            "团队AI化后，真正缺的不是Prompt",
            "2026年04月12日13时43分03秒",
            "图文",
            253,
            12,
            0.04,
            0,
            0,
            0,
            0,
            0,
            23,
            0,
        ]
    )
    sheet.append(
        [
            "AI基础设施战争开打，24小时内出现替代品",
            "2026年04月10日12时11分08秒",
            "图文",
            1868,
            363,
            0.187,
            9,
            0,
            4,
            3,
            4,
            22,
            0,
        ]
    )
    workbook.save(path)


class ImportXhsNoteStatsTests(unittest.TestCase):
    def test_import_updates_stats_and_generates_review_template(self) -> None:
        with tempfile.TemporaryDirectory() as tempdir:
            root = Path(tempdir)
            xlsx_path = root / "笔记列表明细表.xlsx"
            stats_path = root / "04-内容数据统计" / "数据统计表.md"
            review_path = root / "docs" / "reports" / "xhs-note-review-template-2026-04-15.md"

            build_sample_workbook(xlsx_path)
            stats_path.parent.mkdir(parents=True, exist_ok=True)
            stats_path.write_text(
                """
# 内容数据统计表

## 小红书数据

| 日期 | 标题 | 类型 | 播放/阅读 | 点赞 | 收藏 | 评论 | 涨粉 | 备注 |
|------|------|------|----------|------|------|------|------|------|
| | | | | | | | | |

## 抖音数据

| 日期 | 标题 | 播放量 | 完播率 | 点赞 | 评论 | 转发 | 涨粉 | 备注 |
|------|------|--------|--------|------|------|------|------|------|
| | | | | | | | | |
                """.strip()
                + "\n",
                encoding="utf-8",
            )

            result = import_xhs_note_stats.import_xhs_note_stats(
                xlsx_path=xlsx_path,
                stats_path=stats_path,
                review_path=review_path,
            )

            updated_stats = stats_path.read_text(encoding="utf-8")
            review_text = review_path.read_text(encoding="utf-8")

            self.assertEqual(result.imported_rows, 2)
            self.assertIn("团队AI化后，真正缺的不是Prompt", updated_stats)
            self.assertIn("AI基础设施战争开打，24小时内出现替代品", updated_stats)
            self.assertIn("总曝光 `2121`", review_text)
            self.assertIn("主瓶颈初判", review_text)
            self.assertIn("AI基础设施战争开打，24小时内出现替代品", review_text)
            self.assertIn("团队AI化后，真正缺的不是Prompt", review_text)

    def test_import_replaces_same_title_date_instead_of_duplicate(self) -> None:
        with tempfile.TemporaryDirectory() as tempdir:
            root = Path(tempdir)
            xlsx_path = root / "笔记列表明细表.xlsx"
            stats_path = root / "04-内容数据统计" / "数据统计表.md"
            review_path = root / "docs" / "reports" / "xhs-note-review-template-2026-04-15.md"

            build_sample_workbook(xlsx_path)
            stats_path.parent.mkdir(parents=True, exist_ok=True)
            stats_path.write_text(
                """
# 内容数据统计表

## 小红书数据

| 日期 | 标题 | 类型 | 播放/阅读 | 点赞 | 收藏 | 评论 | 涨粉 | 备注 |
|------|------|------|----------|------|------|------|------|------|
| 2026-04-12 | 团队AI化后，真正缺的不是Prompt | 图文 | 99 | 1 | 1 | 1 | 1 | 旧数据 |

## 抖音数据

| 日期 | 标题 | 播放量 | 完播率 | 点赞 | 评论 | 转发 | 涨粉 | 备注 |
|------|------|--------|--------|------|------|------|------|------|
| | | | | | | | | |
                """.strip()
                + "\n",
                encoding="utf-8",
            )

            import_xhs_note_stats.import_xhs_note_stats(
                xlsx_path=xlsx_path,
                stats_path=stats_path,
                review_path=review_path,
            )

            updated_stats = stats_path.read_text(encoding="utf-8")
            self.assertEqual(updated_stats.count("团队AI化后，真正缺的不是Prompt"), 1)
            self.assertIn("| 2026-04-12 | 团队AI化后，真正缺的不是Prompt | 图文 | 12 |", updated_stats)


if __name__ == "__main__":
    unittest.main()
