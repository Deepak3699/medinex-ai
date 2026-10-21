from datetime import date, datetime, time, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Time,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role IN ('patient', 'doctor', 'admin', 'receptionist', 'nurse')",
            name="ck_users_role",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(24), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    patient_profile: Mapped["PatientProfile | None"] = relationship(back_populates="user", uselist=False)
    doctor_profile: Mapped["DoctorProfile | None"] = relationship(back_populates="user", uselist=False)


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    full_name: Mapped[str] = mapped_column(String(160))
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    user: Mapped[User] = relationship(back_populates="patient_profile")
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="patient")


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    location: Mapped[str | None] = mapped_column(String(180), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))

    doctors: Mapped[list["DoctorProfile"]] = relationship(back_populates="department")


class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    department_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    full_name: Mapped[str] = mapped_column(String(160))
    specialization: Mapped[str] = mapped_column(String(120), index=True)
    consultation_fee: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))

    user: Mapped[User] = relationship(back_populates="doctor_profile")
    department: Mapped["Department | None"] = relationship(back_populates="doctors")
    schedules: Mapped[list["DoctorSchedule"]] = relationship(
        back_populates="doctor", cascade="all, delete-orphan"
    )
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="doctor")


class DoctorSchedule(Base):
    __tablename__ = "doctor_schedules"
    __table_args__ = (
        CheckConstraint("weekday >= 0 AND weekday <= 6", name="ck_schedule_weekday"),
        CheckConstraint("slot_minutes > 0", name="ck_schedule_slot_minutes"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    doctor_id: Mapped[UUID] = mapped_column(ForeignKey("doctor_profiles.id", ondelete="CASCADE"), index=True)
    weekday: Mapped[int] = mapped_column(Integer)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    slot_minutes: Mapped[int] = mapped_column(Integer, default=30)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))

    doctor: Mapped[DoctorProfile] = relationship(back_populates="schedules")


class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'confirmed', 'completed', 'cancelled')",
            name="ck_appointments_status",
        ),
        # Database uniqueness is the final guard against concurrent booking collisions.
        Index(
            "uq_appointments_active_doctor_slot",
            "doctor_id",
            "start_at",
            unique=True,
            postgresql_where=text("status <> 'cancelled'"),
        ),
        Index("ix_appointments_patient_start", "patient_id", "start_at"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    patient_id: Mapped[UUID] = mapped_column(ForeignKey("patient_profiles.id", ondelete="RESTRICT"))
    doctor_id: Mapped[UUID] = mapped_column(ForeignKey("doctor_profiles.id", ondelete="RESTRICT"))
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(24), default="confirmed", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    patient: Mapped[PatientProfile] = relationship(back_populates="appointments")
    doctor: Mapped[DoctorProfile] = relationship(back_populates="appointments")


class Ward(Base):
    __tablename__ = "wards"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    ward_type: Mapped[str] = mapped_column(String(40), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
    beds: Mapped[list["Bed"]] = relationship(back_populates="ward", cascade="all, delete-orphan")


class Bed(Base):
    __tablename__ = "beds"
    __table_args__ = (
        UniqueConstraint("ward_id", "bed_number", name="uq_beds_ward_number"),
        CheckConstraint(
            "status IN ('available', 'reserved', 'occupied', 'cleaning', 'maintenance')",
            name="ck_beds_status",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    ward_id: Mapped[UUID] = mapped_column(ForeignKey("wards.id", ondelete="CASCADE"), index=True)
    bed_number: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(24), default="available", index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    ward: Mapped[Ward] = relationship(back_populates="beds")


class BloodInventoryItem(Base):
    __tablename__ = "blood_inventory_items"
    __table_args__ = (
        CheckConstraint(
            "component IN ('red_cells', 'platelets', 'plasma', 'whole_blood')",
            name="ck_blood_component",
        ),
        CheckConstraint(
            "status IN ('available', 'reserved', 'issued', 'expired', 'quarantined')",
            name="ck_blood_status",
        ),
        CheckConstraint("units >= 0", name="ck_blood_units_nonnegative"),
        Index("ix_blood_inventory_lookup", "blood_group", "component", "status", "expires_on"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    blood_group: Mapped[str] = mapped_column(String(3), index=True)
    component: Mapped[str] = mapped_column(String(24))
    units: Mapped[int] = mapped_column(Integer)
    expires_on: Mapped[date] = mapped_column(Date)
    tested: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    status: Mapped[str] = mapped_column(String(24), default="available", index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class BloodInventoryTransaction(Base):
    __tablename__ = "blood_inventory_transactions"
    __table_args__ = (
        CheckConstraint(
            "action IN ('received', 'issued', 'reserved', 'released', 'adjustment', 'expired', 'quarantined')",
            name="ck_blood_transaction_action",
        ),
        CheckConstraint("units_delta <> 0", name="ck_blood_transaction_delta_nonzero"),
        Index("ix_blood_transaction_item_time", "inventory_item_id", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    inventory_item_id: Mapped[UUID] = mapped_column(
        ForeignKey("blood_inventory_items.id", ondelete="RESTRICT"), index=True
    )
    actor_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(24))
    units_delta: Mapped[int] = mapped_column(Integer)
    note: Mapped[str | None] = mapped_column(String(240), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (Index("ix_audit_actor_time", "actor_id", "created_at"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    actor_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(100))
    resource_type: Mapped[str] = mapped_column(String(80))
    resource_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class BloodRequest(Base):
    __tablename__ = "blood_requests"
    __table_args__ = (
        CheckConstraint("blood_group ~ '^(A|B|AB|O)[+-]$'", name="ck_blood_requests_group"),
        CheckConstraint(
            "component IN ('red_cells', 'platelets', 'plasma', 'whole_blood')",
            name="ck_blood_requests_component",
        ),
        CheckConstraint("units > 0", name="ck_blood_requests_units"),
        CheckConstraint("urgency IN ('routine', 'urgent', 'emergency')", name="ck_blood_requests_urgency"),
        CheckConstraint(
            "status IN ('pending', 'approved', 'rejected', 'fulfilled')",
            name="ck_blood_requests_status",
        ),
        Index("ix_blood_requests_status_created", "status", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    patient_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("patient_profiles.id", ondelete="SET NULL"), nullable=True, index=True
    )
    requested_by_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    reviewed_by_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    blood_group: Mapped[str] = mapped_column(String(3))
    component: Mapped[str] = mapped_column(String(24))
    units: Mapped[int] = mapped_column(Integer)
    urgency: Mapped[str] = mapped_column(String(16), default="routine", server_default="routine")
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="pending", server_default="pending")
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (Index("ix_notifications_recipient_created", "recipient_id", "created_at"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    recipient_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    category: Mapped[str] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(String(160))
    message: Mapped[str] = mapped_column(String(500))
    resource_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    resource_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
