import sys
import unittest
from pathlib import Path
from unittest import mock


SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import scrape_hackernews
import scrape_reddit


class HackerNewsFallbackTests(unittest.TestCase):
    def test_fetch_top_stories_falls_back_to_algolia(self) -> None:
        def fake_request(url: str, timeout: int = 10):
            if "topstories.json" in url:
                raise RuntimeError("firebase unavailable")
            if "search?tags=front_page" in url:
                return {"hits": [{"objectID": "101"}, {"objectID": "202"}]}
            raise AssertionError(url)

        with mock.patch.object(scrape_hackernews, "_request_json", side_effect=fake_request):
            self.assertEqual(scrape_hackernews.fetch_top_stories(limit=2), [101, 202])

    def test_fetch_item_falls_back_to_algolia_item(self) -> None:
        def fake_request(url: str, timeout: int = 10):
            if "/item/123.json" in url:
                raise RuntimeError("firebase unavailable")
            if "/items/123" in url:
                return {
                    "id": 123,
                    "type": "story",
                    "author": "alice",
                    "title": "Fallback story",
                    "url": "https://example.com/post",
                    "points": 88,
                    "created_at_i": 1700000000,
                    "children": [{"id": 456}, {"id": 789}],
                }
            raise AssertionError(url)

        with mock.patch.object(scrape_hackernews, "_request_json", side_effect=fake_request):
            item = scrape_hackernews.fetch_item(123)

        self.assertIsNotNone(item)
        self.assertEqual(item["type"], "story")
        self.assertEqual(item["by"], "alice")
        self.assertEqual(item["score"], 88)
        self.assertEqual(item["kids"], [456, 789])


class RedditFallbackTests(unittest.TestCase):
    def test_fetch_subreddit_hot_falls_back_to_pullpush(self) -> None:
        def fake_request(url: str, timeout: int = 10):
            if "www.reddit.com" in url:
                raise RuntimeError("403 blocked")
            if "api.pullpush.io" in url:
                return {
                    "data": [
                        {
                            "id": "abc123",
                            "title": "Need a better SaaS analytics tool",
                            "author": "founder1",
                            "score": 321,
                            "num_comments": 45,
                            "permalink": "/r/SaaS/comments/abc123/need_a_better_saas_analytics_tool/",
                            "created_utc": 1700000000,
                            "selftext": "Current tools are too expensive.",
                            "link_flair_text": "Question",
                        }
                    ]
                }
            raise AssertionError(url)

        with mock.patch.object(scrape_reddit, "_request_json", side_effect=fake_request):
            posts = scrape_reddit.fetch_subreddit_hot("SaaS", limit=1)

        self.assertEqual(len(posts), 1)
        self.assertEqual(posts[0]["source"], "pullpush")
        self.assertIn("/r/SaaS/comments/abc123/", posts[0]["url"])
        self.assertEqual(posts[0]["score"], 321)


if __name__ == "__main__":
    unittest.main()
