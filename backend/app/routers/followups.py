from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

from ..schemas.followup import FollowupCreate, VisitResponse, FollowupListResponse
from ..database import get_database
from ..utils.security import get_current_active_user
from ..utils.helpers import serialize_doc
from ..models.user import UserRole
from ..models.lead import LeadStatus

router = APIRouter()


@router.post("/leads/{lead_id}/followup", response_model=VisitResponse)
async def add_followup(
    lead_id: str,
    followup_data: FollowupCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Add a follow-up (creates a visit record)."""
    db = get_database()

    # Verify lead exists
    lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )

    # Create visit record
    visit_doc = {
        "lead_id": ObjectId(lead_id),
        "sales_person_id": current_user["_id"],
        "visit_date": datetime.utcnow(),
        "construction_stage_at_visit": followup_data.construction_stage_at_visit,
        "remarks": followup_data.remarks,
        "next_followup_date": followup_data.next_followup_date,
        "created_at": datetime.utcnow()
    }

    result = await db.visits.insert_one(visit_doc)
    visit_doc["_id"] = result.inserted_id
    visit_doc["sales_person_name"] = current_user.get("name")

    # Update lead
    await db.leads.update_one(
        {"_id": ObjectId(lead_id)},
        {
            "$set": {
                "construction_stage": followup_data.construction_stage_at_visit,
                "next_followup_date": followup_data.next_followup_date,
                "updated_at": datetime.utcnow()
            },
            "$inc": {"visit_count": 1}
        }
    )

    return serialize_doc(visit_doc)


@router.get("/leads/{lead_id}/visits", response_model=List[VisitResponse])
async def get_visit_history(
    lead_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Get visit history for a lead."""
    db = get_database()

    pipeline = [
        {"$match": {"lead_id": ObjectId(lead_id)}},
        {"$sort": {"visit_date": -1}},
        {
            "$lookup": {
                "from": "users",
                "localField": "sales_person_id",
                "foreignField": "_id",
                "as": "sales_person"
            }
        },
        {
            "$addFields": {
                "sales_person_name": {"$arrayElemAt": ["$sales_person.name", 0]}
            }
        },
        {"$project": {"sales_person": 0}}
    ]

    cursor = db.visits.aggregate(pipeline)
    visits = await cursor.to_list(length=100)

    return [serialize_doc(visit) for visit in visits]


@router.get("/today", response_model=FollowupListResponse)
async def get_today_followups(
    current_user: dict = Depends(get_current_active_user)
):
    """Get today's follow-ups."""
    db = get_database()
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today.replace(hour=23, minute=59, second=59)

    # Build filter
    filter_dict = {
        "lead_status": LeadStatus.FOLLOW_UP,
        "next_followup_date": {"$gte": today, "$lte": tomorrow}
    }

    if current_user.get("role") == UserRole.SALESPERSON:
        filter_dict["sales_person_id"] = current_user["_id"]

    total = await db.leads.count_documents(filter_dict)

    pipeline = [
        {"$match": filter_dict},
        {
            "$lookup": {
                "from": "users",
                "localField": "sales_person_id",
                "foreignField": "_id",
                "as": "sales_person"
            }
        },
        {
            "$addFields": {
                "sales_person_name": {"$arrayElemAt": ["$sales_person.name", 0]},
                "pending_days": 0,
                "is_overdue": False
            }
        },
        {"$project": {"sales_person": 0}},
        {"$sort": {"next_followup_date": 1}}
    ]

    cursor = db.leads.aggregate(pipeline)
    followups = await cursor.to_list(length=100)

    return {
        "followups": [serialize_doc(f) for f in followups],
        "total": total
    }


@router.get("/overdue", response_model=FollowupListResponse)
async def get_overdue_followups(
    current_user: dict = Depends(get_current_active_user)
):
    """Get overdue follow-ups."""
    db = get_database()
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    # Build filter
    filter_dict = {
        "lead_status": LeadStatus.FOLLOW_UP,
        "next_followup_date": {"$lt": today}
    }

    if current_user.get("role") == UserRole.SALESPERSON:
        filter_dict["sales_person_id"] = current_user["_id"]

    total = await db.leads.count_documents(filter_dict)

    pipeline = [
        {"$match": filter_dict},
        {
            "$lookup": {
                "from": "users",
                "localField": "sales_person_id",
                "foreignField": "_id",
                "as": "sales_person"
            }
        },
        {
            "$addFields": {
                "sales_person_name": {"$arrayElemAt": ["$sales_person.name", 0]},
                "pending_days": {
                    "$dateDiff": {
                        "startDate": "$next_followup_date",
                        "endDate": today,
                        "unit": "day"
                    }
                },
                "is_overdue": True
            }
        },
        {"$project": {"sales_person": 0}},
        {"$sort": {"next_followup_date": 1}}
    ]

    cursor = db.leads.aggregate(pipeline)
    followups = await cursor.to_list(length=100)

    return {
        "followups": [serialize_doc(f) for f in followups],
        "total": total
    }


@router.get("/upcoming", response_model=FollowupListResponse)
async def get_upcoming_followups(
    days: int = Query(7, ge=1, le=30),
    current_user: dict = Depends(get_current_active_user)
):
    """Get upcoming follow-ups for next N days."""
    db = get_database()
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    from datetime import timedelta
    end_date = today + timedelta(days=days)

    # Build filter
    filter_dict = {
        "lead_status": LeadStatus.FOLLOW_UP,
        "next_followup_date": {"$gte": today, "$lte": end_date}
    }

    if current_user.get("role") == UserRole.SALESPERSON:
        filter_dict["sales_person_id"] = current_user["_id"]

    total = await db.leads.count_documents(filter_dict)

    pipeline = [
        {"$match": filter_dict},
        {
            "$lookup": {
                "from": "users",
                "localField": "sales_person_id",
                "foreignField": "_id",
                "as": "sales_person"
            }
        },
        {
            "$addFields": {
                "sales_person_name": {"$arrayElemAt": ["$sales_person.name", 0]},
                "pending_days": 0,
                "is_overdue": False
            }
        },
        {"$project": {"sales_person": 0}},
        {"$sort": {"next_followup_date": 1}}
    ]

    cursor = db.leads.aggregate(pipeline)
    followups = await cursor.to_list(length=100)

    return {
        "followups": [serialize_doc(f) for f in followups],
        "total": total
    }
