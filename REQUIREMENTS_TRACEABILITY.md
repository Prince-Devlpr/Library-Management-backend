# Requirements Traceability Matrix (RTM)

This matrix maps functional requirements (FR-01 through FR-60) and non-functional requirements (NFRs) to their concrete implementation in the Library Management System backend.

## Status Legend
- **IMPLEMENTED**: Implemented directly in the backend codebase with tests and validation.
- **CONFIGURED**: Provided via environment configuration / deployment infrastructure.
- **FUTURE_CLIENT**: Ready for future frontend/mobile client integration.

---

## Functional Requirements (FR-01 - FR-60)

| ID | Requirement Description | Implementation Module / Layer | Status | Notes |
|---|---|---|---|---|
| FR-01 | User registration with registration number & email | `src/modules/auth`, `src/modules/users` | IMPLEMENTED | Unique registrationNumber & email |
| FR-02 | Login via Email + Password | `src/modules/auth/auth.controller.ts` (`/api/v1/auth/login`) | IMPLEMENTED | Argon2 verification |
| FR-03 | Login via Registration Number + Password | `src/modules/auth/auth.controller.ts` (`/api/v1/auth/login`) | IMPLEMENTED | Accepts identifier = email or regNo |
| FR-04 | Password hashing with Argon2 | `src/utils/password.util.ts` | IMPLEMENTED | Argon2id variant |
| FR-05 | JWT access token issuance | `src/utils/jwt.util.ts` | IMPLEMENTED | 15m default expiration |
| FR-06 | Refresh token generation & storage | `src/modules/auth/auth.service.ts` | IMPLEMENTED | Stored in `Session` table |
| FR-07 | Token refresh endpoint | `src/modules/auth/auth.controller.ts` (`/api/v1/auth/refresh`) | IMPLEMENTED | Generates new access token |
| FR-08 | User logout & session revocation | `src/modules/auth/auth.controller.ts` (`/api/v1/auth/logout`) | IMPLEMENTED | Revokes session record |
| FR-09 | Inactive user login rejection | `src/modules/auth/auth.service.ts` | IMPLEMENTED | Returns `ACCOUNT_INACTIVE` error |
| FR-10 | Failed authentication audit logging | `src/modules/audit/audit.service.ts` | IMPLEMENTED | Logs `AUTH_LOGIN_FAILED` |
| FR-11 | 15-minute inactivity termination | `src/middleware/auth.middleware.ts` | IMPLEMENTED | Checks & updates `lastActivityAt` |
| FR-12 | View own profile details | `src/modules/users/users.controller.ts` (`/api/v1/users/me`) | IMPLEMENTED | USER, LIBRARIAN, ADMIN |
| FR-13 | Update own profile details | `src/modules/users/users.controller.ts` (`PATCH /api/v1/users/me`) | IMPLEMENTED | Restricts role/status tampering |
| FR-14 | Change own password | `src/modules/auth/auth.controller.ts` (`/api/v1/auth/change-password`) | IMPLEMENTED | Requires current password verify |
| FR-15 | Book catalog search by title | `src/modules/books/books.service.ts` | IMPLEMENTED | Indexed query with pagination |
| FR-16 | Book catalog search by author | `src/modules/books/books.service.ts` | IMPLEMENTED | Indexed query with pagination |
| FR-17 | Book catalog search by ISBN | `src/modules/books/books.service.ts` | IMPLEMENTED | Indexed query with pagination |
| FR-18 | Book catalog search by category | `src/modules/books/books.service.ts` | IMPLEMENTED | Indexed query with pagination |
| FR-19 | Combined keyword search | `src/modules/books/books.service.ts` | IMPLEMENTED | Multi-field search parameter |
| FR-20 | View book details with copy counts | `src/modules/books/books.service.ts` | IMPLEMENTED | Total and available copy count |
| FR-21 | Create new book entry | `src/modules/books/books.controller.ts` (`POST /api/v1/books`) | IMPLEMENTED | LIBRARIAN, ADMINISTRATOR |
| FR-22 | Update book metadata | `src/modules/books/books.controller.ts` (`PATCH /api/v1/books/:id`) | IMPLEMENTED | LIBRARIAN, ADMINISTRATOR |
| FR-23 | Safe deletion of books | `src/modules/books/books.controller.ts` (`DELETE /api/v1/books/:id`) | IMPLEMENTED | Conflict checks if copies/loans exist |
| FR-24 | Add book copy with unique barcode | `src/modules/book-copies/book-copies.controller.ts` | IMPLEMENTED | Unique barcode constraint |
| FR-25 | Update book copy status/location | `src/modules/book-copies/book-copies.controller.ts` | IMPLEMENTED | Validates status state transitions |
| FR-26 | Lookup copy by barcode | `src/modules/book-copies/book-copies.controller.ts` | IMPLEMENTED | `/api/v1/book-copies/barcode/:barcode` |
| FR-27 | Delete book copy safely | `src/modules/book-copies/book-copies.controller.ts` | IMPLEMENTED | Prevents deletion if active loan |
| FR-28 | Reserve book copy | `src/modules/reservations/reservations.service.ts` | IMPLEMENTED | Sets copy to RESERVED |
| FR-29 | Cancel own reservation | `src/modules/reservations/reservations.service.ts` | IMPLEMENTED | Releases copy to AVAILABLE |
| FR-30 | View own reservations | `src/modules/reservations/reservations.controller.ts` | IMPLEMENTED | USER role restricted to own |
| FR-31 | Reservation expiry calculation | `src/modules/reservations/reservations.service.ts` | IMPLEMENTED | Uses `LibraryPolicy.reservationPeriod` |
| FR-32 | Expire overdue reservations | `src/modules/reservations/reservations.service.ts` | IMPLEMENTED | Script & service trigger |
| FR-33 | Issue book copy to user | `src/modules/loans/loans.service.ts` (`POST /api/v1/loans/issue`) | IMPLEMENTED | LIBRARIAN only, transactional |
| FR-34 | Enforce borrow limit on issue | `src/modules/loans/loans.service.ts` | IMPLEMENTED | Checks `policy.borrowLimit` |
| FR-35 | Validate copy availability on issue | `src/modules/loans/loans.service.ts` | IMPLEMENTED | Atomic condition check |
| FR-36 | Calculate loan due date | `src/modules/loans/loans.service.ts` | IMPLEMENTED | Uses `policy.loanDuration` |
| FR-37 | Return book copy | `src/modules/loans/loans.service.ts` (`POST /api/v1/loans/return`) | IMPLEMENTED | LIBRARIAN only, transactional |
| FR-38 | Automatic overdue calculation | `src/modules/loans/loans.service.ts` | IMPLEMENTED | Compares returnDate to dueDate |
| FR-39 | Automatic fine generation | `src/modules/loans/loans.service.ts` | IMPLEMENTED | `overdueDays * policy.finePerDay` |
| FR-40 | Mark loan as returned | `src/modules/loans/loans.service.ts` | IMPLEMENTED | Updates status to RETURNED |
| FR-41 | Release copy on return | `src/modules/loans/loans.service.ts` | IMPLEMENTED | Updates copy to AVAILABLE |
| FR-42 | View user's own active loans | `src/modules/loans/loans.controller.ts` (`/api/v1/loans/me`) | IMPLEMENTED | USER role |
| FR-43 | View user's borrowing history | `src/modules/loans/loans.controller.ts` (`/api/v1/loans/me/history`) | IMPLEMENTED | USER role |
| FR-44 | Renew eligible loan | `src/modules/loans/loans.service.ts` (`POST /api/v1/loans/:id/renew`) | IMPLEMENTED | Transactional renewal |
| FR-45 | Enforce maxRenewals policy | `src/modules/loans/loans.service.ts` | IMPLEMENTED | Dynamic `policy.maxRenewals` check |
| FR-46 | Block renewal if reserved | `src/modules/loans/loans.service.ts` | IMPLEMENTED | Checks active reservations |
| FR-47 | View user's own fines | `src/modules/fines/fines.controller.ts` (`/api/v1/fines/me`) | IMPLEMENTED | USER role |
| FR-48 | View outstanding fines | `src/modules/fines/fines.controller.ts` (`/api/v1/fines`) | IMPLEMENTED | LIBRARIAN / ADMIN role |
| FR-49 | Mark fine as paid | `src/modules/fines/fines.controller.ts` (`PATCH /api/v1/fines/:id/payment`) | IMPLEMENTED | LIBRARIAN / ADMIN role |
| FR-50 | In-app notification creation | `src/modules/notifications/notifications.service.ts` | IMPLEMENTED | System event notifications |
| FR-51 | View notifications | `src/modules/notifications/notifications.controller.ts` | IMPLEMENTED | `/api/v1/notifications` |
| FR-52 | Mark notification as read | `src/modules/notifications/notifications.controller.ts` | IMPLEMENTED | Single and mark-all-read endpoints |
| FR-53 | Admin user account management | `src/modules/users/admin-users.controller.ts` | IMPLEMENTED | List, get, create, edit users |
| FR-54 | Activate / deactivate user account | `src/modules/users/admin-users.controller.ts` | IMPLEMENTED | Prevents last-admin deactivation |
| FR-55 | Admin librarian account management | `src/modules/users/admin-users.controller.ts` | IMPLEMENTED | Create/update librarian roles |
| FR-56 | Librarian user search | `src/modules/users/librarian-users.controller.ts` | IMPLEMENTED | By name, email, regNo |
| FR-57 | Librarian view user borrowing history | `src/modules/users/librarian-users.controller.ts` | IMPLEMENTED | Detailed loan & fine history |
| FR-58 | Configure library policies | `src/modules/policies/policies.controller.ts` | IMPLEMENTED | ADMINISTRATOR only |
| FR-59 | Generate management reports | `src/modules/reports/reports.controller.ts` | IMPLEMENTED | Circulation, overdue, fines, stats |
| FR-60 | Comprehensive audit logging | `src/modules/audit/audit.service.ts` | IMPLEMENTED | Append-only audit table & queries |

---

## Non-Functional Requirements (NFRs)

| ID | Requirement | Implementation / Architecture Solution | Status |
|---|---|---|---|
| NFR-01 | Response Time (<2s under target load) | Indexed PostgreSQL queries, lean Prisma select projections, connection pooling | IMPLEMENTED |
| NFR-02 | Concurrent User Support | Stateless JWT, connection pooling, isolated row updates | IMPLEMENTED |
| NFR-03 | Search Performance (100k catalog) | PostgreSQL B-Tree indexes on `isbn`, `title`, `author`, `category` | IMPLEMENTED |
| NFR-04 | Security & RBAC | Server-side role middleware, Argon2 password hashing, Helmet, Rate limiting | IMPLEMENTED |
| NFR-05 | Concurrency Integrity | Prisma interactive transactions, conditional updates for copy acquisition | IMPLEMENTED |
| NFR-06 | Data Integrity | PostgreSQL foreign keys (`RESTRICT`, `CASCADE`), NOT NULL, unique constraints | IMPLEMENTED |
| NFR-07 | Session Management | Server-side `Session` table, 15-minute inactivity tracking, token revocation | IMPLEMENTED |
| NFR-08 | Audit Trail | Non-deletable `AuditLog` entity recording IP, user agent, action, timestamp | IMPLEMENTED |
| NFR-09 | Automated Daily Backups (30 days) | `scripts/backup-db.ps1` and `scripts/backup-db.sh` with automated purge | IMPLEMENTED |
| NFR-10 | API Documentation | Swagger / OpenAPI 3.0 at `/api/docs` | IMPLEMENTED |
| NFR-11 | Containerization | `Dockerfile` and `docker-compose.yml` for reproducible runtime | IMPLEMENTED |
