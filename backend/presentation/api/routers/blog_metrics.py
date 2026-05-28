from fastapi import APIRouter, Request, Response, status

from application.blog_metrics_service import BlogMetricsService
from presentation.api.dependencies import AdminUserDep
from presentation.api.schemas.blog_metrics import BlogMetricEventRequest, BlogMetricSummaryResponse

router = APIRouter(tags=["blog-metrics"])


@router.post("/blog/metrics/events", status_code=status.HTTP_204_NO_CONTENT)
def record_blog_metric(payload: BlogMetricEventRequest, request: Request):
    BlogMetricsService().record_event(
        payload.model_dump(),
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/admin/blog/metrics", response_model=list[BlogMetricSummaryResponse])
def list_blog_metrics(_admin: AdminUserDep):
    return BlogMetricsService().summary_by_post()
