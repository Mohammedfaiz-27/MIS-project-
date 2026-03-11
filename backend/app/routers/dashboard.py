from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from datetime import datetime, date

from ..schemas.dashboard import (
    KPIResponse, FollowupTableResponse, SalespersonPerformance,
    AreaAnalysis, SalesTrend, ContributionData
)
from ..services.dashboard_service import DashboardService
from ..utils.security import get_current_active_user, require_admin
from ..utils.helpers import serialize_doc, paginate

router = APIRouter()


@router.get("/kpis", response_model=KPIResponse)
async def get_kpis(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    sales_person_id: Optional[str] = None,
    area: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Get KPI data for dashboard."""
    return await DashboardService.get_kpis(
        user=current_user,
        start_date=datetime.combine(start_date, datetime.min.time()) if start_date else None,
        end_date=datetime.combine(end_date, datetime.max.time()) if end_date else None,
        sales_person_id=sales_person_id,
        area=area
    )


@router.get("/followup-table", response_model=FollowupTableResponse)
async def get_followup_table(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sales_person_id: Optional[str] = None,
    area: Optional[str] = None,
    overdue_only: bool = False,
    current_user: dict = Depends(get_current_active_user)
):
    """Get follow-up control table data."""
    result = await DashboardService.get_followup_table(
        user=current_user,
        page=page,
        page_size=page_size,
        sales_person_id=sales_person_id,
        area=area,
        overdue_only=overdue_only
    )

    items = []
    for item in result["items"]:
        serialized = serialize_doc(item)
        serialized["lead_id"] = serialized.get("id", "")
        items.append(serialized)
    pagination_info = paginate(page, page_size, result["total"])

    return {
        "items": items,
        **pagination_info
    }


@router.get("/salesperson-performance", response_model=List[SalespersonPerformance])
async def get_salesperson_performance(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    area: Optional[str] = None,
    current_user: dict = Depends(require_admin)
):
    """Get performance metrics by salesperson (admin only)."""
    return await DashboardService.get_salesperson_performance(
        start_date=datetime.combine(start_date, datetime.min.time()) if start_date else None,
        end_date=datetime.combine(end_date, datetime.max.time()) if end_date else None,
        area=area
    )


@router.get("/area-analysis", response_model=List[AreaAnalysis])
async def get_area_analysis(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    sales_person_id: Optional[str] = None,
    current_user: dict = Depends(require_admin)
):
    """Get area-wise analysis (admin only)."""
    return await DashboardService.get_area_analysis(
        start_date=datetime.combine(start_date, datetime.min.time()) if start_date else None,
        end_date=datetime.combine(end_date, datetime.max.time()) if end_date else None,
        sales_person_id=sales_person_id
    )


@router.get("/charts/sales-trend", response_model=SalesTrend)
async def get_sales_trend(
    months: int = Query(6, ge=1, le=12),
    sales_person_id: Optional[str] = None,
    area: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Get sales trend over time."""
    data = await DashboardService.get_sales_trend(
        months=months,
        sales_person_id=sales_person_id,
        area=area
    )
    return {"data": data}


@router.get("/charts/contribution", response_model=ContributionData)
async def get_contribution(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: dict = Depends(require_admin)
):
    """Get contribution percentages by salesperson (admin only)."""
    data = await DashboardService.get_contribution_data(
        start_date=datetime.combine(start_date, datetime.min.time()) if start_date else None,
        end_date=datetime.combine(end_date, datetime.max.time()) if end_date else None,
    )
    return {"data": data}
