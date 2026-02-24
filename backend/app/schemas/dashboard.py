from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class KPICard(BaseModel):
    label: str
    value: float
    change: Optional[float] = None  # Percentage change
    change_label: Optional[str] = None


class KPIResponse(BaseModel):
    total_leads: KPICard
    hot_leads: KPICard
    warm_leads: KPICard
    cold_leads: KPICard
    pending_followups: KPICard
    overdue_followups: KPICard
    total_steel_kg: KPICard
    total_cement_bags: KPICard
    conversion_rate: KPICard
    pending_approvals: KPICard
    total_won: KPICard


class FollowupTableItem(BaseModel):
    lead_id: str
    site_location_name: str
    area: str
    customer_name: str
    phone_number: str
    sales_person_id: str
    sales_person_name: str
    lead_type: str
    construction_stage: str
    next_followup_date: Optional[datetime] = None
    visit_count: int
    pending_days: int
    is_overdue: bool


class FollowupTableResponse(BaseModel):
    items: List[FollowupTableItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class SalespersonPerformance(BaseModel):
    salesperson_id: str
    salesperson_name: str
    total_leads: int
    won_leads: int
    lost_leads: int
    followup_leads: int
    hot_leads: int
    warm_leads: int
    cold_leads: int
    total_steel_kg: float
    total_cement_bags: float
    conversion_rate: float
    total_visits: int


class AreaAnalysis(BaseModel):
    area: str
    total_leads: int
    won_leads: int
    lost_leads: int
    hot_leads: int
    total_steel_kg: float
    total_cement_bags: float


class SalesTrendItem(BaseModel):
    date: str  # YYYY-MM format
    steel_kg: float
    cement_bags: float
    leads_created: int
    leads_won: int


class SalesTrend(BaseModel):
    data: List[SalesTrendItem]


class ContributionItem(BaseModel):
    salesperson_id: str
    salesperson_name: str
    steel_percentage: float
    cement_percentage: float
    leads_percentage: float


class ContributionData(BaseModel):
    data: List[ContributionItem]
