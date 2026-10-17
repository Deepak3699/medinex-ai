from datetime import date, datetime
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import func, select

from app.core.config import settings
from app.core.database import SessionLocal
from app.models import Bed, BloodInventoryItem, Department, DoctorProfile, User, Ward
from app.services.availability import available_slot_datetimes


def _session():
    if SessionLocal is None:
        raise RuntimeError("Hospital database is not configured.")
    return SessionLocal()


def search_doctors(specialization: str = "", department: str = "") -> dict[str, Any]:
    """Search active hospital doctors by specialty or department name."""
    with _session() as db:
        query = select(DoctorProfile).join(DoctorProfile.user).where(
            DoctorProfile.is_active.is_(True),
            # Only doctor accounts that are active should be shown.
            User.is_active.is_(True),
        )
        if specialization.strip():
            query = query.where(DoctorProfile.specialization.ilike(f"%{specialization.strip()}%"))
        if department.strip():
            query = query.join(DoctorProfile.department).where(Department.name.ilike(f"%{department.strip()}%"))
        doctors = db.scalars(query.order_by(DoctorProfile.full_name).limit(20)).unique().all()
        return {
            "doctors": [
                {
                    "doctor_id": str(doctor.id),
                    "name": doctor.full_name,
                    "specialization": doctor.specialization,
                    "department": doctor.department.name if doctor.department else None,
                    "consultation_fee": float(doctor.consultation_fee) if doctor.consultation_fee is not None else None,
                }
                for doctor in doctors
            ]
        }


def get_doctor_availability(doctor_id: str, requested_date: str) -> dict[str, Any]:
    """Get live, unbooked appointment slots for a doctor on a local hospital date (YYYY-MM-DD)."""
    try:
        parsed_id = UUID(doctor_id)
        day = date.fromisoformat(requested_date)
    except ValueError:
        return {"error": "Use a valid doctor ID and date in YYYY-MM-DD format."}
    with _session() as db:
        doctor = db.scalar(
            select(DoctorProfile).where(DoctorProfile.id == parsed_id, DoctorProfile.is_active.is_(True))
        )
        if doctor is None:
            return {"error": "Doctor was not found or is not active."}
        slots = available_slot_datetimes(db, doctor, day)
        return {
            "doctor_id": str(doctor.id),
            "doctor_name": doctor.full_name,
            "date": day.isoformat(),
            "timezone": settings.hospital_timezone,
            "slots": [
                {"start_at": start.isoformat(), "duration_minutes": minutes}
                for start, minutes in slots
            ],
        }


def get_bed_availability(ward_type: str = "") -> dict[str, Any]:
    """Return live aggregate counts of available and occupied beds by ward."""
    with _session() as db:
        query = (
            select(
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
        if ward_type.strip():
            query = query.where(Ward.ward_type.ilike(f"%{ward_type.strip()}%"))
        return {
            "wards": [
                {
                    "ward": row.name,
                    "ward_type": row.ward_type,
                    "total_beds": row.total_beds,
                    "available_beds": row.available_beds,
                    "occupied_beds": row.occupied_beds,
                }
                for row in db.execute(query)
            ]
        }


def get_blood_availability(blood_group: str = "", component: str = "") -> dict[str, Any]:
    """Return live counts of tested, available, unexpired blood components."""
    today = datetime.now(ZoneInfo(settings.hospital_timezone)).date()
    with _session() as db:
        query = (
            select(
                BloodInventoryItem.blood_group,
                BloodInventoryItem.component,
                func.sum(BloodInventoryItem.units).label("units_available"),
            )
            .where(
                BloodInventoryItem.status == "available",
                BloodInventoryItem.tested.is_(True),
                BloodInventoryItem.expires_on >= today,
            )
            .group_by(BloodInventoryItem.blood_group, BloodInventoryItem.component)
            .order_by(BloodInventoryItem.blood_group, BloodInventoryItem.component)
        )
        if blood_group.strip():
            query = query.where(BloodInventoryItem.blood_group == blood_group.strip().upper())
        if component.strip():
            query = query.where(BloodInventoryItem.component == component.strip().lower())
        return {
            "inventory": [
                {
                    "blood_group": row.blood_group,
                    "component": row.component,
                    "units_available": int(row.units_available or 0),
                }
                for row in db.execute(query)
            ],
            "notice": "Counts are informational. Blood bank staff must verify compatibility and release.",
        }
