import json
import tempfile
import unittest
from datetime import date
from pathlib import Path

from bookscout.report import write_report


class ReadingGateTests(unittest.TestCase):
    def _report(self):
        return {
            "issue": "2026-10",
            "reading_policy": {"require_published": True, "require_verified_ebook": True},
            "books": [{
                "title": "Published book",
                "published": "2022-06-21",
                "ebook_access": {
                    "status": "available", "published": "2022-06-21", "checked_at": "2026-10-12",
                    "isbn": "9780593190302", "links": [{"url": "https://example.com/ebook"}],
                },
            }],
        }

    def test_published_backlist_with_ebook_can_publish(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "current.json"
            self.assertTrue(write_report(self._report(), output, minimum_to_publish=1, today=date(2026, 10, 12)))

    def test_unreleased_or_unverified_ebook_preserves_previous_report(self):
        for change in ("future_book", "future_ebook", "missing_access", "preorder", "missing_link", "unknown_date"):
            with self.subTest(change=change), tempfile.TemporaryDirectory() as directory:
                output = Path(directory) / "current.json"
                previous = {"issue": "2026-08", "books": []}
                output.write_text(json.dumps(previous), encoding="utf-8")
                report = self._report()
                book = report["books"][0]
                if change == "future_book": book["published"] = "2026-10-13"
                elif change == "future_ebook": book["ebook_access"]["published"] = "2026-10-13"
                elif change == "missing_access": book.pop("ebook_access")
                elif change == "preorder": book["ebook_access"]["status"] = "preorder"
                elif change == "missing_link": book["ebook_access"]["links"] = []
                elif change == "unknown_date": book["published"] = "2026-10"
                self.assertFalse(write_report(report, output, minimum_to_publish=1, today=date(2026, 10, 12)))
                self.assertEqual(json.loads(output.read_text(encoding="utf-8")), previous)
                status = json.loads(output.with_name("last-run.json").read_text(encoding="utf-8"))
                self.assertEqual(status["status"], "held_by_reading_gate")
                self.assertTrue(status["unavailable"])
