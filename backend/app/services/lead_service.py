from datetime import datetime
from typing import Optional, List, Dict, Any
from bson import ObjectId
from ..database import get_database
from ..schemas.lead import LeadCreate, LeadUpdate
from ..models.lead import LeadStatus
from ..models.user import UserRole


class LeadService:
    @staticmethod
    async def create_lead(lead_data: LeadCreate, sales_person_id: str) -> dict:
        """Create a new lead."""
        db = get_database()

        lead_doc = {
            "site_location_name": lead_data.site_location_name,
            "area": lead_data.area,
            "site_photos": [],
            "steel_brand": lead_data.steel_brand,
            "cement_brand": lead_data.cement_brand,
            "other_brands": lead_data.other_brands or [],
            "construction_stage": lead_data.construction_stage,
            "lead_type": lead_data.lead_type,
            "lead_status": lead_data.lead_status,
            "customer_name": lead_data.customer_name,
            "phone_number": lead_data.phone_number,
            "occupation": lead_data.occupation,
            "builder_type": lead_data.builder_type,
            "next_followup_date": lead_data.next_followup_date,
            "visit_count": 1,
            "remarks": lead_data.remarks,
            "location": lead_data.location.model_dump() if lead_data.location else None,
            "sales_person_id": ObjectId(sales_person_id),
            "created_at": datetime.utcnow(),
            "updated_at": None
        }

        result = await db.leads.insert_one(lead_doc)
        lead_doc["_id"] = result.inserted_id

        # Create initial visit record
        visit_doc = {
            "lead_id": result.inserted_id,
            "sales_person_id": ObjectId(sales_person_id),
            "visit_date": datetime.utcnow(),
            "construction_stage_at_visit": lead_data.construction_stage,
            "remarks": lead_data.remarks or "Initial visit",
            "created_at": datetime.utcnow()
        }
        if lead_data.next_followup_date:
            visit_doc["next_followup_date"] = lead_data.next_followup_date
        await db.visits.insert_one(visit_doc)

        return lead_doc

    @staticmethod
    async def get_lead(lead_id: str) -> Optional[dict]:
        """Get a lead by ID with sales person details."""
        db = get_database()

        pipeline = [
            {"$match": {"_id": ObjectId(lead_id)}},
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
        results = await cursor.to_list(length=1)
        return results[0] if results else None

    @staticmethod
    async def get_leads(
        user: dict,
        page: int = 1,
        page_size: int = 20,
        area: str = None,
        lead_type: str = None,
        lead_status: str = None,
        sales_person_id: str = None,
        search: str = None,
        start_date: datetime = None,
        end_date: datetime = None
    ) -> Dict[str, Any]:
        """Get leads with filters and pagination."""
        db = get_database()

        # Build filter
        filter_dict = {}

        # Role-based filtering
        if user.get("role") == UserRole.SALESPERSON:
            filter_dict["sales_person_id"] = user["_id"]
        elif sales_person_id:
            filter_dict["sales_person_id"] = ObjectId(sales_person_id)

        if area:
            filter_dict["area"] = area
        if lead_type:
            filter_dict["lead_type"] = lead_type
        if lead_status:
            filter_dict["lead_status"] = lead_status

        if search:
            filter_dict["$or"] = [
                {"customer_name": {"$regex": search, "$options": "i"}},
                {"phone_number": {"$regex": search, "$options": "i"}},
                {"site_location_name": {"$regex": search, "$options": "i"}}
            ]

        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
            if end_date:
                date_filter["$lte"] = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            filter_dict["created_at"] = date_filter

        # Get total count
        total = await db.leads.count_documents(filter_dict)

        # Get paginated results with lookup
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
                "$addFields": {
                    "sales_person_name": {"$arrayElemAt": ["$sales_person.name", 0]}
                }
            },
            {"$project": {"sales_person": 0}}
        ]

        cursor = db.leads.aggregate(pipeline)
        leads = await cursor.to_list(length=page_size)

        return {
            "leads": leads,
            "total": total,
            "page": page,
            "page_size": page_size
        }

    @staticmethod
    async def update_lead(lead_id: str, update_data: LeadUpdate, user: dict) -> Optional[dict]:
        """Update a lead."""
        db = get_database()

        # Check ownership for salesperson
        lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
        if not lead:
            return None

        if user.get("role") == UserRole.SALESPERSON:
            if lead["sales_person_id"] != user["_id"]:
                raise PermissionError("Not authorized to update this lead")

        update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
        update_dict["updated_at"] = datetime.utcnow()

        await db.leads.update_one(
            {"_id": ObjectId(lead_id)},
            {"$set": update_dict}
        )

        return await LeadService.get_lead(lead_id)

    @staticmethod
    async def add_photos(lead_id: str, photo_urls: List[str]) -> Optional[dict]:
        """Add photos to a lead."""
        db = get_database()

        await db.leads.update_one(
            {"_id": ObjectId(lead_id)},
            {
                "$push": {"site_photos": {"$each": photo_urls}},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

        return await LeadService.get_lead(lead_id)

    @staticmethod
    async def update_stage(lead_id: str, stage: str) -> Optional[dict]:
        """Update construction stage."""
        db = get_database()

        await db.leads.update_one(
            {"_id": ObjectId(lead_id)},
            {
                "$set": {
                    "construction_stage": stage,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        return await LeadService.get_lead(lead_id)

    @staticmethod
    async def update_status(lead_id: str, status: str) -> Optional[dict]:
        """Update lead status."""
        db = get_database()

        await db.leads.update_one(
            {"_id": ObjectId(lead_id)},
            {
                "$set": {
                    "lead_status": status,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        return await LeadService.get_lead(lead_id)
