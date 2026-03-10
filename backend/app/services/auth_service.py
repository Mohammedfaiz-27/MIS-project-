from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId
from ..database import get_database
from ..utils.security import get_password_hash, verify_password, create_access_token
from ..schemas.user import UserCreate, Token
from ..models.user import UserRole


class AuthService:
    @staticmethod
    async def create_user(user_data: UserCreate) -> dict:
        """Create a new user."""
        db = get_database()

        # Check if email already exists
        existing = await db.users.find_one({"email": user_data.email})
        if existing:
            raise ValueError("Email already registered")

        user_doc = {
            "email": user_data.email,
            "password_hash": get_password_hash(user_data.password),
            "password_plain": user_data.password,
            "name": user_data.name,
            "role": user_data.role,
            "phone": user_data.phone,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": None
        }

        result = await db.users.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
        return user_doc

    @staticmethod
    async def authenticate_user(email: str, password: str) -> Optional[dict]:
        """Authenticate user by email and password."""
        db = get_database()
        user = await db.users.find_one({"email": email})

        if not user:
            return None
        if not verify_password(password, user["password_hash"]):
            return None
        if not user.get("is_active", False):
            return None

        return user

    @staticmethod
    def create_token(user: dict) -> Token:
        """Create access token for user."""
        token_data = {
            "sub": str(user["_id"]),
            "role": user["role"]
        }
        access_token = create_access_token(data=token_data)
        return Token(access_token=access_token)

    @staticmethod
    async def change_password(user_id: str, current_password: str, new_password: str) -> bool:
        """Change user password."""
        db = get_database()
        user = await db.users.find_one({"_id": ObjectId(user_id)})

        if not user:
            return False
        if not verify_password(current_password, user["password_hash"]):
            return False

        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "password_hash": get_password_hash(new_password),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return True

    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[dict]:
        """Get user by ID."""
        db = get_database()
        try:
            return await db.users.find_one({"_id": ObjectId(user_id)})
        except Exception:
            return None

    @staticmethod
    async def create_default_admin():
        """Create default admin user if no users exist, and migrate old email if present."""
        db = get_database()

        # Migrate old emails if they still exist in the database
        email_migrations = {
            "admin@construction.com": "admin@arckitraders.com",
            "sathish@construction.com": "sathish@arckitraders.com",
        }
        for old_email, new_email in email_migrations.items():
            old = await db.users.find_one({"email": old_email})
            if old:
                await db.users.update_one(
                    {"_id": old["_id"]},
                    {"$set": {"email": new_email}}
                )
                print(f"Migrated email: {old_email} -> {new_email}")

        count = await db.users.count_documents({})

        if count == 0:
            admin_data = UserCreate(
                email="admin@arckitraders.com",
                password="admin123",
                name="Admin User",
                role=UserRole.ADMIN,
                phone="1234567890"
            )
            await AuthService.create_user(admin_data)
            print("Default admin user created: admin@arckitraders.com / admin123")
