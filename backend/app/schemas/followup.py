from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from ..models.lead import ConstructionStage


class FollowupCreate(BaseModel):
    construction_stage_at_visit: ConstructionStage
    remarks: str = Field(..., min_length=5)
    next_followup_date: datetime


class VisitResponse(BaseModel):
    id: str
    lead_id: str
    sales_person_id: str
    sales_person_name: Optional[str] = None
    visit_date: datetime
    construction_stage_at_visit: str
    remarks: str
    next_followup_date: Optional[datetime] = None
    created_at: datetime


class FollowupLeadInfo(BaseModel):
    id: str
    site_location_name: str
    area: str
    customer_name: str
    phone_number: str
    lead_type: str
    lead_status: str
    construction_stage: str
    next_followup_date: Optional[datetime] = None
    visit_count: int
    sales_person_id: str
    sales_person_name: Optional[str] = None
    pending_days: int = 0
    is_overdue: bool = False


class FollowupListResponse(BaseModel):
    followups: List[FollowupLeadInfo]
    total: int
