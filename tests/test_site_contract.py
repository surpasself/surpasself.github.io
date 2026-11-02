import json
import unittest
from datetime import date
from pathlib import Path

from bookscout.availability import reading_gate_issues


class SiteContractTests(unittest.TestCase):
    def test_curated_report_has_required_fields(self):
        payload = json.loads(Path("book/data/current.json").read_text(encoding="utf-8"))
        self.assertGreaterEqual(len(payload["books"]), 2)
        self.assertLessEqual(len(payload["books"]), 4)
        for book in payload["books"]:
            for field in ("title", "authors", "score", "thesis", "fit", "evidence", "caveat", "sources"):
                self.assertIn(field, book)
            self.assertGreaterEqual(len(book["sources"]), 2)

    def test_current_picks_are_published_with_verified_ebooks_in_two_collections(self):
        payload = json.loads(Path("book/data/current.json").read_text(encoding="utf-8"))
        policy = payload["reading_policy"]
        self.assertTrue(policy["require_published"])
        self.assertTrue(policy["require_verified_ebook"])
        self.assertEqual({book["collection"] for book in payload["books"]}, {"new", "backlist"})
        verified_on = date.fromisoformat(payload["generated_at"][:10])
        for book in payload["books"]:
            self.assertEqual(reading_gate_issues(book, policy, today=verified_on), [], book["title"])
            if book["collection"] == "new":
                self.assertLessEqual((verified_on - date.fromisoformat(book["published"])).days, policy["recent_window_days"])

    def test_september_backfill_preserves_current_and_has_readable_books(self):
        history = json.loads(Path("book/data/archive/index.json").read_text(encoding="utf-8"))
        self.assertEqual([item["issue"] for item in history["issues"]][-3:], ["2026-10", "2026-09", "2026-08"])
        entry = next(item for item in history["issues"] if item["issue"] == "2026-09")
        self.assertFalse(entry["current"])
        report = json.loads(Path("book").joinpath(entry["url"]).read_text(encoding="utf-8"))
        audit = json.loads(Path("book").joinpath(entry["candidate_url"]).read_text(encoding="utf-8"))
        self.assertTrue(report["backfilled"])
        self.assertEqual(report["selected_count"], len(report["books"]))
        self.assertEqual(report["scanned"], len(audit["candidates"]))
        cutoff = date.fromisoformat(report["publication_cutoff"])
        checked = date.fromisoformat(report["generated_at"][:10])
        for book in report["books"]:
            self.assertLessEqual(date.fromisoformat(book["published"]), cutoff)
            self.assertLessEqual(date.fromisoformat(book["ebook_access"]["published"]), cutoff)
            self.assertEqual(reading_gate_issues(book, report["reading_policy"], today=checked), [])

    def test_policy_is_documentation_not_page_sections(self):
        html = Path("book/index.html").read_text(encoding="utf-8")
        for marker in ("QUALITY CONTRACT", "YOUR READING DNA", "阅读门槛", 'id="quality-contract"', 'class="profile-section"'):
            self.assertNotIn(marker, html)
        self.assertTrue(Path("docs/book-selection-policy.md").is_file())
        self.assertIn("data-ebook-access", html)
        self.assertIn("data-caveat", html)

    def test_november_preserves_october_and_all_history_files(self):
        history = json.loads(Path("book/data/archive/index.json").read_text(encoding="utf-8"))
        self.assertEqual(history["issues"][0]["issue"], "2026-11")
        for item in history["issues"]:
            report = json.loads(Path("book").joinpath(item["url"]).read_text(encoding="utf-8"))
            self.assertEqual(report["issue"], item["issue"])
            self.assertEqual(len(report["books"]), item["selected_count"])
            self.assertTrue(Path("book").joinpath(item["candidate_url"]).is_file())
        october = json.loads(Path("book/data/archive/2026-10.json").read_text(encoding="utf-8"))
        self.assertEqual([b["isbn"] for b in october["books"]], ["9781668031575", "9780593190296", "9781603580557"])

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
        self.assertGreaterEqual(audit["scanned"], 2)
        for candidate in audit["candidates"]:
            for field in ("title", "authors", "score", "status", "reason"):
                self.assertIn(field, candidate)

    def test_history_index_archives_august_and_points_to_current_issue(self):
        history = json.loads(Path("book/data/archive/index.json").read_text(encoding="utf-8"))
        current_report = json.loads(Path("book/data/current.json").read_text(encoding="utf-8"))
        current = next(item for item in history["issues"] if item["issue"] == current_report["issue"])
        august = next(item for item in history["issues"] if item["issue"] == "2026-08")
        self.assertEqual(sum(item["current"] for item in history["issues"]), 1)
        self.assertTrue(current["current"])
        self.assertEqual(current["url"], "./data/current.json")
        self.assertEqual(current["candidate_url"], "./data/candidate-audit.json")
        self.assertFalse(august["current"])
        self.assertEqual(august["url"], "./data/archive/2026-08.json")
        self.assertEqual(august["candidate_url"], "./data/archive/2026-08-candidates.json")


if __name__ == "__main__":
    unittest.main()
