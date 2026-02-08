from fastapi import APIRouter, HTTPException, status, Depends
from ..schemas.user import (
    UserCreate, UserResponse, UserLogin, Token, ChangePassword
)
from ..services.auth_service import AuthService
from ..utils.security import get_current_active_user, require_admin
from ..utils.helpers import serialize_doc

router = APIRouter()


@router.post("/register", response_model=UserResponse)
async def register_user(
    user_data: UserCreate,
    current_user: dict = Depends(require_admin)
):
    """Register a new user (admin only)."""
    try:
        user = await AuthService.create_user(user_data)
        return serialize_doc(user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login and get access token."""
    user = await AuthService.authenticate_user(
        credentials.email, credentials.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    return AuthService.create_token(user)


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_active_user)):
    """Get current user profile."""
    return serialize_doc(current_user)


@router.put("/change-password")
async def change_password(
    data: ChangePassword,
    current_user: dict = Depends(get_current_active_user)
):
    """Change current user password."""
    success = await AuthService.change_password(
        str(current_user["_id"]),
        data.current_password,
        data.new_password
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    return {"message": "Password changed successfully"}
