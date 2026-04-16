# Functional Requirements

**Maptech Information Solutions Inc. — Project Management System v5.0**

---

## 1. Authentication & Authorization

| ID | Requirement | Status |
|----|-------------|--------|
| FR-1.1 | Session-based authentication with database driver | ✅ |
| FR-1.2 | Login rate limiting (10 attempts/minute) | ✅ |
| FR-1.3 | Password change rate limiting (5/15 minutes) | ✅ |
| FR-1.4 | Minimum 12-character password policy | ✅ |
| FR-1.5 | CSRF protection on all state-changing requests | ✅ |
| FR-1.6 | Global 401 session-expiry handling | ✅ |
| FR-1.7 | Two-factor authentication (TOTP) | ✅ |
| FR-1.8 | Department-based role access control | ✅ |

## 2. Project Management

| ID | Requirement | Status |
|----|-------------|--------|
| FR-2.1 | 5-step project creation wizard | ✅ |
| FR-2.2 | Multi-stage approval pipeline (Tech → Acctg → Admin) | ✅ |
| FR-2.3 | Project editing with modal forms | ✅ |
| FR-2.4 | Project archiving and status management | ✅ |
| FR-2.5 | Team assignment via multi-select | ✅ |
| FR-2.6 | Stakeholder tracking | ✅ |
| FR-2.7 | Project templates | ✅ |
| FR-2.8 | Custom fields on projects | ✅ |
| FR-2.9 | Activity feed / timeline | ✅ |

## 3. Task Management

| ID | Requirement | Status |
|----|-------------|--------|
| FR-3.1 | Task CRUD with assignment | ✅ |
| FR-3.2 | Time logging per task | ✅ |
| FR-3.3 | Task completion reports | ✅ |
| FR-3.4 | Supervisor review/approval of completions | ✅ |
| FR-3.5 | Task blocker reporting | ✅ |
| FR-3.6 | Threaded task comments | ✅ |
| FR-3.7 | Sprint-based task organization | ✅ |
| FR-3.8 | Kanban board view | ✅ |
| FR-3.9 | Bulk task status updates | ✅ |
| FR-3.10 | Bulk task assignment | ✅ |
| FR-3.11 | Custom fields on tasks | ✅ |

## 4. Budget Management

| ID | Requirement | Status |
|----|-------------|--------|
| FR-4.1 | Budget request submission | ✅ |
| FR-4.2 | Two-stage budget approval (Accounting → Supervisor) | ✅ |
| FR-4.3 | Budget tracking and reporting | ✅ |
| FR-4.4 | PDF budget report export | ✅ |
| FR-4.5 | Excel budget report export | ✅ |
| FR-4.6 | Budget variance analysis | ✅ |

## 5. Gantt Charts

| ID | Requirement | Status |
|----|-------------|--------|
| FR-5.1 | Interactive Gantt timeline visualization | ✅ |
| FR-5.2 | Phases, steps, and milestones | ✅ |
| FR-5.3 | Task dependencies (FS, SS, FF, SF) | ✅ |
| FR-5.4 | Gantt export (PDF/image) | ✅ |
| FR-5.5 | Critical path analysis | ✅ |

## 6. Media & Documents

| ID | Requirement | Status |
|----|-------------|--------|
| FR-6.1 | File upload with project association | ✅ |
| FR-6.2 | Access-controlled file download | ✅ |
| FR-6.3 | Media versioning with history | ✅ |

## 7. Notifications

| ID | Requirement | Status |
|----|-------------|--------|
| FR-7.1 | Queued async notifications | ✅ |
| FR-7.2 | Budget approval/rejection notifications | ✅ |
| FR-7.3 | Task review notifications | ✅ |
| FR-7.4 | Blocker notifications | ✅ |
| FR-7.5 | Overdue task notifications (scheduled) | ✅ |
| FR-7.6 | User notification preferences | ✅ |

## 8. Reporting & Export

| ID | Requirement | Status |
|----|-------------|--------|
| FR-8.1 | Budget reports (PDF) | ✅ |
| FR-8.2 | Budget reports (Excel) | ✅ |
| FR-8.3 | Gantt chart export | ✅ |
| FR-8.4 | Dashboard with configurable widgets | ✅ |
| FR-8.5 | Workload management view | ✅ |

## 9. Administration

| ID | Requirement | Status |
|----|-------------|--------|
| FR-9.1 | User CRUD management | ✅ |
| FR-9.2 | Bulk user import (CSV) | ✅ |
| FR-9.3 | Audit log viewing and filtering | ✅ |
| FR-9.4 | Immutable audit trail | ✅ |
| FR-9.5 | Webhook configuration | ✅ |
| FR-9.6 | System scheduled commands | ✅ |

## 10. Issue Tracking

| ID | Requirement | Status |
|----|-------------|--------|
| FR-10.1 | Risk tracking | ✅ |
| FR-10.2 | Issue tracking | ✅ |
| FR-10.3 | Assumption tracking | ✅ |
| FR-10.4 | Dependency tracking | ✅ |

---

*All requirements verified against codebase v5.0. For implementation details, see [docs/SYSTEM_DOCUMENTATION.md](../docs/SYSTEM_DOCUMENTATION.md).*
