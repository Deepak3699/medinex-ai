# Medinex AI — System Architecture Document
**Project:** AI-Powered Smart Hospital Management System  
**Version:** 1.0.0 (Production / Final-Year Major Project)  

---

## 1. High-Level Architecture Overview

Medinex AI follows a **modular monolith** architectural pattern designed for high cohesion, transactional safety, and straightforward maintainability:

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Client Applications                     │
│  - Patient Portal (Mobile & Desktop)                            │
│  - Doctor Clinical Workspace                                    │
│  - Hospital Administrative Console                              │
└────────────────────────────────┬────────────────────────────────┘
                                 │ HTTPS / TLS
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FastAPI Backend Application                   │
│                                                                 │
│  [ Middleware Layer ]                                           │
│  - CORS Middleware (Whitelisted Origins)                        │
│  - JWT Bearer Authentication & Claims Parser                    │
│  - Request ID & Structured Logging                              │
│                                                                 │
│  [ API Router Layer (/api/v1) ]                                 │
│  - /auth (Register, Login, Me)                                  │
│  - /hospital (Doctors, Departments, Availability)               │
│  - /appointments (Mine, Book, Cancel)                           │
│  - /resources (Beds, Blood Inventory)                          │
│  - /admin (Staff, Wards, Beds, Blood Stock, Audit Logs)         │
│  - /notifications (Mine, Read, Read-All)                        │
│  - /assistant (Gemini-driven Grounded Chat)                     │
│                                                                 │
│  [ Core Domain Services Layer ]                                 │
│  - Availability Engine (Slot calculation & conflict checks)     │
│  - Blood Bank Manager (FIFO deduction & transaction ledger)     │
│  - Notification Dispatcher (In-app alerts)                      │
│  - Audit Logger (Security event ledger)                         │
│                                                                 │
│  [ AI Orchestration Layer ]                                     │
│  - Google GenAI Client (gemini-3.8-flash)                       │
│  - Function-Calling Tool Declarations & Dispatch                │
│  - Medical Safety Filter & Emergency Interceptor                │
│  - Two-Step Explicit Confirmation Engine                        │
└────────────────┬───────────────────────────────▲────────────────┘
                 │ SQLAlchemy 2.0 ORM            │
                 │ (Psycopg 3 Driver)            │
                 ▼                               │
┌────────────────────────────────────────────────┴────────────────┐
│               PostgreSQL Database (Neon Cloud / Local)          │
│  - ACID Transactions                                            │
│  - Row-Level Locking (`with_for_update`)                        │
│  - Partial Unique Indexes (Double-booking prevention)           │
│  - Foreign Key Cascades & Check Constraints                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Principles & Integrity Rules

1. **Zero Direct Database Access from Frontend:**  
   The frontend never communicates directly with PostgreSQL. All data queries and state modifications pass through validated FastAPI endpoints.

2. **Zero Database Credentials for Gemini AI:**  
   The Google Gemini LLM has no direct database connection, credentials, or permission to execute SQL. The backend provides strictly defined function signatures (tools) to the model. When the model invokes a tool, the backend validates parameters using Pydantic, executes verified database queries, and supplies only sanitized results back to the model.

3. **Atomic Transactions for Critical Resources:**  
   - **Appointments:** Slot booking queries unbooked slots, verifies doctor active status, and commits the booking in an isolated transaction. The database partial unique index acts as the ultimate lock against race conditions.
   - **Blood Inventory:** Fulfilling a blood request executes row-level locking (`with_for_update`) across tested, unexpired batches using FIFO ordering. Batches are decremented and audit transaction records (`blood_inventory_transactions`) are inserted within the same commit. If any step fails, the entire transaction rolls back.

4. **Two-Stage AI Booking with Human Confirmation:**  
   The conversational assistant can search doctors and suggest slots, but it is architecturally prohibited from finalizing an appointment booking without explicit patient confirmation in a distinct secondary turn.

5. **Role-Based Access Control (RBAC):**  
   Every protected route enforces token claims matching the user's role:
   - `patient`: Can access own profile, search hospital resources, book appointments, view own notifications.
   - `doctor`: Can view assigned appointments and schedules.
   - `admin`: Exclusive access to staff management, ward/bed provisioning, blood inventory adjustments, request approvals, and audit log history.

---

## 3. Technology Rationale

| Layer | Chosen Technology | Rationale & Trade-Offs |
| :--- | :--- | :--- |
| **Frontend** | React 19 + TypeScript + Vite | Static type safety, instant HMR, high responsiveness, and rich component ecosystem. |
| **Backend** | Python 3.13 + FastAPI | Asynchronous performance, automatic OpenAPI documentation, strict Pydantic v2 data validation, and native integration with AI SDKs. |
| **Database** | PostgreSQL + SQLAlchemy 2.0 | Proven transactional consistency (ACID), support for complex check constraints, partial unique indexes, and Neon serverless auto-scaling. |
| **AI Engine** | Google Gemini (`gemini-3.8-flash`) | Industry-leading multi-lingual fluency (English, Hindi, Hinglish), structured function-calling capabilities, and low-latency response generation. |
| **Security** | Argon2 + PyJWT | Argon2 is the OWASP-recommended password hashing algorithm resistant to GPU cracking; PyJWT provides stateless bearer token authentication. |
