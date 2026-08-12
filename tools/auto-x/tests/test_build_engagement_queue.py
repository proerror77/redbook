import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import build_engagement_queue


class BuildEngagementQueueTests(unittest.TestCase):
    def test_default_source_builds_from_fresh_following_without_browser(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            output_dir = root / "05-选题研究"
            output_dir.mkdir(parents=True)
            input_json = output_dir / f"X-timeline-fresh-following-{build_engagement_queue.today_str()}.json"
            input_json.write_text(
                json.dumps(
                    [
                        {
                            "id": "1",
                            "author": "alice_ai",
                            "text": "Agent workflow memory and audit are becoming the real enterprise AI runtime.",
                            "likes": 220,
                            "retweets": 18,
                            "replies": 12,
                            "views": 9000,
                            "created_at": "Tue Jun 30 20:53:55 +0000 2026",
                            "url": "https://x.com/alice_ai/status/1",
                        }
                    ]
                ),
                encoding="utf-8",
            )

            argv = [
                "build_engagement_queue.py",
                "--input-json",
                str(input_json),
                "--limit",
                "20",
            ]
            with mock.patch.object(build_engagement_queue, "PROJECT_ROOT", root), \
                mock.patch.object(sys, "argv", argv), \
                mock.patch.object(build_engagement_queue, "ensure_browser") as ensure_browser:
                build_engagement_queue.main()

            ensure_browser.assert_not_called()
            queue = json.loads(
                (output_dir / f"X-互动队列-{build_engagement_queue.today_str()}.json").read_text(
                    encoding="utf-8"
                )
            )
            self.assertEqual(len(queue), 1)
            self.assertEqual(queue[0]["source"], "fresh-following")
            self.assertEqual(queue[0]["target_url"], "https://x.com/alice_ai/status/1")


if __name__ == "__main__":
    unittest.main()
