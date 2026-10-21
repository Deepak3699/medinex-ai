# Medinex AI

Medinex AI is a hospital operations platform with a conversational assistant at its center. The assistant is designed to answer from verified hospital data and use backend tools for doctor search, live appointment slots, bed availability, and tested, unexpired blood inventory. It does not get direct database access and cannot claim that it booked an appointment; booking is a separate authenticated backend action.

## Project architecture

- **Frontend:** Vite, React, TypeScript, React Router, Tailwind CSS, TanStack Query, React Hook Form, and Zod.
- **Backend:** Python and FastAPI as a modular monolith.
- **Database:** Neon hosted PostgreSQL, accessed by the backend through SQLAlchemy and Psycopg. Neon is the source of truth for hospital records.
- **AI:** Google Gemini through the server-side `google-genai` SDK. Its tools are read-only hospital queries; credentials stay on the server.
- **Schema changes:** Alembic migrations.
- **Authentication:** Argon2 password hashes, bearer tokens, and role checks.

The first backend slice includes patient registration, sign-in, role-aware appointment access and booking/cancellation, doctor/department search, availability queries, bed and blood summaries, admin data-entry endpoints, audit events, and an authenticated Gemini assistant. Patient registration only creates patient accounts; the initial admin is bootstrapped from local environment variables, and admin-created staff accounts receive their role from the server.

Patients and doctors share `/login`; successful sign-in opens the workspace for the account role. Hospital administrators enter through `/12admin`, which requires an administrator account. Patient registration is available at `/register`. The authenticated patient doctor directory, appointment availability and booking, appointment lists, and bed and blood availability use backend endpoints. Admin doctor, department, schedule, ward, bed, and blood-stock entry screens use the available admin endpoints. Public demo workspaces under `/demo/` continue to show synthetic sample data.

The database models include users, patient and doctor profiles, departments, schedules, appointments, wards, beds, blood stock batches, blood stock transactions, and audit logs. Full clinical notes and longitudinal patient records are intentionally outside this first operational slice.

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

After the Neon URL is configured, generate and apply the first schema migration, then create the initial admin account:

```powershell
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
py -m app.scripts.create_admin
```

Set `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` in `backend/.env` before creating the admin, then remove the bootstrap password after the account is made.

Run the API from the `backend` directory:

```powershell
uvicorn app.main:app --reload --port 8000
```

API docs are available at `http://127.0.0.1:8000/docs`; `/health` checks the process and `/ready` checks the Neon connection.

## Current limits

Live dashboards use current appointment, doctor, and aggregate bed/blood endpoints; historical charts and some operational screens remain previews. Patient directories for administrators, blood-request queues, audit-history reads, profile editing, and notification feeds need backend endpoints that are not in this slice. The live patient appointment and availability flows require the backend, Neon database, and configured hospital schedules and inventory. Live account creation and sign-in require Neon to be configured; live AI replies also require `GEMINI_API_KEY`. The role checks and data access in the backend are a project foundation, not a production deployment review.

The assistant sends each chat message to the configured Google Gemini API and does not persist chat history in this slice. Add an explicit privacy notice and consent flow before inviting users to enter real health information.
