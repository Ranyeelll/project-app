# Task Activity Timeline - Implementation Guide

## Overview

The task activity timeline displays a chronological record of all actions performed on a task. It provides users with complete visibility into who did what and when on any task detail page.

**Two-Tier Logging System:**
- `audit_logs` - Compliance/security, immutable, detailed metadata (for auditing department)
- `task_activity_logs` - User-facing timeline, lightweight, human-readable (for task detail page)

## Architecture

### Database

**Table: `task_activity_logs`**
```
- id: Primary key
- task_id: Foreign key to tasks (cascadeOnDelete)
- user_id: Foreign key to users (nullOnDelete)
- action_type: string (task_created, progress_updated, time_logged, etc.)
- description: text (human-readable for UI display)
- metadata: json (additional context - old/new values, hours, etc.)
- created_at: timestamp (immutable)
```

**Indexes:**
- task_id (primary query pattern)
- created_at (for ordering)
- user_id (for activity filtering)

### Models

**TaskActivityLog** (`app/Models/TaskActivityLog.php`)
- Immutable (update/delete throw LogicException)
- Relationships: `belongsTo Task`, `belongsTo User`
- Helper: `static forTask(int $taskId)` - Get full timeline for task

### Services

**TaskActivityLogger** (`app/Services/TaskActivityLogger.php`)
- Static methods for each action type
- Auto-captures current user
- Generates human-readable descriptions
- Normalizes metadata

## Tracked Actions

### Basic Task Lifecycle
1. **task_created** - When task is created
   - Description: "Alice created task: Build login form"
   - Metadata: {task_name: "Build login form"}

2. **task_updated** - When generic fields change (description, dates, etc.)
   - Description: "Alice updated: description, estimated_hours"
   - Metadata: {description: "...", estimated_hours: 8}

3. **task_assigned** - When task is assigned for first time
   - Description: "Alice assigned this task to Bob"
   - Metadata: {assigned_to: "Bob"}

4. **task_reassigned** - When task ownership changes
   - Description: "Alice reassigned from Bob to Charlie"
   - Metadata: {old_assignee: "Bob", new_assignee: "Charlie"}

5. **status_changed** - When task status changes
   - Description: "Alice changed status from 'in-progress' to 'review'"
   - Metadata: {old_status: "in-progress", new_status: "review"}

### Task Management Form Actions
6. **progress_updated** - When progress is logged
   - Description: "Bob updated progress to 75%"
   - Metadata: {percentage: 75}

7. **time_logged** - When time is logged
   - Description: "Bob logged 8.5 hours on Mar 16"
   - Metadata: {hours: 8.5, date_worked: "2026-03-16"}

8. **completion_submitted** - When completion is submitted
   - Description: "Bob submitted completion"
   - Metadata: {summary: "Implementation complete..."}

9. **task_reviewed** - When review/approval is submitted
   - Description: "Alice approved this task" / "rejected" / "requested revision for"
   - Metadata: {review_status: "approved"}

10. **issue_reported** - When blocker/issue is reported
    - Description: "Bob reported a critical blocker: Database timeout"
    - Metadata: {issue_title: "Database timeout", priority: "critical"}

### Future Extensions
11. **file_uploaded** - Ready for file upload tracking
    - Description: "Charlie uploaded design: wireframes.pdf"
    - Metadata: {file_name: "wireframes.pdf", file_type: "design"}

## API

### Fetch Task Activity Timeline

**Endpoint:** `GET /api/tasks/{task}/activities`

**Authorization:**
- ✅ Assigned user (employee on their own task)
- ✅ Managers (all tasks)
- ✅ Admins (all tasks)
- ❌ Unassigned employee (403 Forbidden)

**Response:**
```json
{
  "taskId": "1",
  "taskTitle": "Build login form",
  "totalActivities": 12,
  "activities": [
    {
      "id": "1",
      "taskId": "1",
      "userId": "5",
      "userName": "Alice Smith",
      "userEmail": "alice@example.com",
      "actionType": "task_created",
      "description": "Alice created task: Build login form",
      "metadata": {
        "task_name": "Build login form"
      },
      "createdAt": "2026-03-16T10:00:00.000Z",
      "createdAtFormatted": "Mar 16, 2026 10:00"
    },
    // ... more activities in chronological order
  ]
}
```

## Integration Points

### 1. TaskController (`app/Http/Controllers/Api/TaskController.php`)
- **store()**: `TaskActivityLogger::taskCreated()`
- **update()**: `TaskActivityLogger::statusChanged()`, `taskAssigned()`, `taskReassigned()`, `taskUpdated()`

### 2. TaskProgressLogController
- **update()**: `TaskActivityLogger::progressUpdated()`

### 3. TaskTimeLogController
- **store()**: `TaskActivityLogger::timeLogged()`

### 4. TaskCompletionController
- **store()**: `TaskActivityLogger::completionSubmitted()`

### 5. TaskReviewController
- **store()**: `TaskActivityLogger::reviewSubmitted()`

### 6. TaskBlockerController
- **store()**: `TaskActivityLogger::issueReported()`

## Usage Example

### Frontend Integration (React/Vue)

```javascript
// Fetch task with timeline
GET /api/tasks/1/activities

// Response: Array of activities
activities.map(activity => (
  <div key={activity.id} className="timeline-item">
    <Avatar user={activity.userName} />
    <div class="activity-content">
      <p>{activity.description}</p>
      <small>{activity.createdAtFormatted}</small>
    </div>
  </div>
))
```

### Task Timeline Component Usage

```tsx
<TaskActivityTimeline
  taskId={taskId}
  activities={activities}
  isLoading={loading}
/>
```

## Key Design Decisions

1. **Separate from audit_logs**: `task_activity_logs` is UI-focused and lightweight. `audit_logs` remains for compliance.
2. **Immutable records**: No updates or deletes, ensuring trust and integrity of timeline.
3. **Human-readable descriptions**: Stored in DB, not generated at runtime.
4. **Service-based logging**: All logging goes through `TaskActivityLogger` for consistency and single source of truth.
5. **JSON metadata**: Flexible structure to capture context specific to each action.
6. **Auto-captured user**: Current authenticated user is automatically captured.
7. **Chronological ordering**: Activities ordered by created_at ASC (oldest first).

## Logging Flow

```
User Action → Controller Method → Service/Model Update → TaskActivityLogger::action()
                                                         ↓
                                                    TaskActivityLog::create()
                                                         ↓
                                                    task_activity_logs table
```

Example: Time Log Creation
```
POST /tasks/1/time-logs
  ↓
TaskTimeLogController::store()
  ↓
TaskTimeLog::create() + Task.logged_hours recalc
  ↓
AuditService::logTaskTimeLogged() → audit_logs
  ↓
TaskActivityLogger::timeLogged() → task_activity_logs
```

## Visibility & Authorization

| User Role | Visibility |
|-----------|-----------|
| Task Assignee | Own tasks only |
| Manager | All tasks |
| Technical | All tasks |
| Accounting | All tasks |
| Admin | All tasks |
| Unassigned Employee | 403 Forbidden |

Authorization is enforced in `TaskActivityController::index()` controller method.

## Database Migration

Migration: `2026_03_16_400000_create_task_activity_logs_table.php`

Creates table with:
- Proper foreign keys and cascading
- Indexes on task_id, created_at, user_id
- JSON metadata column for flexible context
- Immutable created_at (no updated_at)

## Files Involved

### New Files
- `database/migrations/2026_03_16_400000_create_task_activity_logs_table.php`
- `app/Models/TaskActivityLog.php`
- `app/Services/TaskActivityLogger.php`
- `app/Http/Controllers/Api/TaskActivityController.php`

### Modified Files
- `routes/web.php` - Added GET route
- `app/Http/Controllers/Api/TaskController.php` - 2 logging calls
- `app/Http/Controllers/Api/TaskProgressLogController.php` - 1 logging call
- `app/Http/Controllers/Api/TaskTimeLogController.php` - 1 logging call
- `app/Http/Controllers/Api/TaskCompletionController.php` - 1 logging call
- `app/Http/Controllers/Api/TaskReviewController.php` - 1 logging call
- `app/Http/Controllers/Api/TaskBlockerController.php` - 1 logging call

## Testing

### Unit Tests
```php
// Test immutability
public function test_activity_logs_cannot_be_updated() {
    $activity = TaskActivityLog::factory()->create();
    $this->expectException(LogicException::class);
    $activity->update(['description' => 'new']);
}

// Test relationships
public function test_activity_log_has_task() {
    $activity = TaskActivityLog::factory()->create();
    $this->assertNotNull($activity->task);
}

// Test service
public function test_logger_creates_activity_with_user() {
    Auth::shouldReceive('user')->andReturn($user);
    TaskActivityLogger::taskCreated(1, 'Test Task');
    $this->assertDatabaseHas('task_activity_logs', [
        'action_type' => 'task_created',
        'user_id' => $user->id,
    ]);
}
```

### Feature Tests
```php
// Test timeline endpoint
public function test_fetch_task_activities() {
    $task = Task::factory()->create();
    TaskActivityLogger::taskCreated($task->id, $task->title);

    $response = $this->actingAs($task->assignee)
        ->get("/api/tasks/{$task->id}/activities");

    $response->assertJsonCount(1, 'activities');
    $response->assertJsonPath('activities.0.actionType', 'task_created');
}

// Test authorization
public function test_unassigned_employee_cannot_view_timeline() {
    $task = Task::factory()->create(['assigned_to' => null]);
    $employee = User::factory()->employee()->create();

    $response = $this->actingAs($employee)
        ->get("/api/tasks/{$task->id}/activities");

    $response->assertStatus(403);
}

// Test activity logging on different actions
public function test_all_actions_logged() {
    $task = Task::factory()->create();
    TaskActivityLogger::taskCreated($task->id, $task->title);
    TaskActivityLogger::progressUpdated($task->id, 50);
    TaskActivityLogger::timeLogged($task->id, 8.5, '2026-03-16');

    $response = $this->actingAs($task->assignee)
        ->get("/api/tasks/{$task->id}/activities");

    $response->assertJsonCount(3, 'activities');
}
```

## Verification Checklist

✅ Migration runs: `php artisan migrate`
✅ Model loads: `php tinker` → `TaskActivityLog::all()`
✅ Route exists: `php artisan route:list | grep activities`
✅ Activities logged on task creation
✅ Activities logged on status changes
✅ Activities logged on assignment/reassignment
✅ Activities logged for all form actions
✅ Authorization works (employees can't view other tasks)
✅ Timeline displays in chronological order
✅ User information (name, email) available in responses
✅ Metadata captures context-specific information

## Performance Considerations

- **Indexes**: task_id, created_at, user_id for fast queries
- **Eager loading**: Includes user data in API response
- **Immutable**: No UPDATE queries, only INSERT/SELECT
- **JSON metadata**: Flexible but reasonable size

## Future Enhancements

1. **Pagination** - For tasks with many activities
2. **Filtering** - By action type, date range, user
3. **WebSocket updates** - Real-time timeline updates
4. **Activity streaming** - Stream to connected clients
5. **Archive** - Move old activities to archive table after 1 year
6. **Analytics** - Aggregate metrics from activities

---

**Status**: ✅ Ready for production deployment
