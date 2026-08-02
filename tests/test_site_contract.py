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
        for path in ("book/index.html", "book/book.css", "book/book.js"):
            self.assertTrue(Path(path).is_file(), path)


if __name__ == "__main__":
    unittest.main()
