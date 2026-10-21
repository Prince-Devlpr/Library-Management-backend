# Library Management System (LMS) - Backend

A modular, production-quality REST API backend for a comprehensive **Library Management System (LMS)** built with **Node.js**, **TypeScript**, **Express**, **PostgreSQL**, and **Prisma ORM**.

The backend serves three distinct user roles:
1. **USER / PATRON** (e.g. patrons using mobile applications)
2. **LIBRARIAN** (e.g. staff using desktop web portals for circulation)
3. **ADMINISTRATOR** (e.g. managers managing users, policies, reports, and system settings)

---

## Table of Contents

- [1. Architecture](#1-architecture)
- [2. Technology Stack](#2-technology-stack)
- [3. Folder Structure](#3-folder-structure)
- [4. Prerequisites](#4-prerequisites)
- [5. Environment Configuration](#5-environment-configuration)
- [6. Database Setup & Migrations](#6-database-setup--migrations)
- [7. Seeding & Development Credentials](#7-seeding--development-credentials)
- [8. Running the Application](#8-running-the-application)
- [9. Testing & Quality Checks](#9-testing--quality-checks)
- [10. API Documentation (Swagger / OpenAPI)](#10-api-documentation-swagger--openapi)
- [11. Role-Based Access Control (RBAC)](#11-role-based-access-control-rbac)
- [12. Business Rules & Concurrency](#12-business-rules--concurrency)
- [13. Database Backup & 30-Day Retention](#13-database-backup--30-day-retention)
- [14. Docker Support](#14-docker-support)
- [15. Troubleshooting](#15-troubleshooting)
- [16. Future Client Integration](#16-future-client-integration)

---

## 1. Architecture

The system follows a strict **Client-Server REST Architecture** structured into decoupled, single-responsibility layers:

```
Clients (Mobile App / Web Frontends)
                │ HTTPS / REST (JSON)
                ▼
      Express REST API (/api/v1)
                │ Middleware (Auth, RBAC, Zod Validation, Request ID, Rate Limiting)
                ▼
           Controllers (HTTP Request/Response translation)
                │
                ▼
      Services / Business Logic Layer (Validation, Transactions, Policy Engine)
                │
                ▼
         Data Access Layer (Prisma ORM)
                │ Parameterized Queries & Connection Pooling
                ▼
         PostgreSQL Database
```

### Key Architectural Characteristics
- **Presentation Layer**: Thin controllers parsing typed inputs and formatting standardized responses.
- **Business Logic Layer**: Centralized services encapsulating domain invariants, fine calculations, policy checks, and database transactions.
- **Data Access Layer**: Prisma ORM with strongly typed schema, explicit foreign key constraints, unique constraints, and optimized indexes.
- **Security & Integrity**: Argon2 password hashing, short-lived JWT access tokens with server-side session tracking and 15-minute inactivity termination, append-only audit logging.

---

## 2. Technology Stack

- **Runtime**: Node.js (v20+ / v22+)
- **Language**: TypeScript (strict mode enabled)
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma ORM v5
- **Authentication**: JWT (`jsonwebtoken`) & Session Records
- **Password Hashing**: Argon2 (`argon2` algorithm variant argon2id)
- **Validation**: Zod
- **Documentation**: OpenAPI 3.0 via Swagger UI (`swagger-ui-express`)
- **Testing**: Jest & Supertest
- **Security**: Helmet, CORS, Express Rate Limit
- **Code Quality**: ESLint v9 & Prettier

---

## 3. Folder Structure

```
backend/
├── docs/
│   ├── REQUIREMENTS_TRACEABILITY.md # Traceability matrix for FR-01 through FR-60 & NFRs
│   └── ASSUMPTIONS.md              # Architectural & design assumptions
├── prisma/
│   ├── migrations/                 # Applied SQL database migrations
│   ├── schema.prisma               # Prisma schema definitions, enums, indexes & relations
│   └── seed.ts                     # Database seeding script with realistic domain data
├── scripts/
│   ├── backup-db.ps1               # Automated Windows PowerShell backup script (30-day retention)
│   ├── backup-db.sh                # Automated Linux/macOS bash backup script (30-day retention)
│   └── expire-reservations.ts      # Scheduled task to expire reservations & release copies
├── src/
│   ├── config/                     # Environment, Prisma client singleton, structured logger
│   ├── middleware/                 # Auth, RBAC, Validation, Error Handler, Request ID
│   ├── modules/
│   │   ├── audit/                  # Audit trail service and query controller
│   │   ├── auth/                   # Authentication, sessions, refresh tokens, password change
│   │   ├── book-copies/            # Physical book copies, barcode lookup, copy lifecycle
│   │   ├── books/                  # Book catalog, indexed search, details, CRUD
│   │   ├── fines/                  # Overdue fine management and payment tracking
│   │   ├── loans/                  # Issue, return, renew, overdue checks, loan history
│   │   ├── notifications/          # In-app notifications
│   │   ├── policies/               # Dynamic library policy configuration
│   │   ├── reports/                # Management reports (circulation, overdue, fines, stats)
│   │   └── users/                  # Profile, admin user management, librarian user search
│   ├── routes/                     # Master API v1 router
│   ├── swagger/                    # OpenAPI 3.0 specification
│   ├── types/                      # TypeScript shared interfaces, models, and response types
│   ├── utils/                      # Password utility, JWT utility, Standardized API response
│   ├── app.ts                      # Express app setup, middleware pipeline
│   └── server.ts                   # Process bootstrap, port binding & graceful shutdown
├── tests/                          # Comprehensive Jest + Supertest suites
│   ├── setup.ts
│   ├── health.test.ts
│   ├── auth.test.ts
│   ├── rbac.test.ts
│   ├── books.test.ts
│   ├── loans.test.ts
│   ├── reservations.test.ts
│   ├── fines.test.ts
│   └── policies.test.ts
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── eslint.config.mjs
├── jest.config.ts
├── package.json
└── tsconfig.json
```

---

## 4. Prerequisites

- **Node.js**: `v20.0.0` or later (tested on Node v22.16.0)
- **npm**: `v10.0.0` or later
- **PostgreSQL**: `v14+` running locally or via Docker
- Optional: **Docker** and **Docker Compose**

---

## 5. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure the environment variables in `.env`:

```env
# Server
PORT=3000
NODE_ENV=development

# PostgreSQL Connection
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/library_management?schema=public"

# Authentication & JWT
JWT_ACCESS_SECRET="dev_jwt_access_secret_super_secure_key_at_least_32_chars!"
JWT_REFRESH_SECRET="dev_jwt_refresh_secret_super_secure_key_at_least_32_chars!"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Session Policy
SESSION_INACTIVITY_MINUTES=15

# Security & CORS
CORS_ORIGIN="*"
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=1000

# Seeding Defaults (DEVELOPMENT ONLY)
SEED_ADMIN_EMAIL="admin@library.local"
SEED_ADMIN_PASSWORD="AdminPassword123!"
SEED_LIBRARIAN_PASSWORD="LibrarianPassword123!"
SEED_USER_PASSWORD="UserPassword123!"
```

---

## 6. Database Setup & Migrations

1. Install project dependencies:
   ```bash
   npm install
   ```

2. Generate the Prisma Client:
   ```bash
   npx prisma generate
   ```

3. Deploy database migrations:
   ```bash
   npx prisma migrate deploy
   ```

---

## 7. Seeding & Development Credentials

Run the database seed script to populate realistic development data:

```bash
npx prisma db seed
# or
npm run prisma:seed
```

### Seed Accounts (FOR DEVELOPMENT ONLY)

> [!WARNING]
> These credentials are provided strictly for local development and testing purposes. Change all passwords in production deployments.

| Role | Email | Registration Number | Password |
|---|---|---|---|
| **ADMINISTRATOR** | `admin@library.local` | `ADM-001` | `AdminPassword123!` |
| **LIBRARIAN** | `librarian1@library.local` | `LIB-001` | `LibrarianPassword123!` |
| **LIBRARIAN** | `librarian2@library.local` | `LIB-002` | `LibrarianPassword123!` |
| **USER / PATRON** | `alice@example.com` | `USR-1001` | `UserPassword123!` |
| **USER / PATRON** | `bob@example.com` | `USR-1002` | `UserPassword123!` |
| **USER / PATRON** | `charlie@example.com` | `USR-1003` *(Inactive)* | `UserPassword123!` |

---

## 8. Running the Application

### Development Mode (with hot-reload)
```bash
npm run dev
```

### Production Build & Execution
```bash
# 1. Compile TypeScript to JavaScript in /dist
npm run build

# 2. Start the production server
npm start
```

### Health Check Endpoints
- **Application Health**: `GET http://localhost:3000/health`
- **Database Connection Health**: `GET http://localhost:3000/health/db`

---

## 9. Testing & Quality Checks

Run the automated test suite (Jest + Supertest against database):

```bash
npm test
```

Run test coverage report:
```bash
npm run test:coverage
```

Run linter:
```bash
npm run lint
```

Format codebase with Prettier:
```bash
npm run format
```

---

## 10. API Documentation (Swagger / OpenAPI)

Interactive Swagger UI documentation is available directly in the browser:

👉 **`http://localhost:3000/api/docs/`**

Features documented in Swagger:
- Interactive **Authorize** button (JWT Bearer tokens persist across requests)
- Complete request bodies, response schemas, status codes, and error formats
- Role permission tags for every endpoint

---

## 11. Role-Based Access Control (RBAC)

The system enforces server-side role validation via `authorizeRoles(...)` middleware:

| Feature / Endpoint Group | USER | LIBRARIAN | ADMINISTRATOR |
|---|:---:|:---:|:---:|
| Search Books & View Details (`/books`) | ✅ | ✅ | ✅ |
| View / Update Own Profile (`/users/me`) | ✅ | ✅ | ✅ |
| Reserve Copy & Cancel Own (`/reservations`) | ✅ | ✅ | ✅ |
| View Own Loans & Renew (`/loans/me`, `/renew`) | ✅ | ✅ | ✅ |
| View Own Fines (`/fines/me`) | ✅ | ✅ | ✅ |
| In-App Notifications (`/notifications`) | ✅ | ✅ | ✅ |
| Issue Book Copy (`POST /loans/issue`) | ❌ | ✅ | ✅ |
| Return Book Copy (`POST /loans/return`) | ❌ | ✅ | ✅ |
| Manage Books & Copies (`POST/PATCH/DELETE`) | ❌ | ✅ | ✅ |
| Search Users & View Loan History | ❌ | ✅ | ✅ |
| Mark Fines as Paid (`PATCH /fines/:id/payment`) | ❌ | ✅ | ✅ |
| Configure Library Policy (`PATCH /admin/policy`) | ❌ | ❌ | ✅ |
| User & Librarian Account Management | ❌ | ❌ | ✅ |
| Circulation, Overdue & Fine Reports | ❌ | ❌ | ✅ |
| View Append-Only Audit Logs (`/audit`) | ❌ | ❌ | ✅ |

---

## 12. Business Rules & Concurrency

1. **Dual Identifier Login**: Users can log in using either their `email` or their `registrationNumber`.
2. **Session Inactivity Termination**: Inactive sessions automatically expire after 15 minutes (`SESSION_INACTIVITY_MINUTES=15`).
3. **Concurrent Book Issue Safeguard**: Copies are claimed atomically within a database transaction using conditional updates (`WHERE id = copy.id AND status IN ('AVAILABLE', 'RESERVED')`). If multiple requests race for the same barcode, exactly one succeeds and the other receives `BOOK_COPY_UNAVAILABLE`.
4. **Dynamic Borrow Limit**: `LibraryPolicy.borrowLimit` is dynamically verified prior to issuing a copy. Users cannot exceed their borrow limit.
5. **Real-Time Overdue Calculation & Fines**: Returns calculate overdue days dynamically (`returnDate - dueDate`). Fines are generated idempotently using `LibraryPolicy.finePerDay`.
6. **Configurable Renewal Limit**: Maximum renewals is governed by `LibraryPolicy.maxRenewals`. Active reservations on the book copy by another user block renewals.
7. **Reservation Expiration**: Overdue reservations can be batch-processed on demand via `npm run reservations:expire` or `POST /api/v1/reservations/process-expired`, automatically releasing the copies to `AVAILABLE`.
8. **Last Administrator Protection**: The system prevents deactivating or removing the role of the final active administrator.

---

## 13. Database Backup & 30-Day Retention

Automated backup scripts are provided for scheduled maintenance:

### Windows PowerShell Script
```powershell
.\scripts\backup-db.ps1 -BackupDir "./backups" -RetentionDays 30
```

### Linux/macOS Bash Script
```bash
chmod +x ./scripts/backup-db.sh
./scripts/backup-db.sh ./backups 30
```

Both scripts:
1. Generate PostgreSQL custom-format (`pg_dump -F c`) compressed backups.
2. Timestamp each backup file (`lms_backup_YYYYMMDD_HHMMSS.sql`).
3. Automatically delete backups older than 30 days to satisfy the retention policy.
4. Can be scheduled via Windows Task Scheduler or Linux `cron` (e.g. `0 2 * * * /path/to/backup-db.sh`).

---

## 14. Docker Support

### Run PostgreSQL via Docker
To run PostgreSQL in a container while running the backend locally:
```bash
docker compose up -d postgres
```

### Run Full Stack (Postgres + Backend)
```bash
docker compose up --build -d
```

---

## 15. Troubleshooting

- **`P2002: Unique constraint failed`**: You attempted to create a user, copy barcode, or session with a value that already exists. Check barcodes and email uniqueness.
- **`SESSION_INACTIVITY_TIMEOUT`**: The session has been idle for more than 15 minutes. Re-authenticate via `/api/v1/auth/login`.
- **Database Connection Error**: Verify PostgreSQL is running on port 5432 and credentials match `DATABASE_URL` in `.env`.
- **Port In Use**: If port 3000 is occupied, set `PORT=3001` in `.env`.

---

## 16. Future Client Integration

The REST API is versioned at `/api/v1` and returns standard JSON envelopes:
- Success: `{ "success": true, "data": { ... }, "message": "..." }`
- List/Pagination: `{ "success": true, "data": [ ... ], "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 } }`
- Error: `{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human readable message" } }`

This backend is ready to be consumed by:
- **Android Mobile App** (Retrofit / OkHttp / Ktor) for Patrons
- **Librarian Web Portal** (React / Vue / Angular) for Circulation & Cataloging
- **Administrator Dashboard** (React / Vue / Angular) for Policy & Analytics
