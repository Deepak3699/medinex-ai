import logging

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.api.routes import admin, appointments, assistant, auth, hospital, notifications
from app.core.config import settings
from app.core.database import database_is_ready
from app import models as _models  # noqa: F401 - register models for migrations


logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title=settings.app_name,
    description="Role-aware hospital operations with a database-grounded AI assistant.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(hospital.router, prefix=settings.api_prefix)
app.include_router(appointments.router, prefix=settings.api_prefix)
app.include_router(assistant.router, prefix=settings.api_prefix)
app.include_router(admin.router, prefix=settings.api_prefix)
app.include_router(notifications.router, prefix=settings.api_prefix)


@app.get("/health", tags=["service health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready", tags=["service health"])
def ready() -> dict[str, str]:
    try:
        if not database_is_ready():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="DATABASE_URL is not configured.",
            )
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is not ready.",
        ) from exc
    return {"status": "ready", "database": "connected"}
