from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.schemas.frontend import DashboardStatsOut
from app.core.auth import AuthenticatedUser, get_current_user
from app.core.db import dashboard_aggregates

router = APIRouter()


@router.get("/dashboard/stats", response_model=DashboardStatsOut)
def get_dashboard_stats(
    user: AuthenticatedUser = Depends(get_current_user),
) -> DashboardStatsOut:
    d = dashboard_aggregates(user_id=user.user_id)
    return DashboardStatsOut(
        applications=int(d["applications"]),
        interviews=int(d["interviews"]),
        average_match_score=round(float(d["average_match_score"]), 1),
        resumes_generated=int(d["resumes_generated"]),
    )
