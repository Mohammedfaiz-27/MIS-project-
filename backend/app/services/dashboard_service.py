from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from bson import ObjectId
from ..database import get_database
from ..models.lead import LeadStatus, LeadType
from ..models.sales_entry import ApprovalStatus
from ..models.user import UserRole


class DashboardService:
    @staticmethod
    async def get_kpis(
        user: dict,
        start_date: datetime = None,
        end_date: datetime = None,
        sales_person_id: str = None,
        area: str = None
    ) -> Dict[str, Any]:
        """Get KPI data for dashboard."""
        db = get_database()
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

        # Build base filter
        lead_filter = {}
        if user.get("role") == UserRole.SALESPERSON:
            lead_filter["sales_person_id"] = user["_id"]
        elif sales_person_id:
            lead_filter["sales_person_id"] = ObjectId(sales_person_id)

        if area:
            lead_filter["area"] = area

        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
            if end_date:
                date_filter["$lte"] = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            lead_filter["created_at"] = date_filter

        # Total leads
        total_leads = await db.leads.count_documents(lead_filter)

        # Hot leads
        hot_filter = {**lead_filter, "lead_type": LeadType.HOT}
        hot_leads = await db.leads.count_documents(hot_filter)

        # Warm leads
        warm_filter = {**lead_filter, "lead_type": LeadType.WARM}
        warm_leads = await db.leads.count_documents(warm_filter)

        # Cold leads
        cold_filter = {**lead_filter, "lead_type": LeadType.COLD}
        cold_leads = await db.leads.count_documents(cold_filter)

        # Pending followups (follow_up status with future/today date)
        pending_filter = {
            **lead_filter,
            "lead_status": LeadStatus.FOLLOW_UP,
            "next_followup_date": {"$gte": today}
        }
        pending_followups = await db.leads.count_documents(pending_filter)

        # Overdue followups
        overdue_filter = {
            **lead_filter,
            "lead_status": LeadStatus.FOLLOW_UP,
            "next_followup_date": {"$lt": today}
        }
        overdue_followups = await db.leads.count_documents(overdue_filter)

        # Sales entries aggregation
        entry_filter = {}
        if user.get("role") == UserRole.SALESPERSON:
            entry_filter["sales_person_id"] = user["_id"]
        elif sales_person_id:
            entry_filter["sales_person_id"] = ObjectId(sales_person_id)

        entry_filter["approval_status"] = ApprovalStatus.APPROVED

        pipeline = [
            {"$match": entry_filter},
            {
                "$group": {
                    "_id": None,
                    "total_steel": {"$sum": "$steel_quantity_kg"},
                    "total_cement": {"$sum": "$cement_quantity_bags"}
                }
            }
        ]

        cursor = db.sales_entries.aggregate(pipeline)
        sales_result = await cursor.to_list(length=1)
        total_steel = sales_result[0]["total_steel"] if sales_result else 0
        total_cement = sales_result[0]["total_cement"] if sales_result else 0

        # Conversion rate
        won_filter = {**lead_filter, "lead_status": LeadStatus.WON}
        won_leads = await db.leads.count_documents(won_filter)
        conversion_rate = (won_leads / total_leads * 100) if total_leads > 0 else 0

        # Pending approvals (admin only)
        pending_approvals = 0
        if user.get("role") == UserRole.ADMIN:
            pending_approvals = await db.sales_entries.count_documents({
                "approval_status": ApprovalStatus.PENDING
            })

        return {
            "total_leads": {"label": "Total Leads", "value": total_leads},
            "hot_leads": {"label": "Hot Leads", "value": hot_leads},
            "warm_leads": {"label": "Warm Leads", "value": warm_leads},
            "cold_leads": {"label": "Cold Leads", "value": cold_leads},
            "pending_followups": {"label": "Pending Follow-ups", "value": pending_followups},
            "overdue_followups": {"label": "Overdue Follow-ups", "value": overdue_followups},
            "total_steel_kg": {"label": "Total Steel (kg)", "value": total_steel},
            "total_cement_bags": {"label": "Total Cement (bags)", "value": total_cement},
            "conversion_rate": {"label": "Conversion Rate", "value": round(conversion_rate, 1)},
            "pending_approvals": {"label": "Pending Approvals", "value": pending_approvals},
            "total_won": {"label": "Total Won", "value": won_leads}
        }

    @staticmethod
    async def get_followup_table(
        user: dict,
        page: int = 1,
        page_size: int = 20,
        sales_person_id: str = None,
        area: str = None,
        overdue_only: bool = False
    ) -> Dict[str, Any]:
        """Get follow-up control table data."""
        db = get_database()
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

        # Build filter
        filter_dict = {"lead_status": LeadStatus.FOLLOW_UP}

        if user.get("role") == UserRole.SALESPERSON:
            filter_dict["sales_person_id"] = user["_id"]
        elif sales_person_id:
            filter_dict["sales_person_id"] = ObjectId(sales_person_id)

        if area:
            filter_dict["area"] = area

        if overdue_only:
            filter_dict["next_followup_date"] = {"$lt": today}

        # Get total count
        total = await db.leads.count_documents(filter_dict)

        # Aggregation pipeline
        skip = (page - 1) * page_size
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
                    "sales_person_name": {"$ifNull": [{"$arrayElemAt": ["$sales_person.name", 0]}, ""]},
                    "pending_days": {
                        "$ifNull": [
                            {
                                "$dateDiff": {
                                    "startDate": "$next_followup_date",
                                    "endDate": today,
                                    "unit": "day"
                                }
                            },
                            0
                        ]
                    },
                    "is_overdue": {"$lt": ["$next_followup_date", today]}
                }
            },
            {"$project": {"sales_person": 0}},
            {"$sort": {"is_overdue": -1, "next_followup_date": 1}},
            {"$skip": skip},
            {"$limit": page_size}
        ]

        cursor = db.leads.aggregate(pipeline)
        items = await cursor.to_list(length=page_size)

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size
        }

    @staticmethod
    async def get_salesperson_performance(
        start_date: datetime = None,
        end_date: datetime = None,
        area: str = None
    ) -> List[Dict[str, Any]]:
        """Get performance metrics by salesperson."""
        db = get_database()

        # Build filter
        lead_filter = {}
        if area:
            lead_filter["area"] = area
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
            if end_date:
                date_filter["$lte"] = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            lead_filter["created_at"] = date_filter

        pipeline = [
            {"$match": lead_filter},
            {
                "$group": {
                    "_id": "$sales_person_id",
                    "total_leads": {"$sum": 1},
                    "won_leads": {
                        "$sum": {"$cond": [{"$eq": ["$lead_status", LeadStatus.WON]}, 1, 0]}
                    },
                    "lost_leads": {
                        "$sum": {"$cond": [{"$eq": ["$lead_status", LeadStatus.LOST]}, 1, 0]}
                    },
                    "followup_leads": {
                        "$sum": {"$cond": [{"$eq": ["$lead_status", LeadStatus.FOLLOW_UP]}, 1, 0]}
                    },
                    "hot_leads": {
                        "$sum": {"$cond": [{"$eq": ["$lead_type", LeadType.HOT]}, 1, 0]}
                    },
                    "warm_leads": {
                        "$sum": {"$cond": [{"$eq": ["$lead_type", LeadType.WARM]}, 1, 0]}
                    },
                    "cold_leads": {
                        "$sum": {"$cond": [{"$eq": ["$lead_type", LeadType.COLD]}, 1, 0]}
                    }
                }
            },
            {
                "$lookup": {
                    "from": "users",
                    "localField": "_id",
                    "foreignField": "_id",
                    "as": "salesperson"
                }
            },
            {
                "$lookup": {
                    "from": "sales_entries",
                    "let": {"sp_id": "$_id"},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {"$eq": ["$sales_person_id", "$$sp_id"]},
                                "approval_status": ApprovalStatus.APPROVED
                            }
                        },
                        {
                            "$group": {
                                "_id": None,
                                "total_steel": {"$sum": "$steel_quantity_kg"},
                                "total_cement": {"$sum": "$cement_quantity_bags"}
                            }
                        }
                    ],
                    "as": "sales"
                }
            },
            {
                "$lookup": {
                    "from": "visits",
                    "localField": "_id",
                    "foreignField": "sales_person_id",
                    "as": "visits"
                }
            },
            {
                "$addFields": {
                    "salesperson_name": {"$arrayElemAt": ["$salesperson.name", 0]},
                    "total_steel_kg": {"$ifNull": [{"$arrayElemAt": ["$sales.total_steel", 0]}, 0]},
                    "total_cement_bags": {"$ifNull": [{"$arrayElemAt": ["$sales.total_cement", 0]}, 0]},
                    "total_visits": {"$size": "$visits"},
                    "conversion_rate": {
                        "$cond": [
                            {"$gt": ["$total_leads", 0]},
                            {"$multiply": [{"$divide": ["$won_leads", "$total_leads"]}, 100]},
                            0
                        ]
                    }
                }
            },
            {
                "$project": {
                    "salesperson": 0,
                    "sales": 0,
                    "visits": 0
                }
            },
            {"$sort": {"total_leads": -1}}
        ]

        cursor = db.leads.aggregate(pipeline)
        results = await cursor.to_list(length=100)

        return [
            {
                "salesperson_id": str(r["_id"]),
                "salesperson_name": r.get("salesperson_name", "Unknown"),
                "total_leads": r["total_leads"],
                "won_leads": r["won_leads"],
                "lost_leads": r["lost_leads"],
                "followup_leads": r["followup_leads"],
                "hot_leads": r["hot_leads"],
                "warm_leads": r["warm_leads"],
                "cold_leads": r["cold_leads"],
                "total_steel_kg": r["total_steel_kg"],
                "total_cement_bags": r["total_cement_bags"],
                "total_visits": r["total_visits"],
                "conversion_rate": round(r["conversion_rate"], 1)
            }
            for r in results
        ]

    @staticmethod
    async def get_area_analysis(
        start_date: datetime = None,
        end_date: datetime = None,
        sales_person_id: str = None
    ) -> List[Dict[str, Any]]:
        """Get analysis by area."""
        db = get_database()

        # Build filter
        lead_filter = {}
        if sales_person_id:
            lead_filter["sales_person_id"] = ObjectId(sales_person_id)
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
            if end_date:
                date_filter["$lte"] = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            lead_filter["created_at"] = date_filter

        pipeline = [
            {"$match": lead_filter},
            {
                "$group": {
                    "_id": "$area",
                    "total_leads": {"$sum": 1},
                    "won_leads": {
                        "$sum": {"$cond": [{"$eq": ["$lead_status", LeadStatus.WON]}, 1, 0]}
                    },
                    "lost_leads": {
                        "$sum": {"$cond": [{"$eq": ["$lead_status", LeadStatus.LOST]}, 1, 0]}
                    },
                    "hot_leads": {
                        "$sum": {"$cond": [{"$eq": ["$lead_type", LeadType.HOT]}, 1, 0]}
                    },
                    "lead_ids": {"$push": "$_id"}
                }
            },
            {
                "$lookup": {
                    "from": "sales_entries",
                    "let": {"lead_ids": "$lead_ids"},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {"$in": ["$lead_id", "$$lead_ids"]},
                                "approval_status": ApprovalStatus.APPROVED
                            }
                        },
                        {
                            "$group": {
                                "_id": None,
                                "total_steel": {"$sum": "$steel_quantity_kg"},
                                "total_cement": {"$sum": "$cement_quantity_bags"}
                            }
                        }
                    ],
                    "as": "sales"
                }
            },
            {
                "$addFields": {
                    "total_steel_kg": {"$ifNull": [{"$arrayElemAt": ["$sales.total_steel", 0]}, 0]},
                    "total_cement_bags": {"$ifNull": [{"$arrayElemAt": ["$sales.total_cement", 0]}, 0]}
                }
            },
            {"$project": {"lead_ids": 0, "sales": 0}},
            {"$sort": {"total_leads": -1}}
        ]

        cursor = db.leads.aggregate(pipeline)
        results = await cursor.to_list(length=100)

        return [
            {
                "area": r["_id"],
                "total_leads": r["total_leads"],
                "won_leads": r["won_leads"],
                "lost_leads": r["lost_leads"],
                "hot_leads": r["hot_leads"],
                "total_steel_kg": r["total_steel_kg"],
                "total_cement_bags": r["total_cement_bags"]
            }
            for r in results
        ]

    @staticmethod
    async def get_sales_trend(
        months: int = 6,
        sales_person_id: str = None,
        area: str = None
    ) -> List[Dict[str, Any]]:
        """Get sales trend over time."""
        db = get_database()
        today = datetime.utcnow()
        start_date = today - timedelta(days=months * 30)

        # Build filter
        lead_filter = {"created_at": {"$gte": start_date}}
        if sales_person_id:
            lead_filter["sales_person_id"] = ObjectId(sales_person_id)
        if area:
            lead_filter["area"] = area

        pipeline = [
            {"$match": lead_filter},
            {
                "$group": {
                    "_id": {
                        "year": {"$year": "$created_at"},
                        "month": {"$month": "$created_at"}
                    },
                    "leads_created": {"$sum": 1},
                    "leads_won": {
                        "$sum": {"$cond": [{"$eq": ["$lead_status", LeadStatus.WON]}, 1, 0]}
                    },
                    "lead_ids": {"$push": "$_id"}
                }
            },
            {
                "$lookup": {
                    "from": "sales_entries",
                    "let": {"lead_ids": "$lead_ids"},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {"$in": ["$lead_id", "$$lead_ids"]},
                                "approval_status": ApprovalStatus.APPROVED
                            }
                        },
                        {
                            "$group": {
                                "_id": None,
                                "steel_kg": {"$sum": "$steel_quantity_kg"},
                                "cement_bags": {"$sum": "$cement_quantity_bags"}
                            }
                        }
                    ],
                    "as": "sales"
                }
            },
            {
                "$addFields": {
                    "steel_kg": {"$ifNull": [{"$arrayElemAt": ["$sales.steel_kg", 0]}, 0]},
                    "cement_bags": {"$ifNull": [{"$arrayElemAt": ["$sales.cement_bags", 0]}, 0]}
                }
            },
            {"$project": {"lead_ids": 0, "sales": 0}},
            {"$sort": {"_id.year": 1, "_id.month": 1}}
        ]

        cursor = db.leads.aggregate(pipeline)
        results = await cursor.to_list(length=12)

        return [
            {
                "date": f"{r['_id']['year']}-{r['_id']['month']:02d}",
                "steel_kg": r["steel_kg"],
                "cement_bags": r["cement_bags"],
                "leads_created": r["leads_created"],
                "leads_won": r["leads_won"]
            }
            for r in results
        ]

    @staticmethod
    async def get_contribution_data(
        start_date: datetime = None,
        end_date: datetime = None
    ) -> List[Dict[str, Any]]:
        """Get contribution percentages by salesperson."""
        db = get_database()

        # Get salesperson performance first
        performance = await DashboardService.get_salesperson_performance(start_date, end_date)

        # Calculate totals
        total_steel = sum(p["total_steel_kg"] for p in performance)
        total_cement = sum(p["total_cement_bags"] for p in performance)
        total_leads = sum(p["total_leads"] for p in performance)

        return [
            {
                "salesperson_id": p["salesperson_id"],
                "salesperson_name": p["salesperson_name"],
                "steel_percentage": round((p["total_steel_kg"] / total_steel * 100) if total_steel > 0 else 0, 1),
                "cement_percentage": round((p["total_cement_bags"] / total_cement * 100) if total_cement > 0 else 0, 1),
                "leads_percentage": round((p["total_leads"] / total_leads * 100) if total_leads > 0 else 0, 1)
            }
            for p in performance
        ]
