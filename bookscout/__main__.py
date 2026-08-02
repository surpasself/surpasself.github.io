from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path

from .discovery import discover
from .report import build_report, write_report
from .scoring import rank_candidates


def _write_candidate_audit(report: dict, audit_path: Path) -> None:
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    if audit_path.exists():
        try:
            previous = json.loads(audit_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            previous = {}
        previous_issue = str(previous.get("issue") or "")
        if previous_issue and previous_issue != report["issue"]:
            archive = audit_path.parent / "archive" / f"{previous_issue}-candidates.json"
            archive.parent.mkdir(parents=True, exist_ok=True)
            if not archive.exists():
                archive.write_text(json.dumps(previous, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    audit_path.write_text(
        json.dumps(
            {
                "schema_version": report["schema_version"],
                "issue": report["issue"],
                "generated_at": report["generated_at"],
                "scanned": report["scanned"],
                "candidates": report["candidates"],
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Discover and rank new books for Surpasself Books")
    parser.add_argument("--profile", default="config/books_profile.json")
    parser.add_argument("--output", default="book/data/current.json")
    parser.add_argument("--audit-output", help="Write the complete candidate audit even when publication is held")
    parser.add_argument("--today", help="Override date as YYYY-MM-DD for reproducible runs")
    args = parser.parse_args()

    profile = json.loads(Path(args.profile).read_text(encoding="utf-8"))
    today = date.fromisoformat(args.today) if args.today else date.today()
    candidates = discover(profile, today=today)
    ranked = rank_candidates(candidates, profile, today=today)
    report = build_report(ranked, profile, today=today)
    if args.audit_output:
        _write_candidate_audit(report, Path(args.audit_output))
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
