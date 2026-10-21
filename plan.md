# Medinex AI — Project Plan

**Last updated:** 21 October 2026  
**Product goal:** A role-based hospital platform with a patient portal, doctor workspace, hospital administration tools, Neon PostgreSQL storage, and an AI assistant that answers from verified hospital data.

## Progress at a glance

- **Frontend:** Complete for the current product slice. Patient, doctor, and admin portals have separate access paths; patients and doctors use `/login`, while admins use `/12admin`.
- **Backend:** Core services and several operational workflows are implemented. The latest code is pushed, but the app has not yet been connected to a live Neon database.
- **AI:** Server-side Gemini chat and read-only hospital information tools are present. AI-led booking with a patient confirmation step is still future work.
- **Production readiness:** Not complete. Neon setup, end-to-end verification, formal tests, security hardening, and deployment remain.

## Phase 1 — Project foundation

**Status: Mostly complete; Neon setup remains.**

- React, TypeScript, Vite, FastAPI, SQLAlchemy, Alembic, authentication, and role checks are in the repository.
- GitHub repository and project documentation are in place.
- Neon connection configuration uses `DATABASE_URL`; a checked-in initial Alembic migration is available.
- **Remaining:** Configure the local backend environment, apply the migration to a fresh Neon database, create the first admin account, and confirm the API can reach Neon.

## Phase 2 — Role-based frontend

**Status: Complete for the current slice.**

- Patient portal, doctor workspace, and admin workspace are implemented.
- Patients and doctors share `/login`; the signed-in account determines the workspace. Admins enter through `/12admin`.
- Frontend includes dashboards, doctor discovery, appointment views, bed and blood availability, admin directories, request review, audit history, notifications, reports, profile views, and the AI chat screen.
- Demo routes use sample data; live portal screens call backend APIs where those integrations are implemented.

## Phase 3 — Core hospital backend and Neon persistence

**Status: Code implemented; live database verification remains.**

- Patient registration, sign-in, doctor and department data, schedules, appointment booking/cancellation, and bed/blood inventory APIs are present.
- Admin-only patient directory and audit history APIs are connected to their screens.
- Blood requests have persistent statuses. Fulfilling an approved request checks tested, unexpired matching stock and records inventory deductions and transactions together.
- Appointment and request changes create private in-app notifications. Patient, doctor, and admin portals can view notifications.
- **Remaining:** Apply the migration in Neon and verify these journeys against that database. Profile editing, broader appointment administration (rescheduling, completion and no-show), admissions, and historical trend reports are not implemented yet.

## Phase 4 — Gemini assistant and safe hospital tools

**Status: Base integration present; conversational actions remain.**

- The backend has an authenticated Gemini assistant. Its current hospital tools are read-only and use server-side credentials.
- The assistant must continue to use backend authorization and verified database results; it must never run arbitrary SQL or claim an action succeeded without backend confirmation.
- **Remaining:** Add AI-guided appointment search and booking with explicit patient confirmation, authorized appointment lookup/cancellation, robust missing-information and failure handling, and focused Hindi/Hinglish behavior review. Keep medical diagnosis and prescribing out of scope.

## Phase 5 — Advanced operational workflows

**Status: Partially implemented.**

- Blood request creation, review, fulfillment, status tracking, and in-app notifications are implemented.
- **Remaining:** Appointment reminders, waitlists, rescheduling, low-stock alerts, authenticated real-time updates (WebSocket/SSE or a documented polling fallback), and staff leave management.
- Donor registration and blood compatibility decisions require separate workflows and qualified staff review; inventory counts alone must not imply transfusion suitability.

## Phase 6 — Testing, privacy, and security hardening

**Status: Not complete.**

- The code has a foundation of password hashing, role-protected endpoints, server-side validation, inventory transactions, and audit events.
- **Remaining:** Add and run authentication and role-permission tests, concurrent booking and inventory tests, AI authorization/failure tests, and frontend accessibility/responsive checks. Review rate limits, secret handling, data minimization, retention, consent, logging, backups, and recovery.
- Do not use real patient data for development or demos. Assess applicable requirements before any real-hospital deployment.

## Phase 7 — Deployment and project presentation

**Status: Not started.**

- Local frontend and backend setup instructions are documented in `README.md`.
- **Remaining:** Container/deployment configuration, production environment variables and CORS, HTTPS, migration procedure, health checks, logging, backup/recovery plan, synthetic demo seed data, architecture and database diagrams, test report, and presentation materials.
- Do not describe the system as production-ready until deployment and security work has been reviewed.

## Phase 8 — Optional expansion after the operational MVP

**Status: Future scope.**

- Digital clinical records, prescriptions, lab results, discharge summaries, admissions, pharmacy/medicine inventory, hospital maps/navigation, queue management, and appointment no-show prediction.
- These features introduce additional clinical, privacy, operational, and validation requirements; they should follow the core workflows rather than block them.

## Immediate next steps

1. Add the Neon connection string and a generated secret to `backend/.env` locally. Keep credentials out of GitHub and chat.
2. Confirm the target Neon database is fresh. The current initial migration assumes there are no existing application tables.
3. From the `backend` directory, apply the migration and create the initial admin as described in `README.md`.
4. Start the API and verify `/ready`, then walk through registration, login, appointment booking/cancellation, admin request fulfillment, and notifications using synthetic data.
5. Address remaining core gaps, then continue AI action flows, formal tests/security review, and deployment.

## Repository milestones

- `f7b0e0f` — role-based frontend workspaces completed.
- `078ffc6` — admin workflows, notifications, backend APIs, and initial database migration added.

The latest code is pushed to `main`. The Neon migration has **not** been run, and the frontend/backend have **not** been verified end to end against a live Neon database.
