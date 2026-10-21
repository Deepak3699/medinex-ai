# 🏥 Medinex AI — Project Startup & Evaluation Guide

> **AI-Powered Smart Hospital Management System**  
> Complete operational manual for running the project locally and demonstrating all workflows (Patient, Doctor, Administrator, and AI Voice Companion) to teachers and evaluators.

---

## ⚡ Quick Summary: Ports & Base URLs

| Component | Default URL | Purpose |
| :--- | :--- | :--- |
| **Frontend Web App** | `http://localhost:5173` *(or `5174`)* | Patient, Doctor & Admin Interface |
| **Backend API Server** | `http://127.0.0.1:8000` | FastAPI Python REST Backend |
| **Interactive API Docs** | `http://127.0.0.1:8000/docs` | Swagger / OpenAPI Interactive Testing |
| **Database** | Neon Serverless PostgreSQL | Cloud PostgreSQL (Configured in `backend/.env`) |

---

## 🔑 Login Paths & Seeded Credentials

### 1. Master Accounts Table

| Portal Role | Login URL Path | Email ID | Password | Access / Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Hospital Administrator** | [`/12admin`](http://localhost:5173/12admin) | `admin@medinex.ai` | `MedinexAdmin@2026!` | Full Hospital Operations, Doctor directory, Departments, Wards & Beds, Blood Bank & Audit Logs. |
| **Doctor (Cardiologist)** | [`/login`](http://localhost:5173/login) | `dr.ananya@medinex.ai` | `Doctor@Medinex2026` | Doctor workspace, Schedule, Patient queue, Consultation history. |
| **Doctor (Neurologist)** | [`/login`](http://localhost:5173/login) | `dr.rajesh@medinex.ai` | `Doctor@Medinex2026` | Neurology schedule, Consultations, Patient visits. |
| **Doctor (Pediatrician)** | [`/login`](http://localhost:5173/login) | `dr.priya@medinex.ai` | `Doctor@Medinex2026` | Pediatrics ward and clinic appointments. |
| **Doctor (Orthopedic)** | [`/login`](http://localhost:5173/login) | `dr.vikram@medinex.ai` | `Doctor@Medinex2026` | Bone & joint care schedule. |
| **Doctor (General Med)** | [`/login`](http://localhost:5173/login) | `dr.sunita@medinex.ai` | `Doctor@Medinex2026` | General OPD schedule and triage consultations. |
| **Registered Patient** | [`/login`](http://localhost:5173/login) | `patient.maya@medinex.ai` | `Patient@Medinex2026` | AI Voice Companion, 1-tap booking, Notifications, Health summary. |
| **New Patient Signup** | [`/register`](http://localhost:5173/register) | *(Any valid email)* | *(Min 10 characters)* | Self-service patient account registration. |

---

### 2. Instant Demo Paths *(Zero-Login Required for Fast Demos)*

If you want to immediately show pages to teachers without entering passwords:

- **Patient Workspace Demo:** [`http://localhost:5173/demo/patient/dashboard`](http://localhost:5173/demo/patient/dashboard)
- **AI Voice & Health Companion Demo:** [`http://localhost:5173/demo/patient/ai-assistant`](http://localhost:5173/demo/patient/ai-assistant)
- **Doctor Workspace Demo:** [`http://localhost:5173/demo/doctor/dashboard`](http://localhost:5173/demo/doctor/dashboard)
- **Hospital Admin Demo:** [`http://localhost:5173/demo/admin/dashboard`](http://localhost:5173/demo/admin/dashboard)

---

## 🚀 How to Run the Project (Step-by-Step)

### Prerequisites
- **Node.js** (v18 or higher)
- **Python** (v3.11 or higher)
- **Git**

---

### Step 1: Start the FastAPI Backend

Open a terminal (PowerShell or Bash) in the project directory:

```powershell
# 1. Navigate to the backend folder
cd backend

# 2. Activate the virtual environment
# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# On Windows (CMD):
.\.venv\Scripts\activate.bat
# On Linux / macOS:
source .venv/bin/activate

# 3. (Optional) If running for the very first time on a fresh system:
# pip install -r requirements.txt
# alembic upgrade head
# python -m app.scripts.seed_data

# 4. Start the backend with auto-reload
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

✅ **Verification:** Open `http://127.0.0.1:8000/docs` in your browser. You should see the interactive Swagger API documentation.

---

### Step 2: Start the React + Vite Frontend

Open a **second** terminal window in the project root:

```powershell
# In the project root directory:
npm run dev
```

The terminal will display the local URL:
```
  VITE v6.x.x  ready in 280 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```
*(If port 5173 is occupied, Vite will automatically select `http://localhost:5174/`).*

---

## 🎯 Teacher Evaluation & Presentation Flow

To give the most impactful demonstration to your examiners, follow this 4-step sequence:

### 1. Modern Healthcare Public Portal & Landing Page
- Open `http://localhost:5173/`
- Highlight the **Bento Grid** showcasing the 6 hospital pillars (AI Triage, Appointment Scheduling, Real-time Bed Management, Blood Bank Stock, Care Team Coordination, and HIPAA-ready Security).
- Show responsive layout and clean typography.

---

### 2. Patient AI Voice & Health Companion (`/patient/ai-assistant`)
- Sign in as `patient.maya@medinex.ai` / `Patient@Medinex2026` (or click *Open Voice Companion* from the hero banner on the patient dashboard).
- **Test 1: Voice Input / Multilingual Triage (Hinglish/Hindi/English)**
  - Click the **Mic** button (turns red while listening) and speak:
    > *"Mujhe 2 din se tez sir dard aur ulti jaisa lag raha hai"*
  - The AI Assistant triages the condition, suggests **Dr. Rajesh Sharma (Neurology)**, and outputs an **interactive Doctor Slot Card**.
- **Test 2: One-Tap Direct Slot Booking**
  - Click any available time slot (e.g. `09:30 AM`) directly inside the card.
  - Click **"Confirm & Book Slot"**.
  - Verified live booking code is created immediately (e.g. `APT-XXXXXXXX`) with audit logging!
- **Test 3: Live Hospital Capacity Query**
  - Click the quick chip **"Live Beds"** or type:
    > *"ICU me kitne bed khali hain?"*
  - The AI retrieves real-time ward data from the PostgreSQL database and renders a live bed meter card.
- **Test 4: Emergency Intercept Guardrail**
  - Click **"Chest Pain / Dil"** or type:
    > *"Bahut tez chest pain ho raha hai"*
  - Immediate emergency alert appears with 1-tap **Dial 108 / 112** red badges.

---

### 3. Doctor Workspace (`/doctor/dashboard`)
- Sign in as `dr.ananya@medinex.ai` / `Doctor@Medinex2026` via `http://localhost:5173/login`.
- Point out:
  - Doctor's daily schedule and today's consultation queue.
  - Patients seen metrics and hospital capacity ring chart.
  - Clean distinction between Patient and Clinician workspaces.

---

### 4. Administrator Command Center (`/12admin`)
- Navigate to `http://localhost:5173/12admin`.
- Sign in as `admin@medinex.ai` / `MedinexAdmin@2026!`.
- Demonstrate:
  - **Doctor & Department Management:** Add new doctors and configure weekly slot durations.
  - **Live Bed Tracking:** Ward-by-ward occupancy across General, ICU, Maternity, and Pediatrics.
  - **Blood Inventory Control:** Batch-wise unexpired units (O+, O-, A+, B+, AB+ whole blood, platelets, and plasma).
  - **Audit Logs:** Full immutable audit trail recording every booking, status transition, and administrative action.

---

## 🛠️ Key Technical Highlights for Viva / Project Questions

1. **How does Medinex AI handle Gemini API rate limits or offline scenarios?**
   - We engineered a **Dual-Mode Resilient Triage Engine** in `backend/app/api/routes/assistant.py`.
   - When Gemini is active, function calling queries live PostgreSQL data.
   - If an API key is missing or quota is exhausted, our local semantic classifier grounds answers directly in database doctors, beds, and blood inventory with zero downtime.

2. **How does the system prevent two patients from booking the same slot at the exact same second?**
   - We implemented a **PostgreSQL partial unique index** in `app/models.py`:
     ```sql
     CREATE UNIQUE INDEX uq_appointments_active_doctor_slot 
     ON appointments(doctor_id, start_at) 
     WHERE status <> 'cancelled';
     ```
   - Plus transaction-level `db.flush()` and `IntegrityError` handling with HTTP 409 conflict return.

3. **How does the voice feature work?**
   - Uses the browser's native **Web Speech API** (`SpeechRecognition` / `webkitSpeechRecognition` for voice input, and `speechSynthesis` for spoken output).
   - Works client-side without costly third-party speech token billing.

---

## 📞 Quick Reference Card (Print or Keep Handy)

```
┌────────────────────────────────────────────────────────────────────────┐
│                          MEDINEX AI QUICK LOGIN                        │
├───────────────┬──────────────────────────┬─────────────────────────────┤
│ Portal        │ Email                    │ Password                    │
├───────────────┼──────────────────────────┼─────────────────────────────┤
│ Admin (/12admin) admin@medinex.ai       │ MedinexAdmin@2026!          │
│ Doctor (/login)  dr.ananya@medinex.ai   │ Doctor@Medinex2026          │
│ Patient (/login) patient.maya@medinex.ai│ Patient@Medinex2026         │
└───────────────┴──────────────────────────┴─────────────────────────────┘
```
