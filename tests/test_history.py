import json
import tempfile
import unittest
from pathlib import Path

from bookscout.report import write_report


def report(issue: str) -> dict:
    return {
        "schema_version": 1,
        "issue": issue,
        "generated_at": f"{issue}-01T01:00:00+00:00",
        "scanned": 20,
        "selected_count": 2,
        "headline": f"{issue} monthly books",
        "editor_note": "test",
        "books": [{"title": "A"}, {"title": "B"}],
        "watchlist": [],
        "candidates": [],
        "rejected_summary": {"count": 18, "reasons": []},
    }


class HistoryTests(unittest.TestCase):
    def test_new_issue_archives_previous_report_and_updates_index(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "book" / "data" / "current.json"
            self.assertTrue(write_report(report("2026-08"), output, minimum_to_publish=2))
            self.assertTrue(write_report(report("2026-09"), output, minimum_to_publish=2))

            archive = output.parent / "archive" / "2026-08.json"
            self.assertTrue(archive.is_file())
            self.assertEqual(json.loads(archive.read_text(encoding="utf-8"))["issue"], "2026-08")

            index = json.loads((output.parent / "archive" / "index.json").read_text(encoding="utf-8"))
            self.assertEqual([item["issue"] for item in index["issues"]], ["2026-09", "2026-08"])
            self.assertTrue(index["issues"][0]["current"])
            self.assertFalse(index["issues"][1]["current"])


if __name__ == "__main__":
    unittest.main()
