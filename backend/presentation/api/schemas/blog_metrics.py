from typing import Literal

from pydantic import BaseModel, Field


BlogMetricEventType = Literal[
    "post_impression",
    "post_click",
    "post_view",
    "post_read_time",
    "post_cta_click",
]


class BlogMetricEventRequest(BaseModel):
    eventType: BlogMetricEventType
    postId: str | None = None
    slug: str | None = None
    path: str | None = None
    label: str | None = None
    target: str | None = None
    durationSeconds: int | None = Field(default=None, ge=0, le=24 * 60 * 60)


class BlogMetricSummaryResponse(BaseModel):
    postId: str
    slug: str
    impressions: int
    clicks: int
    views: int
    ctaClicks: int
    totalReadSeconds: int
    readSamples: int
    averageReadSeconds: int
    lastEventAt: str
