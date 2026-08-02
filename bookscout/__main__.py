from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path

from .discovery import discover
from .report import build_report, write_report
from .scoring import rank_candidates


def main() -> int:
    parser = argparse.ArgumentParser(description="Discover and rank new books for Surpasself Books")
    parser.add_argument("--profile", default="config/books_profile.json")
    parser.add_argument("--output", default="book/data/current.json")
    parser.add_argument("--today", help="Override date as YYYY-MM-DD for reproducible runs")
    args = parser.parse_args()

    profile = json.loads(Path(args.profile).read_text(encoding="utf-8"))
    today = date.fromisoformat(args.today) if args.today else date.today()
    candidates = discover(profile, today=today)
    ranked = rank_candidates(candidates, profile, today=today)
    report = build_report(ranked, profile, today=today)
    published = write_report(
        report,
        Path(args.output),
        minimum_to_publish=int(profile.get("minimum_recommendations_to_publish", 2)),
    )
    print(
        json.dumps(
            {
                "scanned": report["scanned"],
                "qualified": report["selected_count"],
                "published": published,
                "output": args.output,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
