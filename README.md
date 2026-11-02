# CityMind AI — AI-Powered Civic Grievance Redressal & Municipal Decision-Support Platform

[![Backend CI / Tests](https://img.shields.io/badge/Backend%20Tests-58%20Passing-brightgreen.svg)](#testing-and-validation)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14.2.24-000000.svg?logo=next.js)](https://nextjs.org)
[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.13-blue.svg?logo=python)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4.5-3178C6.svg?logo=typescript)](https://www.typescriptlang.org)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.4.2-F7931E.svg?logo=scikit-learn)](https://scikit-learn.org)

**CityMind AI** is an enterprise-grade civic grievance redressal and municipal decision-support system. It transforms unstructured citizen reports into structured, triaged, prioritized, and trackable municipal work orders using Machine Learning classification and deterministic risk analysis.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Problem Statement](#problem-statement)
3. [Project Objectives](#project-objectives)
4. [Key Features](#key-features)
5. [User Roles & Functional Capabilities](#user-roles--functional-capabilities)
6. [System Architecture](#system-architecture)
7. [Technology Stack](#technology-stack)
8. [Backend Implementation](#backend-implementation)
9. [Frontend Implementation](#frontend-implementation)
10. [AI/ML Implementation & Decision-Support Methodology](#aiml-implementation--decision-support-methodology)
11. [Dataset Details](#dataset-details)
12. [Priority & Urgency Scoring Logic](#priority--urgency-scoring-logic)
13. [Department Recommendation Logic](#department-recommendation-logic)
14. [Model Evaluation Results](#model-evaluation-results)
15. [Database Design & Schema](#database-design--schema)
16. [Complaint Lifecycle & Finite State Machine](#complaint-lifecycle--finite-state-machine)
17. [REST API Endpoints Specification](#rest-api-endpoints-specification)
18. [Project Directory Structure](#project-directory-structure)
19. [Installation & Setup](#installation--setup)
20. [Execution Instructions](#execution-instructions)
21. [Testing and Validation](#testing-and-validation)
22. [Application Screenshots](#application-screenshots)
23. [Implemented vs. Planned Features](#implemented-vs-planned-features)
24. [Future Enhancements](#future-enhancements)

---

## Project Overview

Municipal authorities receive large volumes of citizen complaints daily across web portals, phone lines, and physical helpdesks. Processing these complaints manually creates severe administrative bottlenecks:
- Reports are frequently misrouted to incorrect departmental queues.
- Critical emergencies (e.g., sparking electrical lines, open deep cave-ins, toxic sewage contamination) compete for attention alongside routine issues.
- Citizens lack transparent, real-time tracking of their grievance status.
- Municipal administrators lack aggregated operational metrics to monitor resolution velocity and optimize resource distribution.

**CityMind AI** addresses this challenge with an asynchronous **FastAPI** backend, a responsive **Next.js 14** web frontend, and a **Scikit-Learn Machine Learning pipeline** (`TF-IDF + Multinomial Logistic Regression`) that analyzes incoming citizen complaints upon submission. The platform automatically predicts grievance categories, calculates an objective hazard-weighted urgency score, assigns priority bands, recommends appropriate municipal departments, and tracks grievances across a transactional finite state machine.

---

## Problem Statement

Conventional civic grievance platforms face several operational challenges:
1. **Manual Triage Delays**: Municipal staff manually read, classify, and route reports, leading to dispatch delays.
2. **Subjective Prioritization**: Priority is often assigned based on citizen complaints rather than objective hazard risk, allowing urgent hazards to go unnoticed.
3. **Fragmented Department Workflows**: Lack of centralized coordination leads to duplicated field inspections and mismatched departmental handoffs.
4. **Opaque Resolution Lifecycle**: Citizens receive little visibility into the progress of their filed grievances.
5. **Lack of Operational Visibility**: Decision-makers lack real-time statistical overviews of department workloads and resolution performance.

---

## Project Objectives

- **Automate Civic Text Classification**: Classify natural language grievance descriptions into six canonical municipal domains (`ROADS`, `WATER`, `WASTE`, `ELECTRICITY`, `TRAFFIC`, `HEALTH`) with calibrated confidence scores.
- **Provide Explainable Decision Support**: Compute an objective, bounded urgency score $(0.05 \text{ to } 1.00)$ and priority band (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) using category base risks combined with hazard-keyword heuristics.
- **Ensure Fail-Safe Operation**: Decouple complaint persistence from AI inference; if the ML model is unavailable or encounters an error, complaints are safely stored with reference defaults without blocking citizens.
- **Enforce Transactional State Management**: Restrict complaint status transitions (`SUBMITTED` $\rightarrow$ `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` $\rightarrow$ `CLOSED` or `REJECTED`) with an immutable audit log and caller tracking.
- **Deliver Dedicated Role-Based Workspaces**: Provide distinct, secure interfaces for Citizens, Municipal Field Officers, and Municipal Administrators.

---

## Key Features

- **Public Tracking & Instant Filing**: Citizens can submit grievances with geotagged coordinates (latitude/longitude), structured category selection, and multiple image attachments. Public ticket tracking is available via unique `CM-YYYYMMDD-XXXX` identifiers without requiring authentication.
- **AI-Powered Analysis Engine**: Real-time evaluation of complaint title and description upon creation:
  - Categorization confidence estimation with low-confidence flagging ($< 0.45$).
  - Recommended department mapping.
  - Priority and urgency scoring based on critical/high hazard indicators.
- **Evidence Management**: Multi-file attachment support with binary magic-byte inspection (JPEG, PNG, WebP), path-traversal prevention, UUID storage, and size guardrails (max 5 MB per file, max 5 attachments per complaint).
- **Secure Authentication & RBAC**: Argon2id password hashing, stateless JWT Bearer token authentication (access + refresh tokens), and dependency-level role enforcement.
- **Administrative Oversight**: City-wide complaint filtering, dynamic officer reassignment, department-level distribution metrics, and officer resolution performance tracking.

---

## User Roles & Functional Capabilities

CityMind AI implements three canonical roles stored in the `roles` table:

```
+-----------------------------------------------------------------------------------+
|                                 CITYMIND AI ROLES                                 |
+--------------------------+----------------------------+---------------------------+
|      CITIZEN (Role ID: 1) |    OFFICER (Role ID: 2)    |     ADMIN (Role ID: 3)    |
+--------------------------+----------------------------+---------------------------+
| - Submit new grievances   | - View assigned complaints | - City-wide supervisor    |
| - Attach image evidence   | - View dept unassigned queue| - Assign complaints to    |
| - Track personal tickets  | - Transition work status   |   specific officers       |
| - Public ticket search    |   (ASSIGNED->IN_PROGRESS   | - Inspect all departments |
| - View own profile/history|    ->RESOLVED / REJECTED)  | - Real-time statistics    |
|                          | - Record work remarks      | - View officer roster     |
|                          | - View officer KPI stats   | - Override status workflows|
+--------------------------+----------------------------+---------------------------+
```

### 1. Citizen Role (`CITIZEN`)
- **Filing**: Submit complaints with title, description, category selection, latitude, longitude, and optional textual address.
- **Evidence Upload**: Upload up to 5 image attachments per complaint (JPEG, PNG, WebP).
- **History**: View paginated personal complaint submissions (`/api/v1/complaints/my`).
- **Isolation**: Cannot view other citizens' complaints, alter statuses, or assign officers.

### 2. Municipal Officer Role (`OFFICER`)
- **Department Queue**: Access complaints assigned directly to the officer's profile, or unassigned complaints belonging to their municipal department.
- **Workflow Execution**: Transition assigned complaints from `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` (or mark as `REJECTED`), appending progress remarks.
- **Personal Performance**: View aggregated metrics (`/api/v1/complaints/stats/officer`) displaying total assigned, active cases, resolved counts, and average resolution time in hours.
- **Jurisdiction Boundary**: Cannot view or modify complaints belonging to other municipal departments.

### 3. Municipal Administrator Role (`ADMIN`)
- **System-Wide Oversight**: Access all complaints across all municipal departments with multi-criteria filtering (status, category, department, officer, text query).
- **Dispatcher Assignment**: Manually assign or reassign officers to complaints (`PATCH /api/v1/complaints/{id}/assign`), triggering status transition to `ASSIGNED`.
- **Analytics Dashboard**: City-wide aggregates (`GET /api/v1/admin/stats`), including totals by status, per-department breakdown, per-category breakdown, and active officer count.
- **Department & Officer Management**: List available officers and active municipal departments.

---

## System Architecture

```
                                  +-----------------------------+
                                  |   Next.js 14 Web Portal     |
                                  |   (Tailwind CSS, TypeScript)|
                                  +--------------+--------------+
                                                 |
                                     HTTPS / REST JSON API
                                                 |
                                                 v
+--------------------------------------------------------------------------------------------------+
|                                    FastAPI Application Server                                    |
|                                                                                                  |
|  [ CORS & Security Headers ]      [ JWT Bearer / Argon2id RBAC ]      [ Pydantic v2 Validation ] |
|                                                                                                  |
|                                        API v1 ROUTERS                                            |
|     /auth                 /complaints                 /categories              /admin            |
|  - register/login      - submit, list, get         - list active categories  - stats overview    |
|  - refresh token       - status update, assign                               - officer roster    |
|  - me profile          - upload/view attachments                             - department list   |
|                                        |                                                         |
|                             COMPLAINT SERVICE LAYER                                              |
|                                        |                                                         |
|                   +--------------------+--------------------+                                    |
|                   |                                         |                                    |
|                   v                                         v                                    |
|      [ ML Inference Engine ]                     [ Storage Service ]                             |
|      - TF-IDF + Logistic Regression              - LocalStorageService                           |
|      - Probability calibration (< 0.45 check)    - Magic-byte validation                         |
|      - Category risk weighting (0.45 - 0.80)     - UUID sanitization                             |
|      - Hazard keyword heuristic (+0.15 / +0.30)  - Path traversal guard                          |
|      - Department routing mapping                           |                                    |
|                   |                                         v                                    |
|                   |                              backend/uploads/complaints/                     |
|                   v                                                                              |
|        SQLAlchemy 2.0 (Asyncpg / aiosqlite ORM)                                                  |
+-------------------+------------------------------------------------------------------------------+
                    |
                    v
    +-------------------------------+
    |       Database Engine         |
    |  PostgreSQL 15+ (Production)  |
    |  SQLite / aiosqlite (Dev)     |
    +-------------------------------+
```

---

## Technology Stack

### Backend & API Framework
- **FastAPI (0.111.0)**: Asynchronous REST API framework using Python 3.11/3.13 type annotations.
- **Uvicorn (0.29.0)**: Production ASGI web server.
- **Pydantic v2 (2.7.1)** & **Pydantic-Settings (2.2.1)**: Request/response validation and settings management.

### Database & ORM
- **SQLAlchemy 2.0 (2.0.30)**: Fully asynchronous ORM using `Mapped[...]` and `mapped_column[...]`.
- **Alembic (1.13.1)**: Database schema migration manager (`001_initial_phase1_schema`, `002_phase2_complaints`, `003_phase3_complaint_ai_analysis`).
- **Asyncpg (0.29.0)**: Asynchronous PostgreSQL client library.
- **Aiosqlite (0.20.0)**: Asynchronous SQLite driver for local development and testing.

### Machine Learning & Data Processing
- **Scikit-Learn (1.4.2)**: Text feature extraction, classification pipeline, and evaluation metrics.
- **Joblib (1.4.2)**: Model serialization and persistence.
- **NumPy (1.26.4)**: Numerical computing and probability array manipulation.

### Security & Cryptography
- **Passlib (1.7.4) + Argon2-Cffi (23.1.0)**: Memory-hard Argon2id password hashing.
- **Python-JOSE (3.3.0)**: Cryptographic JWT token generation and validation (HMAC-SHA256).
- **Python-Multipart (0.0.9)**: Streaming multipart form-data processor for file uploads.

### Frontend Client
- **Next.js (14.2.24)**: React web application framework (App Router architecture).
- **React (18.3.1)** & **React DOM (18.3.1)**: Component library.
- **TypeScript (5.4.5)**: Static typing synchronized with backend data models.
- **Tailwind CSS (3.4.3)**: Utility-first CSS styling.
- **Lucide React (0.378.0)**: Iconography.

---

## Backend Implementation

The backend follows a modular, layered architecture located in `backend/app/`:

- **Configuration (`app/core/config.py`)**: Environment-driven settings loaded via Pydantic `BaseSettings`, handling JWT secrets, database connection URLs, token expiration times, and CORS origins.
- **Security & Authorization (`app/core/security.py`, `app/core/dependencies.py`)**:
  - `verify_password()` and `get_password_hash()` implementing Argon2id hashing.
  - `create_access_token()` and `create_refresh_token()` using HMAC-SHA256.
  - `RoleChecker` dependency enforcing RBAC rules at endpoint boundaries.
- **Database Session & Models (`app/db/`, `app/models/`)**: Asynchronous engine and session factory (`app/db/session.py`) paired with declarative SQLAlchemy 2.0 models.
- **Business Logic Services (`app/services/`)**:
  - `AuthService`: User registration, credential authentication, refresh token rotation, and profile queries.
  - `ComplaintService`: Complaint creation, ticket number generation (`CM-YYYYMMDD-XXXX`), status transition enforcement, officer assignment, and officer metrics aggregation.
  - `StorageService` (`LocalStorageService`): File size enforcement (5 MB limit), magic-byte MIME type validation, UUID filename generation, and secure storage in `backend/uploads/complaints/<complaint_id>/`.
- **ML Gateway (`app/ml_engine/classifier.py`)**: Singleton inference manager loading `ml/artifacts/category_classifier.joblib`, evaluating probabilities, and computing priority/urgency.

---

## Frontend Implementation

The frontend is built with Next.js 14 App Router in `frontend/src/`:

- **Authentication Context (`src/context/auth-context.tsx`)**: Global React state maintaining user session, tokens, and active profile data with automatic local storage persistence.
- **API Client (`src/lib/api-client.ts`)**: HTTP client wrapper injecting Bearer authentication headers, managing token refresh handshakes, and standardizing error handling.
- **Pages & Routes (`src/app/`)**:
  - `/login`, `/register`: Authentication screens.
  - `/dashboard`: Route dispatcher redirecting users based on their active role.
  - `/complaints`: Citizen complaint overview.
  - `/complaints/new`: Complaint submission form with interactive fields for category, title, description, geographic coordinates, and file attachments.
  - `/complaints/[id]`: Detailed complaint tracking view displaying timeline history, assigned officer details, AI analysis badges, and uploaded images.
  - `/track`: Public lookup page for unauthenticated citizens to track status using ticket numbers.
  - `/officer/dashboard`, `/officer/complaints`, `/officer/performance`: Officer workspace for managing assigned tasks, updating workflow states, and viewing personal performance KPIs.
  - `/admin/dashboard`, `/admin/complaints`, `/admin/hotspots`: Administrative control center for monitoring city-wide metrics, assigning officers, and filtering reports.

---

## AI/ML Implementation & Decision-Support Methodology

CityMind AI combines Machine Learning with deterministic business rules:
1. **Text Classification (Machine Learning)**: A trained Scikit-Learn pipeline predicts the civic category from complaint text.
2. **Confidence Estimation (Machine Learning)**: Prediction probabilities are evaluated; predictions with top probability $< 0.45$ are flagged as low confidence (`is_low_confidence = True`).
3. **Department Recommendation (Rule-Based)**: Maps the predicted category directly to operational municipal departments.
4. **Urgency & Priority Scoring (Rule-Based)**: Computes an urgency score and assigns a priority band based on category baseline risk and detected hazard keywords.

```
                           Raw Citizen Text (Title + Description)
                                             |
                                             v
                           +-----------------------------------+
                           |        TfidfVectorizer            |
                           |  - lowercase, unicode stripping   |
                           |  - n-gram range: (1, 2)           |
                           |  - max_features: 5000             |
                           |  - sublinear_tf: True             |
                           +-----------------+-----------------+
                                             |
                                    Feature Vector (1x5000)
                                             |
                                             v
                           +-----------------------------------+
                           |     LogisticRegression            |
                           |  - C=1.0, max_iter=1000           |
                           |  - class_weight='balanced'        |
                           |  - multiclass (multinomial)       |
                           +-----------------+-----------------+
                                             |
                       +---------------------+---------------------+
                       |                                           |
                       v                                           v
             Predicted Category                           Prediction Probabilities
     (ROADS, WATER, WASTE, ELECTRICITY,                   (Softmax distribution)
              TRAFFIC, HEALTH)                                     |
                       |                                           v
                       |                             Confidence Score: max(P)
                       |                             Low Confidence Flag: P < 0.45
                       |                                           |
                       +---------------------+---------------------+
                                             |
                                             v
                           +-----------------------------------+
                           |    Deterministic Decision-Support |
                           |  - Category Risk Base: 0.45-0.80  |
                           |  - Critical Hazard Match: +0.30   |
                           |  - High Hazard Match: +0.15       |
                           |  - Formula: (Risk * Conf) + Hazard|
                           |  - Department Code Mapping        |
                           +-----------------+-----------------+
                                             |
                                             v
                         Comprehensive AI Analysis Output Stored
```

---

## Dataset Details

The ML model is trained on a dedicated development benchmark dataset located at `ml/data/municipal_complaints_dev.csv`.

> [!NOTE]
> The development dataset is synthetic and development-focused. It does not contain private citizen identities or actual municipal archives. Complaints have been generated with realistic linguistic patterns, technical civic jargon, colloquial phrasing, typos, and varying severity levels across six municipal domains.

### Dataset Schema
| Column Name | Data Type | Description | Example Value |
|---|---|---|---|
| `id` | `Integer` | Unique sequential identifier | `1` |
| `title` | `String` | Brief summary of the civic grievance | `"Deep pothole near market entrance"` |
| `description` | `String` | Detailed textual description of the problem | `"There is a crater in the middle of the road..."` |
| `category` | `String` | **Target Variable** (Ground truth domain) | `ROADS` |
| `urgency_hint` | `String` | Benchmark reference urgency level | `HIGH` |

### Target Variable Classes & Distribution
The dataset contains **270 balanced records** (45 samples per class) across 6 distinct categories:
1. `ROADS` (45 samples): Potholes, damaged bitumen, cracked sidewalks, sunken trenches, collapsed curbs.
2. `WATER` (45 samples): Pipeline bursts, tap water discoloration, zero water pressure, leaking mains.
3. `WASTE` (45 samples): Overflowing community bins, uncollected trash, illegal dumping, foul odor.
4. `ELECTRICITY` (45 samples): Streetlights out, flickering lamps, sparking transformers, dangling live wires.
5. `TRAFFIC` (45 samples): Defective signals, lights stuck on red, missing traffic dividers, intersection gridlock.
6. `HEALTH` (45 samples): Stagnant sewage in open gutters, mosquito breeding spots, unsanitary drains.

---

## Priority & Urgency Scoring Logic

The platform calculates an explainable, deterministic urgency score and assigns a priority band using the `calculate_urgency_and_priority()` function in `backend/app/ml_engine/classifier.py`.

### 1. Category Baseline Risk Weights ($W_{\text{cat}}$)
| Category | Base Risk Weight ($W_{\text{cat}}$) |
|---|---|
| `TRAFFIC` | `0.80` |
| `HEALTH` | `0.75` |
| `WATER` | `0.70` |
| `ROADS` | `0.70` |
| `WASTE` | `0.50` |
| `ELECTRICITY` | `0.45` |
| *Default / Unmapped* | `0.50` |

### 2. Hazard Indicators ($H$)
Text matching searches the combined title and description (case-insensitive) against predefined keyword lists:

- **Critical Hazard Indicators ($+0.30$)**:
  `"sparking"`, `"fire"`, `"live wire"`, `"snapped wire"`, `"burst"`, `"fatal"`, `"accident"`, `"emergency"`, `"exposed wire"`, `"drowning"`, `"flood"`, `"collapse"`, `"sinkhole"`, `"gas leak"`, `"poison"`, `"deadly"`, `"explosion"`, `"ambulance"`, `"head-on"`

- **High Hazard Indicators ($+0.15$)**:
  `"overflow"`, `"choked"`, `"stagnant"`, `"dengue"`, `"malaria"`, `"blackout"`, `"contamination"`, `"fumes"`, `"toxic"`, `"vomiting"`, `"illness"`, `"gridlock"`, `"deep pothole"`, `"crater"`, `"severe"`, `"hazardous"`

*Note: If both a critical and a high hazard keyword are detected, both boosts are added cumulatively ($+0.45$).*

### 3. Scoring Formula & Bounds
$$\text{Raw Score} = (W_{\text{cat}} \times C) + H$$
$$\text{Urgency Score} = \text{round}\Big(\min\big(1.0, \max(0.05, \text{Raw Score})\big), 3\Big)$$
where $C$ is the ML model prediction confidence probability $(0.0 \le C \le 1.0)$.

### 4. Priority Categorization Thresholds
| Urgency Score Range | Assigned Priority Band |
|---|---|
| $\text{Score} \ge 0.75$ | **`CRITICAL`** |
| $0.55 \le \text{Score} < 0.75$ | **`HIGH`** |
| $0.35 \le \text{Score} < 0.55$ | **`MEDIUM`** |
| $\text{Score} < 0.35$ | **`LOW`** |

---

## Department Recommendation Logic

Department recommendation operates through two layers:

1. **Intelligent AI Recommendation (`ComplaintAIAnalysis`)**:
   Upon complaint creation, `analyze_complaint_text()` maps the predicted category to a target municipal department code and name via `CATEGORY_DEPARTMENT_MAP`:
   - `ROADS` $\rightarrow$ Code: `ROADS`, Name: `Roads`
   - `WATER` $\rightarrow$ Code: `WATER`, Name: `Water`
   - `WASTE` $\rightarrow$ Code: `WASTE`, Name: `Waste Management`
   - `ELECTRICITY` $\rightarrow$ Code: `ELECTRICITY`, Name: `Electricity`
   - `TRAFFIC` $\rightarrow$ Code: `TRAFFIC`, Name: `Traffic`
   - `HEALTH` $\rightarrow$ Code: `HEALTH`, Name: `Health`
   The matching database ID is resolved dynamically from the `departments` table and saved into `complaint_ai_analyses.recommended_department_id`.

2. **Static Category Fallback (`ComplaintCategory.target_department_id`)**:
   As documented in `backend/app/models/category.py`, each category entity retains a static `target_department_id` foreign key. This serves strictly as a reference fallback when AI analysis is unavailable.

---

## Model Evaluation Results

The model was evaluated using a **stratified 80/20 train/test split** (random seed = 42) on the 270-sample development benchmark dataset. The evaluation metrics persisted in `ml/artifacts/metrics.json` are:

### Overall Test Split Performance (54 Test Samples)
- **Dataset Size**: 270 samples (Train: 216, Test: 54)
- **Accuracy**: **`77.78%`** (0.7778)
- **Macro Precision**: **`78.70%`** (0.7870)
- **Macro Recall**: **`77.78%`** (0.7778)
- **Macro F1-Score**: **`77.10%`** (0.7710)

### Per-Category Performance Breakdown
| Category | Precision | Recall | F1-Score | Test Support |
|---|---|---|---|---|
| `ROADS` | **1.000** | **1.000** | **1.000** | 9 |
| `WATER` | **0.889** | **0.889** | **0.889** | 9 |
| `HEALTH` | **0.800** | **0.444** | **0.571** | 9 |
| `TRAFFIC` | **0.700** | **0.778** | **0.737** | 9 |
| `ELECTRICITY` | **0.667** | **0.889** | **0.762** | 9 |
| `WASTE` | **0.667** | **0.667** | **0.667** | 9 |

### Confusion Matrix
Rows represent true ground truth classes; columns represent predicted classes:
Order: `[ELECTRICITY, HEALTH, ROADS, TRAFFIC, WASTE, WATER]`

```text
               Pred: ELEC  HLTH  ROAD  TRAF  WAST  WATR
True: ELEC             8     0     0     1     0     0
True: HLTH             0     4     0     1     3     1
True: ROAD             0     0     9     0     0     0
True: TRAF             2     0     0     7     0     0
True: WAST             1     1     0     1     6     0
True: WATR             1     0     0     0     0     8
```

---

## Database Design & Schema

The system uses 8 relational tables linked via foreign key constraints:

```
+------------------+         +--------------------+         +-------------------+
|      roles       |         |       users        |         |     officers      |
+------------------+         +--------------------+         +-------------------+
| id (PK, Int)     |<---+    | id (PK, UUID)      |<---+    | id (PK, UUID)     |
| name (VARCHAR)   |    +----| role_id (FK)       |    +----| user_id (FK, Uniq)|
| description      |         | email (VARCHAR)    |    +----| department_id (FK)|
+------------------+         | hashed_password    |    |    | badge_number (Idx)|
                             | full_name          |    |    | is_available(Bool)|
                             | is_active (Bool)   |    |    +-------------------+
                             +--------------------+    |              |
                                       |               |              |
                                       v               |              v
+------------------+         +--------------------+    |    +-------------------+
|   departments    |         |     complaints     |    |    |    complaint_     |
+------------------+         +--------------------+    |    |    attachments    |
| id (PK, Int)     |<---+    | id (PK, UUID)      |    |    +-------------------+
| name (VARCHAR)   |    |    | ticket_number (Idx)|    |    | id (PK, UUID)     |
| code (VARCHAR)   |    |    | citizen_id (FK)----+----+    | complaint_id (FK) |
| contact_email    |    |    | category_id (FK)---|----+    | uploaded_by (FK)  |
+------------------+    |    | assigned_officer(FK)-+  |    | original_filename |
         ^              |    | title, description | |  |    | stored_filename   |
         |              |    | latitude, longitude| |  |    | file_size, path   |
+------------------+    |    | status (VARCHAR)   | |  |    +-------------------+
|complaint_categori|    |    | created_at, etc.   | |  |
+------------------+    |    +--------------------+ |  |    +-------------------+
| id (PK, Int)     |    |        |           |      |  |    |  complaint_status |
| name, slug       |    |        |           +------+--+--->|     _history      |
| target_dept_id(FK)+---+        v                  |       +-------------------+
+------------------+     +-------------------+      |       | id (PK, Int)      |
                         |  complaint_ai_    |      |       | complaint_id (FK) |
                         |    analyses       |      |       | old_status, new_..|
                         +-------------------+      |       | changed_by (FK)   |
                         | id (PK, UUID)     |      |       | remarks (Text)    |
                         | complaint_id (FK) |<-----+       +-------------------+
                         | predicted_category|
                         | category_conf     |
                         | urgency_score     |
                         | predicted_priority|
                         +-------------------+
```

### Table Definitions & Primary Columns

1. **`roles`**: System roles (`1: CITIZEN`, `2: OFFICER`, `3: ADMIN`).
2. **`departments`**: Municipal departments (`ROADS`, `WATER`, `WASTE`, `ELECTRICITY`, `TRAFFIC`, `HEALTH`).
3. **`complaint_categories`**: Complaint categories (`roads`, `water-supply`, `waste-management`, `streetlights-power`, `traffic-signals`, `public-health-sewage`) with default SLAs and fallback `target_department_id`.
4. **`users`**: User records with Argon2id-hashed passwords, role association, contact info, and active flag.
5. **`officers`**: Links an officer `user_id` to their municipal `department_id`, unique `badge_number`, designation, and availability flag.
6. **`complaints`**: Core grievance record storing UUID, ticket number (`CM-YYYYMMDD-XXXX`), citizen reference, category reference, coordinates (`latitude`, `longitude`, `address`), workflow status, and timestamps (`created_at`, `updated_at`, `resolved_at`, `closed_at`).
7. **`complaint_status_history`**: Audit trail capturing transitions (`old_status`, `new_status`, `changed_by_user_id`, `remarks`, `created_at`).
8. **`complaint_attachments`**: Attachment records tracking original filename, sanitized disk filename, MIME type, size, and storage path.
9. **`complaint_ai_analyses`**: ML analysis output linked 1:1 with `complaint_id`, including `predicted_category`, `category_confidence`, `urgency_score`, `predicted_priority`, `recommended_department_code`, and `is_low_confidence`.

---

## Complaint Lifecycle & Finite State Machine

State transitions are governed by an explicit finite state machine defined in `backend/app/models/complaint.py` (`ALLOWED_STATUS_TRANSITIONS`):

```
                        +----------------------+
                        |      SUBMITTED       |
                        +----------+-----------+
                                   |
                     +-------------+-------------+
                     |                           |
                     v                           v
           +------------------+         +------------------+
           |     ASSIGNED     |         |     REJECTED     | (Terminal)
           +--------+---------+         +------------------+
                    |                            ^
                    +-------------+              |
                    |             +--------------+
                    v
           +------------------+
           |   IN_PROGRESS    |
           +--------+---------+
                    |
                    v
           +------------------+
           |     RESOLVED     |
           +--------+---------+
                    |
                    v
           +------------------+
           |      CLOSED      | (Terminal)
           +------------------+
```

### Transition Enforcement Rules
- **Initial State**: Always `SUBMITTED`.
- **Valid Transitions**:
  - `SUBMITTED` $\rightarrow$ `ASSIGNED` *(Officer assignment)*
  - `SUBMITTED` $\rightarrow$ `REJECTED` *(Invalid/duplicate report)*
  - `ASSIGNED` $\rightarrow$ `IN_PROGRESS` *(Work initiated)*
  - `ASSIGNED` $\rightarrow$ `REJECTED` *(Rejected upon field review)*
  - `IN_PROGRESS` $\rightarrow$ `RESOLVED` *(Remediation completed)*
  - `RESOLVED` $\rightarrow$ `CLOSED` *(Final administrative sign-off)*
- **Terminal States**: `CLOSED` and `REJECTED` cannot transition to any other status.
- **Illegal Transitions**: Any attempt to bypass steps (e.g., `SUBMITTED` $\rightarrow$ `RESOLVED`) is blocked with `400 Bad Request`.
- **Audit Logging**: Every transition automatically creates an immutable `ComplaintStatusHistory` record with the user ID, timestamp, and transition remarks.

---

## REST API Endpoints Specification

All endpoints are prefixed with `/api/v1`.

### 1. Health Check
| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Returns API status, environment, database connection health, and timestamp |

### 2. Authentication & User Profile
| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register new citizen account (defaults to `CITIZEN` role) |
| `POST` | `/auth/login` | Public | Authenticate with email/password; returns JWT access and refresh tokens |
| `POST` | `/auth/refresh` | Public | Issues a new access token using a valid refresh token |
| `GET` | `/auth/me` | Authenticated | Returns current authenticated user profile and role details |

### 3. Categories & Public Services
| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `GET` | `/categories` | Public / Auth | List all active complaint categories with default priorities and SLAs |

### 4. Complaints Management
| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `POST` | `/complaints` | `CITIZEN` | Submit a new grievance; generates ticket number and runs ML analysis |
| `GET` | `/complaints/my` | `CITIZEN` | Paginated personal complaint history (`page`, `page_size`) |
| `GET` | `/complaints` | `OFFICER`, `ADMIN` | Department queue for officers; city-wide queue for admins |
| `GET` | `/complaints/{id}` | Role Protected | Detailed view with timeline, status history, attachments, and AI analysis |
| `PATCH` | `/complaints/{id}/status` | `OFFICER`, `ADMIN` | Update workflow status conforming to the finite state machine |
| `PATCH` | `/complaints/{id}/assign` | `ADMIN` | Assign or reassign complaint to an officer (moves to `ASSIGNED`) |
| `POST` | `/complaints/{id}/attachments`| Role Protected | Upload image evidence (JPEG/PNG/WebP, max 5 MB, max 5 files) |
| `GET` | `/complaints/{id}/attachments/{aid}`| Role Protected | Download or display attachment file with MIME headers |
| `GET` | `/complaints/stats/officer` | `OFFICER` | Aggregated performance metrics for authenticated officer |

### 5. Administration & Dispatch
| Method | Endpoint | Access Role | Description |
|---|---|---|---|
| `GET` | `/admin/test` | `ADMIN` | Verifies administrative role authorization |
| `GET` | `/admin/stats` | `ADMIN` | City-wide metrics: counts by status, per department, and per category |
| `GET` | `/admin/officers` | `ADMIN` | List all registered officers with department and contact information |
| `GET` | `/admin/departments` | `ADMIN` | List all active municipal departments |

---

## Project Directory Structure

```text
CityMind AI/
├── docs/                                  # Architectural specifications & planning
│   ├── ARCHITECTURE.md                    # Core architectural specification
│   └── DEVELOPMENT_PLAN.md                # Phased development roadmap
│
├── backend/                               # FastAPI backend service
│   ├── alembic/                           # Database migration scripts
│   │   ├── versions/                      # Schema migration versions (001, 002, 003)
│   │   └── env.py                         # Alembic migration environment
│   ├── app/
│   │   ├── api/v1/                        # REST API routing
│   │   │   ├── endpoints/
│   │   │   │   ├── admin.py               # Admin stats, officer roster, department lists
│   │   │   │   ├── auth.py                # Citizen registration, login, token refresh
│   │   │   │   ├── categories.py          # Category listing endpoints
│   │   │   │   ├── complaints.py          # Complaint CRUD, lifecycle, attachments
│   │   │   │   └── health.py              # Health check and DB connectivity probe
│   │   │   └── router.py                  # Aggregated API v1 router
│   │   ├── core/                          # Security, JWT, configuration
│   │   │   ├── config.py                  # Pydantic BaseSettings & env parser
│   │   │   ├── dependencies.py            # RBAC RoleChecker & auth dependencies
│   │   │   ├── exceptions.py              # Centralized HTTPException classes
│   │   │   └── security.py                # Argon2id password hashing & JWT handlers
│   │   ├── db/                            # Database setup
│   │   │   ├── base.py                    # SQLAlchemy Base & TimestampMixin
│   │   │   ├── session.py                 # Async session engine & dependency
│   │   │   └── seed.py                    # Database seeder (roles, depts, users)
│   │   ├── ml_engine/                     # ML inference gateway
│   │   │   ├── __init__.py                # Module exports
│   │   │   └── classifier.py              # Singleton classifier & scoring logic
│   │   ├── models/                        # SQLAlchemy 2.0 ORM models
│   │   │   ├── category.py                # ComplaintCategory model
│   │   │   ├── complaint.py               # Complaint model & state machine
│   │   │   ├── complaint_ai_analysis.py   # ComplaintAIAnalysis model
│   │   │   ├── complaint_attachment.py    # ComplaintAttachment model
│   │   │   ├── complaint_status_history.py# ComplaintStatusHistory model
│   │   │   ├── department.py              # Department model
│   │   │   ├── officer.py                 # Officer profile model
│   │   │   ├── role.py                    # Role model (CITIZEN, OFFICER, ADMIN)
│   │   │   └── user.py                    # User account model
│   │   ├── schemas/                       # Pydantic v2 schemas
│   │   │   ├── admin.py                   # Admin stats & officer read schemas
│   │   │   ├── auth.py                    # Login, token & refresh schemas
│   │   │   ├── category.py                # Category response schemas
│   │   │   ├── complaint.py               # Complaint create, read & detail schemas
│   │   │   ├── department.py              # Department schemas
│   │   │   ├── role.py                    # Role schemas
│   │   │   └── user.py                    # User create & response schemas
│   │   ├── services/                      # Business logic layer
│   │   │   ├── auth_service.py            # User auth & token logic
│   │   │   ├── complaint_service.py       # Complaint workflows & state transitions
│   │   │   └── storage_service.py         # File validation & storage service
│   │   └── main.py                        # FastAPI application entrypoint & CORS setup
│   ├── tests/                             # Pytest automated test suite (58 tests)
│   │   ├── conftest.py                    # Test fixtures & in-memory async DB setup
│   │   ├── test_admin.py                  # Admin dashboard & stats tests
│   │   ├── test_ai_analysis.py            # ML engine & inference pipeline tests
│   │   ├── test_auth.py                   # Authentication & token tests
│   │   ├── test_complaint_lifecycle.py    # State machine transition tests
│   │   ├── test_complaint_service.py      # Core service logic tests
│   │   ├── test_complaints.py             # Complaint API route tests
│   │   └── test_rbac.py                   # Role-based access control tests
│   ├── uploads/                           # Local storage for complaint attachments
│   ├── alembic.ini                        # Alembic migration configuration
│   ├── requirements.txt                   # Backend Python dependencies
│   └── .env.example                       # Backend environment template
│
├── ml/                                    # Machine Learning module
│   ├── artifacts/                         # Serialized models & metrics
│   │   ├── category_classifier.joblib     # Serialized TF-IDF + LogReg pipeline
│   │   └── metrics.json                   # Genuine evaluation metrics report
│   ├── data/                              # Dataset repository
│   │   ├── municipal_complaints_dev.csv   # 270-sample synthetic benchmark dataset
│   │   └── README.md                      # Dataset documentation & class descriptions
│   ├── evaluate.py                        # Model evaluation & sample prediction script
│   ├── generate_dataset.py                # Synthetic dataset generation utility
│   └── train.py                           # Model training & metrics export pipeline
│
├── frontend/                              # Next.js 14 web application
│   ├── src/
│   │   ├── app/                           # App Router pages
│   │   │   ├── admin/                     # Admin portal (dashboard, complaints, hotspots)
│   │   │   ├── complaints/                # Citizen portal (list, new, detail view)
│   │   │   ├── dashboard/                 # Role-based landing router
│   │   │   ├── login/                     # Login page
│   │   │   ├── officer/                   # Officer portal (dashboard, queue, performance)
│   │   │   ├── register/                  # Citizen registration page
│   │   │   ├── track/                     # Public ticket lookup page
│   │   │   ├── layout.tsx                 # Root layout & providers
│   │   │   └── page.tsx                   # Landing page
│   │   ├── components/                    # Reusable UI & layout components
│   │   ├── context/                       # Global React Context (auth-context.tsx)
│   │   ├── hooks/                         # Custom hooks (use-auth.ts)
│   │   ├── lib/                           # Utilities & API client (api-client.ts)
│   │   └── types/                         # TypeScript definitions (auth.ts, complaint.ts)
│   ├── package.json                       # Frontend dependencies & npm scripts
│   ├── tailwind.config.js                 # Tailwind CSS configuration
│   └── tsconfig.json                      # TypeScript configuration
│
├── .gitignore                             # Git ignore rules
└── README.md                              # Project documentation
```

---

## Installation & Setup

### 1. Prerequisites
- **Python**: Version `3.11+` (Python `3.13` supported).
- **Node.js**: Version `18.18+` or `20+` with `npm`.
- **Database**: PostgreSQL (recommended for production) or SQLite (default for development/testing).

### 2. Backend Configuration
Navigate to `backend/` and copy the example environment file:
```bash
cd backend
cp .env.example .env
```

Ensure the following variables are configured in `backend/.env`:
```env
PROJECT_NAME="CityMind AI"
ENVIRONMENT="development"
DEBUG=True
API_V1_STR="/api/v1"

# Database connection: PostgreSQL or SQLite
DATABASE_URL="sqlite+aiosqlite:///./citymind_dev.db"

# JWT Secret: Generate a 32+ character random string
JWT_SECRET="replace-with-a-very-secure-random-secret-key-at-least-32-chars-long"
JWT_ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS Origins (Frontend URL)
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]
```

### 3. Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 4. Database Initialization & Migrations
Apply Alembic migrations to set up the database tables:
```bash
cd backend
python -m alembic upgrade head
```

### 5. Seed Initial Data
Seed municipal departments, default roles, initial complaint categories, and standard test accounts:
```bash
cd backend
python app/db/seed.py
```

**Default Test Accounts Created by Seeder:**
| Role | Email | Password | Assigned Department |
|---|---|---|---|
| **Admin** | `admin@citymind.gov` | `Admin@CityMind2026!` | *All Departments (City-Wide)* |
| **Officer** | `officer.roads@citymind.gov` | `Officer@Roads2026!` | Roads Department |
| **Citizen** | *(Self-register via UI or `/auth/register`)* | *(Configured at signup)* | *N/A* |

### 6. Frontend Configuration
Navigate to `frontend/` and install package dependencies:
```bash
cd frontend
npm install
```

Configure `frontend/.env.local` if custom backend URL is needed:
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
```

---

## Execution Instructions

### Running the Backend Service
Start the FastAPI backend with hot-reload enabled:
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```
- **API Base URL**: `http://127.0.0.1:8000`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/api/v1/docs`
- **ReDoc Documentation**: `http://127.0.0.1:8000/api/v1/redoc`
- **Health Check**: `http://127.0.0.1:8000/api/v1/health`

### Running the Frontend Service
Start the Next.js development server:
```bash
cd frontend
npm run dev
```
- **Web Portal URL**: `http://localhost:3000`

### Training and Evaluating the ML Pipeline
To retrain the classification model and update the serialized artifact and evaluation metrics:
```bash
# From the project root
python ml/train.py
```

To run standalone evaluation and test sample predictions:
```bash
python ml/evaluate.py
```

---

## Testing and Validation

The backend includes a **58-test automated Pytest suite** covering authentication, JWT expiration, RBAC restrictions, complaint creation, state machine transitions, attachment security, and ML decision-support.

To execute the test suite:
```bash
cd backend
python -m pytest -v
```

### Key Areas Tested
- **Authentication (`test_auth.py`)**: User registration, password hashing verification, login token delivery, refresh token rotation, and invalid credential rejections.
- **Role-Based Access Control (`test_rbac.py`)**: Verification that citizens cannot call officer/admin routes (`403 Forbidden`) and unauthenticated requests return `401 Unauthorized`.
- **Complaint Lifecycle (`test_complaint_lifecycle.py`)**: Validation of allowed state progressions (`SUBMITTED` $\rightarrow$ `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` $\rightarrow$ `CLOSED`) and rejection of illegal state bypasses.
- **Attachment Security (`test_complaints.py`)**: File type verification against magic bytes, rejection of executable or non-image payloads, and 5MB size limit checks.
- **ML Decision Support (`test_ai_analysis.py`)**: Prediction output, low-confidence handling, department recommendation mapping, and urgency score threshold calculations.

---

## Application Screenshots

> Interface preview placeholders for key portal interfaces.

```
+-----------------------------------------------------------------------------------+
|                        [ SCREENSHOT: CITIZEN PORTAL ]                             |
|  - Multi-step complaint submission with geolocation and attachment upload         |
|  - Personal complaint tracking dashboard with real-time status timeline           |
|  [ Interface: citizen-dashboard.png ]                                             |
+-----------------------------------------------------------------------------------+
|                        [ SCREENSHOT: OFFICER WORKSPACE ]                          |
|  - Departmental queue filtered by assigned complaints                             |
|  - Status workflow updater with audit remarks and field evidence inspection       |
|  [ Interface: officer-queue.png ]                                                 |
+-----------------------------------------------------------------------------------+
|                        [ SCREENSHOT: ADMIN DISPATCH DASHBOARD ]                   |
|  - City-wide metrics: total submissions, resolution velocity, department queues   |
|  - Officer assignment interface and geospatial grievance distribution             |
|  [ Interface: admin-dispatch.png ]                                                |
+-----------------------------------------------------------------------------------+
```

---

## Implemented vs. Planned Features

To ensure technical accuracy, the table below provides a clear distinction between currently implemented features and planned roadmap features:

| Feature / Capability | Implementation Status | Technical Implementation Details |
|---|---|---|
| **Citizen Registration & JWT Auth** | **Implemented** | Argon2id hashing, access/refresh tokens, role enforcement (`backend/app/core/security.py`) |
| **Grievance Lifecycle State Machine** | **Implemented** | Strict transitions (`SUBMITTED` $\rightarrow$ `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` $\rightarrow$ `CLOSED`, plus `REJECTED`) with audit history |
| **TF-IDF + Logistic Regression ML** | **Implemented** | Scikit-Learn pipeline (`ngram_range=(1,2)`, `max_features=5000`, `class_weight='balanced'`) in `backend/app/ml_engine/classifier.py` |
| **Urgency & Priority Scoring** | **Implemented** | Deterministic formula: $(W_{\text{cat}} \times C) + H$, bounded within $[0.05, 1.00]$ with hazard keywords |
| **Evidence Attachment Handling** | **Implemented** | Local storage with magic-byte validation, UUID filenames, 5MB limit, 5 files max |
| **Officer Assignment & Queue** | **Implemented** | Admin officer assignment and department queue filtering in `backend/app/services/complaint_service.py` |
| **Citizen / Officer / Admin Frontend** | **Implemented** | Next.js 14 App Router pages (`frontend/src/app/`) with TypeScript and Tailwind CSS |
| **Automated Geospatial Clustering (DBSCAN)** | **Planned (Phase 6)** | *Not yet implemented in backend.* Spatial views are currently visualized as mock coordinates; automated clustering on live coordinates is scheduled for Phase 6. |
| **Computer Vision Evidence Verification** | **Planned** | *Not yet implemented.* Deep learning model (ResNet/EfficientNet) to verify image content against selected category. |
| **Multilingual NLP Support** | **Planned** | *Not yet implemented.* Transformer-based multilingual embeddings (IndicBERT/multilingual RoBERTa) for non-English complaints. |
| **Cloud Object Storage (S3 / GCS)** | **Planned** | *Not yet implemented.* `BaseStorageService` abstraction is in place, but current storage defaults to local disk (`LocalStorageService`). |
| **Automated SMS / WhatsApp Notification** | **Planned** | *Not yet implemented.* Outbound messaging webhooks upon status transitions. |

---

## Future Enhancements

1. **Automated Geospatial Clustering (DBSCAN)**: Implement backend spatial clustering on complaint coordinates to aggregate nearby reports of the same category into a single dispatch work order.
2. **Computer Vision Evidence Validation**: Add pre-trained image classification models to detect whether uploaded photos match the claimed civic issue (e.g., verifying potholes or garbage heaps).
3. **Multilingual and Dialect NLP**: Integrate multilingual transformer models to process complaints submitted in regional and colloquial languages.
4. **Cloud Storage Provider Integration**: Implement AWS S3 or Google Cloud Storage adapters on top of `BaseStorageService`.
5. **Real-time Notifications**: Integrate WebSockets or Server-Sent Events (SSE) for live dashboard updates as complaint statuses change.
