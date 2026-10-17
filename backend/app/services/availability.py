from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Appointment, DoctorProfile, DoctorSchedule


def available_slot_datetimes(db: Session, doctor: DoctorProfile, day: date) -> list[tuple[datetime, int]]:
    """Return currently unbooked slots as hospital-local aware datetimes."""
    local_zone = ZoneInfo(settings.hospital_timezone)
    schedules = db.scalars(
        select(DoctorSchedule).where(
            DoctorSchedule.doctor_id == doctor.id,
            DoctorSchedule.weekday == day.weekday(),
            DoctorSchedule.is_active.is_(True),
        )
    ).all()
    if not schedules:
        return []

    local_start = datetime.combine(day, min(item.start_time for item in schedules), tzinfo=local_zone)
    local_end = datetime.combine(day, max(item.end_time for item in schedules), tzinfo=local_zone)
    booked = set(
        db.scalars(
            select(Appointment.start_at).where(
                Appointment.doctor_id == doctor.id,
                Appointment.status != "cancelled",
                Appointment.start_at >= local_start.astimezone(timezone.utc),
                Appointment.start_at < local_end.astimezone(timezone.utc),
            )
        ).all()
    )
    booked_utc = {moment.astimezone(timezone.utc) for moment in booked}
    now_local = datetime.now(local_zone)
    found: dict[datetime, int] = {}

    for schedule in schedules:
        current = datetime.combine(day, schedule.start_time, tzinfo=local_zone)
        window_end = datetime.combine(day, schedule.end_time, tzinfo=local_zone)
        duration = timedelta(minutes=schedule.slot_minutes)
        if window_end <= current:
            continue
        while current + duration <= window_end:
            start_utc = current.astimezone(timezone.utc)
            if current > now_local and start_utc not in booked_utc:
                found[current] = schedule.slot_minutes
            current += duration

    return sorted(found.items(), key=lambda item: item[0])
