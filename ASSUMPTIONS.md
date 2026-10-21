# Assumptions and Design Decisions

This document outlines key technical decisions, interpretations, and assumptions implemented in the Library Management System (LMS) backend.

## 1. User Registration Number
- **SRS Requirement**: Authentication must support both email and registration number.
- **Implementation**: Added `registrationNumber` as a required, unique, and indexed string on the `User` model. For system administrators and librarians seeded or created via administrative endpoints, registration numbers follow formatted patterns (e.g., `ADM-001`, `LIB-001`, `LIB-002`, `USR-1001`).

## 2. Library Policy & Renewal Limit
- **SRS Reference**: The SRS states that loans can be renewed up to a configured limit, but did not define a limit field in the original schema dictionary.
- **Implementation**: Added `maxRenewals` (integer, default: 2) to the `LibraryPolicy` model. Renewal operations dynamically consult this field rather than hardcoding.

## 3. Session Management & Inactivity
- **SRS Requirement**: Web sessions must terminate after 15 minutes of inactivity.
- **Implementation**:
  - The `Session` model records `lastActivityAt` for every active session.
  - The authentication middleware tracks inbound authenticated requests, compares `Date.now() - session.lastActivityAt` against `SESSION_INACTIVITY_MINUTES` (15 minutes).
  - If exceeded, the session is invalidated/revoked, and a `401 Unauthorized` (`SESSION_EXPIRED`) error is returned.
  - If active, `lastActivityAt` is updated.

## 4. Concurrency & Race Conditions on Issuing Copies
- **Scenario**: Multiple librarians attempting to issue the same book copy barcode at the exact same millisecond.
- **Implementation**: All issuance logic executes inside a Prisma interactive transaction (`$transaction`). The copy status is conditionally updated with `WHERE id = copy.id AND status = AVAILABLE`. If the update count is zero (indicating another transaction acquired it), a `ConflictError` with code `BOOK_COPY_UNAVAILABLE` is raised and the transaction automatically rolls back.

## 5. Overdue Calculation & Fine Generation
- **Requirement**: Return operation must calculate overdue days and charge fines automatically.
- **Implementation**:
  - Overdue duration is calculated in real time during the return operation: `Math.max(0, Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24)))`.
  - Even if a scheduled status update hasn't run yet, the return operation computes the exact fine using `LibraryPolicy.finePerDay`.
  - Fine creation is idempotent: a unique constraint on `loanId` in the `Fine` table guarantees at most one fine per loan.

## 6. Reservation Expiration & Copy Release
- **Requirement**: Expired reservations must release held copies.
- **Implementation**:
  - Expiration script/service function `ReservationService.processExpiredReservations()` queries `ACTIVE` reservations where `expiryDate < now()`.
  - In a transaction, matching reservations are set to `EXPIRED` and the associated copy is returned to `AVAILABLE`.
  - Can be run on-demand or invoked via CLI script (`npm run reservations:expire`).

## 7. Soft vs. Hard Deletes
- **Books & Copies**: Hard deletion is only permitted when no foreign-key references exist (no historical loans or reservations). If loans exist, attempting to delete a book or copy will return a clear 409 Conflict error (`CANNOT_DELETE_REFERENCED_RESOURCE`), preserving full audit and historical integrity.

## 8. In-App Notifications
- **Requirement**: In-app notifications only (no mandatory third-party SMS/email gateways).
- **Implementation**: `NotificationService` persists notification records to PostgreSQL. The service is cleanly decoupled with a dispatch interface to allow seamless plug-and-play addition of external transport providers (Email, SMS, WebSockets, Firebase Cloud Messaging) in the future.
