# Corporate Access Governance & Approval System — Frontend

A React Single Page Application (SPA) designed to replicate a real corporate Identity & Access Management (IAM) governance system.

Built with **React.js (JSX)**, **Vite**, **Vanilla CSS**, and **Lucide React**.

---

## 1. Architecture

The frontend strictly separates presentation, state, routing, and API communication:

```text
frontend/
├── src/
│   ├── components/
│   │   ├── common/       # RequestStatus, PriorityBadge, SearchInput, Pagination, FeedbackStates
│   │   ├── layout/       # Sidebar, Topbar, PageHeader
│   │   ├── requests/     # RequestTable, RequestTimeline, ApprovalModal, RejectModal
│   │   └── dashboard/    # MetricCard
│   ├── pages/
│   │   ├── auth/         # LoginPage, RegisterPage
│   │   ├── employee/     # EmployeeDashboard, RequestListPage, NewRequestPage, RequestDetailPage, NotificationsPage, ProfilePage
│   │   ├── manager/      # ManagerDashboard
│   │   └── admin/        # AdminDashboard, UserManagementPage, AuditTrailPage
│   ├── context/          # AuthContext (JWT session state)
│   ├── routes/           # ProtectedRoute, RoleRoute (enforces role guards)
│   ├── services/         # apiClient, authService, requestService, userService, notificationService, dashboardService
│   ├── constants/        # Systems, AccessLevels, Roles, Departments
│   ├── App.jsx           # Declarative React Router routes
│   ├── main.jsx          # Root bootstrap
│   └── index.css         # Enterprise vanilla CSS design system
├── index.html
├── vite.config.js
└── package.json
```

---

## 2. Key Features

* **JWT Session Management**: Tokens persisted securely with automatic re-validation against `/api/auth/me`.
* **Role-Based UI & Navigation**: Distinct navigation items and guarded routes for Employee, Manager, and Admin users.
* **Separation of Duties**: Managers cannot approve their own requests in review queues.
* **Live Notifications Bell**: Polls unread notifications and gives quick navigation directly to requests.
* **Immutable Audit Trail Viewer**: Admins can inspect real-time security events.
* **No AI Gimmicks**: Restrained enterprise color palette (charcoal, slate, clean status accents) with Monstrate/Sarabun corporate typography.

---

## 3. Running Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

The application runs at `http://localhost:5173` and proxies `/api` calls directly to `http://localhost:5000`.
