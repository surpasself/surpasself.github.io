import json
import unittest
from datetime import date
from pathlib import Path

from bookscout.discovery import Candidate, candidate_from_openlibrary
from bookscout.scoring import score_candidate


PROFILE = json.loads(Path("config/books_profile.json").read_text(encoding="utf-8"))


class ScoringTests(unittest.TestCase):
    def test_openlibrary_candidate_uses_recent_edition(self):
        candidate = candidate_from_openlibrary(
            {
                "key": "/works/OL123W",
                "title": "A New Systems Book",
                "author_name": ["A. Researcher"],
                "publish_date": ["2012", "August 11, 2026"],
                "publisher": ["MIT Press"],
                "isbn": ["1234567890", "9780000000018"],
                "number_of_pages_median": 320,
                "subject": ["Systems thinking", "Learning"],
                "cover_i": 123,
            },
            "systems thinking complexity",
            earliest=date(2026, 3, 5),
            latest=date(2026, 10, 1),
        )
        self.assertIsNotNone(candidate)
        self.assertEqual(candidate.published_date, "2026-08-11")
        self.assertEqual(candidate.isbn, "9780000000018")
        self.assertEqual(candidate.info_url, "https://openlibrary.org/works/OL123W")

    def test_research_backed_trusted_book_can_pass(self):
        candidate = Candidate(
            title="Rethinking Decisions in the Age of AI",
            authors=["A. Researcher"],
            description=(
                "Drawing on decades of research, archival evidence, interviews, data, case studies and experiments, "
                "this first comprehensive analysis reveals how artificial intelligence and economic institutions "
                "transform decision making, democracy, power and human behavior. It proposes a new theory and "
                "framework for understanding why technology is not destiny. " * 4
            ),
            published_date="2026-08-11",
            publisher="MIT Press",
            pages=416,
            isbn="9780000000001",
            info_url="https://example.com/book",
            preview_url="https://example.com/preview",
            query_hits={"artificial intelligence society", "decision making psychology"},
        )
        scored = score_candidate(candidate, PROFILE, today=date(2026, 8, 2))
        self.assertEqual(scored.verdict, "recommend")
        self.assertGreaterEqual(scored.score, PROFILE["recommend_threshold"])

    def test_manifestation_guarantee_is_rejected(self):
        candidate = Candidate(
            title="Manifest Anything Instantly",
            authors=["A. Guru"],
            description=("A secret formula guarantees that high-frequency thoughts mean the universe will manifest anything instantly. " * 6),
            published_date="2026-07-01",
            publisher="Unknown House",
            pages=220,
            isbn="9780000000002",
            info_url="https://example.com/manifest",
            query_hits={"self efficacy personal change"},
        )
        scored = score_candidate(candidate, PROFILE, today=date(2026, 8, 2))
        self.assertEqual(scored.verdict, "reject")
        self.assertTrue(scored.red_flags)

    def test_short_metadata_only_book_cannot_pass_hard_gate(self):
        candidate = Candidate(
            title="Systems",
            authors=["A. Writer"],
            description="A new book about systems and complexity.",
            published_date="2026-08",
            publisher="MIT Press",
            pages=80,
            query_hits={"systems thinking complexity"},
        )
        scored = score_candidate(candidate, PROFILE, today=date(2026, 8, 2))
        self.assertNotEqual(scored.verdict, "recommend")


if __name__ == "__main__":
    unittest.main()
