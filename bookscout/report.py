from __future__ import annotations

import json
from dataclasses import asdict
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from .scoring import ScoredCandidate


def _book_payload(item: ScoredCandidate) -> dict[str, Any]:
    book = item.candidate
    theme = item.matched_themes[0] if item.matched_themes else {}
    evidence = ", ".join(item.evidence_signals[:4]) or "出版信息完整"
    novelty = ", ".join(item.novelty_signals[:3]) or "主题与既有兴趣高度相连"
    limitation = "目前主要依据出版社元数据和内容简介；正式阅读后仍需验证论证质量。"
    if not item.trusted_publisher:
        limitation = "出版社不在高可信白名单中，只进入观察席，不应仅凭简介购买。"
    elif not book.preview_url:
        limitation = "缺少可用试读，当前判断不能替代对目录和样章的核验。"

    return {
        "title": book.title,
        "subtitle": "",
        "authors": book.authors,
        "published": book.published_date,
        "publisher": book.publisher,
        "pages": book.pages,
        "isbn": book.isbn,
        "score": item.score,
        "category": theme.get("label", "跨学科"),
        "theme": theme.get("id", "other"),
        "cover": book.cover_url,
        "thesis": f"这本书可能带来的思想增量集中在：{novelty}。",
        "fit": theme.get("connection", "与书单中的跨学科、机制型阅读偏好相连。"),
        "evidence": f"自动证据命中：{evidence}；{book.pages or '未知'} 页，出版方为 {book.publisher or '待核验'}。",
        "caveat": limitation,
        "sources": [
            {"label": "出版/图书信息", "url": book.info_url},
            {"label": "试读", "url": book.preview_url},
        ],
    }


def build_report(ranked: list[ScoredCandidate], profile: dict[str, Any], *, today: date | None = None) -> dict[str, Any]:
    today = today or date.today()
    recommends = [item for item in ranked if item.verdict == "recommend"][: int(profile.get("max_recommendations", 4))]
    watchlist = [item for item in ranked if item.verdict == "watch"][: int(profile.get("max_watchlist", 3))]
    return {
        "schema_version": 1,
        "issue": today.strftime("%Y-%m"),
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "status": "auto-ranked",
        "scanned": len(ranked),
        "selected_count": len(recommends),
        "headline": f"{today.year} 年 {today.month} 月 · 宁缺毋滥",
        "editor_note": "本期由规则引擎自动初筛。分数代表值得进一步阅读的概率，不是内容真理值。",
        "books": [_book_payload(item) for item in recommends],
        "watchlist": [_book_payload(item) for item in watchlist],
        "rejected_summary": {
            "count": len([item for item in ranked if item.verdict == "reject"]),
            "reasons": ["内容简介或页数不足", "缺少可信出版与研究信号", "命中速成、摘要或不可检验承诺"]
        },
    }


def write_report(report: dict[str, Any], output: Path, *, minimum_to_publish: int) -> bool:
    output.parent.mkdir(parents=True, exist_ok=True)
    previous: dict[str, Any] | None = None
    if output.exists():
        previous = json.loads(output.read_text(encoding="utf-8"))

    if len(report.get("books") or []) < minimum_to_publish:
        status_path = output.with_name("last-run.json")
        status_path.write_text(
            json.dumps(
                {
                    "generated_at": report.get("generated_at"),
                    "status": "held_by_quality_gate",
                    "scanned": report.get("scanned", 0),
                    "qualified": len(report.get("books") or []),
                    "required": minimum_to_publish,
                    "message": "本月合格书目不足，已保留上一期，避免为了更新而降低质量。",
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        return False

    if previous and previous.get("issue") != report.get("issue"):
        archive = output.parent / "archive" / f"{previous.get('issue', 'unknown')}.json"
        archive.parent.mkdir(parents=True, exist_ok=True)
        if not archive.exists():
            archive.write_text(json.dumps(previous, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return True
