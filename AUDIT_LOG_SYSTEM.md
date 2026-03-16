# Append-Only Audit Log System

## Overview

The audit log system provides immutable, append-only logging of important system events. All entries are automatically timestamped and include full context information for compliance and security auditing.

## Key Features

- **Immutable Records**: Audit logs cannot be modified or deleted (enforced at model level)
- **Auto-Captured Context**: IP address, user agent, request ID, and user role are automatically captured
- **JSON Storage**: Complex data (changes, snapshot, context) stored as JSON for queryability
- **Sensitive Flag**: Marks high-security operations for special handling
- **Append-Only**: New events are only appended; history is never modified

## Schema

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | bigint | Primary key |
| `user_id` | bigint | ID of user who performed action |
| `actor_role` | string | Role/department of the actor (auto-populated from user) |
| `action` | string | Action name (e.g., `project.approval`, `chat.moderated`) |
| `resource_type` | string | Type of resource (e.g., `project`, `task`, `chat_message`) |
| `resource_id` | bigint | ID of the resource being audited |
| `project_id` | bigint | Associated project (can be null) |
| `changes` | json | Field-level changes (old→new values) |
| `snapshot` | json | Full resource snapshot after change |
| `context` | json | Additional context for the event |
| `ip_address` | string | IP address of requester |
| `user_agent` | string | User agent string |
| `request_id` | string | Trace ID for request correlation |
| `performed_via` | string | Channel: `web`, `api`, `cli`, `system` |
| `sensitive_flag` | boolean | Marks sensitive operations |
| `created_at` | timestamp | When the event occurred (immutable) |

### Indexes

- `resource_type` + `resource_id`: Query all events for a resource
- `action`: Query all events of a specific type
- `user_id`: Query all events by a user
- `project_id`: Query all events in a project
- `created_at`: Time-based queries

## Usage

### Static API (Recommended)

```php
use App\Services\AuditService;

// Project approval
AuditService::logProjectApproval($projectId, ['reason' => 'Demo'], $userId);

// Project export
AuditService::logProjectExport($projectId, null, $userId);

// Visibility changes
AuditService::logVisibilityChange(
    resourceId: $taskId,
    resourceType: 'task',
    oldVisibility: 'private',
    newVisibility: 'public',
    projectId: $projectId
);

// Serial assignment
AuditService::logSerialAssignment($projectId, 'PROJ-2024-001', $userId);

// Serial backfill (typically from CLI/migration)
AuditService::logSerialBackfill($projectId, 'PROJ-2024-001', ['batch' => 'import']);

// Chat moderation
AuditService::logChatModeration(
    messageId: $messageId,
    projectId: $projectId,
    action: 'deleted',
    moderationDetails: ['reason' => 'Inappropriate content'],
    userId: $userId
);

// Generic logging
AuditService::log(
    action: 'custom.event',
    resourceType: 'custom_resource',
    resourceId: 123,
    projectId: $projectId,
    changes: ['field' => ['old' => 'value', 'new' => 'value2']],
    snapshot: ['full' => 'state'],
    context: ['extra' => 'data']
);
```

### Instance API (in Controllers)

```php
use App\Services\AuditService;

class MyController extends Controller
{
    public function __construct(private AuditService $audit) {}

    public function updateProject(Request $request, Project $project)
    {
        $oldStatus = $project->status;
        $project->update($request->validated());

        // Log the change
        $this->audit->projectStatusChanged($project, $oldStatus, $request->status);

        return $project;
    }

    public function deleteProject(Project $project)
    {
        $this->audit->projectDeleted($project);
        $project->delete();
    }
}
```

### Querying Audit Logs

```php
use App\Services\AuditService;

// All events for a resource
AuditService::forResource('project', $projectId)->get();

// All events in a project
AuditService::forProject($projectId)->paginate(25);

// All events of a specific type
AuditService::byAction('project.approval')->get();

// All sensitive operations
AuditService::sensitive()->whereDate('created_at', today())->get();

// With custom filters
AuditLog::where('actor_role', 'Manager')
    ->whereBetween('created_at', [$start, $end])
    ->orderBy('created_at', 'desc')
    ->get();
```

## Events Currently Tracked

### Projects
- ✅ `project.created` - Project creation
- ✅ `project.status_change` - Status changes (active→completed, etc.)
- ✅ `project.approval` - Project approval
- ✅ `project.export` - Project export (PDF/Excel)
- ✅ `project.visibility_change` - Visibility changes
- ✅ `project.serial_assignment` - Serial number assignment
- ✅ `project.serial_backfill` - Serial backfill from migration
- ✅ `project.deleted` - Project deletion

### Budget
- ✅ `budget_request.approved` - Budget request approval
- ✅ `budget_request.rejected` - Budget request rejection
- ✅ `budget_request.revision_requested` - Revision requests
- ✅ `budget.report_exported` - Report exports (PDF/XLSX)

### Chat (Ready for Implementation)
- 🔲 `chat.deleted` - Message deletion
- 🔲 `chat.moderated` - Manual moderation
- 🔲 `chat.flagged` - Automated flagging

## Immutability Guarantees

The model enforces immutability at the ORM level:

```php
$audit = AuditLog::find(1);
$audit->update(['action' => 'something']); // Throws LogicException
$audit->delete();                           // Throws LogicException
```

## Database Considerations

### Performance
- Audit logs should be write-optimized (few indexes on write paths)
- Query-optimized for common patterns (resource lookup, time range)
- Consider archiving/partitioning old logs in high-volume systems

### Storage
- JSON fields can grow; monitor for bloat
- Use `changes` for deltas, `snapshot` for full state
- `context` for operation-specific metadata only

### Compliance
- No deletion/modification guarantees GDPR audit trail compliance
- `sensitive_flag` can trigger extra data handling policies
- `ip_address` + `request_id` enable correlation with other logs

## Migrations

The audit system comes with automatic migrations:

1. **2026_03_16_100001**: Initial audit_logs table creation
2. **2026_03_16_200000**: Final audit_logs schema with all fields
3. **2026_03_16_200001**: Backfill audit logs for existing project serials

Run migrations:
```bash
php artisan migrate
```

## Error Handling

If audit logging fails, the main operation should still complete (audit is secondary):

```php
try {
    $project->update($data);
    AuditService::log(...);
} catch (\Exception $e) {
    // Log error but don't fail the request
    \Log::warning('Audit log failed', ['error' => $e->getMessage()]);
}
```

## Future Events to Track

Consider adding audit logging for:
- User permission changes
- Contract approvals
- Expense report approvals
- Template modifications
- System configuration changes
- Data export requests (for GDPR compliance)
