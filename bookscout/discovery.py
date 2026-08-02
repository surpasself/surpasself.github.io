from __future__ import annotations

import json
import re
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any


OPEN_LIBRARY_SEARCH = "https://openlibrary.org/search.json"
OPEN_LIBRARY_ROOT = "https://openlibrary.org"
USER_AGENT = "Surpasself-Books/0.1 (+https://surpasself.github.io/book/)"


@dataclass
class Candidate:
    title: str
    authors: list[str]
    description: str
    published_date: str
    publisher: str = ""
    pages: int = 0
    isbn: str = ""
    info_url: str = ""
    preview_url: str = ""
    cover_url: str = ""
    categories: list[str] = field(default_factory=list)
    query_hits: set[str] = field(default_factory=set)
    work_key: str = ""

    @property
    def key(self) -> str:
        if self.isbn:
            return self.isbn
        return " ".join(self.title.casefold().split())

    @property
    def searchable_text(self) -> str:
        return " ".join(
            [self.title, " ".join(self.authors), self.description, self.publisher, " ".join(self.categories)]
        ).casefold()


def _ssl_context() -> ssl.SSLContext:
    defaults = ssl.get_default_verify_paths()
    if defaults.cafile:
        return ssl.create_default_context()
    macos_cert = Path("/private/etc/ssl/cert.pem")
    if macos_cert.is_file():
        return ssl.create_default_context(cafile=str(macos_cert))
    return ssl.create_default_context()


def _fetch_json(url: str, *, timeout: int = 25, attempts: int = 3) -> dict[str, Any]:
    last_error: Exception | None = None
    context = _ssl_context()
    for attempt in range(attempts):
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
        try:
            with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
                return json.load(response)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            last_error = error
            if attempt + 1 < attempts:
                time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Unable to fetch {url}: {last_error}")


def _parse_date(value: str) -> date | None:
    if not value:
        return None
    cleaned = str(value).strip().replace("Sept ", "Sep ")
    if re.fullmatch(r"\d{4}", cleaned):
        return date(int(cleaned), 7, 1)
    if re.fullmatch(r"\d{4}-\d{2}", cleaned):
        year, month = (int(part) for part in cleaned.split("-"))
        return date(year, month, 15)
    for fmt in (
        "%Y-%m-%d",
        "%B %d, %Y",
        "%b %d, %Y",
        "%d %B %Y",
        "%B %Y",
        "%b %Y",
    ):
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    return None


def _recent_publication(values: list[str], *, earliest: date, latest: date) -> tuple[str, date] | None:
    parsed = [(str(value), _parse_date(str(value))) for value in values]
    eligible = [(raw, value) for raw, value in parsed if value and earliest <= value <= latest]
    if not eligible:
        return None
    return max(eligible, key=lambda item: item[1])


def _first_text(value: Any) -> str:
    if isinstance(value, list):
        return str(value[0]).strip() if value else ""
    return str(value or "").strip()


def _isbn(values: list[str]) -> str:
    normalized = [str(value).replace("-", "").strip() for value in values]
    return next((value for value in normalized if len(value) == 13), normalized[0] if normalized else "")


def candidate_from_openlibrary(
    doc: dict[str, Any],
    query: str,
    *,
    earliest: date,
    latest: date,
) -> Candidate | None:
    title = str(doc.get("title") or "").strip()
    authors = [str(author).strip() for author in doc.get("author_name") or [] if str(author).strip()]
    publication = _recent_publication([str(value) for value in doc.get("publish_date") or []], earliest=earliest, latest=latest)
    if not title or not authors or not publication:
        return None

    published_raw, published = publication
    isbn = _isbn(doc.get("isbn") or [])
    work_key = str(doc.get("key") or "")
    if work_key and not work_key.startswith("/"):
        work_key = f"/works/{work_key}" if not work_key.startswith("OL") else f"/works/{work_key}"
    first_sentence = _first_text(doc.get("first_sentence"))
    subjects = [str(subject) for subject in (doc.get("subject") or [])[:40]]
    description = first_sentence
    if subjects:
        description = f"{description} Subjects and evidence context: {', '.join(subjects)}".strip()
    cover_id = doc.get("cover_i")
    cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg" if cover_id else ""
    info_url = f"{OPEN_LIBRARY_ROOT}{work_key}" if work_key else ""

    return Candidate(
        title=title,
        authors=authors,
        description=description,
        published_date=published_raw if re.fullmatch(r"\d{4}(-\d{2})?", published_raw) else published.isoformat(),
        publisher=_first_text(doc.get("publisher")),
        pages=int(doc.get("number_of_pages_median") or 0),
        isbn=isbn,
        info_url=info_url,
        preview_url="",
        cover_url=cover_url,
        categories=subjects,
        query_hits={query},
        work_key=work_key,
    )


def _merge(existing: Candidate, incoming: Candidate) -> Candidate:
    existing.query_hits.update(incoming.query_hits)
    if len(incoming.description) > len(existing.description):
        existing.description = incoming.description
    for attr in ("publisher", "published_date", "info_url", "preview_url", "cover_url", "isbn", "work_key"):
        if not getattr(existing, attr) and getattr(incoming, attr):
            setattr(existing, attr, getattr(incoming, attr))
    existing.pages = max(existing.pages, incoming.pages)
    existing.categories = sorted(set(existing.categories + incoming.categories))
    return existing


def _trusted_publisher(candidate: Candidate, profile: dict[str, Any]) -> bool:
    return any(name.casefold() in candidate.publisher.casefold() for name in profile.get("trusted_publishers") or [])


def _enrichment_priority(candidate: Candidate, profile: dict[str, Any]) -> tuple[int, int, int, int]:
    text = candidate.searchable_text
    theme_hits = sum(
        1
        for theme in profile.get("themes") or []
        for keyword in theme.get("keywords") or []
        if keyword.casefold() in text
    )
    return (
        int(_trusted_publisher(candidate, profile)),
        int(candidate.pages >= 160),
        min(theme_hits, 12),
        len(candidate.query_hits),
    )


def _work_description(payload: dict[str, Any]) -> str:
    value = payload.get("description") or payload.get("first_sentence") or ""
    if isinstance(value, dict):
        value = value.get("value") or ""
    if isinstance(value, list):
        value = " ".join(str(item) for item in value)
    return str(value).strip()


def _enrich(candidates: list[Candidate], profile: dict[str, Any], *, limit: int = 12) -> None:
    prioritized = sorted(candidates, key=lambda item: _enrichment_priority(item, profile), reverse=True)
    for candidate in prioritized[:limit]:
        if not candidate.work_key:
            continue
        try:
            payload = _fetch_json(f"{OPEN_LIBRARY_ROOT}{candidate.work_key}.json", timeout=12, attempts=1)
        except RuntimeError:
            continue
        description = _work_description(payload)
        if len(description) > len(candidate.description):
            candidate.description = description
        extra_subjects = [str(subject) for subject in (payload.get("subjects") or [])[:40]]
        candidate.categories = sorted(set(candidate.categories + extra_subjects))
        time.sleep(0.1)


def discover(profile: dict[str, Any], *, today: date | None = None, max_results_per_query: int = 24) -> list[Candidate]:
    today = today or date.today()
    window = profile.get("publication_window_days") or {}
    earliest = today - timedelta(days=int(window.get("past", 150)))
    latest = today + timedelta(days=int(window.get("future", 60)))
    merged: dict[str, Candidate] = {}
    successful_queries = 0
    fields = ",".join(
        [
            "key", "title", "author_name", "publish_date", "publisher", "isbn",
            "number_of_pages_median", "subject", "cover_i", "first_sentence",
        ]
    )

    for query in profile.get("queries") or []:
        year_filter = f"publish_year:[{earliest.year} TO {latest.year}]"
        params = urllib.parse.urlencode(
            {
                "q": f"{query} language:eng {year_filter}",
                "sort": "new",
                "limit": min(max_results_per_query, 50),
                "fields": fields,
                "lang": "en",
            }
        )
        try:
            payload = _fetch_json(f"{OPEN_LIBRARY_SEARCH}?{params}")
        except RuntimeError:
            continue
        successful_queries += 1
        for doc in payload.get("docs") or []:
            candidate = candidate_from_openlibrary(doc, query, earliest=earliest, latest=latest)
            if not candidate:
                continue
            if candidate.key in merged:
                _merge(merged[candidate.key], candidate)
            else:
                merged[candidate.key] = candidate
        time.sleep(0.15)

    if not successful_queries:
        raise RuntimeError("All Open Library discovery queries failed; previous report was left untouched.")

    candidates = list(merged.values())
    _enrich(candidates, profile)
    return candidates
