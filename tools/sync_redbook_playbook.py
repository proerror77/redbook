#!/usr/bin/env python3
"""Sync shared Redbook playbook block into AGENTS.md and CLAUDE.md.

Usage:
  python3 tools/sync_redbook_playbook.py --bootstrap-from CLAUDE.md
  python3 tools/sync_redbook_playbook.py
"""

from __future__ import annotations

import argparse
from pathlib import Path

START_MARKER = "<!-- BEGIN SHARED_RED_BOOK_PLAYBOOK -->"
END_MARKER = "<!-- END SHARED_RED_BOOK_PLAYBOOK -->"
SECTION_HEADER = "## 🎯 标准化内容生产工作流"
SHARED_PATH = Path("docs/shared/redbook-playbook.md")
TARGETS = [Path("AGENTS.md"), Path("CLAUDE.md")]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


def extract_shared_block(text: str) -> str:
    idx = text.find(SECTION_HEADER)
    if idx < 0:
        raise ValueError(f"Could not find section header: {SECTION_HEADER}")
    return text[idx:].rstrip() + "\n"


def replace_marked_block(text: str, shared: str) -> str:
    if START_MARKER in text and END_MARKER in text:
        start = text.index(START_MARKER)
        end = text.index(END_MARKER, start) + len(END_MARKER)
        prefix = text[:start].rstrip() + "\n\n"
        suffix = text[end:].lstrip("\n")
        merged = prefix + START_MARKER + "\n" + shared.rstrip() + "\n" + END_MARKER + "\n"
        if suffix:
            merged += "\n" + suffix
        return merged

    idx = text.find(SECTION_HEADER)
    if idx < 0:
        raise ValueError(f"Could not find section header in target file")

    prefix = text[:idx].rstrip() + "\n\n"
    return prefix + START_MARKER + "\n" + shared.rstrip() + "\n" + END_MARKER + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bootstrap-from", type=Path, help="Source file used to initialize docs/shared/redbook-playbook.md")
    args = parser.parse_args()

    if args.bootstrap_from:
        source_text = read_text(args.bootstrap_from)
        shared = extract_shared_block(source_text)
        SHARED_PATH.parent.mkdir(parents=True, exist_ok=True)
        write_text(SHARED_PATH, shared)

    if not SHARED_PATH.exists():
        raise SystemExit(f"Shared file not found: {SHARED_PATH}. Run with --bootstrap-from first.")

    shared = read_text(SHARED_PATH)
    for target in TARGETS:
        current = read_text(target)
        updated = replace_marked_block(current, shared)
        if updated != current:
            write_text(target, updated)
            print(f"updated: {target}")
        else:
            print(f"unchanged: {target}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
