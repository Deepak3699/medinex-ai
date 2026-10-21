"""Seed script to populate initial departments, doctors, schedules, wards, beds, and blood stock.

Usage:
    python -m app.scripts.seed_data
"""
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import (
    Bed,
    BloodInventoryItem,
    BloodInventoryTransaction,
    BloodRequest,
    Department,
    DoctorProfile,
    DoctorSchedule,
    PatientProfile,
    User,
    Ward,
)


def seed():
    if SessionLocal is None:
        print("DATABASE_URL is not configured.")
        return 1

    with SessionLocal() as db:
        # Check if already seeded
        dept_count = db.scalar(select(Department.id).limit(1))
        if dept_count is not None:
            print("Database already contains data. Skipping seed.")
            return 0

        print("Seeding hospital departments...")
        cardiology = Department(name="Cardiology", location="Building A, Floor 2")
        neurology = Department(name="Neurology", location="Building B, Floor 3")
        pediatrics = Department(name="Pediatrics", location="Building A, Floor 1")
        orthopedics = Department(name="Orthopedics", location="Building C, Floor 1")
        general_med = Department(name="General Medicine", location="Building A, Ground Floor")
        db.add_all([cardiology, neurology, pediatrics, orthopedics, general_med])
        db.flush()

        print("Seeding doctor accounts and schedules...")
        doctors_data = [
            {
                "email": "dr.ananya@medinex.ai",
                "name": "Dr. Ananya Rao",
                "specialization": "Cardiologist",
                "dept": cardiology,
                "fee": Decimal("800.00"),
            },
            {
                "email": "dr.rajesh@medinex.ai",
                "name": "Dr. Rajesh Sharma",
                "specialization": "Neurologist",
                "dept": neurology,
                "fee": Decimal("900.00"),
            },
            {
                "email": "dr.priya@medinex.ai",
                "name": "Dr. Priya Nair",
                "specialization": "Pediatrician",
                "dept": pediatrics,
                "fee": Decimal("600.00"),
            },
            {
                "email": "dr.vikram@medinex.ai",
                "name": "Dr. Vikram Sethi",
                "specialization": "Orthopedic Surgeon",
                "dept": orthopedics,
                "fee": Decimal("750.00"),
            },
            {
                "email": "dr.sunita@medinex.ai",
                "name": "Dr. Sunita Kapoor",
                "specialization": "General Physician",
                "dept": general_med,
                "fee": Decimal("500.00"),
            },
        ]

        created_doctors = []
        for doc in doctors_data:
            user = User(
                email=doc["email"],
                password_hash=hash_password("Doctor@Medinex2026"),
                role="doctor",
            )
            db.add(user)
            db.flush()

            profile = DoctorProfile(
                user_id=user.id,
                department_id=doc["dept"].id,
                full_name=doc["name"],
                specialization=doc["specialization"],
                consultation_fee=doc["fee"],
            )
            db.add(profile)
            db.flush()
            created_doctors.append(profile)

            # Weekly schedules: Mon (0) to Fri (4) from 09:00 to 17:00 (30 min slots)
            for day in range(5):
                schedule = DoctorSchedule(
                    doctor_id=profile.id,
                    weekday=day,
                    start_time=time(9, 0),
                    end_time=time(17, 0),
                    slot_minutes=30,
                )
                db.add(schedule)

        print("Seeding hospital wards and beds...")
        wards_data = [
            ("General Ward A", "General", 8),
            ("General Ward B", "General", 8),
            ("Intensive Care Unit (ICU)", "ICU", 4),
            ("Maternity Ward", "Maternity", 6),
            ("Pediatric Care Unit", "Pediatric", 6),
        ]

        for ward_name, ward_type, bed_count in wards_data:
            ward = Ward(name=ward_name, ward_type=ward_type)
            db.add(ward)
            db.flush()

            for i in range(1, bed_count + 1):
                # Distribute some available, occupied, and reserved
                status = "available" if i % 3 != 0 else ("occupied" if i % 2 == 0 else "cleaning")
                bed = Bed(
                    ward_id=ward.id,
                    bed_number=f"{ward_type[:3].upper()}-{100 + i}",
                    status=status,
                )
                db.add(bed)

        print("Seeding tested blood inventory batches...")
        today = date.today()
        blood_batches = [
            ("O+", "whole_blood", 24, today + timedelta(days=25)),
            ("O+", "red_cells", 18, today + timedelta(days=30)),
            ("O-", "whole_blood", 8, today + timedelta(days=20)),
            ("O-", "red_cells", 6, today + timedelta(days=15)),
            ("A+", "whole_blood", 20, today + timedelta(days=28)),
            ("A+", "platelets", 12, today + timedelta(days=5)),
            ("A-", "whole_blood", 5, today + timedelta(days=22)),
            ("B+", "whole_blood", 22, today + timedelta(days=35)),
            ("B+", "plasma", 15, today + timedelta(days=60)),
            ("B-", "whole_blood", 4, today + timedelta(days=18)),
            ("AB+", "whole_blood", 10, today + timedelta(days=26)),
            ("AB-", "whole_blood", 3, today + timedelta(days=14)),
        ]

        admin_user = db.scalar(select(User).where(User.role == "admin").limit(1))
        for bg, comp, units, expires in blood_batches:
            item = BloodInventoryItem(
                blood_group=bg,
                component=comp,
                units=units,
                expires_on=expires,
                tested=True,
                status="available",
            )
            db.add(item)
            db.flush()

            db.add(
                BloodInventoryTransaction(
                    inventory_item_id=item.id,
                    actor_id=admin_user.id if admin_user else None,
                    action="received",
                    units_delta=units,
                    note="Initial seed inventory stock",
                )
            )

        print("Seeding a demo patient account...")
        patient_user = User(
            email="patient.maya@medinex.ai",
            password_hash=hash_password("Patient@Medinex2026"),
            role="patient",
        )
        db.add(patient_user)
        db.flush()

        patient_profile = PatientProfile(
            user_id=patient_user.id,
            full_name="Maya Fernandes",
            phone="+91 9823012345",
        )
        db.add(patient_profile)
        db.flush()

        print("Seeding a pending blood request for admin review...")
        blood_req = BloodRequest(
            patient_id=patient_profile.id,
            requested_by_id=patient_user.id,
            blood_group="O+",
            component="red_cells",
            units=2,
            urgency="urgent",
            reason="Planned surgical procedure pre-op requirement",
            status="pending",
        )
        db.add(blood_req)

        db.commit()
        print("Hospital seed data successfully populated in Neon PostgreSQL!")
        return 0


if __name__ == "__main__":
    import sys
    sys.exit(seed())
