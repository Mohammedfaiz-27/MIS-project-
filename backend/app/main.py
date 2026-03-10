from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from .config import get_settings
from .database import connect_to_mongodb, close_mongodb_connection
from .routers import auth, leads, followups, sales_entries, dashboard, admin, master_data

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    await connect_to_mongodb()
    # Create default admin user if none exists
    from .services.auth_service import AuthService
    await AuthService.create_default_admin()
    yield
    await close_mongodb_connection()


app = FastAPI(
    title="Arcki Traders API",
    description="Management Information System for Arcki Traders",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(leads.router, prefix="/api/leads", tags=["Leads"])
app.include_router(followups.router, prefix="/api/followups", tags=["Follow-ups"])
app.include_router(sales_entries.router, prefix="/api/sales-entries", tags=["Sales Entries"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(master_data.router, prefix="/api/master-data", tags=["Master Data"])


@app.get("/")
async def root():
    return {"message": "Arcki Traders API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
