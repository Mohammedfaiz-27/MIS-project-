from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
import re
from ..models.lead import ConstructionStage, LeadType, LeadStatus, BuilderType


class LeadCreate(BaseModel):
    # Site Details
    site_location_name: str = Field(..., min_length=2)
    area: str = Field(..., min_length=2)

    # Materials
    steel_brand: Optional[str] = None
    cement_brand: Optional[str] = None
    other_brands: Optional[List[str]] = []

    # Construction Stage
    construction_stage: ConstructionStage

    # Lead Classification
    lead_type: LeadType = LeadType.COLD
    lead_status: LeadStatus = LeadStatus.FOLLOW_UP

    # Customer Details
    customer_name: str = Field(..., min_length=2)
    phone_number: str = Field(..., min_length=10, max_length=10)
    occupation: Optional[str] = None
    builder_type: BuilderType

    @field_validator('phone_number')
    @classmethod
    def validate_phone_number(cls, v):
        if not re.match(r'^[6-9]\d{9}$', v):
            raise ValueError('Enter a valid 10-digit Indian mobile number')
        return v

    # Follow-up
    next_followup_date: Optional[datetime] = None

    # Remarks
    remarks: Optional[str] = None


class LeadUpdate(BaseModel):
    site_location_name: Optional[str] = None
    area: Optional[str] = None
    steel_brand: Optional[str] = None
    cement_brand: Optional[str] = None
    other_brands: Optional[List[str]] = None
    construction_stage: Optional[ConstructionStage] = None
    lead_type: Optional[LeadType] = None
    lead_status: Optional[LeadStatus] = None
    customer_name: Optional[str] = None
    phone_number: Optional[str] = None
    occupation: Optional[str] = None
    builder_type: Optional[BuilderType] = None
    next_followup_date: Optional[datetime] = None
    remarks: Optional[str] = None
    lost_reason: Optional[str] = None


class LeadStageUpdate(BaseModel):
    construction_stage: ConstructionStage


class LeadStatusUpdate(BaseModel):
    lead_status: LeadStatus


class LeadResponse(BaseModel):
    id: str
    site_location_name: str
    area: str
    site_photos: List[str] = []
    steel_brand: Optional[str] = None
    cement_brand: Optional[str] = None
    other_brands: List[str] = []
    construction_stage: ConstructionStage
    lead_type: LeadType
    lead_status: LeadStatus
    customer_name: str
    phone_number: str
    occupation: Optional[str] = None
    builder_type: BuilderType
    next_followup_date: Optional[datetime] = None
    visit_count: int = 1
    sales_person_id: str
    sales_person_name: Optional[str] = None
    remarks: Optional[str] = None
    lost_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class LeadListResponse(BaseModel):
    leads: List[LeadResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
