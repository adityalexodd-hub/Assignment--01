# Corporate Access Request & Approval System — Comprehensive System Documentation

## 1. Project Overview & Business Problem
In corporate environments, unauthorized or unmonitored access to sensitive platforms (AWS, production databases, GitHub repos, VPNs) represents a premier attack vector and regulatory liability (SOC2, ISO 27001, HIPAA). Manual provisioning via Slack or unmonitored emails lacks traceability, role-based oversight, and automatic revocation.

The **Corporate Access Request & Approval System** automates and audits this lifecycle from end to end using the **MERN** technology stack.

---

## 2. Technology Stack & Hard Constraints
* **Database**: MongoDB via Mongoose ODM (No relational database, PostgreSQL, MySQL, SQLite, or SQL ORM).
* **Backend**: Node.js & Express.js following a strict MVC architecture.
* **Frontend**: React.js 18 (JSX, Vite) using pure Vanilla CSS.
* **Language**: JavaScript only (`.js`, `.jsx`). No TypeScript (`.ts`, `.tsx`, or `tsconfig.json`).

---

## 3. Backend MVC Architecture
* **Models (`/models`)**: Defines Mongoose schemas, validators, indexes, and virtuals (`User.js`, `AccessRequest.js`, `Notification.js`, `AuditLog.js`).
* **Controllers (`/controllers`)**: Manages HTTP request/response parsing and status codes. Thin layer delegating to services.
* **Services (`/services`)**: Implements domain business logic, MongoDB queries, aggregation pipelines, audit generation, and notifications.
* **Routes (`/routes`)**: Defines REST endpoints, route protection, rate limiters, and validator chains.
* **Middleware (`/middleware`)**: JWT token verification (`protect`), role-based authorization (`authorize`, `adminOnly`, `managerOrAdmin`), input sanitization, centralized error handling, and rate limiting.
* **Validators (`/validators`)**: `express-validator` rules for payload validation before hitting controllers.
* **Config (`/config`)**: Isolated MongoDB connection (`db.js`).

---

## 4. Frontend Architecture
The React frontend uses a modular structure:
* **Context**: `AuthContext` provides global authentication state, token storage, and user role helpers.
* **Routes & Guards**: `ProtectedRoute` checks session presence; `RoleRoute` restricts views based on user permissions.
* **API Services**: `authService`, `requestService`, `userService`, `notificationService`, and `dashboardService` encapsulate backend communication.
* **Components**: Highly reusable components (`RequestTable`, `RequestTimeline`, `ApprovalModal`, `RejectModal`, `MetricCard`, `PriorityBadge`, `RequestStatus`, `SearchInput`, `Pagination`).
* **Styling**: Comprehensive vanilla CSS design tokens matching corporate governance platforms (charcoal primary, slate accents, restrained status badges, Sarabun/Montserrat typography).

---

## 5. Security & Governance Rules
1. **Separation of Duties**: Reviewers cannot approve or reject their own requests.
2. **Access State Machine**: Transitions are enforced on the server: `pending -> approved | rejected | cancelled | expired`. Terminal states cannot be altered.
3. **Audit Trail**: Every significant action (`REQUEST_CREATED`, `REQUEST_APPROVED`, `REQUEST_REJECTED`, `USER_ROLE_CHANGED`, etc.) writes an immutable log with metadata.
4. **Auto-Expiring Privileges**: Durations (e.g. 7 days, 30 days) set an `expiresAt` timestamp upon approval, enabling automated access expiration.
