from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Query
from typing import Optional, List
from datetime import datetime, date
import os
import uuid
import aiofiles

from ..schemas.lead import (
    LeadCreate, LeadUpdate, LeadResponse, LeadListResponse,
    LeadStageUpdate, LeadStatusUpdate
)
from ..services.lead_service import LeadService
from ..utils.security import get_current_active_user
from ..utils.helpers import serialize_doc, paginate
from ..config import get_settings

router = APIRouter()
settings = get_settings()


@router.get("", response_model=LeadListResponse)
async def get_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    area: Optional[str] = None,
    lead_type: Optional[str] = None,
    lead_status: Optional[str] = None,
    sales_person_id: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Get leads with filters and pagination."""
    result = await LeadService.get_leads(
        user=current_user,
        page=page,
        page_size=page_size,
        area=area,
        lead_type=lead_type,
        lead_status=lead_status,
        sales_person_id=sales_person_id,
        search=search,
        start_date=datetime.combine(start_date, datetime.min.time()) if start_date else None,
        end_date=datetime.combine(end_date, datetime.max.time()) if end_date else None,
    )

    leads = [serialize_doc(lead) for lead in result["leads"]]
    pagination = paginate(page, page_size, result["total"])

    return {
        "leads": leads,
        **pagination
    }


@router.post("", response_model=LeadResponse)
async def create_lead(
    lead_data: LeadCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Create a new lead."""
    lead = await LeadService.create_lead(
        lead_data=lead_data,
        sales_person_id=str(current_user["_id"])
    )
    return serialize_doc(lead)


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Get lead by ID."""
    lead = await LeadService.get_lead(lead_id)
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )
    return serialize_doc(lead)


@router.put("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str,
    update_data: LeadUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """Update a lead."""
    try:
        lead = await LeadService.update_lead(lead_id, update_data, current_user)
        if not lead:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lead not found"
            )
        return serialize_doc(lead)
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )


@router.post("/{lead_id}/photos", response_model=LeadResponse)
async def upload_photos(
    lead_id: str,
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_active_user)
):
    """Upload site photos for a lead."""
    # Verify lead exists
    lead = await LeadService.get_lead(lead_id)
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )

    # Save files
    photo_urls = []
    for file in files:
        # Generate unique filename
        ext = os.path.splitext(file.filename)[1]
        filename = f"{lead_id}_{uuid.uuid4()}{ext}"
        filepath = os.path.join(settings.upload_dir, filename)

        # Save file
        async with aiofiles.open(filepath, 'wb') as f:
            content = await file.read()
            await f.write(content)

        photo_urls.append(f"/uploads/{filename}")

    # Update lead with photo URLs
    updated_lead = await LeadService.add_photos(lead_id, photo_urls)
    return serialize_doc(updated_lead)


@router.put("/{lead_id}/stage", response_model=LeadResponse)
async def update_construction_stage(
    lead_id: str,
    data: LeadStageUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """Update construction stage."""
    lead = await LeadService.update_stage(lead_id, data.construction_stage)
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )
    return serialize_doc(lead)


@router.put("/{lead_id}/status", response_model=LeadResponse)
async def update_lead_status(
    lead_id: str,
    data: LeadStatusUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """Update lead status."""
    lead = await LeadService.update_status(lead_id, data.lead_status)
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )
    return serialize_doc(lead)
