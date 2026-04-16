# System Flow Documentation

**Maptech Information Solutions Inc. — Project Management System**
**Document Version:** 2.0
**Last Updated:** April 16, 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [User Roles & Departments](#2-user-roles--departments)
3. [Authentication Flow](#3-authentication-flow)
4. [Project Lifecycle Flow](#4-project-lifecycle-flow)
5. [Project Approval Pipeline](#5-project-approval-pipeline)
6. [Budget Request Flow](#6-budget-request-flow)
7. [Task Management Flow](#7-task-management-flow)
8. [Task Completion & Review Flow](#8-task-completion--review-flow)
9. [Gantt Chart Flow](#9-gantt-chart-flow)
10. [Notification Flow](#10-notification-flow)
11. [Audit Log Flow](#11-audit-log-flow)
12. [Export & Reporting Flow](#12-export--reporting-flow)
13. [Complete System Flow Diagram](#13-complete-system-flow-diagram)

---

## 1. System Overview

The Maptech PMS is a Laravel 11 + React single-page application that manages IT projects from creation through completion. The system enforces a multi-stage approval pipeline, role-based access control, budget tracking, task management, and audit logging.

**Technology Stack:**
- Backend: Laravel 11 (PHP 8.2+), PostgreSQL
- Frontend: React (TypeScript), Vite, Tailwind CSS
- Real-time: Pusher/Reverb (WebSocket broadcasting)
- PDF Generation: DomPDF
- Excel Generation: Open XML via ZipArchive

---

## 2. User Roles & Departments

### Department Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ADMIN DEPARTMENT                            │
│  Role: Superadmin                                                   │
│  Access: Full system control — all features, all data               │
│  Can: Manage users, approve final stages, view audit logs,          │
│       export reports, configure system settings                     │
├─────────────────────────────────────────────────────────────────────┤
│                      ACCOUNTING DEPARTMENT                          │
│  Role: Supervisor / Employee                                        │
│  Access: Budget management, financial reviews                       │
│  Can: Review budget requests (Stage 1), view budget reports,        │
│       export financial data                                         │
├─────────────────────────────────────────────────────────────────────┤
│                      TECHNICAL DEPARTMENT                           │
│  Role: Supervisor / Employee                                        │
│  Access: Gantt charts, task management, technical reviews           │
│  Can: Create/manage tasks, review technical feasibility,            │
│       manage Gantt items, view all projects                         │
├─────────────────────────────────────────────────────────────────────┤
│                      EMPLOYEE DEPARTMENT                            │
│  Role: Employee                                                     │
│  Access: Own tasks, time logging, budget requests                   │
│  Can: View assigned tasks, log time, submit budget requests,        │
│       submit task completions, report issues/blockers               │
└─────────────────────────────────────────────────────────────────────┘
```

### Permission Matrix

| Feature              | Admin      | Accounting  | Technical   | Employee    |
|----------------------|------------|-------------|-------------|-------------|
| Projects — View      | All        | Associated  | All         | Assigned    |
| Projects — Create    | ✅          | ❌           | ❌           | ❌           |
| Projects — Approve   | Final      | Budget only | Technical   | ❌           |
| Tasks — View         | All        | Associated  | All         | Own only    |
| Tasks — Create       | ✅          | ❌           | ✅           | ❌           |
| Tasks — Review       | ✅          | ✅           | ✅           | ❌           |
| Budget — Request     | ✅          | ✅           | ✅           | ✅           |
| Budget — Approve     | Final      | Stage 1     | ❌           | ❌           |
| Gantt — Manage       | ✅          | ❌           | ✅           | ❌           |
| Gantt — View         | All        | Filtered    | All         | Filtered    |
| Users — Manage       | ✅          | ❌           | ❌           | ❌           |
| Audit Logs           | ✅          | ❌           | ❌           | ❌           |
| Reports — Export     | ✅          | Budget only | ❌           | ❌           |

---

## 3. Authentication Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Login Page  │────▶│  Validate    │────▶│  2FA Enabled?    │
│  (Email/Pwd) │     │  Credentials │     │                  │
└──────────────┘     └──────┬───────┘     └────┬────────┬────┘
                            │                  │        │
                       ❌ Invalid          Yes │    No  │
                            │                  ▼        ▼
                     ┌──────▼──────┐   ┌──────────┐ ┌──────────────────┐
                     │ Show Error  │   │ 2FA Code │ │ Must Change Pwd? │
                     │ (Rate: 5/m)│   │  Prompt  │ │                  │
                     └─────────────┘   └────┬─────┘ └───┬──────────┬──┘
                                            │           │          │
                                      ✅ Valid     Yes  │     No   │
                                            │           ▼          ▼
                                            │    ┌───────────┐ ┌──────────┐
                                            └───▶│ Force Pwd │ │ Dashboard│
                                                 │  Change   │ │ (SPA)    │
                                                 └─────┬─────┘ └──────────┘
                                                       │
                                                       ▼
                                                 ┌──────────┐
                                                 │ Dashboard│
                                                 └──────────┘
```

**Password Recovery (Offline):**
```
Employee ID + Recovery Code → Verify → Set New Password → New Recovery Code Issued
```

---

## 4. Project Lifecycle Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                      PROJECT LIFECYCLE                            │
│                                                                   │
│  ┌─────────┐    ┌─────────┐    ┌───────────┐    ┌─────────────┐ │
│  │ CREATED │───▶│ ACTIVE  │───▶│ COMPLETED │───▶│  ARCHIVED   │ │
│  │ (draft) │    │         │    │           │    │             │ │
│  └─────────┘    └────┬────┘    └───────────┘    └─────────────┘ │
│                      │                                           │
│                      ▼                                           │
│                 ┌─────────┐                                      │
│                 │ ON-HOLD │ (can resume to Active)               │
│                 └─────────┘                                      │
└──────────────────────────────────────────────────────────────────┘
```

### Project Creation (Supervisor+ Only)

```
Step 1: Fill Project Details
         ├── Name, Description
         ├── Priority (Low / Medium / High / Critical)
         ├── Category (Development / Maintenance / Research / Infrastructure / Consultation)
         ├── Risk Level (Low / Medium / High)
         ├── Beneficiary Info, Contact, Location
         ├── Objectives, Start Date, End Date
         ├── Budget Amount
         └── Team Assignment (Manager + Team Members)

Step 2: System Auto-Processing
         ├── Serial Number assigned (MAP-YYYY-XXXXXXXXXX)
         ├── Tasks auto-created for each team member
         ├── Approval status set to "draft"
         └── Audit log: "project.created" (sensitive)

Step 3: Project is now ACTIVE and ready for work
```

---

## 5. Project Approval Pipeline

The system enforces a **5-stage sequential approval pipeline** where each department reviews and approves before the project advances.

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │              PROJECT APPROVAL PIPELINE                       │
                    │                                                              │
  ┌───────┐   submit   ┌───────────┐  approve  ┌────────────┐  approve           │
  │ DRAFT │───────────▶│ TECHNICAL │─────────▶│ ACCOUNTING │─────────▶           │
  │       │            │  REVIEW   │          │   REVIEW   │                     │
  └───────┘            └─────┬─────┘          └─────┬──────┘                     │
                             │                      │                             │
                    ┌────────┴──────────┐  ┌────────┴──────────┐                 │
                    │                    │  │                    │                 │
               ┌────────────┐  approve  ┌────────────┐  approve ┌──────────┐    │
          ────▶│ SUPERVISOR │─────────▶│ SUPERADMIN │─────────▶│ APPROVED │    │
               │   REVIEW   │          │   REVIEW   │          │  (Final) │    │
               └─────┬──────┘          └─────┬──────┘          └──────────┘    │
                     │                       │                                  │
                     └───────────┬───────────┘                                  │
                                 │                                               │
                     At ANY stage, reviewer can:                                 │
                                 │                                               │
                     ┌───────────┴───────────┐                                  │
                     ▼                       ▼                                   │
              ┌─────────────┐        ┌──────────┐                               │
              │  REVISION   │        │ REJECTED │  (Terminal — cannot proceed)  │
              │  REQUESTED  │        │          │                               │
              └──────┬──────┘        └──────────┘                               │
                     │                                                           │
                     │ resubmit                                                  │
                     ▼                                                           │
              ┌───────────┐                                                      │
              │ TECHNICAL │  (Restarts from Stage 1)                            │
              │  REVIEW   │                                                      │
              └───────────┘                                                      │
                    └────────────────────────────────────────────────────────────┘
```

### Stage Details

| Stage | Reviewer | What They Check |
|-------|----------|-----------------|
| 1. Technical Review | Technical Department | Feasibility, resource availability, technical scope |
| 2. Accounting Review | Accounting Department | Budget accuracy, financial viability, cost alignment |
| 3. Supervisor Review | Supervisor Role | Operational alignment, priority, team readiness |
| 4. Superadmin Review | Admin / Superadmin | Final authorization, strategic fit |

### Project Completion Flow

```
Employee finishes all work
         │
         ▼
┌──────────────────┐
│  finish_project  │  (Employee or Admin triggers)
│  action          │
└────────┬─────────┘
         │
         ├── Project status → "completed"
         ├── Notification sent to Supervisor + Superadmin
         └── Employee task/progress updates now BLOCKED
```

---

## 6. Budget Request Flow

### Budget Request Types
- **Spending** — Request to spend from allocated project budget
- **Additional Budget** — Request for more budget allocation

### 3-Stage Budget Approval Pipeline

```
┌──────────────────────────────────────────────────────────────────────┐
│                   BUDGET REQUEST APPROVAL FLOW                        │
│                                                                       │
│  ┌─────────┐   ┌─────────────┐   ┌────────────┐   ┌──────────────┐ │
│  │ PENDING │──▶│ ACCOUNTING  │──▶│ SUPERVISOR │──▶│   APPROVED   │ │
│  │(created)│   │  APPROVED   │   │  APPROVED  │   │   (Final)    │ │
│  └────┬────┘   └──────┬──────┘   └─────┬──────┘   └──────────────┘ │
│       │               │               │                             │
│       │     At ANY stage, reviewer can:                              │
│       │               │               │                             │
│       ▼               ▼               ▼                             │
│  ┌──────────────────────────────────────┐                            │
│  │         REVISION REQUESTED           │                            │
│  │  (Returns to PENDING on resubmit)    │                            │
│  └──────────────────────────────────────┘                            │
│                       │                                              │
│                       ▼                                              │
│               ┌──────────────┐                                       │
│               │   REJECTED   │  (Terminal)                           │
│               └──────────────┘                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Budget Request Lifecycle

```
Step 1: Employee creates budget request
         ├── Select project
         ├── Type: Spending or Additional Budget
         ├── Amount, Purpose, Attachment (optional)
         └── Status → PENDING

Step 2: Accounting reviews (Stage 1)
         ├── Verify financial accuracy
         ├── Check budget availability
         └── Approve → ACCOUNTING_APPROVED
             or Revision / Reject

Step 3: Supervisor reviews (Stage 2)
         ├── Verify operational need
         └── Approve → SUPERVISOR_APPROVED
             or Revision / Reject

Step 4: Admin/Superadmin reviews (Stage 3)
         ├── Final authorization
         └── Approve → APPROVED (budget applied to project)
             or Revision / Reject
```

### Revision Workflow
```
Reviewer requests revision
         │
         ├── Original amount saved (first time only)
         ├── Revision count incremented
         ├── Status → REVISION_REQUESTED
         ├── Notification sent to requester
         │
         ▼
Employee revises and resubmits
         │
         ├── Can modify amount, purpose
         ├── Status → PENDING (restarts from Accounting)
         └── Cycle repeats until approved or rejected
```

---

## 7. Task Management Flow

### Task Lifecycle

```
┌──────────┐    ┌──────────────┐    ┌──────────┐    ┌───────────┐
│   TODO   │───▶│ IN-PROGRESS  │───▶│  REVIEW  │───▶│ COMPLETED │
│          │    │              │    │          │    │           │
└──────────┘    └──────────────┘    └──────────┘    └───────────┘
```

### Task Creation

```
Admin/Technical creates task
         │
         ├── Assign to project
         ├── Assign to team member(s)
         ├── Set priority, due dates
         ├── Initial: progress=0, logged_hours=0
         └── completion_report_status=none

  OR

Project creation auto-generates tasks
         │
         └── One task per team member (auto-assigned)
```

### Who Can Update Tasks

```
┌─────────────┬──────────────────────────────────────────────────┐
│  EMPLOYEE   │ Can update: status, progress, logged_hours,      │
│             │             completion_report_status, report_cost │
│             │ Restriction: Own tasks only                       │
│             │ Blocked if: Project is completed or archived      │
├─────────────┼──────────────────────────────────────────────────┤
│ ADMIN /     │ Can update: All fields                           │
│ TECHNICAL   │ Access: Any task                                  │
└─────────────┴──────────────────────────────────────────────────┘
```

### Progress Auto-Recalculation

```
Employee updates task progress
         │
         ▼
System recalculates project progress
         │
         ├── Formula: Average of all team member task progress
         └── Writes to: projects.progress column (materialized)
```

### Time Logging

```
Employee logs time on task
         │
         ├── Date worked (required)
         ├── Hours worked (0.25 – 24 hours)
         ├── Work description (optional)
         │
         ▼
System auto-calculates
         │
         ├── task.logged_hours = SUM of all time log entries
         └── Audit log: "task.time_logged"
```

---

## 8. Task Completion & Review Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                  TASK COMPLETION & REVIEW FLOW                        │
│                                                                       │
│  Employee submits completion                                          │
│       │                                                               │
│       ├── completion_date                                             │
│       ├── deliverable_path (file/link)                                │
│       ├── summary of work done                                       │
│       ├── issues_encountered                                          │
│       │                                                               │
│       ▼                                                               │
│  ┌─────────────────┐                                                  │
│  │ Task Status:    │                                                  │
│  │ PENDING review  │                                                  │
│  └────────┬────────┘                                                  │
│           │                                                           │
│           ▼                                                           │
│  Reviewer (Technical / Admin / Accounting / Supervisor)               │
│           │                                                           │
│     ┌─────┴──────────────────────┐                                    │
│     │            │               │                                    │
│     ▼            ▼               ▼                                    │
│ ┌────────┐ ┌──────────┐ ┌────────────────┐                           │
│ │APPROVED│ │ REJECTED │ │   REVISION     │                           │
│ │        │ │          │ │   REQUESTED    │                           │
│ └───┬────┘ └──────────┘ └───────┬────────┘                           │
│     │                           │                                     │
│     ├── report_cost counts      │ Assignee revises                   │
│     │   toward project.spent    │ and resubmits                      │
│     └── Notification sent       └── Notification sent                │
│                                                                       │
│  Report Cost Accumulation:                                            │
│     If employee resubmits after approval,                             │
│     new report_cost is ADDED to existing (not replaced)              │
│     → triggers recalcProjectSpent()                                   │
└──────────────────────────────────────────────────────────────────────┘
```

### Task Blockers / Issue Reporting

```
Employee reports a blocker
         │
         ├── Issue title, description
         ├── Priority (Low / Medium / High / Critical)
         ├── Date reported, attachment (optional)
         │
         ▼
Notification sent to Project Manager
         │
         ├── Blocker tracked as: Open
         ├── Can be resolved by manager/admin
         └── Resolution records: resolved_at, resolved_by
```

---

## 9. Gantt Chart Flow

### Item Hierarchy

```
PROJECT
  └── PHASE (top-level container)
       └── STEP (work package)
            └── SUBTASK (individual work item)
                 └── MILESTONE (zero-duration checkpoint)
```

### Gantt Management

```
┌──────────────────────────────────────────────────────────┐
│                    GANTT CHART FLOW                        │
│                                                           │
│  Admin/Technical creates Gantt items                      │
│       │                                                   │
│       ├── Select parent (or none for Phase)               │
│       ├── Set type: Phase / Step / Subtask / Milestone    │
│       ├── Set date range, progress (0-100%)               │
│       ├── Assign team members                             │
│       ├── Set visibility (by role / by user)              │
│       │                                                   │
│       ▼                                                   │
│  Items displayed in tree + timeline view                  │
│       │                                                   │
│       ├── Tree: Collapsible hierarchy with state badges   │
│       ├── Timeline: Horizontal bars with progress fill    │
│       ├── Dependencies: Predecessor → Successor arrows    │
│       └── Today marker: Red vertical line                 │
│                                                           │
│  Views available:                                         │
│       ├── Gantt Chart (tree + timeline)                   │
│       ├── Calendar View (monthly calendar)                │
│       └── Zoom levels: Week / Month / Quarter             │
│                                                           │
│  Visibility Control:                                      │
│       ├── visible_to_roles: Department-based filtering    │
│       ├── visible_to_users: Individual user access        │
│       └── Admin preview: ?preview_as={department}         │
└──────────────────────────────────────────────────────────┘
```

---

## 10. Notification Flow

### Notification Channels
All notifications are dispatched via **3 channels**:
- **Mail** — Email delivery
- **Database** — Stored for in-app notification UI
- **Broadcast** — Real-time via WebSocket (Pusher/Reverb)

### Notification Types & Triggers

```
┌──────────────────────────────────────────────────────────────────────┐
│                     NOTIFICATION TRIGGERS                             │
│                                                                       │
│  PROJECT APPROVAL                                                     │
│  ├── Trigger: Any stage transition                                    │
│  └── Recipients: Department heads + project submitter                 │
│                                                                       │
│  BUDGET STATUS                                                        │
│  ├── Trigger: Approved / Rejected / Revision Requested                │
│  └── Recipients: Budget requester                                     │
│                                                                       │
│  TASK REVIEW                                                          │
│  ├── Trigger: Review submitted (approved / rejected / revision)       │
│  └── Recipients: Task assignee                                        │
│                                                                       │
│  BLOCKER REPORTED                                                     │
│  ├── Trigger: New blocker/issue reported                              │
│  └── Recipients: Project manager                                      │
│                                                                       │
│  OVERDUE TASK                                                         │
│  ├── Trigger: Task past end_date                                      │
│  └── Recipients: Assignee + project manager                           │
└──────────────────────────────────────────────────────────────────────┘
```

### Notification Preferences
Users can configure per-notification-type delivery:
- Enable/disable by type (project, budget, task, blocker)
- Channel selection (email, in-app, real-time)
- Quiet hours (start/end times)

---

## 11. Audit Log Flow

### Design Principles
- **Immutable** — No updates or deletes allowed (enforced at model level)
- **Append-only** — Only `created_at`, no `updated_at`
- **Tamper-resistant** — Unique `request_id` for traceability

### What Gets Logged

```
┌──────────────────────────────────────────────────────────────────────┐
│                       AUDIT LOG EVENTS                                │
│                                                                       │
│  PROJECT EVENTS                              SENSITIVE                │
│  ├── project.created                           ✅                     │
│  ├── project.updated                           ❌                     │
│  ├── project.deleted                           ✅                     │
│  ├── project.approval.* (all transitions)      ✅                     │
│  ├── project.status_changed                    ❌                     │
│  └── project.export                            ❌                     │
│                                                                       │
│  BUDGET EVENTS                                                        │
│  ├── budget.created                            ❌                     │
│  ├── budget.approved / rejected                ✅                     │
│  ├── budget.revision_requested                 ❌                     │
│  └── budget.exported                           ❌                     │
│                                                                       │
│  TASK EVENTS                                                          │
│  ├── task.created / updated / completed        ❌                     │
│  ├── task.time_logged                          ❌                     │
│  ├── task.blocker_reported                     ❌                     │
│  └── task.completion_submitted                 ❌                     │
│                                                                       │
│  USER EVENTS                                                          │
│  ├── user.created / updated / deleted          ✅                     │
│  ├── user.role_changed                         ✅                     │
│  └── user.department_changed                   ✅                     │
│                                                                       │
│  AUTH EVENTS                                                          │
│  ├── auth.login / auth.logout                  ✅                     │
│  ├── auth.password_changed                     ✅                     │
│  └── auth.password_change_failed               ✅                     │
│                                                                       │
│  SYSTEM EVENTS                                                        │
│  ├── settings.updated                          ❌                     │
│  └── visibility_change                         ❌                     │
└──────────────────────────────────────────────────────────────────────┘
```

### Audit Record Structure
Each log entry captures:
- **Who:** user_id, actor_role (department at time of action)
- **What:** action, resource_type, resource_id
- **Where:** project_id (if project-scoped)
- **Changes:** JSON delta `{ field: { from, to } }`
- **Snapshot:** Full entity state at time of action
- **Context:** Additional metadata (IP, user agent, request ID)

---

## 12. Export & Reporting Flow

### Available Exports

| Report | PDF | Excel | Access | Filters |
|--------|-----|-------|--------|---------|
| Projects Report | ✅ | ✅ | Supervisor+ | Period, Status, Priority, Category |
| Budget Report | ✅ | ✅ | Supervisor+ | Period |
| Audit Logs Report | ✅ | ✅ | Superadmin | Period, Action, Entity, Project |
| Gantt Report | ✅ | ✅ | Admin/Technical | Period, Department Preview |

### Export Flow

```
User selects export format (PDF / XLS) and period (Weekly / Monthly / Yearly)
         │
         ▼
Server queries filtered data within date range
         │
         ├── PDF: DomPDF renders Blade template
         │         ├── Maptech branded header (logo + title)
         │         ├── Summary cards
         │         ├── Data table with styled badges
         │         └── Footer with generation timestamp
         │
         └── XLS: ZipArchive builds Open XML workbook
                   ├── Summary sheet
                   ├── Detailed data sheet
                   └── Conditional formatting (status colors)
         │
         ▼
Browser downloads file
```

---

## 13. Complete System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MAPTECH PMS — COMPLETE SYSTEM FLOW                   │
│                                                                              │
│  ┌──────────┐                                                               │
│  │  LOGIN   │──── 2FA ──── Password Check ──── Session Created              │
│  └────┬─────┘                                                               │
│       │                                                                      │
│       ▼                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                         DASHBOARD                                    │    │
│  │  (Role-specific: Admin / Accounting / Technical / Employee)          │    │
│  └──────┬──────────┬──────────┬──────────┬──────────┬──────────────────┘    │
│         │          │          │          │          │                         │
│    ┌────▼────┐ ┌───▼───┐ ┌───▼───┐ ┌───▼────┐ ┌──▼──────┐                 │
│    │PROJECTS │ │ TASKS │ │ GANTT │ │ BUDGET │ │SETTINGS │                 │
│    └────┬────┘ └───┬───┘ └───┬───┘ └───┬────┘ └─────────┘                 │
│         │          │         │         │                                     │
│         │          │         │         │                                     │
│    ┌────▼──────────▼─────────▼─────────▼────────────────────────────┐       │
│    │                   APPROVAL PIPELINES                            │       │
│    │                                                                 │       │
│    │  PROJECT:  Draft → Technical → Accounting → Supervisor →        │       │
│    │            Superadmin → Approved                                │       │
│    │                                                                 │       │
│    │  BUDGET:   Pending → Accounting Approved → Supervisor           │       │
│    │            Approved → Approved                                  │       │
│    │                                                                 │       │
│    │  TASK:     Submitted → Reviewed (Approved / Rejected /          │       │
│    │            Revision Requested)                                  │       │
│    └────────────────────────────┬────────────────────────────────────┘       │
│                                 │                                            │
│                                 ▼                                            │
│    ┌────────────────────────────────────────────────────────────────┐        │
│    │                    CROSS-CUTTING SYSTEMS                       │        │
│    │                                                                │        │
│    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │        │
│    │  │  AUDIT LOGS  │  │NOTIFICATIONS │  │   EXPORT/REPORTS     │ │        │
│    │  │              │  │              │  │                      │ │        │
│    │  │ Every action │  │ Email +      │  │ PDF + XLS            │ │        │
│    │  │ is logged    │  │ Database +   │  │ Projects, Budget,    │ │        │
│    │  │ immutably    │  │ Real-time    │  │ Audit Logs, Gantt    │ │        │
│    │  └──────────────┘  └──────────────┘  └──────────────────────┘ │        │
│    └────────────────────────────────────────────────────────────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference: Status Values

| Entity | Possible Values |
|--------|----------------|
| Project Status | `active`, `on-hold`, `completed`, `archived` |
| Project Approval | `draft`, `technical_review`, `accounting_review`, `supervisor_review`, `superadmin_review`, `approved`, `revision_requested`, `rejected` |
| Budget Request | `pending`, `accounting_approved`, `supervisor_approved`, `approved`, `revision_requested`, `rejected` |
| Task Status | `todo`, `in-progress`, `review`, `completed` |
| Task Completion | `none`, `pending`, `approved`, `rejected`, `revision_requested` |
| User Status | `active`, `inactive` |
| Gantt Item State | `planned` (0%), `in process` (1-99%), `completed` (100%) |

---

*Document generated for Maptech Information Solutions Inc.*
*Maptech Project Management System v1.0*
