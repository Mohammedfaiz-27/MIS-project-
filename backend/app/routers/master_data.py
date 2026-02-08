from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel

from ..database import get_database
from ..utils.security import get_current_active_user, require_admin
from ..utils.helpers import serialize_doc
from ..models.master_data import MasterDataType

router = APIRouter()


class MasterDataCreate(BaseModel):
    type: MasterDataType
    value: str


class MasterDataResponse(BaseModel):
    id: str
    type: MasterDataType
    value: str
    is_active: bool
    created_at: datetime


@router.get("", response_model=List[MasterDataResponse])
async def get_master_data(
    type: Optional[MasterDataType] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Get all master data or filter by type."""
    db = get_database()

    filter_dict = {"is_active": True}
    if type:
        filter_dict["type"] = type

    cursor = db.master_data.find(filter_dict).sort("value", 1)
    items = await cursor.to_list(length=500)

    return [serialize_doc(item) for item in items]


@router.post("", response_model=MasterDataResponse)
async def create_master_data(
    data: MasterDataCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Create new master data entry (admin only)."""
    db = get_database()

    # Check if already exists
    existing = await db.master_data.find_one({
        "type": data.type,
        "value": data.value
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Value already exists for this type"
        )

    doc = {
        "type": data.type,
        "value": data.value,
        "is_active": True,
        "created_at": datetime.utcnow()
    }

    result = await db.master_data.insert_one(doc)
    doc["_id"] = result.inserted_id

    return serialize_doc(doc)


@router.delete("/{item_id}")
async def delete_master_data(
    item_id: str,
    current_user: dict = Depends(require_admin)
):
    """Delete master data entry (admin only)."""
    db = get_database()

    result = await db.master_data.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": {"is_active": False}}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master data not found"
        )

    return {"message": "Deleted successfully"}


@router.post("/seed")
async def seed_master_data(
    current_user: dict = Depends(require_admin)
):
    """Seed initial master data (admin only)."""
    db = get_database()

    # Check if already seeded
    count = await db.master_data.count_documents({})
    if count > 0:
        return {"message": "Master data already exists", "count": count}

    # Seed data
    seed_items = [
        # Steel brands
        {"type": "steel_brand", "value": "Tata Tiscon"},
        {"type": "steel_brand", "value": "JSW Steel"},
        {"type": "steel_brand", "value": "SAIL"},
        {"type": "steel_brand", "value": "Jindal Panther"},
        {"type": "steel_brand", "value": "Kamdhenu"},

        # Cement brands
        {"type": "cement_brand", "value": "UltraTech"},
        {"type": "cement_brand", "value": "ACC"},
        {"type": "cement_brand", "value": "Ambuja"},
        {"type": "cement_brand", "value": "Shree Cement"},
        {"type": "cement_brand", "value": "Dalmia Cement"},

        # Other brands
        {"type": "other_brand", "value": "Havells"},
        {"type": "other_brand", "value": "Polycab"},
        {"type": "other_brand", "value": "Asian Paints"},
        {"type": "other_brand", "value": "Berger Paints"},

        # Areas
        {"type": "area", "value": "North Zone"},
        {"type": "area", "value": "South Zone"},
        {"type": "area", "value": "East Zone"},
        {"type": "area", "value": "West Zone"},
        {"type": "area", "value": "Central Zone"},
    ]

    now = datetime.utcnow()
    for item in seed_items:
        item["is_active"] = True
        item["created_at"] = now

    await db.master_data.insert_many(seed_items)

    return {"message": "Master data seeded successfully", "count": len(seed_items)}
