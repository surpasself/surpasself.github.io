from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any

from .discovery import Candidate, _parse_date


@dataclass(frozen=True)
class ScoredCandidate:
    candidate: Candidate
    score: int
    matched_themes: tuple[dict[str, Any], ...]
    evidence_signals: tuple[str, ...]
    novelty_signals: tuple[str, ...]
    red_flags: tuple[str, ...]
    trusted_publisher: bool
    verdict: str


def _matches(text: str, terms: list[str]) -> list[str]:
    return [term for term in terms if term.casefold() in text]


def score_candidate(candidate: Candidate, profile: dict[str, Any], *, today: date | None = None) -> ScoredCandidate:
    today = today or date.today()
    text = f" {candidate.searchable_text} "
    matched_themes: list[dict[str, Any]] = []
    theme_points = 0.0
    for theme in profile.get("themes") or []:
        hits = _matches(text, theme.get("keywords") or [])
        if hits:
            theme_copy = dict(theme)
            theme_copy["hits"] = hits
            matched_themes.append(theme_copy)
            theme_points += min(9.0, 3.0 + len(hits) * 1.5) * float(theme.get("weight", 1.0))

    evidence = _matches(text, profile.get("substance_signals") or [])
    novelty = _matches(text, profile.get("novelty_signals") or [])
    red_flags = _matches(text, profile.get("red_flags") or [])
    trusted = any(name.casefold() in candidate.publisher.casefold() for name in profile.get("trusted_publishers") or [])

    score = 8
    score += min(30, round(theme_points))
    score += min(18, len(set(evidence)) * 2)
    score += min(12, len(set(novelty)) * 2)
    score += 10 if trusted else 0
    score += 5 if candidate.pages >= 180 else (2 if candidate.pages >= 120 else 0)
    score += 5 if len(candidate.description) >= 500 else (2 if len(candidate.description) >= 240 else 0)
    score += 3 if candidate.isbn else 0
    score += 2 if candidate.preview_url else 0
    score += min(3, len(candidate.query_hits))

    published = _parse_date(candidate.published_date)
    if published:
        distance = abs((published - today).days)
        score += 4 if distance <= 45 else (2 if distance <= 120 else 0)

    score -= len(set(red_flags)) * 8
    if candidate.pages and candidate.pages < 96:
        score -= 10
    if len(candidate.description) < 160:
        score -= 8
    if not matched_themes:
        score -= 20
    score = max(0, min(100, score))

    recommend_threshold = int(profile.get("recommend_threshold", 82))
    watch_threshold = int(profile.get("watch_threshold", 70))
    hard_gate = trusted and candidate.pages >= 180 and len(candidate.description) >= 300 and not red_flags
    if score >= recommend_threshold and hard_gate:
        verdict = "recommend"
    elif score >= watch_threshold and not red_flags:
        verdict = "watch"
    else:
        verdict = "reject"

    return ScoredCandidate(
        candidate=candidate,
        score=score,
        matched_themes=tuple(matched_themes),
        evidence_signals=tuple(sorted(set(evidence))),
        novelty_signals=tuple(sorted(set(novelty))),
        red_flags=tuple(sorted(set(red_flags))),
        trusted_publisher=trusted,
        verdict=verdict,
    )


def rank_candidates(candidates: list[Candidate], profile: dict[str, Any], *, today: date | None = None) -> list[ScoredCandidate]:
    ranked = [score_candidate(candidate, profile, today=today) for candidate in candidates]
    return sorted(ranked, key=lambda item: (-item.score, item.candidate.title.casefold()))
