from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
from ..models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=2)
    role: UserRole = UserRole.SALESPERSON
    phone: Optional[str] = None

    @field_validator("email")
    @classmethod
    def email_domain_must_be_arckitraders(cls, v):
        if not str(v).endswith("@arckitraders.com"):
            raise ValueError("Email must use the @arckitraders.com domain")
        return v


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6)


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole
    phone: Optional[str] = None
    is_active: bool
    password_plain: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None
    role: Optional[str] = None


class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)
