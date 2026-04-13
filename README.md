# MAPTECH Project Management System

A web-based project management application for managing projects, tasks, budgets, Gantt timelines, and team operations with role-based access control and comprehensive audit logging.

## Technology Stack

| Layer | Technology |
|-------|------------|
| Backend | Laravel 11 (PHP 8.2+) |
| Frontend | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 |
| Database | PostgreSQL / MySQL |
| Auth | Session-based (database driver) |
| Queue | Database driver (ShouldQueue notifications) |

## Features

- **Project Management** — Full lifecycle with multi-stage approval workflows, archiving, and team assignment
- **Task Management** — Assignment, progress tracking, time logging, completion reports, review/approval workflows
- **Gantt Charts** — Interactive timeline visualization with phases, steps, milestones, and dependencies
- **Budget Management** — Request submission, staged approval (Accounting → Supervisor), and financial reporting with PDF/Excel export
- **Media Management** — File upload/download with project-level access authorization
- **Issue Tracking** — Risk, issue, assumption, and dependency tracking
- **Audit Logging** — Immutable, append-only audit trail for compliance (project approvals, budget changes, exports, config updates)
- **Notifications** — Queued notifications for budget approvals, task reviews, blockers, and overdue tasks
- **Role-Based Access** — Superadmin, Supervisor, Admin, Technical, Accounting, and Employee roles with department-based permissions

## Prerequisites

- PHP 8.2+
- Composer
- Node.js 18+ & npm
- PostgreSQL 15+ (or MySQL 8+)

## Setup

```bash
# Clone and install dependencies
git clone <repository-url>
cd project-app
composer install
npm install

# Configure environment
cp .env.example .env
php artisan key:generate

# Set up database
php artisan migrate --seed

# Build frontend
npm run build          # Production
npm run dev            # Development (Vite HMR)

# Start the application
php artisan serve
```

### Queue Worker

Notifications are queued asynchronously. Start the queue worker:

```bash
php artisan queue:work --tries=3
```

### Scheduled Commands

Register the Laravel scheduler in your system crontab:

```bash
* * * * * cd /path-to-project && php artisan schedule:run >> /dev/null 2>&1
```

This runs the `tasks:notify-overdue` command daily at 08:00 to send overdue task notifications.

## Environment Variables

Key variables to configure in `.env`:

| Variable | Purpose |
|----------|---------|
| `DB_CONNECTION` / `DB_HOST` / `DB_DATABASE` | Database connection |
| `SESSION_DRIVER` | Must be `database` for production |
| `QUEUE_CONNECTION` | Set to `database` for async notifications |
| `TRUSTED_PROXIES` | Comma-separated proxy IPs (or `*` for all) |
| `APP_DEBUG` | Set to `false` in production |

## Project Structure

```
app/
├── Console/Commands/       # Artisan commands (NotifyOverdueTasks)
├── Enums/                  # PHP enums (ApprovalStatus, Department)
├── Http/Controllers/Api/   # API controllers
├── Models/                 # Eloquent models
├── Notifications/          # Queued notification classes
└── Services/               # Business logic (AuditService, TaskActivityLogger)

resources/js/project-management/
├── context/AppContext.tsx   # Central state management & API calls
├── utils/
│   ├── apiFetch.ts         # Centralized HTTP client (CSRF, credentials, 401 handling)
│   └── parseApiError.ts    # Laravel 422 validation error parser
├── components/ui/          # Reusable UI components (Modal, Button, LoadingSpinner, ErrorBoundary)
├── constants/              # Shared constants (approvalStatuses)
└── pages/                  # Page components (admin/, employee/)
```

## Security Highlights

- **Session-based auth** with server-side invalidation on logout
- **CSRF protection** via `X-CSRF-TOKEN` header on all state-changing requests
- **Rate limiting** on login (10/min) and password change (5/15min) endpoints
- **Media authorization** — download/serve requires project team membership
- **Password policy** — minimum 12 characters; random defaults for new users
- **FK integrity** — `nullOnDelete` foreign keys preserve records when users are removed
- **Immutable audit logs** — append-only with model-level update/delete guards
- **Global 401 handling** — automatic session-expiry detection and redirect to login
- **Double-submit protection** — form buttons disabled during API calls
- **Query result limits** — safety caps on list endpoints (500–1000 records)

## Documentation

Comprehensive system documentation is available at [`docs/SYSTEM_DOCUMENTATION.md`](docs/SYSTEM_DOCUMENTATION.md) (v4.0), covering:

- System architecture and data models
- API endpoint reference
- Business process workflows
- User roles and permissions
- Deployment and operations guide
- User manual

Additional documentation:
- [`AUDIT_LOG_SYSTEM.md`](AUDIT_LOG_SYSTEM.md) — Audit logging architecture
- [`AUDIT_IMPLEMENTATION.md`](AUDIT_IMPLEMENTATION.md) — Audit implementation guide
- [`TASK_FORMS_IMPLEMENTATION.md`](TASK_FORMS_IMPLEMENTATION.md) — Task form system
- [`TASK_ACTIVITY_TIMELINE.md`](TASK_ACTIVITY_TIMELINE.md) — Activity timeline system

## License

Proprietary — MAPTECH IT Department. Internal use only.
