from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from .config import get_settings

settings = get_settings()

client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None


async def connect_to_mongodb():
    """Connect to MongoDB and create indexes."""
    global client, db
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.database_name]

    # Create indexes
    await create_indexes()

    print(f"Connected to MongoDB: {settings.database_name}")


async def close_mongodb_connection():
    """Close MongoDB connection."""
    global client
    if client:
        client.close()
        print("Closed MongoDB connection")


async def create_indexes():
    """Create database indexes for better query performance."""
    # Users indexes
    await db.users.create_index("email", unique=True)

    # Leads indexes
    await db.leads.create_index("sales_person_id")
    await db.leads.create_index("area")
    await db.leads.create_index("phone_number")
    await db.leads.create_index("next_followup_date")
    await db.leads.create_index("lead_status")
    await db.leads.create_index("lead_type")
    await db.leads.create_index([("created_at", -1)])

    # Visits indexes
    await db.visits.create_index("lead_id")
    await db.visits.create_index("sales_person_id")
    await db.visits.create_index("visit_date")

    # Sales entries indexes
    await db.sales_entries.create_index("lead_id")
    await db.sales_entries.create_index("sales_person_id")
    await db.sales_entries.create_index("approval_status")
    await db.sales_entries.create_index([("created_at", -1)])

    # Master data indexes
    await db.master_data.create_index([("type", 1), ("value", 1)], unique=True)


def get_database() -> AsyncIOMotorDatabase:
    """Get database instance."""
    return db
