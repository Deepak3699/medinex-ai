# Medinex AI — REST API Specification
**Version:** 1.0.0  
**Base URL:** `/api/v1`  
**Authentication:** Bearer JWT Token (`Authorization: Bearer <token>`)  

---

## 1. Authentication Endpoints

### `POST /auth/register/patient`
- **Description:** Registers a new patient account and automatically creates a linked `patient_profiles` row.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "StrongPassword123!",
    "full_name": "Rohan Sharma",
    "phone": "+91 9876543210"
  }
  ```
- **Responses:**
  - `201 Created`: Returns user record.
  - `409 Conflict`: Email already exists.

### `POST /auth/login`
- **Description:** OAuth2 form-compliant login returning an access token.
- **Content-Type:** `application/x-www-form-urlencoded`
- **Request Body:** `username=user@example.com&password=StrongPassword123!`
- **Responses:**
  - `200 OK`: `{"access_token": "...", "token_type": "bearer"}`
  - `401 Unauthorized`: Invalid credentials.

### `GET /auth/me`
- **Description:** Fetches currently authenticated user info and role.

---

## 2. Hospital Information & Availability Endpoints

### `GET /doctors`
- **Query Params:** `specialization` (optional), `department_id` (optional).
- **Responses:** `200 OK` List of active doctors with department and fee info.

### `GET /doctors/{id}/availability?day=YYYY-MM-DD`
- **Description:** Generates live 30-minute availability slots from doctor schedule, deducting existing booked appointments.
- **Responses:** `200 OK`
  ```json
  {
    "doctor_id": "uuid",
    "doctor_name": "Dr. Ananya Rao",
    "date": "2026-11-05",
    "slots": [
      { "start_at": "2026-11-05T09:00:00Z", "duration_minutes": 30 },
      { "start_at": "2026-11-05T09:30:00Z", "duration_minutes": 30 }
    ]
  }
  ```

### `GET /resources/beds`
- **Description:** Aggregates total, available, and occupied beds per ward.

### `GET /resources/blood`
- **Description:** Aggregates tested, available, unexpired blood units by group and component.

---

## 3. Appointment Endpoints

### `POST /appointments`
- **Role Required:** `patient`
- **Request Body:** `{"doctor_id": "uuid", "start_at": "2026-11-05T09:00:00Z"}`
- **Responses:**
  - `201 Created`: Confirmed appointment object with audit log and notification creation.
  - `409 Conflict`: Slot already taken or expired.

### `GET /appointments/mine`
- **Role Required:** `patient` or `doctor`
- **Responses:** `200 OK` List of appointments for current user.

### `POST /appointments/{id}/cancel`
- **Role Required:** `patient` (own), `doctor` (own), `admin`
- **Responses:**
  - `200 OK`: Cancelled appointment object with notifications sent to other party.
  - `403 Forbidden`: Unauthorized user.

---

## 4. Admin Workflows

### `POST /admin/departments` | `POST /admin/doctors` | `POST /admin/doctors/{id}/schedules`
- Provisioning departments, doctor accounts, and recurring weekly slot schedules.

### `POST /admin/wards` | `POST /admin/wards/{id}/beds` | `PATCH /admin/beds/{id}`
- Ward creation, bed creation, and live status adjustments (`available`, `occupied`, `cleaning`, `maintenance`).

### `POST /admin/blood-inventory` | `POST /admin/blood-inventory/{id}/adjust`
- Ingesting tested batches and performing auditable adjustments.

### `GET /admin/blood-requests` | `POST /admin/blood-requests` | `PATCH /admin/blood-requests/{id}`
- Reviewing, approving, and atomically fulfilling blood requests with FIFO batch deductions.

### `GET /admin/audit-logs`
- Immutable chronological log of all administrative actions.

---

## 5. Gemini AI Conversational Endpoint

### `POST /assistant/chat`
- **Role Required:** `patient`, `doctor`, or `admin`
- **Request Body:** `{"message": "Kya mujhe kal cardiologist se milne ka slot mil sakta hai?"}`
- **Responses:**
  - `200 OK`: `{"reply": "..."}`
  - `503 Service Unavailable`: If `GEMINI_API_KEY` is not configured.
