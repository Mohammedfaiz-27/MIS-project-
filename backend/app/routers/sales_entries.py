from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

from ..schemas.sales_entry import (
    SalesEntryCreate, SalesEntryResponse, SalesEntryApproval,
    SalesEntryRejection, SalesEntryListResponse
)
from ..database import get_database
from ..utils.security import get_current_active_user, require_admin
from ..utils.helpers import serialize_doc, paginate
from ..models.sales_entry import ApprovalStatus
from ..models.user import UserRole

router = APIRouter()


@router.post("/leads/{lead_id}/entry", response_model=SalesEntryResponse)
async def create_sales_entry(
    lead_id: str,
    entry_data: SalesEntryCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Create a sales entry for a lead."""
    db = get_database()

    # Verify lead exists
    lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )

    # Create entry
    entry_doc = {
        "lead_id": ObjectId(lead_id),
        "sales_person_id": current_user["_id"],
        "steel_quantity_kg": entry_data.steel_quantity_kg,
        "cement_quantity_bags": entry_data.cement_quantity_bags,
        "approval_status": ApprovalStatus.PENDING,
        "approved_by": None,
        "approval_date": None,
        "rejection_reason": None,
        "created_at": datetime.utcnow(),
        "updated_at": None
    }

    result = await db.sales_entries.insert_one(entry_doc)
    entry_doc["_id"] = result.inserted_id
    entry_doc["sales_person_name"] = current_user.get("name")
    entry_doc["customer_name"] = lead.get("customer_name")
    entry_doc["site_location_name"] = lead.get("site_location_name")
    entry_doc["area"] = lead.get("area")

    return serialize_doc(entry_doc)


@router.get("/leads/{lead_id}/entries", response_model=List[SalesEntryResponse])
async def get_lead_entries(
    lead_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Get all sales entries for a lead."""
    db = get_database()

    pipeline = [
        {"$match": {"lead_id": ObjectId(lead_id)}},
        {"$sort": {"created_at": -1}},
        {
            "$lookup": {
                "from": "users",
                "localField": "sales_person_id",
                "foreignField": "_id",
                "as": "sales_person"
            }
        },
        {
            "$lookup": {
                "from": "users",
                "localField": "approved_by",
                "foreignField": "_id",
                "as": "approver"
            }
        },
        {
            "$lookup": {
                "from": "leads",
                "localField": "lead_id",
                "foreignField": "_id",
                "as": "lead"
            }
        },
        {
            "$addFields": {
                "sales_person_name": {"$arrayElemAt": ["$sales_person.name", 0]},
                "approved_by_name": {"$arrayElemAt": ["$approver.name", 0]},
                "customer_name": {"$arrayElemAt": ["$lead.customer_name", 0]},
                "site_location_name": {"$arrayElemAt": ["$lead.site_location_name", 0]},
                "area": {"$arrayElemAt": ["$lead.area", 0]}
            }
        },
        {"$project": {"sales_person": 0, "approver": 0, "lead": 0}}
    ]

    cursor = db.sales_entries.aggregate(pipeline)
    entries = await cursor.to_list(length=100)

    return [serialize_doc(entry) for entry in entries]


@router.get("", response_model=SalesEntryListResponse)
async def get_all_entries(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    approval_status: Optional[str] = None,
    sales_person_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Get all sales entries with filters."""
    db = get_database()

    # Build filter
    filter_dict = {}

    if current_user.get("role") == UserRole.SALESPERSON:
        filter_dict["sales_person_id"] = current_user["_id"]
    elif sales_person_id:
        filter_dict["sales_person_id"] = ObjectId(sales_person_id)

    if approval_status:
        filter_dict["approval_status"] = approval_status

    if start_date or end_date:
        date_filter = {}
        if start_date:
            date_filter["$gte"] = start_date
        if end_date:
            date_filter["$lte"] = end_date
        filter_dict["created_at"] = date_filter

    # Get total count
    total = await db.sales_entries.count_documents(filter_dict)

    # Get paginated results
    skip = (page - 1) * page_size
    pipeline = [
        {"$match": filter_dict},
        {"$sort": {"created_at": -1}},
        {"$skip": skip},
        {"$limit": page_size},
        {
            "$lookup": {
                "from": "users",
                "localField": "sales_person_id",
                "foreignField": "_id",
                "as": "sales_person"
            }
        },
        {
            "$lookup": {
                "from": "users",
                "localField": "approved_by",
                "foreignField": "_id",
                "as": "approver"
            }
        },
        {
            "$lookup": {
                "from": "leads",
                "localField": "lead_id",
                "foreignField": "_id",
                "as": "lead"
            }
        },
        {
            "$addFields": {
                "sales_person_name": {"$arrayElemAt": ["$sales_person.name", 0]},
                "approved_by_name": {"$arrayElemAt": ["$approver.name", 0]},
                "customer_name": {"$arrayElemAt": ["$lead.customer_name", 0]},
                "site_location_name": {"$arrayElemAt": ["$lead.site_location_name", 0]},
                "area": {"$arrayElemAt": ["$lead.area", 0]}
            }
        },
        {"$project": {"sales_person": 0, "approver": 0, "lead": 0}}
    ]

    cursor = db.sales_entries.aggregate(pipeline)
    entries = await cursor.to_list(length=page_size)

    pagination = paginate(page, page_size, total)

    return {
        "entries": [serialize_doc(entry) for entry in entries],
        **pagination
    }


@router.get("/{entry_id}", response_model=SalesEntryResponse)
async def get_entry(
    entry_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Get a single sales entry."""
    db = get_database()

    pipeline = [
        {"$match": {"_id": ObjectId(entry_id)}},
        {
            "$lookup": {
                "from": "users",
                "localField": "sales_person_id",
                "foreignField": "_id",
                "as": "sales_person"
            }
        },
        {
            "$lookup": {
                "from": "users",
                "localField": "approved_by",
                "foreignField": "_id",
                "as": "approver"
            }
        },
        {
            "$lookup": {
                "from": "leads",
                "localField": "lead_id",
                "foreignField": "_id",
                "as": "lead"
            }
        },
        {
            "$addFields": {
                "sales_person_name": {"$arrayElemAt": ["$sales_person.name", 0]},
                "approved_by_name": {"$arrayElemAt": ["$approver.name", 0]},
                "customer_name": {"$arrayElemAt": ["$lead.customer_name", 0]},
                "site_location_name": {"$arrayElemAt": ["$lead.site_location_name", 0]},
                "area": {"$arrayElemAt": ["$lead.area", 0]}
            }
        },
        {"$project": {"sales_person": 0, "approver": 0, "lead": 0}}
    ]

    cursor = db.sales_entries.aggregate(pipeline)
    entries = await cursor.to_list(length=1)

    if not entries:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sales entry not found"
        )

    return serialize_doc(entries[0])


@router.put("/{entry_id}/approve", response_model=SalesEntryResponse)
async def approve_entry(
    entry_id: str,
    current_user: dict = Depends(require_admin)
):
    """Approve a sales entry (admin only)."""
    db = get_database()

    # Verify entry exists and is pending
    entry = await db.sales_entries.find_one({"_id": ObjectId(entry_id)})
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sales entry not found"
        )

    if entry["approval_status"] != ApprovalStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Entry is not pending approval"
        )

    # Update entry
    await db.sales_entries.update_one(
        {"_id": ObjectId(entry_id)},
        {
            "$set": {
                "approval_status": ApprovalStatus.APPROVED,
                "approved_by": current_user["_id"],
                "approval_date": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )

    # Get updated entry
    return await get_entry(entry_id, current_user)


@router.put("/{entry_id}/reject", response_model=SalesEntryResponse)
async def reject_entry(
    entry_id: str,
    data: SalesEntryRejection,
    current_user: dict = Depends(require_admin)
):
    """Reject a sales entry with reason (admin only)."""
    db = get_database()

    # Verify entry exists and is pending
    entry = await db.sales_entries.find_one({"_id": ObjectId(entry_id)})
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sales entry not found"
        )

    if entry["approval_status"] != ApprovalStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Entry is not pending approval"
        )

    # Update entry
    await db.sales_entries.update_one(
        {"_id": ObjectId(entry_id)},
        {
            "$set": {
                "approval_status": ApprovalStatus.REJECTED,
                "approved_by": current_user["_id"],
                "approval_date": datetime.utcnow(),
                "rejection_reason": data.reason,
                "updated_at": datetime.utcnow()
            }
        }
    )

    # Get updated entry
    return await get_entry(entry_id, current_user)
