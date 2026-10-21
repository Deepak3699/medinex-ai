"""Initial Medinex schema with operational workflows.

Revision ID: 0001_initial
Revises:
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "departments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("location", sa.String(length=180), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index("ix_departments_name", "departments", ["name"], unique=False)

    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=24), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("role IN ('patient', 'doctor', 'admin', 'receptionist', 'nurse')", name="ck_users_role"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False)
    op.create_index("ix_users_role", "users", ["role"], unique=False)

    op.create_table(
        "patient_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )

    op.create_table(
        "doctor_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("department_id", sa.Uuid(), nullable=True),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column("specialization", sa.String(length=120), nullable=False),
        sa.Column("consultation_fee", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.ForeignKeyConstraint(["department_id"], ["departments.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_doctor_profiles_department_id", "doctor_profiles", ["department_id"], unique=False)
    op.create_index("ix_doctor_profiles_specialization", "doctor_profiles", ["specialization"], unique=False)

    op.create_table(
        "doctor_schedules",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("doctor_id", sa.Uuid(), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("slot_minutes", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.CheckConstraint("weekday >= 0 AND weekday <= 6", name="ck_schedule_weekday"),
        sa.CheckConstraint("slot_minutes > 0", name="ck_schedule_slot_minutes"),
        sa.ForeignKeyConstraint(["doctor_id"], ["doctor_profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_doctor_schedules_doctor_id", "doctor_schedules", ["doctor_id"], unique=False)

    op.create_table(
        "appointments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("patient_id", sa.Uuid(), nullable=False),
        sa.Column("doctor_id", sa.Uuid(), nullable=False),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("status IN ('pending', 'confirmed', 'completed', 'cancelled')", name="ck_appointments_status"),
        sa.ForeignKeyConstraint(["doctor_id"], ["doctor_profiles.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["patient_id"], ["patient_profiles.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "uq_appointments_active_doctor_slot",
        "appointments",
        ["doctor_id", "start_at"],
        unique=True,
        postgresql_where=sa.text("status <> 'cancelled'"),
    )
    op.create_index("ix_appointments_patient_start", "appointments", ["patient_id", "start_at"], unique=False)
    op.create_index("ix_appointments_status", "appointments", ["status"], unique=False)

    op.create_table(
        "wards",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("ward_type", sa.String(length=40), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index("ix_wards_ward_type", "wards", ["ward_type"], unique=False)

    op.create_table(
        "beds",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("ward_id", sa.Uuid(), nullable=False),
        sa.Column("bed_number", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("status IN ('available', 'reserved', 'occupied', 'cleaning', 'maintenance')", name="ck_beds_status"),
        sa.ForeignKeyConstraint(["ward_id"], ["wards.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ward_id", "bed_number", name="uq_beds_ward_number"),
    )
    op.create_index("ix_beds_ward_id", "beds", ["ward_id"], unique=False)
    op.create_index("ix_beds_status", "beds", ["status"], unique=False)

    op.create_table(
        "blood_inventory_items",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("blood_group", sa.String(length=3), nullable=False),
        sa.Column("component", sa.String(length=24), nullable=False),
        sa.Column("units", sa.Integer(), nullable=False),
        sa.Column("expires_on", sa.Date(), nullable=False),
        sa.Column("tested", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("component IN ('red_cells', 'platelets', 'plasma', 'whole_blood')", name="ck_blood_component"),
        sa.CheckConstraint("status IN ('available', 'reserved', 'issued', 'expired', 'quarantined')", name="ck_blood_status"),
        sa.CheckConstraint("units >= 0", name="ck_blood_units_nonnegative"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_blood_inventory_items_blood_group", "blood_inventory_items", ["blood_group"], unique=False)
    op.create_index("ix_blood_inventory_items_status", "blood_inventory_items", ["status"], unique=False)
    op.create_index(
        "ix_blood_inventory_lookup",
        "blood_inventory_items",
        ["blood_group", "component", "status", "expires_on"],
        unique=False,
    )

    op.create_table(
        "blood_inventory_transactions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("inventory_item_id", sa.Uuid(), nullable=False),
        sa.Column("actor_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(length=24), nullable=False),
        sa.Column("units_delta", sa.Integer(), nullable=False),
        sa.Column("note", sa.String(length=240), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("action IN ('received', 'issued', 'reserved', 'released', 'adjustment', 'expired', 'quarantined')", name="ck_blood_transaction_action"),
        sa.CheckConstraint("units_delta <> 0", name="ck_blood_transaction_delta_nonzero"),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["inventory_item_id"], ["blood_inventory_items.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_blood_inventory_transactions_inventory_item_id", "blood_inventory_transactions", ["inventory_item_id"], unique=False)
    op.create_index("ix_blood_transaction_item_time", "blood_inventory_transactions", ["inventory_item_id", "created_at"], unique=False)

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("actor_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("resource_type", sa.String(length=80), nullable=False),
        sa.Column("resource_id", sa.String(length=80), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_actor_time", "audit_logs", ["actor_id", "created_at"], unique=False)

    op.create_table(
        "blood_requests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("patient_id", sa.Uuid(), nullable=True),
        sa.Column("requested_by_id", sa.Uuid(), nullable=True),
        sa.Column("reviewed_by_id", sa.Uuid(), nullable=True),
        sa.Column("blood_group", sa.String(length=3), nullable=False),
        sa.Column("component", sa.String(length=24), nullable=False),
        sa.Column("units", sa.Integer(), nullable=False),
        sa.Column("urgency", sa.String(length=16), server_default="routine", nullable=False),
        sa.Column("reason", sa.String(length=500), nullable=True),
        sa.Column("status", sa.String(length=24), server_default="pending", nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("blood_group ~ '^(A|B|AB|O)[+-]$'", name="ck_blood_requests_group"),
        sa.CheckConstraint("component IN ('red_cells', 'platelets', 'plasma', 'whole_blood')", name="ck_blood_requests_component"),
        sa.CheckConstraint("units > 0", name="ck_blood_requests_units"),
        sa.CheckConstraint("urgency IN ('routine', 'urgent', 'emergency')", name="ck_blood_requests_urgency"),
        sa.CheckConstraint("status IN ('pending', 'approved', 'rejected', 'fulfilled')", name="ck_blood_requests_status"),
        sa.ForeignKeyConstraint(["patient_id"], ["patient_profiles.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["requested_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["reviewed_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_blood_requests_patient_id", "blood_requests", ["patient_id"], unique=False)
    op.create_index("ix_blood_requests_requested_by_id", "blood_requests", ["requested_by_id"], unique=False)
    op.create_index("ix_blood_requests_status_created", "blood_requests", ["status", "created_at"], unique=False)

    op.create_table(
        "notifications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("recipient_id", sa.Uuid(), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("message", sa.String(length=500), nullable=False),
        sa.Column("resource_type", sa.String(length=80), nullable=True),
        sa.Column("resource_id", sa.String(length=80), nullable=True),
        sa.Column("is_read", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["recipient_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notifications_recipient_id", "notifications", ["recipient_id"], unique=False)
    op.create_index("ix_notifications_recipient_created", "notifications", ["recipient_id", "created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_notifications_recipient_created", table_name="notifications")
    op.drop_index("ix_notifications_recipient_id", table_name="notifications")
    op.drop_table("notifications")
    op.drop_index("ix_blood_requests_status_created", table_name="blood_requests")
    op.drop_index("ix_blood_requests_requested_by_id", table_name="blood_requests")
    op.drop_index("ix_blood_requests_patient_id", table_name="blood_requests")
    op.drop_table("blood_requests")
    op.drop_index("ix_audit_actor_time", table_name="audit_logs")
    op.drop_table("audit_logs")
    op.drop_index("ix_blood_transaction_item_time", table_name="blood_inventory_transactions")
    op.drop_index("ix_blood_inventory_transactions_inventory_item_id", table_name="blood_inventory_transactions")
    op.drop_table("blood_inventory_transactions")
    op.drop_index("ix_blood_inventory_lookup", table_name="blood_inventory_items")
    op.drop_index("ix_blood_inventory_items_status", table_name="blood_inventory_items")
    op.drop_index("ix_blood_inventory_items_blood_group", table_name="blood_inventory_items")
    op.drop_table("blood_inventory_items")
    op.drop_index("ix_beds_status", table_name="beds")
    op.drop_index("ix_beds_ward_id", table_name="beds")
    op.drop_table("beds")
    op.drop_index("ix_wards_ward_type", table_name="wards")
    op.drop_table("wards")
    op.drop_index("ix_appointments_status", table_name="appointments")
    op.drop_index("ix_appointments_patient_start", table_name="appointments")
    op.drop_index("uq_appointments_active_doctor_slot", table_name="appointments")
    op.drop_table("appointments")
    op.drop_index("ix_doctor_schedules_doctor_id", table_name="doctor_schedules")
    op.drop_table("doctor_schedules")
    op.drop_index("ix_doctor_profiles_specialization", table_name="doctor_profiles")
    op.drop_index("ix_doctor_profiles_department_id", table_name="doctor_profiles")
    op.drop_table("doctor_profiles")
    op.drop_table("patient_profiles")
    op.drop_index("ix_users_role", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.drop_index("ix_departments_name", table_name="departments")
    op.drop_table("departments")
