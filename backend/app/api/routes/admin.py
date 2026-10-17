from datetime import datetime, timezone
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.config import settings
from app.core.database import get_db
from app.core.security import hash_password
from app.models import (
    AuditLog,
    Bed,
    BloodInventoryItem,
    BloodInventoryTransaction,
    Department,
    DoctorProfile,
    DoctorSchedule,
    User,
    Ward,
)
from app.schemas import (
    BedCreate,
    BedStatusUpdate,
    BloodInventoryAdjustment,
    BloodInventoryCreate,
    DepartmentCreate,
    DoctorCreate,
    DoctorRead,
    DoctorScheduleCreate,
    UserRole,
    WardCreate,
)


router = APIRouter(prefix="/admin", tags=["hospital administration"])
admin_user = require_roles(UserRole.ADMIN)


def _audit(db: Session, user: User, action: str, resource_type: str, resource_id: str | None = None) -> None:
    db.add(AuditLog(actor_id=user.id, action=action, resource_type=resource_type, resource_id=resource_id))


@router.post("/departments", status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
) -> dict[str, str | None]:
    department = Department(name=payload.name.strip(), location=payload.location)
    db.add(department)
    try:
        db.flush()
        _audit(db, user, "department.create", "department", str(department.id))
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Department name already exists.") from exc
    return {"id": str(department.id), "name": department.name, "location": department.location}


@router.post("/doctors", response_model=DoctorRead, status_code=status.HTTP_201_CREATED)
def create_doctor(
    payload: DoctorCreate,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
) -> DoctorProfile:
    if payload.department_id and db.get(Department, payload.department_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department was not found.")
    staff_account = User(email=str(payload.email).lower(), password_hash=hash_password(payload.password), role="doctor")
    doctor = DoctorProfile(
        user=staff_account,
        department_id=payload.department_id,
        full_name=payload.full_name.strip(),
        specialization=payload.specialization.strip(),
        consultation_fee=payload.consultation_fee,
    )
    db.add(doctor)
    try:
        db.flush()
        _audit(db, user, "doctor.create", "doctor", str(doctor.id))
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.") from exc
    db.refresh(doctor)
    return doctor


@router.post("/doctors/{doctor_id}/schedules", status_code=status.HTTP_201_CREATED)
def add_doctor_schedule(
    doctor_id: UUID,
    payload: DoctorScheduleCreate,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
) -> dict[str, str | int]:
    if payload.start_time >= payload.end_time:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Schedule end must be later than start.")
    doctor = db.get(DoctorProfile, doctor_id)
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor was not found.")
    overlap = db.scalar(
        select(DoctorSchedule.id).where(
            DoctorSchedule.doctor_id == doctor.id,
            DoctorSchedule.weekday == payload.weekday,
            DoctorSchedule.is_active.is_(True),
            DoctorSchedule.start_time < payload.end_time,
            DoctorSchedule.end_time > payload.start_time,
        )
    )
    if overlap is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This schedule overlaps an existing schedule.")
    schedule = DoctorSchedule(doctor_id=doctor.id, **payload.model_dump())
    db.add(schedule)
    db.flush()
    _audit(db, user, "doctor_schedule.create", "doctor_schedule", str(schedule.id))
    db.commit()
    return {
        "id": str(schedule.id),
        "doctor_id": str(schedule.doctor_id),
        "weekday": schedule.weekday,
        "start_time": schedule.start_time.isoformat(),
        "end_time": schedule.end_time.isoformat(),
        "slot_minutes": schedule.slot_minutes,
    }


@router.post("/wards", status_code=status.HTTP_201_CREATED)
def create_ward(
    payload: WardCreate,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    ward = Ward(name=payload.name.strip(), ward_type=payload.ward_type.strip())
    db.add(ward)
    try:
        db.flush()
        _audit(db, user, "ward.create", "ward", str(ward.id))
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ward name already exists.") from exc
    return {"id": str(ward.id), "name": ward.name, "ward_type": ward.ward_type}


@router.post("/wards/{ward_id}/beds", status_code=status.HTTP_201_CREATED)
def create_bed(
    ward_id: UUID,
    payload: BedCreate,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    if db.get(Ward, ward_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ward was not found.")
    bed = Bed(ward_id=ward_id, **payload.model_dump())
    db.add(bed)
    try:
        db.flush()
        _audit(db, user, "bed.create", "bed", str(bed.id))
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That bed number already exists in this ward.") from exc
    return {"id": str(bed.id), "ward_id": str(bed.ward_id), "bed_number": bed.bed_number, "status": bed.status}


@router.patch("/beds/{bed_id}")
def update_bed_status(
    bed_id: UUID,
    payload: BedStatusUpdate,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    bed = db.get(Bed, bed_id)
    if bed is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bed was not found.")
    bed.status = payload.status
    bed.updated_at = datetime.now(timezone.utc)
    _audit(db, user, "bed.status.update", "bed", str(bed.id))
    db.commit()
    return {"id": str(bed.id), "status": bed.status}


@router.post("/blood-inventory", status_code=status.HTTP_201_CREATED)
def add_blood_inventory(
    payload: BloodInventoryCreate,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
) -> dict[str, str | int | bool]:
    today = datetime.now(ZoneInfo(settings.hospital_timezone)).date()
    if payload.expires_on < today:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Expiry date is in the past.")
    item = BloodInventoryItem(
        blood_group=payload.blood_group,
        component=payload.component,
        units=payload.units,
        expires_on=payload.expires_on,
        tested=payload.tested,
        status="available",
    )
    db.add(item)
    db.flush()
    db.add(
        BloodInventoryTransaction(
            inventory_item_id=item.id,
            actor_id=user.id,
            action="received",
            units_delta=payload.units,
            note="New stock batch received",
        )
    )
    _audit(db, user, "blood_inventory.receive", "blood_inventory_item", str(item.id))
    db.commit()
    return {
        "id": str(item.id),
        "blood_group": item.blood_group,
        "component": item.component,
        "units": item.units,
        "expires_on": item.expires_on.isoformat(),
        "tested": item.tested,
    }


@router.post("/blood-inventory/{item_id}/adjust")
def adjust_blood_inventory(
    item_id: UUID,
    payload: BloodInventoryAdjustment,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
) -> dict[str, str | int]:
    item = db.scalar(
        select(BloodInventoryItem).where(BloodInventoryItem.id == item_id).with_for_update()
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory batch was not found.")
    action = payload.action
    if action in {"issued", "reserved"} and payload.units_delta >= 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Issued/reserved units must reduce available stock.")
    if action == "released" and payload.units_delta <= 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Released units must increase available stock.")
    new_total = item.units + payload.units_delta
    if new_total < 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Adjustment exceeds the available units in this batch.")
    item.units = new_total
    if action in {"expired", "quarantined"}:
        if payload.units_delta != -new_total and new_total != 0:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Expire or quarantine the full remaining batch.")
        item.status = action
    elif item.status in {"expired", "quarantined"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Expired or quarantined stock cannot be adjusted as available.")
    item.updated_at = datetime.now(timezone.utc)
    db.add(
        BloodInventoryTransaction(
            inventory_item_id=item.id,
            actor_id=user.id,
            action=action,
            units_delta=payload.units_delta,
            note=payload.note,
        )
    )
    _audit(db, user, f"blood_inventory.{action}", "blood_inventory_item", str(item.id))
    db.commit()
    return {"id": str(item.id), "status": item.status, "units_available": item.units}
