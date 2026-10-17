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

The database models include users, patient and doctor profiles, departments, schedules, appointments, wards, beds, blood stock batches, blood stock transactions, and audit logs. Full clinical notes and longitudinal patient records are intentionally outside this first operational slice.

## Run the frontend

From the project root:

```powershell
npm install
npm run dev
```

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

The existing frontend still uses synthetic demo data and has not yet been connected to these API routes. The API needs a Neon connection string and Gemini key supplied locally before live database and AI requests can run. The role checks and data access in the backend are a project foundation, not a production deployment review.

The assistant sends each chat message to the configured Google Gemini API and does not persist chat history in this slice. Add an explicit privacy notice and consent flow before inviting users to enter real health information.
