from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from ..models.sales_entry import ApprovalStatus


class SalesEntryCreate(BaseModel):
    steel_quantity_kg: float = Field(..., ge=0)
    cement_quantity_bags: float = Field(..., ge=0)


class SalesEntryResponse(BaseModel):
    id: str
    lead_id: str
    sales_person_id: str
    sales_person_name: Optional[str] = None
    steel_quantity_kg: float
    cement_quantity_bags: float
    approval_status: ApprovalStatus
    approved_by: Optional[str] = None
    approved_by_name: Optional[str] = None
    approval_date: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Lead info for display
    customer_name: Optional[str] = None
    site_location_name: Optional[str] = None
    area: Optional[str] = None


class SalesEntryApproval(BaseModel):
    pass  # No additional data needed


class SalesEntryRejection(BaseModel):
    reason: str = Field(..., min_length=5)


class SalesEntryListResponse(BaseModel):
    entries: List[SalesEntryResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
