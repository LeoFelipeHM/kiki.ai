import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Literal
from uuid import uuid4

BlogMetricEventType = Literal[
    "post_impression",
    "post_click",
    "post_view",
    "post_read_time",
    "post_cta_click",
]


def _backend_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _frontend_root() -> Path:
    repo_root = _backend_root().parent
    frontend_root = repo_root / "frontend"
    if frontend_root.exists():
        return frontend_root
    return _backend_root()


def _metrics_file_path() -> Path:
    configured = os.getenv("BLOG_METRICS_FILE", "").strip()
    if configured:
        path = Path(configured)
        if path.is_absolute():
            return path
        return _frontend_root() / "data" / path.name
    return _frontend_root() / "data" / "blog-metrics.json"


class BlogMetricsService:
    def __init__(self) -> None:
        self._metrics_file = _metrics_file_path()

    def _ensure_metrics_file(self) -> None:
        self._metrics_file.parent.mkdir(parents=True, exist_ok=True)
        if not self._metrics_file.exists():
            self._metrics_file.write_text("[]\n", encoding="utf-8")

    def list_events(self) -> list[dict[str, Any]]:
        self._ensure_metrics_file()
        raw = self._metrics_file.read_text(encoding="utf-8")
        events = json.loads(raw or "[]")
        if not isinstance(events, list):
            return []
        return events

    def _write_events(self, events: list[dict[str, Any]]) -> None:
        self._ensure_metrics_file()
        self._metrics_file.write_text(
            json.dumps(events[-10000:], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    def record_event(self, payload: dict[str, Any], *, user_agent: str | None, ip_address: str | None) -> dict[str, Any]:
        event = {
            "id": str(uuid4()),
            "eventType": payload["eventType"],
            "postId": payload.get("postId") or "",
            "slug": payload.get("slug") or "",
            "path": payload.get("path") or "",
            "label": payload.get("label") or "",
            "target": payload.get("target") or "",
            "durationSeconds": int(payload.get("durationSeconds") or 0),
            "createdAt": datetime.utcnow().isoformat(timespec="milliseconds") + "Z",
            "userAgent": (user_agent or "")[:300],
            "ipAddress": ip_address or "",
        }
        events = self.list_events()
        self._write_events([*events, event])
        return event

    def summary_by_post(self) -> list[dict[str, Any]]:
        summary: dict[str, dict[str, Any]] = {}
        for event in self.list_events():
            post_key = str(event.get("postId") or event.get("slug") or "sem-post")
            item = summary.setdefault(
                post_key,
                {
                    "postId": event.get("postId") or "",
                    "slug": event.get("slug") or "",
                    "impressions": 0,
                    "clicks": 0,
                    "views": 0,
                    "ctaClicks": 0,
                    "totalReadSeconds": 0,
                    "readSamples": 0,
                    "lastEventAt": "",
                },
            )
            event_type = event.get("eventType")
            if event_type == "post_impression":
                item["impressions"] += 1
            elif event_type == "post_click":
                item["clicks"] += 1
            elif event_type == "post_view":
                item["views"] += 1
            elif event_type == "post_cta_click":
                item["ctaClicks"] += 1
            elif event_type == "post_read_time":
                item["totalReadSeconds"] += int(event.get("durationSeconds") or 0)
                item["readSamples"] += 1
            item["lastEventAt"] = max(str(item["lastEventAt"]), str(event.get("createdAt") or ""))

        return sorted(
            (
                {
                    **item,
                    "averageReadSeconds": round(item["totalReadSeconds"] / item["readSamples"])
                    if item["readSamples"]
                    else 0,
                }
                for item in summary.values()
            ),
            key=lambda item: str(item["lastEventAt"]),
            reverse=True,
        )
