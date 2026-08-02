import json
import unittest
from pathlib import Path


class SiteContractTests(unittest.TestCase):
    def test_curated_report_has_required_fields(self):
        payload = json.loads(Path("book/data/current.json").read_text(encoding="utf-8"))
        self.assertGreaterEqual(len(payload["books"]), 2)
        for book in payload["books"]:
            for field in ("title", "authors", "score", "thesis", "fit", "evidence", "caveat", "sources"):
                self.assertIn(field, book)
            self.assertTrue(book["sources"])

    def test_page_assets_exist(self):
        for path in (
            "book/index.html",
            "book/book.css",
            "book/book.js",
            "book/journal-store.js",
            "book/review/index.html",
            "book/review/review.css",
            "book/review/review.js",
        ):
            self.assertTrue(Path(path).is_file(), path)

    def test_candidate_audit_is_complete(self):
        audit = json.loads(Path("book/data/candidate-audit.json").read_text(encoding="utf-8"))
        self.assertEqual(audit["scanned"], len(audit["candidates"]))
        self.assertGreaterEqual(audit["scanned"], 25)
        for candidate in audit["candidates"]:
            for field in ("title", "authors", "score", "status", "reason"):
                self.assertIn(field, candidate)

    def test_history_index_points_to_august(self):
        history = json.loads(Path("book/data/archive/index.json").read_text(encoding="utf-8"))
        august = next(item for item in history["issues"] if item["issue"] == "2026-08")
        self.assertEqual(august["url"], "./data/current.json")
        self.assertEqual(august["candidate_url"], "./data/candidate-audit.json")


if __name__ == "__main__":
    unittest.main()
