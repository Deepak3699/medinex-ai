from datetime import datetime, timezone
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case, desc, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, aliased

from app.api.deps import require_roles
from app.core.config import settings
from app.core.database import get_db
from app.core.security import hash_password
from app.models import (
    Appointment,
    AuditLog,
    Bed,
    BloodRequest,
    BloodInventoryItem,
    BloodInventoryTransaction,
    Department,
    DoctorProfile,
    DoctorSchedule,
    PatientProfile,
    User,
    Ward,
)
from app.services.notifications import make_notification
from app.schemas import (
    AuditLogItem,
    BedCreate,
    BedStatusUpdate,
    BloodRequestCreate,
    BloodRequestItem,
    BloodRequestStatusUpdate,
    BloodInventoryAdjustment,
    BloodInventoryCreate,
    DepartmentCreate,
    DoctorCreate,
    DoctorRead,
    DoctorScheduleCreate,
    PatientDirectoryItem,
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


@router.get("/patients")
def list_patients(
    search: str = "",
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    del user
    if not 1 <= limit <= 100 or offset < 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Use a limit from 1 to 100 and a non-negative offset.")

    appointment_stats = (
        select(
            Appointment.patient_id.label("patient_id"),
            func.count(Appointment.id).label("appointment_count"),
            func.max(Appointment.start_at).label("latest_appointment_at"),
        )
        .group_by(Appointment.patient_id)
        .subquery()
    )
    query = (
        select(
            PatientProfile,
            User,
            func.coalesce(appointment_stats.c.appointment_count, 0),
            appointment_stats.c.latest_appointment_at,
        )
        .join(User, User.id == PatientProfile.user_id)
        .outerjoin(appointment_stats, appointment_stats.c.patient_id == PatientProfile.id)
    )
    count_query = select(func.count(PatientProfile.id)).join(User, User.id == PatientProfile.user_id)
    if search.strip():
        term = f"%{search.strip()}%"
        filters = [PatientProfile.full_name.ilike(term), User.email.ilike(term)]
        filters.append(PatientProfile.phone.ilike(term))
        query = query.where(or_(*filters))
        count_query = count_query.where(or_(*filters))
    total = int(db.scalar(count_query) or 0)
    rows = db.execute(query.order_by(PatientProfile.full_name).limit(limit).offset(offset)).all()
    items = [
        PatientDirectoryItem(
            id=patient.id,
            full_name=patient.full_name,
            email=account.email,
            phone=patient.phone,
            created_at=patient.created_at,
            appointment_count=appointment_count,
            latest_appointment_at=latest_appointment_at,
        ).model_dump()
        for patient, account, appointment_count, latest_appointment_at in rows
    ]
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/blood-requests")
def list_blood_requests(
    request_status: str | None = None,
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    del user
    if not 1 <= limit <= 100 or offset < 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Use a limit from 1 to 100 and a non-negative offset.")
    allowed_statuses = {"pending", "approved", "rejected", "fulfilled"}
    if request_status and request_status not in allowed_statuses:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unknown blood request status.")

    requester = aliased(User)
    patient_profile = aliased(PatientProfile)
    patient_user = aliased(User)
    query = (
        select(BloodRequest, requester, patient_profile, patient_user)
        .outerjoin(requester, requester.id == BloodRequest.requested_by_id)
        .outerjoin(patient_profile, patient_profile.id == BloodRequest.patient_id)
        .outerjoin(patient_user, patient_user.id == patient_profile.user_id)
    )
    count_query = select(func.count(BloodRequest.id))
    if request_status:
        query = query.where(BloodRequest.status == request_status)
        count_query = count_query.where(BloodRequest.status == request_status)
    total = int(db.scalar(count_query) or 0)
    rows = db.execute(
        query.order_by(
            case(
                (BloodRequest.status == "pending", 0),
                (BloodRequest.status == "approved", 1),
                (BloodRequest.status == "rejected", 2),
                else_=3,
            ),
            case(
                (BloodRequest.urgency == "emergency", 0),
                (BloodRequest.urgency == "urgent", 1),
                else_=2,
            ),
            desc(BloodRequest.created_at),
        ).limit(limit).offset(offset)
    ).all()
    items = [
        BloodRequestItem(
            id=request.id,
            patient_id=request.patient_id,
            patient_name=patient.full_name if patient else None,
            requested_by_id=request.requested_by_id,
            requester_email=requester_account.email if requester_account else None,
            blood_group=request.blood_group,
            component=request.component,
            units=request.units,
            urgency=request.urgency,
            reason=request.reason,
            status=request.status,
            created_at=request.created_at,
            updated_at=request.updated_at,
        ).model_dump()
        for request, requester_account, patient, _patient_account in rows
    ]
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.post("/blood-requests", status_code=status.HTTP_201_CREATED)
def create_blood_request(
    payload: BloodRequestCreate,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
) -> BloodRequestItem:
    patient = db.get(PatientProfile, payload.patient_id) if payload.patient_id else None
    if payload.patient_id and patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient was not found.")
    request = BloodRequest(
        patient_id=patient.id if patient else None,
        requested_by_id=user.id,
        blood_group=payload.blood_group,
        component=payload.component,
        units=payload.units,
        urgency=payload.urgency,
        reason=payload.reason,
    )
    db.add(request)
    db.flush()
    _audit(db, user, "blood_request.create", "blood_request", str(request.id))
    db.commit()
    db.refresh(request)
    return BloodRequestItem(
        id=request.id,
        patient_id=request.patient_id,
        patient_name=patient.full_name if patient else None,
        requested_by_id=request.requested_by_id,
        requester_email=user.email,
        blood_group=request.blood_group,
        component=request.component,
        units=request.units,
        urgency=request.urgency,
        reason=request.reason,
        status=request.status,
        created_at=request.created_at,
        updated_at=request.updated_at,
    )


@router.patch("/blood-requests/{request_id}", response_model=BloodRequestItem)
def update_blood_request(
    request_id: UUID,
    payload: BloodRequestStatusUpdate,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
) -> BloodRequestItem:
    request = db.scalar(select(BloodRequest).where(BloodRequest.id == request_id).with_for_update())
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blood request was not found.")
    allowed_transitions = {
        "pending": {"approved", "rejected"},
        "approved": {"fulfilled"},
    }
    if payload.status not in allowed_transitions.get(request.status, set()):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"A {request.status} request cannot be changed to {payload.status}.")
    if payload.status == "fulfilled":
        today = datetime.now(ZoneInfo(settings.hospital_timezone)).date()
        batches = list(
            db.scalars(
                select(BloodInventoryItem)
                .where(
                    BloodInventoryItem.blood_group == request.blood_group,
                    BloodInventoryItem.component == request.component,
                    BloodInventoryItem.status == "available",
                    BloodInventoryItem.tested.is_(True),
                    BloodInventoryItem.expires_on >= today,
                    BloodInventoryItem.units > 0,
                )
                .order_by(BloodInventoryItem.expires_on, BloodInventoryItem.id)
                .with_for_update()
            ).all()
        )
        stock = sum(batch.units for batch in batches)
        if stock < request.units:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Not enough tested, unexpired stock. {stock} unit(s) available; {request.units} required.",
            )
        remaining = request.units
        for batch in batches:
            issued = min(batch.units, remaining)
            if issued == 0:
                break
            batch.units -= issued
            if batch.units == 0:
                batch.status = "issued"
            batch.updated_at = datetime.now(timezone.utc)
            db.add(
                BloodInventoryTransaction(
                    inventory_item_id=batch.id,
                    actor_id=user.id,
                    action="issued",
                    units_delta=-issued,
                    note=f"Fulfilled blood request {str(request.id)[:8]}",
                )
            )
            remaining -= issued
    request.status = payload.status
    request.reviewed_by_id = user.id
    request.reviewed_at = datetime.now(timezone.utc)
    request.updated_at = request.reviewed_at
    _audit(db, user, f"blood_request.{payload.status}", "blood_request", str(request.id))
    if request.requested_by_id:
        db.add(
            make_notification(
                request.requested_by_id,
                "blood_request",
                f"Blood request {payload.status}",
                f"Your request for {request.units} unit(s) of {request.blood_group} {request.component.replace('_', ' ')} was {payload.status}.",
                "blood_request",
                str(request.id),
            )
        )
    db.commit()
    db.refresh(request)
    patient = db.get(PatientProfile, request.patient_id) if request.patient_id else None
    requester = db.get(User, request.requested_by_id) if request.requested_by_id else None
    return BloodRequestItem(
        id=request.id,
        patient_id=request.patient_id,
        patient_name=patient.full_name if patient else None,
        requested_by_id=request.requested_by_id,
        requester_email=requester.email if requester else None,
        blood_group=request.blood_group,
        component=request.component,
        units=request.units,
        urgency=request.urgency,
        reason=request.reason,
        status=request.status,
        created_at=request.created_at,
        updated_at=request.updated_at,
    )


@router.get("/audit-logs")
def list_audit_logs(
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    del user
    if not 1 <= limit <= 100 or offset < 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Use a limit from 1 to 100 and a non-negative offset.")
    total = int(db.scalar(select(func.count(AuditLog.id))) or 0)
    rows = db.execute(
        select(AuditLog, User)
        .outerjoin(User, User.id == AuditLog.actor_id)
        .order_by(desc(AuditLog.created_at))
        .limit(limit)
        .offset(offset)
    ).all()
    items = [
        AuditLogItem(
            id=entry.id,
            actor_email=actor.email if actor else None,
            actor_role=actor.role if actor else None,
            action=entry.action,
            resource_type=entry.resource_type,
            resource_id=entry.resource_id,
            created_at=entry.created_at,
        ).model_dump()
        for entry, actor in rows
    ]
    return {"items": items, "total": total, "limit": limit, "offset": offset}
