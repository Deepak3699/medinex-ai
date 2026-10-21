# Medinex AI

> 🚀 **Quick Start & Evaluation Guide:** For direct step-by-step instructions, login URLs, and all seeded credentials (Admin, Doctor, Patient), please see [HOW_TO_RUN.md](file:///e:/PROJECTS/7th%20projects/Medinex%20Ai/medinex-ai/HOW_TO_RUN.md).

Medinex AI is a hospital operations platform with a conversational assistant at its center. The assistant is designed to answer from verified hospital data and use backend tools for doctor search, live appointment slots, bed availability, and tested, unexpired blood inventory. It does not get direct database access and cannot claim that it booked an appointment; booking is a separate authenticated backend action.

## Project architecture

- **Frontend:** Vite, React, TypeScript, React Router, Tailwind CSS, TanStack Query, React Hook Form, and Zod.
- **Backend:** Python and FastAPI as a modular monolith.
- **Database:** Neon hosted PostgreSQL, accessed by the backend through SQLAlchemy and Psycopg. Neon is the source of truth for hospital records.
- **AI:** Google Gemini through the server-side `google-genai` SDK. Its tools are read-only hospital queries; credentials stay on the server.
- **Schema changes:** Alembic migrations.
- **Authentication:** Argon2 password hashes, bearer tokens, and role checks.

The backend includes patient registration, sign-in, role-aware appointment access and booking/cancellation, doctor/department search, availability queries, admin data-entry endpoints, protected patient and audit directories, blood request review, appointment and request notifications, and an authenticated Gemini assistant. Patient registration only creates patient accounts; the initial admin is bootstrapped from local environment variables, and admin-created doctor accounts receive their role from the server.

Patients and doctors share `/login`; successful sign-in opens the workspace for the account role. Hospital administrators enter through `/12admin`, which requires an administrator account. Patient registration is available at `/register`. Appointment confirmations and cancellations create private notifications for the affected patient and doctor. Admin-only APIs expose patient directory details, blood request review, and audit history. Fulfilling an approved blood request deducts eligible tested, unexpired stock and records inventory transactions in the same database transaction. Public demo workspaces under `/demo/` continue to show synthetic sample data.

The database models include users, patient and doctor profiles, departments, schedules, appointments, wards, beds, blood stock batches, blood stock transactions, blood requests, notifications, and audit logs. Full clinical notes and longitudinal patient records are intentionally outside this operational slice.

## Run the frontend

From the project root:

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Set `VITE_API_BASE_URL` in `.env.local` if the backend API is running at a different address.

## Set up the backend and Neon

Use a Neon pooled PostgreSQL connection string for the app runtime. Keep the URL and Gemini key in `backend/.env`; never add them to `src/` or commit them.

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` with the Neon `DATABASE_URL` and a generated `SECRET_KEY`. Add `GEMINI_API_KEY` when you want the live assistant. The assistant is unavailable until that key is set.

For a fresh Neon database, apply the checked-in schema migration, then create the initial admin account:

```powershell
alembic upgrade head
py -m app.scripts.create_admin
```

The initial migration assumes an empty database. If tables were created manually or from an uncommitted local migration, back up the database and confirm its schema before applying this migration.

Set `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` in `backend/.env` before creating the admin, then remove the bootstrap password after the account is made.

Run the API from the `backend` directory:

```powershell
uvicorn app.main:app --reload --port 8000
```

API docs are available at `http://127.0.0.1:8000/docs`; `/health` checks the process and `/ready` checks the Neon connection.

## Current limits

Live dashboards use current appointment, doctor, and aggregate bed/blood endpoints. Historical trend reporting and profile editing still need additional endpoints. The live patient appointment and availability flows require the backend, Neon database, and configured hospital schedules and inventory. Live account creation and sign-in require Neon to be configured; live AI replies also require `GEMINI_API_KEY`. The role checks and data access in the backend are a project foundation, not a production deployment review.

The assistant sends each chat message to the configured Google Gemini API and does not persist chat history in this slice. Add an explicit privacy notice and consent flow before inviting users to enter real health information.
