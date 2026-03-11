from fastapi import APIRouter, HTTPException, status, Depends, Query
from fastapi.responses import StreamingResponse
from typing import Optional, List
from datetime import datetime, date
from bson import ObjectId
import io

from ..schemas.user import UserCreate, UserUpdate, UserResponse
from ..database import get_database
from ..services.auth_service import AuthService
from ..utils.security import require_admin, get_password_hash
from ..utils.helpers import serialize_doc

router = APIRouter()


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    current_user: dict = Depends(require_admin)
):
    """List all users (admin only)."""
    db = get_database()
    cursor = db.users.find().sort("created_at", -1)
    users = await cursor.to_list(length=100)
    return [serialize_doc(user) for user in users]


@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: dict = Depends(require_admin)
):
    """Create a new user (admin only)."""
    try:
        user = await AuthService.create_user(user_data)
        return serialize_doc(user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    update_data: UserUpdate,
    current_user: dict = Depends(require_admin)
):
    """Update a user (admin only)."""
    db = get_database()

    # Verify user exists
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if "password" in update_dict:
        plain = update_dict.pop("password")
        update_dict["password_hash"] = get_password_hash(plain)
        update_dict["password_plain"] = plain
    update_dict["updated_at"] = datetime.utcnow()

    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_dict}
    )

    updated_user = await db.users.find_one({"_id": ObjectId(user_id)})
    return serialize_doc(updated_user)


@router.get("/export/leads")
async def export_leads(
    format: str = Query("excel", regex="^(excel|csv)$"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    sales_person_id: Optional[str] = None,
    area: Optional[str] = None,
    current_user: dict = Depends(require_admin)
):
    """Export leads data (admin only)."""
    db = get_database()

    # Build filter
    filter_dict = {}
    if sales_person_id:
        filter_dict["sales_person_id"] = ObjectId(sales_person_id)
    if area:
        filter_dict["area"] = area
    if start_date or end_date:
        date_filter = {}
        if start_date:
            date_filter["$gte"] = datetime.combine(start_date, datetime.min.time())
        if end_date:
            date_filter["$lte"] = datetime.combine(end_date, datetime.max.time())
        filter_dict["created_at"] = date_filter

    # Get leads with user info
    pipeline = [
        {"$match": filter_dict},
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
            "$addFields": {
                "sales_person_name": {"$arrayElemAt": ["$sales_person.name", 0]}
            }
        },
        {"$project": {"sales_person": 0}}
    ]

    cursor = db.leads.aggregate(pipeline)
    leads = await cursor.to_list(length=10000)

    if format == "excel":
        from openpyxl import Workbook

        wb = Workbook()
        ws = wb.active
        ws.title = "Leads"

        # Headers
        headers = [
            "ID", "Site Location", "Area", "Customer Name", "Phone",
            "Builder Type", "Construction Stage", "Lead Type", "Lead Status",
            "Steel Brand", "Cement Brand", "Next Followup", "Visit Count",
            "Sales Person", "Created At"
        ]
        ws.append(headers)

        # Data
        for lead in leads:
            ws.append([
                str(lead.get("_id", "")),
                lead.get("site_location_name", ""),
                lead.get("area", ""),
                lead.get("customer_name", ""),
                lead.get("phone_number", ""),
                lead.get("builder_type", ""),
                lead.get("construction_stage", ""),
                lead.get("lead_type", ""),
                lead.get("lead_status", ""),
                lead.get("steel_brand", ""),
                lead.get("cement_brand", ""),
                str(lead.get("next_followup_date", ""))[:10] if lead.get("next_followup_date") else "",
                lead.get("visit_count", 1),
                lead.get("sales_person_name", ""),
                str(lead.get("created_at", ""))[:10] if lead.get("created_at") else ""
            ])

        # Save to buffer
        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=leads_export.xlsx"}
        )

    else:  # CSV
        import csv

        output = io.StringIO()
        writer = csv.writer(output)

        # Headers
        writer.writerow([
            "ID", "Site Location", "Area", "Customer Name", "Phone",
            "Builder Type", "Construction Stage", "Lead Type", "Lead Status",
            "Steel Brand", "Cement Brand", "Next Followup", "Visit Count",
            "Sales Person", "Created At"
        ])

        # Data
        for lead in leads:
            writer.writerow([
                str(lead.get("_id", "")),
                lead.get("site_location_name", ""),
                lead.get("area", ""),
                lead.get("customer_name", ""),
                lead.get("phone_number", ""),
                lead.get("builder_type", ""),
                lead.get("construction_stage", ""),
                lead.get("lead_type", ""),
                lead.get("lead_status", ""),
                lead.get("steel_brand", ""),
                lead.get("cement_brand", ""),
                str(lead.get("next_followup_date", ""))[:10] if lead.get("next_followup_date") else "",
                lead.get("visit_count", 1),
                lead.get("sales_person_name", ""),
                str(lead.get("created_at", ""))[:10] if lead.get("created_at") else ""
            ])

        output.seek(0)

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=leads_export.csv"}
        )


@router.get("/export/sales-entries")
async def export_sales_entries(
    format: str = Query("excel", regex="^(excel|csv)$"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    sales_person_id: Optional[str] = None,
    approval_status: Optional[str] = None,
    current_user: dict = Depends(require_admin)
):
    """Export sales entries data (admin only)."""
    db = get_database()

    # Build filter
    filter_dict = {}
    if sales_person_id:
        filter_dict["sales_person_id"] = ObjectId(sales_person_id)
    if approval_status:
        filter_dict["approval_status"] = approval_status
    if start_date or end_date:
        date_filter = {}
        if start_date:
            date_filter["$gte"] = datetime.combine(start_date, datetime.min.time())
        if end_date:
            date_filter["$lte"] = datetime.combine(end_date, datetime.max.time())
        filter_dict["created_at"] = date_filter

    # Get entries with lookup
    pipeline = [
        {"$match": filter_dict},
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
                "from": "leads",
                "localField": "lead_id",
                "foreignField": "_id",
                "as": "lead"
            }
        },
        {
            "$addFields": {
                "sales_person_name": {"$arrayElemAt": ["$sales_person.name", 0]},
                "customer_name": {"$arrayElemAt": ["$lead.customer_name", 0]},
                "site_location_name": {"$arrayElemAt": ["$lead.site_location_name", 0]},
                "area": {"$arrayElemAt": ["$lead.area", 0]}
            }
        },
        {"$project": {"sales_person": 0, "lead": 0}}
    ]

    cursor = db.sales_entries.aggregate(pipeline)
    entries = await cursor.to_list(length=10000)

    if format == "excel":
        from openpyxl import Workbook

        wb = Workbook()
        ws = wb.active
        ws.title = "Sales Entries"

        # Headers
        headers = [
            "ID", "Customer Name", "Site Location", "Area",
            "Steel (kg)", "Cement (bags)", "Status",
            "Sales Person", "Created At", "Approval Date"
        ]
        ws.append(headers)

        # Data
        for entry in entries:
            ws.append([
                str(entry.get("_id", "")),
                entry.get("customer_name", ""),
                entry.get("site_location_name", ""),
                entry.get("area", ""),
                entry.get("steel_quantity_kg", 0),
                entry.get("cement_quantity_bags", 0),
                entry.get("approval_status", ""),
                entry.get("sales_person_name", ""),
                str(entry.get("created_at", ""))[:10] if entry.get("created_at") else "",
                str(entry.get("approval_date", ""))[:10] if entry.get("approval_date") else ""
            ])

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=sales_entries_export.xlsx"}
        )

    else:  # CSV
        import csv

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow([
            "ID", "Customer Name", "Site Location", "Area",
            "Steel (kg)", "Cement (bags)", "Status",
            "Sales Person", "Created At", "Approval Date"
        ])

        for entry in entries:
            writer.writerow([
                str(entry.get("_id", "")),
                entry.get("customer_name", ""),
                entry.get("site_location_name", ""),
                entry.get("area", ""),
                entry.get("steel_quantity_kg", 0),
                entry.get("cement_quantity_bags", 0),
                entry.get("approval_status", ""),
                entry.get("sales_person_name", ""),
                str(entry.get("created_at", ""))[:10] if entry.get("created_at") else "",
                str(entry.get("approval_date", ""))[:10] if entry.get("approval_date") else ""
            ])

        output.seek(0)

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=sales_entries_export.csv"}
        )
