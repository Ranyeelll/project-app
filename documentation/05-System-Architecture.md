# System Architecture

**Maptech Information Solutions Inc. — Project Management System v5.0**

---

## 1. Architecture Pattern

The system follows a **Single-Page Application (SPA)** architecture:

- **Frontend**: React 18.2 SPA served via Inertia.js, bundled by Vite 7
- **Backend**: Laravel 11 REST API with session-based authentication
- **Communication**: JSON over HTTPS with CSRF token protection
- **Real-time**: WebSocket broadcasting via Pusher/Reverb

## 2. Backend Architecture

### 2.1 Directory Structure

```
app/
├── Console/Commands/          # 2 Artisan commands
├── Enums/                     # ApprovalStatus, Department
├── Events/                    # Broadcasting events
├── Http/
│   ├── Controllers/Api/       # 34 API controllers
│   └── Middleware/            # 3 custom middleware
├── Jobs/                      # Queue jobs
├── Models/                    # 27 Eloquent models
├── Notifications/             # 5 notification classes
├── Providers/                 # Service providers
└── Services/                  # 6 service classes
```

### 2.2 Key Controllers

| Controller | Purpose |
|-----------|---------|
| ProjectController | Project CRUD, approval pipeline |
| TaskController | Task management, assignment, time logging |
| BudgetRequestController | Budget requests and approval |
| GanttController | Gantt chart data and operations |
| UserManagementController | User CRUD and permissions |
| AuditLogController | Audit trail viewing |
| TaskCommentController | Threaded task comments |
| BulkOperationController | Mass task operations |
| SprintController | Sprint management |
| WebhookController | External integrations |
| TwoFactorController | 2FA enrollment and verification |

### 2.3 Services

| Service | Responsibility |
|---------|---------------|
| AuditService | Immutable audit log recording |
| TaskActivityLogger | Task activity timeline tracking |
| GanttExportService | Gantt chart PDF/image export |
| GanttDependencyService | Dependency validation and critical path |
| BudgetExportService | Budget report PDF/Excel generation |
| NotificationPreferenceService | User notification settings |

### 2.4 Middleware

| Middleware | Purpose |
|-----------|---------|
| AdminMiddleware | Restricts routes to Admin department users |
| SupervisorMiddleware | Restricts routes to Supervisor+ roles |
| EnsureTwoFactorVerified | Enforces 2FA verification when enabled |

## 3. Frontend Architecture

### 3.1 State Management

Centralized via `AppContext.tsx` — a React Context provider that manages:
- Authentication state
- API data fetching and caching
- CRUD operations for all entities
- Error and loading states

### 3.2 API Client

`apiFetch.ts` provides a centralized HTTP client with:
- Automatic CSRF token injection (`X-CSRF-TOKEN` header)
- Credentials inclusion (session cookies)
- Global 401 handling (redirect to login on session expiry)
- Laravel 422 validation error parsing

### 3.3 Component Structure

- **27 page components** organized by role (admin/ and employee/ directories)
- **31 reusable UI components** (Modal, Button, LoadingSpinner, ErrorBoundary, etc.)
- Tailwind CSS utility classes for styling

## 4. Database Architecture

- **67 migrations** defining the complete schema
- **27 Eloquent models** with relationships
- Foreign keys with `nullOnDelete` to preserve data integrity
- JSON columns for flexible data (team_ids, custom fields, widget preferences)
- See [09-Data-Architecture.md](09-Data-Architecture.md) for full ERD

## 5. Security Architecture

### 5.1 Authentication
- Session-based auth with database session driver
- Optional TOTP-based two-factor authentication
- Rate limiting: 10 login attempts/min, 5 password changes/15min

### 5.2 Authorization
- Department-based role system (Admin > Technical/Accounting > Employee)
- Middleware-enforced route protection
- Controller-level access validation (team membership checks)

### 5.3 Data Protection
- CSRF protection on all state-changing requests
- Immutable audit logs (model-level update/delete guards)
- Media access authorization (project team membership required)
- Password policy: minimum 12 characters

### 5.4 API Security
- Query result limits (500–1000 records) to prevent resource exhaustion
- Double-submit protection (disabled buttons during API calls)
- Input validation on all endpoints via Laravel Form Requests

## 6. Deployment Architecture

```
┌─────────────────────────────────────┐
│           Railway Platform          │
│  ┌───────────────────────────────┐  │
│  │     Docker Container          │  │
│  │  ┌─────────┐  ┌───────────┐  │  │
│  │  │  Nginx  │→│  PHP-FPM  │  │  │
│  │  │         │  │ Laravel 11│  │  │
│  │  └─────────┘  └───────────┘  │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │    PostgreSQL Database        │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

- Static assets pre-built via `npm run build` (Vite)
- Queue worker: `php artisan queue:work --tries=3`
- Scheduler: Cron → `php artisan schedule:run`

---

*For complete technical reference, see [docs/SYSTEM_DOCUMENTATION.md](../docs/SYSTEM_DOCUMENTATION.md).*
