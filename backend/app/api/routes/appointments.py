from datetime import timedelta, timezone
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.config import settings
from app.core.database import get_db
from app.models import Appointment, AuditLog, DoctorProfile, PatientProfile, User
from app.schemas import AppointmentCreate, AppointmentRead, UserRole
from app.services.availability import available_slot_datetimes
from app.services.notifications import make_notification


router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.get("/mine", response_model=list[AppointmentRead])
def my_appointments(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[Appointment]:
    query = select(Appointment).order_by(Appointment.start_at.desc())
    if user.role == UserRole.PATIENT.value:
        profile = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
        if profile is None:
            return []
        query = query.where(Appointment.patient_id == profile.id)
    elif user.role == UserRole.DOCTOR.value:
        profile = db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == user.id))
        if profile is None:
            return []
        query = query.where(Appointment.doctor_id == profile.id)
    elif user.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Appointments are not available to this role.")
    return list(db.scalars(query).all())


@router.post("", response_model=AppointmentRead, status_code=status.HTTP_201_CREATED)
def book_appointment(
    payload: AppointmentCreate,
    user: User = Depends(require_roles(UserRole.PATIENT)),
    db: Session = Depends(get_db),
) -> Appointment:
    patient = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
    doctor = db.scalar(
        select(DoctorProfile).where(DoctorProfile.id == payload.doctor_id, DoctorProfile.is_active.is_(True))
    )
    if patient is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Complete your patient profile before booking.")
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor was not found.")

    local_start = payload.start_at.astimezone(ZoneInfo(settings.hospital_timezone))
    slots = available_slot_datetimes(db, doctor, local_start.date())
    selected = next(
        (slot for slot in slots if slot[0].astimezone(timezone.utc) == payload.start_at.astimezone(timezone.utc)),
        None,
    )
    if selected is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That appointment slot is no longer available.")

    local_slot, duration = selected
    appointment = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        start_at=local_slot.astimezone(timezone.utc),
        end_at=(local_slot + timedelta(minutes=duration)).astimezone(timezone.utc),
        status="confirmed",
    )
    db.add(appointment)
    try:
        db.flush()
        db.add(AuditLog(actor_id=user.id, action="appointment.book", resource_type="appointment", resource_id=str(appointment.id)))
        db.add(
            make_notification(
                patient.user_id,
                "appointment",
                "Appointment confirmed",
                f"Your appointment with {doctor.full_name} is confirmed.",
                "appointment",
                str(appointment.id),
            )
        )
        db.add(
            make_notification(
                doctor.user_id,
                "appointment",
                "New appointment booked",
                f"A patient booked an appointment for {local_slot.isoformat()}.",
                "appointment",
                str(appointment.id),
            )
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That slot was just booked. Please choose another.")
    db.refresh(appointment)
    return appointment


@router.post("/{appointment_id}/cancel", response_model=AppointmentRead)
def cancel_appointment(
    appointment_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Appointment:
    appointment = db.get(Appointment, appointment_id)
    if appointment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment was not found.")

    is_allowed = user.role == UserRole.ADMIN.value
    if user.role == UserRole.PATIENT.value:
        profile = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
        is_allowed = profile is not None and profile.id == appointment.patient_id
    elif user.role == UserRole.DOCTOR.value:
        profile = db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == user.id))
        is_allowed = profile is not None and profile.id == appointment.doctor_id
    if not is_allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot cancel this appointment.")
    if appointment.status in {"cancelled", "completed"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This appointment can no longer be cancelled.")

    appointment.status = "cancelled"
    db.add(AuditLog(actor_id=user.id, action="appointment.cancel", resource_type="appointment", resource_id=str(appointment.id)))
    recipients: set[UUID] = set()
    if user.role == UserRole.ADMIN.value:
        recipients.update({appointment.patient.user_id, appointment.doctor.user_id})
    elif user.role == UserRole.PATIENT.value:
        recipients.add(appointment.doctor.user_id)
    elif user.role == UserRole.DOCTOR.value:
        recipients.add(appointment.patient.user_id)
    for recipient_id in recipients - {user.id}:
        db.add(
            make_notification(
                recipient_id,
                "appointment",
                "Appointment cancelled",
                "An appointment in your care schedule was cancelled.",
                "appointment",
                str(appointment.id),
            )
        )
    db.commit()
    db.refresh(appointment)
    return appointment
