from __future__ import annotations

from datetime import date
from typing import Any
from urllib.parse import urlparse


def _exact_date(value: Any) -> date | None:
    try:
        return date.fromisoformat(str(value))
    except ValueError:
        return None


def reading_gate_issues(book: dict[str, Any], policy: dict[str, Any], *, today: date) -> list[str]:
    issues = []
    if policy.get("require_published"):
        published = _exact_date(book.get("published"))
        if not published or published > today:
            issues.append("尚未出版或完整发行日期未核实")
    if policy.get("require_verified_ebook"):
        access = book.get("ebook_access") or {}
        released = _exact_date(access.get("published"))
        checked = _exact_date(access.get("checked_at"))
        links = access.get("links") or []
        has_link = any(
            urlparse(str(link.get("url", ""))).scheme == "https"
            and urlparse(str(link.get("url", ""))).netloc
            for link in links
        )
        if (
            access.get("status") != "available"
            or not released or released > today
            or not checked or checked > today or checked < released
            or not access.get("isbn") or not has_link
        ):
            issues.append("已发行正版电子版及获取链接未核实")
    return issues
