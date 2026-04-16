# System Overview

**Maptech Information Solutions Inc. — Project Management System v5.0**

---

## 1. System Description

The MAPTECH PMS is a full-stack web application built with Laravel 11 and React 18.2. It serves as the central platform for managing IT projects, budgets, tasks, and team operations within MAPTECH.

## 2. Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Backend Framework | Laravel | 11.x |
| Language (Backend) | PHP | 8.2+ |
| Frontend Framework | React | 18.2 |
| Language (Frontend) | TypeScript | 5.9.3 |
| Build Tool | Vite | 7.x |
| CSS Framework | Tailwind CSS | 3.x |
| Database | PostgreSQL / MySQL | 15+ / 8+ |
| Authentication | Session-based | Database driver |
| 2FA | TOTP | RFC 6238 |
| Real-time | Pusher / Laravel Reverb | WebSocket |
| PDF Generation | DomPDF | — |
| Excel Generation | Open XML (ZipArchive) | — |
| Testing | PHPUnit | 11.x |

## 3. Key Features

### Core Modules
1. **Project Management** — Full lifecycle with 5-step creation wizard, multi-stage approval, templates, archiving
2. **Task Management** — Assignment, progress tracking, time logging, completion reports, review workflows
3. **Budget Management** — Request submission, staged approval, variance tracking, financial reporting
4. **Gantt Charts** — Interactive timeline with phases, steps, milestones, dependencies, critical path

### Collaboration
5. **Task Comments** — Threaded discussion on tasks with reply support
6. **Activity Feed** — Real-time project activity timeline
7. **Notifications** — Queued multi-channel notifications (email, database, broadcast)

### Advanced Features
8. **Sprints** — Sprint-based task organization and iteration tracking
9. **Kanban Board** — Drag-and-drop task status management
10. **Custom Fields** — User-defined metadata on projects and tasks
11. **Project Templates** — Reusable project configurations
12. **Bulk Operations** — Mass task status updates and reassignment
13. **Workload Management** — Team capacity visualization

### Administration
14. **User Management** — CRUD, bulk CSV import, role assignment
15. **Two-Factor Authentication** — TOTP-based 2FA enrollment and verification
16. **Webhooks** — External system integration via configurable event hooks
17. **Dashboard Widgets** — Personalized dashboard with configurable widgets
18. **Audit Logging** — Immutable, append-only compliance trail
19. **Media Versioning** — File upload with version history and access control

## 4. User Roles & Departments

| Department | Role | Access Level |
|-----------|------|-------------|
| Admin | Superadmin | Full system access — user management, all approvals, audit logs, system config |
| Technical | Supervisor | Project oversight, technical approval, task review, team management |
| Accounting | Supervisor | Budget approval, financial reports, budget variance analysis |
| Employee | Employee | Own tasks, assigned projects, time logging, completion reports |

## 5. System Architecture (High-Level)

```
┌─────────────────────────────────────────────────┐
│                   Client Browser                │
│        React 18.2 SPA + Tailwind CSS            │
└──────────────────────┬──────────────────────────┘
                       │ HTTPS (JSON API)
┌──────────────────────▼──────────────────────────┐
│              Laravel 11 Backend                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │Controllers│  │Middleware│  │  Services     │  │
│  │  (34)     │  │  (3)     │  │  (6)          │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Models  │  │  Events  │  │ Notifications │  │
│  │  (27)    │  │          │  │  (5)          │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│            PostgreSQL / MySQL Database           │
│              67 migrations applied               │
└─────────────────────────────────────────────────┘
```

## 6. Deployment

- **Platform**: Railway (with `railway.toml` and `nixpacks.toml` configuration)
- **Container**: Docker support via `Dockerfile`
- **Build**: `npm run build` (Vite) + `composer install --no-dev`
- **Queue**: Database-backed queue worker for async jobs
- **Scheduler**: Cron-based Laravel scheduler for automated tasks

---

*For detailed architecture, see [05-System-Architecture.md](05-System-Architecture.md). For complete reference, see [docs/SYSTEM_DOCUMENTATION.md](../docs/SYSTEM_DOCUMENTATION.md).*
