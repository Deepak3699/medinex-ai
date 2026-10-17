from datetime import date, datetime
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.config import settings
from app.models import Bed, BloodInventoryItem, Department, DoctorProfile, Ward
from app.schemas import DoctorRead
from app.services.availability import available_slot_datetimes


router = APIRouter(tags=["hospital information"])


@router.get("/departments")
def list_departments(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    departments = db.scalars(
        select(Department).where(Department.is_active.is_(True)).order_by(Department.name)
    ).all()
    return [{"id": str(item.id), "name": item.name, "location": item.location} for item in departments]


@router.get("/doctors", response_model=list[DoctorRead])
def list_doctors(
    specialization: str | None = None,
    department_id: UUID | None = None,
    db: Session = Depends(get_db),
) -> list[DoctorProfile]:
    query = select(DoctorProfile).options(joinedload(DoctorProfile.department)).where(DoctorProfile.is_active.is_(True))
    if specialization:
        query = query.where(DoctorProfile.specialization.ilike(f"%{specialization.strip()}%"))
    if department_id:
        query = query.where(DoctorProfile.department_id == department_id)
    return list(db.scalars(query.order_by(DoctorProfile.full_name)).unique().all())


@router.get("/doctors/{doctor_id}/availability")
def doctor_availability(
    doctor_id: UUID,
    day: date = Query(description="Local hospital date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    doctor = db.scalar(select(DoctorProfile).where(DoctorProfile.id == doctor_id, DoctorProfile.is_active.is_(True)))
    if doctor is None:
        return {"doctor_id": str(doctor_id), "date": day.isoformat(), "slots": []}
    slots = available_slot_datetimes(db, doctor, day)
    return {
        "doctor_id": str(doctor.id),
        "doctor_name": doctor.full_name,
        "date": day.isoformat(),
        "slots": [
            {"start_at": start.isoformat(), "duration_minutes": minutes}
            for start, minutes in slots
        ],
    }


@router.get("/resources/beds")
def bed_availability(
    ward_type: str | None = None,
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    query = (
        select(
            Ward.id,
            Ward.name,
            Ward.ward_type,
            func.count(Bed.id).label("total_beds"),
            func.count(Bed.id).filter(Bed.status == "available").label("available_beds"),
            func.count(Bed.id).filter(Bed.status == "occupied").label("occupied_beds"),
        )
        .join(Bed, Bed.ward_id == Ward.id, isouter=True)
        .where(Ward.is_active.is_(True))
        .group_by(Ward.id, Ward.name, Ward.ward_type)
        .order_by(Ward.name)
    )
    if ward_type:
        query = query.where(Ward.ward_type.ilike(f"%{ward_type.strip()}%"))
    return [
        {
            "ward_id": str(row.id),
            "ward": row.name,
            "ward_type": row.ward_type,
            "total_beds": row.total_beds,
            "available_beds": row.available_beds,
            "occupied_beds": row.occupied_beds,
        }
        for row in db.execute(query)
    ]


@router.get("/resources/blood")
def blood_availability(
    blood_group: str | None = None,
    component: str | None = None,
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    query = (
        select(
            BloodInventoryItem.blood_group,
            BloodInventoryItem.component,
            func.sum(BloodInventoryItem.units).label("units_available"),
        )
        .where(
            BloodInventoryItem.status == "available",
            BloodInventoryItem.tested.is_(True),
            BloodInventoryItem.expires_on >= datetime.now(ZoneInfo(settings.hospital_timezone)).date(),
        )
        .group_by(BloodInventoryItem.blood_group, BloodInventoryItem.component)
        .order_by(BloodInventoryItem.blood_group, BloodInventoryItem.component)
    )
    if blood_group:
        query = query.where(BloodInventoryItem.blood_group == blood_group.strip().upper())
    if component:
        query = query.where(BloodInventoryItem.component == component.strip().lower())
    return [
        {"blood_group": row.blood_group, "component": row.component, "units_available": int(row.units_available or 0)}
        for row in db.execute(query)
    ]
