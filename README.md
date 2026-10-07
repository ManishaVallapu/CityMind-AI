# CityMind AI — AI-Powered Urban Management & Decision-Support Platform

CityMind AI is an enterprise-grade, research-oriented civic grievance redressal and municipal decision-support system. It transforms unstructured citizen reports into structured, triaged, prioritized, and geographically clustered municipal work orders.

---

## Project Status

- **Phase 1: Environment Setup, Database Architecture & Core Authentication** — **COMPLETED**
- **Phase 2: Complete Complaint Management Backend** — **COMPLETED**
- **Phase 3: Machine Learning & Research Pipelines** — *Pending*
- **Phase 4: Backend ML Gateway Integration** — *Pending*
- **Phase 5: Frontend Portals & UI Implementation** — *Pending*
- **Phase 6: Spatial Analytics & Geospatial Hotspots** — *Pending*
- **Phase 7: Testing, Academic Evaluation & Research Artifacts** — *Pending*
- **Phase 8: Free-Tier Deployment & Hardening** — *Pending*

---

## Architecture & Documentation

- [**System Architecture (`docs/ARCHITECTURE.md`)**](docs/ARCHITECTURE.md): Comprehensive system architecture, ER diagrams, ML pipeline methodologies, API specifications, and free-tier hosting strategy.
- [**Master Development Plan (`docs/DEVELOPMENT_PLAN.md`)**](docs/DEVELOPMENT_PLAN.md): Step-by-step phased execution plan, evaluation metrics, and research milestones.

---

## Directory Structure

```text
CityMind AI/
├── docs/                        # Architecture & development roadmaps
│   ├── ARCHITECTURE.md
│   └── DEVELOPMENT_PLAN.md
├── backend/                     # Python 3.11+ / FastAPI / SQLAlchemy 2 / Alembic
│   ├── app/
│   │   ├── api/v1/endpoints/   # Auth, Health, Admin endpoints
│   │   ├── core/               # App configuration, Argon2id security, JWT RBAC
│   │   ├── db/                 # Async database session & seed script
│   │   ├── models/             # SQLAlchemy 2.0 ORM models (Role, User, Dept, Officer, Category)
│   │   ├── schemas/            # Pydantic v2 validation & response schemas
│   │   ├── services/           # Encapsulated AuthService business logic
│   │   └── ml_engine/          # ML inference adapters (Phase 4)
│   ├── alembic/                # Database migrations
│   ├── tests/                  # Pytest unit & integration test suite (22 tests)
│   ├── requirements.txt        # Backend dependencies
│   └── .env.example            # Environment variables template
├── ml/                          # Datasets, training pipelines & ONNX models (Phase 3)
└── frontend/                    # Next.js 14+ Civic Web Portal (Phase 5)
```

---

## Getting Started (Backend Development)

### 1. Prerequisites
- Python 3.11+ (Python 3.13 supported)
- PostgreSQL (or local SQLite for dev/testing)

### 2. Environment Configuration
Copy `.env.example` to `.env` in the `backend/` directory:
```bash
cd backend
cp .env.example .env
```
Ensure `JWT_SECRET` is set to a secure random string (minimum 32 characters).

### 3. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 4. Database Migrations
Apply the initial Phase 1 schema migration:
```bash
cd backend
python -m alembic upgrade head
```

### 5. Seed Initial Data
Seed municipal departments, canonical roles (`CITIZEN`, `OFFICER`, `ADMIN`), initial categories, and default test accounts:
```bash
cd backend
python app/db/seed.py
```
*Default Seeded Accounts:*
- **Admin**: `admin@citymind.gov` / `Admin@CityMind2026!`
- **Officer (Roads)**: `officer.roads@citymind.gov` / `Officer@Roads2026!`

### 6. Run Automated Test Suite
Execute the comprehensive automated test suite (58 tests covering Phase 1 auth/RBAC and Phase 2 complaint lifecycle, state transitions, attachments, security):
```bash
cd backend
python -m pytest -v
```

### 7. Run the Development Server
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```
- Interactive Swagger API Documentation: [http://127.0.0.1:8000/api/v1/docs](http://127.0.0.1:8000/api/v1/docs)
- Alternative ReDoc Documentation: [http://127.0.0.1:8000/api/v1/redoc](http://127.0.0.1:8000/api/v1/redoc)
- System Health Check: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)

---

## Phase 2: Complaint Management Architecture

### 1. Complaint Lifecycle & Canonical State Machine
The complaint lifecycle is governed by an explicit, transactional finite state machine:
- Initial state: `SUBMITTED`
- Valid transitions:
  - `SUBMITTED` $\rightarrow$ `ASSIGNED`
  - `SUBMITTED` $\rightarrow$ `REJECTED`
  - `ASSIGNED` $\rightarrow$ `IN_PROGRESS`
  - `ASSIGNED` $\rightarrow$ `REJECTED`
  - `IN_PROGRESS` $\rightarrow$ `RESOLVED`
  - `RESOLVED` $\rightarrow$ `CLOSED`
- Any illegal transition is rejected with `HTTP 400 Bad Request`.
- Status changes, timestamps (`resolved_at`, `closed_at`), and `ComplaintStatusHistory` entries are recorded atomically.

### 2. API Endpoints
| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/complaints` | `CITIZEN` | Submit a new grievance, generates `CM-YYYYMMDD-XXXX` ticket. |
| `GET` | `/api/v1/complaints/my` | `CITIZEN` | Paginated personal complaint archive (`?page=1&page_size=10`). |
| `GET` | `/api/v1/complaints` | `OFFICER`, `ADMIN` | Department queue for officers / city-wide queue for admins. |
| `GET` | `/api/v1/complaints/{id}` | Authenticated | Detailed complaint view with timeline history and attachments. |
| `PATCH` | `/api/v1/complaints/{id}/status` | `OFFICER`, `ADMIN` | Transition complaint workflow status with optional remarks. |
| `PATCH` | `/api/v1/complaints/{id}/assign` | `ADMIN` | Assign officer profile to complaint (`SUBMITTED` $\rightarrow$ `ASSIGNED`). |
| `POST` | `/api/v1/complaints/{id}/attachments` | Authenticated | Upload JPEG/PNG/WebP image evidence (max 5MB, up to 5 files). |

### 3. Attachment Handling & Storage Security
- **MIME & Signature Validation**: Accepts only JPEG (`image/jpeg`), PNG (`image/png`), and WebP (`image/webp`) files verified against binary magic bytes.
- **Payload Guard**: Strict 5MB size limit per file; maximum 5 attachments per complaint.
- **Path Traversal & Filename Sanitization**: Server generates random UUID filenames (`<uuid>.<ext>`) stored in isolated directories (`backend/uploads/complaints/<complaint_id>/`). Path traversal sequences (`..`, `/`, `\`) are strictly blocked.
- **Storage Abstraction**: Implements `BaseStorageService` enabling seamless swap from `LocalStorageService` to cloud object storage (S3/Cloudinary).

### 4. Role-Based Access Control (RBAC) Rules
- **Citizen**: Can create complaints, view only their own complaints and details, and upload image attachments to their own complaints. Cannot alter status or view other citizens' complaints.
- **Officer**: Can view complaints assigned to them or their assigned municipal department, upload attachments, and update authorized workflow states (`ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED`, or `REJECTED`). Cannot access other departments' complaints.
- **Admin**: Full municipal oversight — can inspect all complaints, assign/reassign officers, update workflow statuses, and access attachments city-wide.

