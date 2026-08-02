from __future__ import annotations

import json
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


def _candidate_reason(item: ScoredCandidate) -> str:
    book = item.candidate
    if item.verdict == "recommend":
        return "通过正式推荐门槛：主题匹配、可信出版、篇幅和内容证据均达到要求。"
    if item.red_flags:
        return f"触发内容风险信号：{', '.join(item.red_flags)}。"
    if not item.matched_themes:
        return "与当前阅读画像的交叉不足，暂时没有足够个人相关性。"
    if not item.trusted_publisher:
        return "出版社或内容来源尚未进入可信白名单，需要更多独立证据。"
    if book.pages < 180:
        return f"篇幅信息不足（当前记录为 {book.pages or '未知'} 页），未通过硬门槛。"
    if len(book.description) < 300:
        return "可核验的简介、目录或样章信息不足，暂不据此做深度推荐。"
    if item.verdict == "watch":
        return "接近门槛，但综合证据或思想增量还不足，进入观察席。"
    return "综合评分未达到观察门槛，或与既有书单重复度较高。"


def _candidate_payload(item: ScoredCandidate) -> dict[str, Any]:
    book = item.candidate
    return {
        "title": book.title,
        "authors": book.authors,
        "published": book.published_date,
        "publisher": book.publisher,
        "pages": book.pages,
        "isbn": book.isbn,
        "score": item.score,
        "status": item.verdict,
        "themes": [theme.get("label", theme.get("id", "跨学科")) for theme in item.matched_themes],
        "reason": _candidate_reason(item),
        "source_url": book.info_url,
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
        "candidates": [_candidate_payload(item) for item in ranked],
        "rejected_summary": {
            "count": len([item for item in ranked if item.verdict == "reject"]),
            "reasons": ["内容简介或页数不足", "缺少可信出版与研究信号", "命中速成、摘要或不可检验承诺"]
        },
    }


def write_history_index(output: Path) -> None:
    archive_dir = output.parent / "archive"
    archive_dir.mkdir(parents=True, exist_ok=True)
    reports: dict[str, tuple[dict[str, Any], str, bool]] = {}
    candidate_urls: dict[str, str] = {}

    for path in sorted(archive_dir.glob("*.json")):
        if path.name == "index.json":
            continue
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        issue = str(payload.get("issue") or "")
        if path.name.endswith("-candidates.json"):
            if issue:
                candidate_urls[issue] = f"./data/archive/{path.name}"
            continue
        if issue:
            reports[issue] = (payload, f"./data/archive/{path.name}", False)

    candidate_audit = output.parent / "candidate-audit.json"
    if candidate_audit.exists():
        try:
            audit_payload = json.loads(candidate_audit.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            audit_payload = {}
        audit_issue = str(audit_payload.get("issue") or "")
        if audit_issue:
            candidate_urls[audit_issue] = "./data/candidate-audit.json"

    if output.exists():
        try:
            current = json.loads(output.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            current = {}
        issue = str(current.get("issue") or "")
        if issue:
            reports[issue] = (current, "./data/current.json", True)

    issues = []
    for issue, (payload, url, is_current) in sorted(reports.items(), reverse=True):
        issues.append(
            {
                "issue": issue,
                "headline": payload.get("headline", issue),
                "selected_count": payload.get("selected_count", len(payload.get("books") or [])),
                "url": url,
                "candidate_url": candidate_urls.get(issue, ""),
                "current": is_current,
            }
        )

    (archive_dir / "index.json").write_text(
        json.dumps({"schema_version": 1, "issues": issues}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


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
        write_history_index(output)
        return False

    if previous and previous.get("issue") != report.get("issue"):
        archive = output.parent / "archive" / f"{previous.get('issue', 'unknown')}.json"
        archive.parent.mkdir(parents=True, exist_ok=True)
        if not archive.exists():
            archive.write_text(json.dumps(previous, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_history_index(output)
    return True
