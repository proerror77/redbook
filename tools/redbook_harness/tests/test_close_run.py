from pathlib import Path
import unittest


from tools.redbook_harness.runtime import HarnessRuntime


class CloseRunTest(unittest.TestCase):
    def test_content_pipeline_done_close_requires_retrospect(self) -> None:
        with self.subTest("content pipeline"):
            import tempfile

            with tempfile.TemporaryDirectory() as temp_dir:
                runtime = HarnessRuntime(Path(temp_dir))
                run = runtime.create_run(
                    topic="计划内容",
                    source="user",
                    owner="Codex",
                    priority="P1",
                    summary="",
                )

                with self.assertRaisesRegex(ValueError, "final retrospect stage"):
                    runtime.close_run(run["run_id"], status="done")

    def test_content_pipeline_can_close_stale_before_retrospect(self) -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            runtime = HarnessRuntime(Path(temp_dir))
            run = runtime.create_run(
                topic="计划内容",
                source="user",
                owner="Codex",
                priority="P1",
                summary="",
            )

            closed = runtime.close_run(run["run_id"], status="closed_stale")

            self.assertEqual(closed["status"], "closed_stale")

    def test_wiki_maintenance_done_close_still_allowed(self) -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            runtime = HarnessRuntime(Path(temp_dir))
            run = runtime.create_run(
                topic="LLM Wiki query agent workflow",
                source="wiki/index.md",
                owner="Codex",
                priority="P1",
                summary="",
            )

            closed = runtime.close_run(run["run_id"], status="done")

            self.assertEqual(closed["status"], "done")


if __name__ == "__main__":
    unittest.main()
