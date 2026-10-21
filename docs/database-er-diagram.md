# Medinex AI — Database Entity-Relationship (ER) Specification
**Database:** PostgreSQL 16+ (Hosted on Neon)  
**ORM:** SQLAlchemy 2.0  
**Migration Tool:** Alembic  

---

## 1. Entity-Relationship Diagram (Mermaid)

```mermaid
erDiagram
    users ||--o| patient_profiles : "has"
    users ||--o| doctor_profiles : "has"
    users ||--o{ notifications : "receives"
    users ||--o{ audit_logs : "triggers"
    users ||--o{ blood_requests : "requests/reviews"
    users ||--o{ blood_inventory_transactions : "performs"

    departments ||--o{ doctor_profiles : "employs"
    doctor_profiles ||--o{ doctor_schedules : "maintains"
    doctor_profiles ||--o{ appointments : "conducts"
    patient_profiles ||--o{ appointments : "attends"
    patient_profiles ||--o{ blood_requests : "subject_of"

    wards ||--o{ beds : "contains"
    blood_inventory_items ||--o{ blood_inventory_transactions : "logs"

    users {
        uuid id PK
        string email UK
        string password_hash
        string role
        boolean is_active
        timestamptz created_at
    }

    patient_profiles {
        uuid id PK
        uuid user_id FK,UK
        string full_name
        string phone
        timestamptz created_at
    }

    departments {
        uuid id PK
        string name UK
        string location
        boolean is_active
    }

    doctor_profiles {
        uuid id PK
        uuid user_id FK,UK
        uuid department_id FK
        string full_name
        string specialization
        numeric consultation_fee
        boolean is_active
    }

    doctor_schedules {
        uuid id PK
        uuid doctor_id FK
        int weekday
        time start_time
        time end_time
        int slot_minutes
        boolean is_active
    }

    appointments {
        uuid id PK
        uuid patient_id FK
        uuid doctor_id FK
        timestamptz start_at
        timestamptz end_at
        string status
        timestamptz created_at
    }

    wards {
        uuid id PK
        string name UK
        string ward_type
        boolean is_active
    }

    beds {
        uuid id PK
        uuid ward_id FK
        string bed_number
        string status
        timestamptz updated_at
    }

    blood_inventory_items {
        uuid id PK
        string blood_group
        string component
        int units
        date expires_on
        boolean tested
        string status
        timestamptz updated_at
    }

    blood_inventory_transactions {
        uuid id PK
        uuid inventory_item_id FK
        uuid actor_id FK
        string action
        int units_delta
        string note
        timestamptz created_at
    }

    blood_requests {
        uuid id PK
        uuid patient_id FK
        uuid requested_by_id FK
        uuid reviewed_by_id FK
        string blood_group
        string component
        int units
        string urgency
        string reason
        string status
        timestamptz reviewed_at
        timestamptz created_at
        timestamptz updated_at
    }

    notifications {
        uuid id PK
        uuid recipient_id FK
        string category
        string title
        string message
        string resource_type
        string resource_id
        boolean is_read
        timestamptz created_at
    }

    audit_logs {
        uuid id PK
        uuid actor_id FK
        string action
        string resource_type
        string resource_id
        timestamptz created_at
    }
```

---

## 2. Table Dictionaries & Constraint Details

### Table: `users`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | Unique account identifier. |
| `email` | VARCHAR(320) | UNIQUE, NOT NULL, INDEX | Login email address. |
| `password_hash` | VARCHAR(255) | NOT NULL | Argon2id secure hash. |
| `role` | VARCHAR(24) | NOT NULL, CHECK(`ck_users_role`) | Role in ('patient', 'doctor', 'admin', 'receptionist', 'nurse'). |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Account status. |
| `created_at` | TIMESTAMPTZ | NOT NULL | UTC creation timestamp. |

---

### Table: `appointments`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | Unique appointment ID. |
| `patient_id` | UUID | FK -> `patient_profiles.id`, NOT NULL | Target patient. |
| `doctor_id` | UUID | FK -> `doctor_profiles.id`, NOT NULL | Target doctor. |
| `start_at` | TIMESTAMPTZ | NOT NULL | UTC appointment start time. |
| `end_at` | TIMESTAMPTZ | NOT NULL | UTC appointment end time. |
| `status` | VARCHAR(24) | NOT NULL, CHECK(`ck_appointments_status`) | in ('pending', 'confirmed', 'completed', 'cancelled'). |
| `created_at` | TIMESTAMPTZ | NOT NULL | UTC booking timestamp. |

**Indexes & Concurrency Protection:**
- `uq_appointments_active_doctor_slot`: UNIQUE(`doctor_id`, `start_at`) WHERE `status <> 'cancelled'` — **Guarantees no two patients can book the same doctor slot concurrently.**

---

### Table: `blood_inventory_items`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | Unique batch identifier. |
| `blood_group` | VARCHAR(3) | NOT NULL, INDEX | A+, A-, B+, B-, AB+, AB-, O+, O-. |
| `component` | VARCHAR(24) | NOT NULL, CHECK(`ck_blood_component`) | in ('red_cells', 'platelets', 'plasma', 'whole_blood'). |
| `units` | INTEGER | NOT NULL, CHECK(`units >= 0`) | Available unit count (never negative). |
| `expires_on` | DATE | NOT NULL | Batch expiration date. |
| `tested` | BOOLEAN | NOT NULL, DEFAULT false | Whether testing has passed. |
| `status` | VARCHAR(24) | NOT NULL, CHECK(`ck_blood_status`) | in ('available', 'reserved', 'issued', 'expired', 'quarantined'). |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Last update timestamp. |
