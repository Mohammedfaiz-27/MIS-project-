from typing import Any, Dict, List
from datetime import datetime
from bson import ObjectId
import math


def serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Convert MongoDB document to JSON-serializable dict."""
    if doc is None:
        return None

    result = {}
    for key, value in doc.items():
        if key == "_id":
            result["id"] = str(value)
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value
        elif isinstance(value, list):
            result[key] = [
                serialize_doc(item) if isinstance(item, dict) else
                str(item) if isinstance(item, ObjectId) else item
                for item in value
            ]
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        else:
            result[key] = value
    return result


def paginate(page: int, page_size: int, total: int) -> Dict[str, int]:
    """Calculate pagination values."""
    total_pages = math.ceil(total / page_size) if page_size > 0 else 0
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


def get_date_range_filter(
    start_date: datetime = None,
    end_date: datetime = None,
    field: str = "created_at"
) -> Dict[str, Any]:
    """Build a date range filter for MongoDB queries."""
    filter_dict = {}

    if start_date or end_date:
        date_filter = {}
        if start_date:
            date_filter["$gte"] = start_date
        if end_date:
            date_filter["$lte"] = end_date
        filter_dict[field] = date_filter

    return filter_dict
