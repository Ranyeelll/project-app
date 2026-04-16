# User Manual

**Maptech Information Solutions Inc. — Project Management System v5.0**

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard](#2-dashboard)
3. [Project Management](#3-project-management)
4. [Task Management](#4-task-management)
5. [Budget Management](#5-budget-management)
6. [Gantt Charts](#6-gantt-charts)
7. [Media Management](#7-media-management)
8. [Issue Tracking](#8-issue-tracking)
9. [Reports & Exports](#9-reports--exports)
10. [User Administration](#10-user-administration)
11. [Account Settings](#11-account-settings)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Getting Started

### 1.1 Logging In
1. Navigate to the application URL
2. Enter your email and password
3. If 2FA is enabled, enter the 6-digit code from your authenticator app
4. Click **Login**

### 1.2 First-Time Setup
- Change your default password immediately via **Account Settings**
- Optionally enable Two-Factor Authentication for enhanced security

### 1.3 Navigation
The left sidebar provides access to all system modules. Available menu items depend on your department role.

---

## 2. Dashboard

The dashboard provides an overview of your projects, tasks, and key metrics.

### 2.1 Widgets
- Customize your dashboard by configuring widget preferences
- Available widgets include: project summary, task status breakdown, budget overview, recent activity

---

## 3. Project Management

### 3.1 Creating a Project
Use the 5-step creation wizard:
1. **Basic Info** — Project name, description, dates
2. **Team** — Assign team members
3. **Stakeholders** — Add stakeholder contacts
4. **Details** — Additional project details and custom fields
5. **Review** — Confirm and submit

### 3.2 Creating from Template
1. Click **New Project from Template**
2. Select a template
3. Customize the pre-filled project data
4. Submit for approval

### 3.3 Project Approval
Projects follow a multi-stage approval pipeline:
- **Technical Review** → **Accounting Review** → **Admin Approval**
- You will be notified when action is required

### 3.4 Kanban Board
- View tasks in a drag-and-drop board layout
- Move tasks between status columns
- Filter by assignee, priority, or sprint

---

## 4. Task Management

### 4.1 Creating Tasks
- Navigate to a project → **Tasks** tab
- Click **Add Task** and fill in details (title, description, assignee, due date, priority)
- Optionally assign to a sprint

### 4.2 Time Logging
- Open a task → click **Log Time**
- Enter hours worked and description
- Time entries are tracked per task

### 4.3 Completion Reports
- When a task is done, submit a **Completion Report**
- Supervisor reviews and approves/rejects

### 4.4 Task Comments
- Open a task → **Comments** section
- Add comments with optional threading (replies)
- All team members on the project can participate

### 4.5 Bulk Operations
- Select multiple tasks using checkboxes
- Use **Bulk Actions** to update status or reassign

---

## 5. Budget Management

### 5.1 Submitting a Budget Request
1. Navigate to a project → **Budget** tab
2. Click **New Budget Request**
3. Fill in amount, justification, and line items
4. Submit for approval

### 5.2 Budget Approval
- Accounting reviews first, then Supervisor
- You receive notifications on approval/rejection

### 5.3 Budget Variance
- View budget vs. actual spending analysis
- Identify over/under-budget items

---

## 6. Gantt Charts

### 6.1 Viewing the Gantt Chart
- Navigate to a project → **Gantt** tab
- View phases, steps, milestones on the timeline

### 6.2 Managing Dependencies
- Link steps with dependency types: Finish-to-Start, Start-to-Start, Finish-to-Finish, Start-to-Finish
- The system validates for circular dependencies

### 6.3 Exporting
- Click **Export** to generate PDF or image of the Gantt chart

---

## 7. Media Management

### 7.1 Uploading Files
- Navigate to a project → **Media** tab
- Click **Upload** and select files
- Files are versioned automatically

### 7.2 Downloading Files
- Click on any file to download
- Access is restricted to project team members

### 7.3 Version History
- View file version history
- Download previous versions as needed

---

## 8. Issue Tracking

Track project risks, issues, assumptions, and dependencies (RAID log):

- **Risks** — Potential problems and mitigation plans
- **Issues** — Active problems requiring resolution
- **Assumptions** — Project assumptions to validate
- **Dependencies** — External dependencies to track

---

## 9. Reports & Exports

### 9.1 Budget Reports
- **PDF Reports** — Formatted budget summaries
- **Excel Reports** — Detailed spreadsheets for analysis

### 9.2 Gantt Export
- Export Gantt charts as PDF or image

### 9.3 Audit Log
- Admins can view the complete audit trail
- Filter by user, action type, date range, or entity

---

## 10. User Administration

*(Admin users only)*

### 10.1 Managing Users
- **Users** page → Add, edit, or deactivate users
- Assign department and role

### 10.2 Bulk User Import
- Prepare a CSV file with user data (name, email, department, role)
- Upload via **Import Users**
- System validates and creates accounts with default passwords

### 10.3 Webhooks
- Configure external system integrations
- Set URL, events to subscribe to, and authentication

---

## 11. Account Settings

### 11.1 Change Password
- Navigate to **Account Settings** → **Change Password**
- Enter current password and new password (minimum 12 characters)

### 11.2 Two-Factor Authentication
1. Go to **Account Settings** → **Security**
2. Click **Enable 2FA**
3. Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
4. Enter the 6-digit verification code to confirm
5. Store backup codes securely

### 11.3 Notification Preferences
- Configure which notifications you receive
- Choose delivery channels (email, in-app)

---

## 12. Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't log in | Check credentials; wait 1 minute if rate-limited; contact admin if locked out |
| 2FA code rejected | Ensure your device clock is synchronized; use a backup code |
| Session expired | Re-login; this occurs after inactivity |
| File upload fails | Check file size limits; ensure you're a project team member |
| Missing project/task | Verify you are assigned to the project team |
| Export not generating | Try again; check browser downloads; contact admin |
| Notifications not arriving | Check notification preferences; verify email configuration with admin |

---

*For technical documentation, see [docs/SYSTEM_DOCUMENTATION.md](../docs/SYSTEM_DOCUMENTATION.md).*
