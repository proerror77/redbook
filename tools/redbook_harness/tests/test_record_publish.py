import argparse
import unittest


from tools.record_publish import build_record, validate_record


def make_args(**overrides: object) -> argparse.Namespace:
    base = {
        "record_id": "record-1",
        "stage": "T+1",
        "platform": "x.com",
        "title": "Test",
        "published_at": "2026-04-28T08:00:00+08:00",
        "status_url": "https://x.com/0xcybersmile/status/1",
        "post_id": "",
        "note_id": "",
        "account": "0xcybersmile",
        "content_path": "",
        "publish_record_path": "",
        "source_url": [],
        "evidence": [],
        "note": "",
    }
    for metric in ("views", "likes", "reposts", "replies", "bookmarks", "shares", "comments", "saves", "followers"):
        base[metric] = None
    base.update(overrides)
    return argparse.Namespace(**base)


class RecordPublishTest(unittest.TestCase):
    def test_followup_requires_readback_metric_or_explicit_closure(self) -> None:
        record = build_record(make_args(evidence=["status_page_visible"]))

        with self.assertRaisesRegex(ValueError, "metric plus live readback"):
            validate_record(record)

    def test_followup_accepts_metric_with_live_readback(self) -> None:
        record = build_record(make_args(views="12", evidence=["status_page_visible"]))

        validate_record(record)

    def test_followup_accepts_explicit_no_metric_closure(self) -> None:
        record = build_record(make_args(evidence=["closed_without_metrics"]))

        validate_record(record)


if __name__ == "__main__":
    unittest.main()
