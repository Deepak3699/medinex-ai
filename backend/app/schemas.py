from datetime import date, datetime, time
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserRole(StrEnum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    ADMIN = "admin"
    RECEPTIONIST = "receptionist"
    NURSE = "nurse"


class PatientRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    full_name: str = Field(min_length=2, max_length=160)
    phone: str | None = Field(default=None, max_length=32)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    role: UserRole
    is_active: bool


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class DoctorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    specialization: str
    department_id: UUID | None
    consultation_fee: Decimal | None


class AppointmentCreate(BaseModel):
    doctor_id: UUID
    start_at: datetime

    @field_validator("start_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("start_at must include a timezone offset")
        return value


class AppointmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    doctor_id: UUID
    patient_id: UUID
    start_at: datetime
    end_at: datetime
    status: str


class AssistantChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class AssistantChatResponse(BaseModel):
    reply: str
    action: dict[str, object] | None = None


class DepartmentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    location: str | None = Field(default=None, max_length=180)


class DoctorCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    full_name: str = Field(min_length=2, max_length=160)
    specialization: str = Field(min_length=2, max_length=120)
    department_id: UUID | None = None
    consultation_fee: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)


class DoctorScheduleCreate(BaseModel):
    weekday: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    slot_minutes: int = Field(default=30, ge=5, le=240)


class WardCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    ward_type: str = Field(min_length=2, max_length=40)


class BedCreate(BaseModel):
    bed_number: str = Field(min_length=1, max_length=32)
    status: str = Field(default="available", pattern=r"^(available|reserved|occupied|cleaning|maintenance)$")


class BedStatusUpdate(BaseModel):
    status: str = Field(pattern=r"^(available|reserved|occupied|cleaning|maintenance)$")


class BloodInventoryCreate(BaseModel):
    blood_group: str = Field(pattern=r"^(A|B|AB|O)[+-]$", examples=["O-"])
    component: str = Field(pattern=r"^(red_cells|platelets|plasma|whole_blood)$")
    units: int = Field(gt=0, le=10000)
    expires_on: date
    tested: bool


class BloodInventoryAdjustment(BaseModel):
    units_delta: int = Field(ge=-10000, le=10000)
    action: str = Field(pattern=r"^(issued|reserved|released|adjustment|expired|quarantined)$")
    note: str | None = Field(default=None, max_length=240)

    @field_validator("units_delta")
    @classmethod
    def delta_must_not_be_zero(cls, value: int) -> int:
        if value == 0:
            raise ValueError("units_delta cannot be zero")
        return value


class PatientDirectoryItem(BaseModel):
    id: UUID
    full_name: str
    email: EmailStr
    phone: str | None
    created_at: datetime
    appointment_count: int
    latest_appointment_at: datetime | None


class BloodRequestCreate(BaseModel):
    patient_id: UUID | None = None
    blood_group: str = Field(pattern=r"^(A|B|AB|O)[+-]$")
    component: str = Field(pattern=r"^(red_cells|platelets|plasma|whole_blood)$")
    units: int = Field(gt=0, le=10000)
    urgency: str = Field(default="routine", pattern=r"^(routine|urgent|emergency)$")
    reason: str | None = Field(default=None, max_length=500)


class BloodRequestStatusUpdate(BaseModel):
    status: str = Field(pattern=r"^(approved|rejected|fulfilled)$")


class BloodRequestItem(BaseModel):
    id: UUID
    patient_id: UUID | None
    patient_name: str | None
    requested_by_id: UUID | None
    requester_email: EmailStr | None
    blood_group: str
    component: str
    units: int
    urgency: str
    reason: str | None
    status: str
    created_at: datetime
    updated_at: datetime


class AuditLogItem(BaseModel):
    id: UUID
    actor_email: EmailStr | None
    actor_role: UserRole | None
    action: str
    resource_type: str
    resource_id: str | None
    created_at: datetime


class NotificationItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    category: str
    title: str
    message: str
    resource_type: str | None
    resource_id: str | None
    is_read: bool
    created_at: datetime
