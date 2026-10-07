# Corporate Access Request & Approval System — Backend

A production-grade, secure Node.js & Express.js REST API using MongoDB and Mongoose.

The backend strictly follows the **MVC architecture**:
- **Models**: Mongoose schemas defining fields, indexes, constraints, and hooks (`User`, `AccessRequest`, `Notification`, `AuditLog`).
- **Controllers**: Thin HTTP handlers handling status codes, query parsing, and response envelope formatting.
- **Services**: All business logic, transaction isolation, MongoDB queries, notifications, and audit logging.
- **Routes**: Route declarations protected with rate limiting, JWT authentication, and role authorization.
- **Middleware**: Centralized error handler, 404 handler, input sanitation, JWT verification, and rate limiters.
- **Validators**: `express-validator` chains validating inputs before hitting controllers.

> **MERN ONLY**: MongoDB + Express.js + React.js + Node.js. No PostgreSQL, MySQL, SQLite, Prisma, Sequelize, TypeORM, TypeScript, `.ts`, `.tsx`, or `tsconfig.json` are used. Backend follows MVC architecture with Mongoose.

---

## 1. Directory Structure

```text
backend/
├── config/
│   └── db.js                  # MongoDB connection isolated with Mongoose
├── controllers/
│   ├── authController.js
│   ├── requestController.js
│   ├── userController.js
│   ├── notificationController.js
│   ├── auditController.js
│   └── dashboardController.js
├── models/
│   ├── User.js
│   ├── AccessRequest.js
│   ├── Notification.js
│   └── AuditLog.js
├── routes/
│   ├── authRoutes.js
│   ├── requestRoutes.js
│   ├── userRoutes.js
│   ├── notificationRoutes.js
│   ├── auditRoutes.js
│   └── dashboardRoutes.js
├── services/
│   ├── authService.js
│   ├── requestService.js
│   ├── userService.js
│   ├── notificationService.js
│   ├── auditService.js
│   └── dashboardService.js
├── middleware/
│   ├── authMiddleware.js
│   ├── roleMiddleware.js
│   ├── errorMiddleware.js
│   ├── notFoundMiddleware.js
│   ├── rateLimitMiddleware.js
│   └── validationMiddleware.js
├── validators/
│   ├── authValidator.js
│   ├── requestValidator.js
│   └── userValidator.js
├── utils/
│   ├── ApiError.js
│   ├── apiResponse.js
│   ├── asyncHandler.js
│   ├── constants.js
│   ├── generateToken.js
│   └── pagination.js
├── seed/
│   └── seed.js                # Complete demo dataset seed
├── scripts/
│   ├── apiSmokeTest.js        # Automated API test suite
│   └── checkArchitecture.js   # Automated architecture guard
├── app.js                     # Express app assembly & middleware
├── server.js                  # Thin bootstrap
└── package.json
```

---

## 2. Setup & Installation

```bash
cd backend
npm install
```

Configure your environment variables in `.env` (or copy `.env.example`):
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/corporate_access
JWT_SECRET=super_secret_jwt_access_request_key_2026_production_grade
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### Seeding Demo Data
```bash
npm run seed
```

### Starting the Server
```bash
npm run dev
```
