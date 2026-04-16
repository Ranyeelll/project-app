<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BudgetRequestController;
use App\Http\Controllers\Api\IssueController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TaskCompletionController;
use App\Http\Controllers\Api\TaskReviewController;
use App\Http\Controllers\Api\TaskBlockerController;
use App\Http\Controllers\Api\TimeLogController;
use App\Http\Controllers\Api\GanttController;
use App\Http\Controllers\Api\ProjectApprovalController;
use App\Http\Controllers\Api\ProjectFormController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\BulkOperationController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\SystemSettingsController;
use App\Http\Controllers\Api\TaskActivityController;
use App\Http\Controllers\Api\TaskProgressLogController;
use App\Http\Controllers\Api\TaskTimeLogController;
use App\Http\Controllers\Api\TaskCommentController;
use App\Http\Controllers\Api\WorkloadController;
use App\Http\Controllers\Api\ProjectTemplateController;
use App\Http\Controllers\Api\BudgetVarianceController;
use App\Http\Controllers\Api\SprintController;
use App\Http\Controllers\Api\CustomFieldController;
use App\Http\Controllers\Api\DashboardWidgetController;
use App\Http\Controllers\Api\WebhookController;
use App\Http\Controllers\Api\MediaVersionController;
use App\Http\Controllers\Api\ActivityFeedController;
use App\Http\Controllers\Api\TwoFactorController;
use App\Http\Controllers\Api\UserImportController;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Route;

// Serve a consistent favicon at the root to override cached/missing /favicon.ico behavior
Route::get('favicon.ico', function () {
    // Serve the generated 48x48 PNG (copied to favicon.ico) so browsers
    // requesting the root favicon receive the taskbar logo.
    $path = public_path('favicon-48.png');
    if (!file_exists($path)) {
        // fallback to the original PNG if generated favicon missing
        $path = public_path('Maptech_Official_Logo_version2_(1).png');
    }
    if (!file_exists($path)) {
        abort(404);
    }
    return response()->file($path)->header('Content-Type', 'image/vnd.microsoft.icon');
});

/*
|--------------------------------------------------------------------------
| Project Management System (React SPA)
|--------------------------------------------------------------------------
*/
Route::get('/', function () {
    return view('project-management');
})->name('project-management');

// Override the default Breeze /login so it serves the SPA instead
Route::get('/login', function () {
    return view('project-management');
})->name('login');

/*
|--------------------------------------------------------------------------
| API routes for the Project Management SPA
|--------------------------------------------------------------------------
*/
Route::prefix('api')->group(function () {
    // Public routes (no auth required) — rate-limited to prevent brute force
    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:30,1');
    Route::post('/login/2fa', [AuthController::class, 'login2fa'])
        ->middleware('throttle:5,1');
    Route::post('/verify-recovery', [AuthController::class, 'verifyRecovery'])
        ->middleware('throttle:5,15');
    Route::post('/reset-password-offline', [AuthController::class, 'resetPasswordOffline'])
        ->middleware('throttle:5,15');
    Route::get('/users/{user}/photo', [UserController::class, 'servePhoto']);

    // Authenticated routes
    Route::middleware(['auth.api', 'throttle:120,1'])->group(function () {
        // Session bootstrap (any authenticated user)
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);

        // Password change (any authenticated user)
        Route::post('/change-password', [AuthController::class, 'changePassword']);

        // Self-service profile & password (Settings page)
        Route::put('/user/profile', [UserController::class, 'updateProfile']);
        Route::put('/user/password', [UserController::class, 'updatePassword']);

        // ─── Superadmin Only ───────────────────────────────────────
        Route::middleware('role:superadmin')->group(function () {
            // User management
            Route::post('/users', [UserController::class, 'store']);
            Route::put('/users/{user}', [UserController::class, 'update']);
            Route::delete('/users/{user}', [UserController::class, 'destroy']);
            Route::post('/users/{user}/regenerate-recovery', [UserController::class, 'regenerateRecovery']);

            // Bulk user import (CSV)
            Route::post('/users/import', [UserImportController::class, 'import']);

            // Audit logs (superadmin only)
            Route::get('/audit-logs', [AuditLogController::class, 'index']);
            Route::get('/audit-logs/export-pdf', [AuditLogController::class, 'exportPdf']);
            Route::get('/audit-logs/export-sheet', [AuditLogController::class, 'exportSheet']);
            // System settings (superadmin)
            Route::get('/settings/audit-log-retention', [SystemSettingsController::class, 'getAuditLogRetention']);
            Route::put('/settings/audit-log-retention', [SystemSettingsController::class, 'updateAuditLogRetention']);

            // Task delete (superadmin only)
            Route::delete('/tasks/{task}', [TaskController::class, 'destroy']);

            // Issue delete (superadmin only)
            Route::delete('/issues/{issue}', [IssueController::class, 'destroy']);

            // Project templates (superadmin only)
            Route::get('/project-templates', [ProjectTemplateController::class, 'index']);
            Route::post('/project-templates', [ProjectTemplateController::class, 'store']);
            Route::put('/project-templates/{template}', [ProjectTemplateController::class, 'update']);
            Route::delete('/project-templates/{template}', [ProjectTemplateController::class, 'destroy']);
            Route::post('/project-templates/{template}/instantiate', [ProjectTemplateController::class, 'instantiate']);

            // Custom fields management (superadmin only)
            Route::get('/custom-fields', [CustomFieldController::class, 'index']);
            Route::post('/custom-fields', [CustomFieldController::class, 'store']);
            Route::put('/custom-fields/{field}', [CustomFieldController::class, 'update']);
            Route::delete('/custom-fields/{field}', [CustomFieldController::class, 'destroy']);

            // Webhooks (superadmin only)
            Route::get('/webhooks', [WebhookController::class, 'index']);
            Route::post('/webhooks', [WebhookController::class, 'store']);
            Route::put('/webhooks/{webhook}', [WebhookController::class, 'update']);
            Route::delete('/webhooks/{webhook}', [WebhookController::class, 'destroy']);
            Route::get('/webhooks/{webhook}/logs', [WebhookController::class, 'logs']);
            Route::post('/webhooks/{webhook}/regenerate-secret', [WebhookController::class, 'regenerateSecret']);
        });

        // ─── Superadmin + Supervisor (Project management) ───────────
        Route::middleware('role:supervisor')->group(function () {
            Route::post('/projects', [ProjectController::class, 'store']);
            Route::put('/projects/{project}', [ProjectController::class, 'update']);
            Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);
            Route::get('/projects/export-pdf', [ProjectController::class, 'exportPdf']);
            Route::get('/projects/export-sheet', [ProjectController::class, 'exportSheet']);
        });

        // ─── Admin + Technical (Task management + Gantt writes) ────
        Route::middleware('department:Admin,Technical')->group(function () {
            // Admin and Technical can create tasks
            Route::post('/tasks', [TaskController::class, 'store']);

            // Bulk task operations
            Route::post('/bulk/tasks/status', [BulkOperationController::class, 'updateTaskStatus']);
            Route::post('/bulk/tasks/assign', [BulkOperationController::class, 'assignTasks']);

            // Gantt items (Admin + Technical can create/edit/delete)
            Route::post('/projects/{project}/gantt-items', [GanttController::class, 'store']);
            Route::put('/projects/{project}/gantt-items/{item}', [GanttController::class, 'update']);
            Route::delete('/projects/{project}/gantt-items/{item}', [GanttController::class, 'destroy']);
            Route::patch('/projects/{project}/gantt-items/{item}/move', [GanttController::class, 'move']);

            // Gantt report exports
            Route::get('/projects/{project}/gantt-report/export-pdf', [GanttController::class, 'exportPdf']);
            Route::get('/projects/{project}/gantt-report/export-sheet', [GanttController::class, 'exportSheet']);

            // Gantt dependency writes
            Route::post('/projects/{project}/gantt-dependencies', [GanttController::class, 'storeDependency']);
            Route::delete('/projects/{project}/gantt-dependencies/{dependency}', [GanttController::class, 'destroyDependency']);
        });

        // ─── Accounting (+ superadmin bypass) Budget management ────
        Route::middleware('department:Accounting')->group(function () {
            Route::delete('/budget-requests/{budget_request}', [BudgetRequestController::class, 'destroy']);

            // Bulk budget operations
            Route::post('/bulk/budget-requests/status', [BulkOperationController::class, 'updateBudgetStatus']);

            // Budget reports
            Route::get('/budget-report', [BudgetRequestController::class, 'report']);
            Route::get('/budget-report/export-pdf', [BudgetRequestController::class, 'exportPdf']);
            Route::get('/budget-report/export-sheet', [BudgetRequestController::class, 'exportSheet']);
        });

        // ─── Admin + Technical + Accounting (Form review) ──────────
        Route::middleware('department:Admin,Technical,Accounting')->group(function () {
            Route::put('/projects/{project}/form-submissions/{submission}', [ProjectFormController::class, 'update']);
        });

        // ─── Any Authenticated User ───────────────────────────────
        // Dashboard analytics
        Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

        // Workload & resource utilization
        Route::get('/workload', [WorkloadController::class, 'index']);

        // Budget variance / burn rate
        Route::get('/budget-variance', [BudgetVarianceController::class, 'index']);

        // Global activity feed
        Route::get('/activity-feed', [ActivityFeedController::class, 'index']);

        // Dashboard widgets (user-specific)
        Route::get('/dashboard-widgets', [DashboardWidgetController::class, 'index']);
        Route::post('/dashboard-widgets', [DashboardWidgetController::class, 'store']);
        Route::put('/dashboard-widgets/{widget}', [DashboardWidgetController::class, 'update']);
        Route::delete('/dashboard-widgets/{widget}', [DashboardWidgetController::class, 'destroy']);
        Route::post('/dashboard-widgets/reorder', [DashboardWidgetController::class, 'reorder']);

        // Two-factor authentication (own account)
        Route::get('/two-factor/status', [TwoFactorController::class, 'status']);
        Route::post('/two-factor/setup', [TwoFactorController::class, 'setup']);
        Route::post('/two-factor/verify', [TwoFactorController::class, 'verify']);
        Route::post('/two-factor/disable', [TwoFactorController::class, 'disable']);

        // Custom field values (read/write for any entity)
        Route::get('/custom-field-values/{entityType}/{entityId}', [CustomFieldController::class, 'getValues'])
            ->where('entityType', 'project|task');
        Route::post('/custom-field-values/{entityType}/{entityId}', [CustomFieldController::class, 'setValues'])
            ->where('entityType', 'project|task');

        // Read-only users list (used by team views and assignee labels)
        Route::get('/users', [UserController::class, 'index']);

        // Notifications
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
        Route::get('/notification-preferences', [NotificationController::class, 'getPreferences']);
        Route::put('/notification-preferences', [NotificationController::class, 'updatePreferences']);

        // Gantt read access (visibility filtering enforced server-side)
        Route::get('/projects/{project}/gantt-items', [GanttController::class, 'index']);
        Route::get('/projects/{project}/gantt-dependencies', [GanttController::class, 'indexDependencies']);

        // Project approval workflow (authorization enforced in service)
        Route::post('/projects/{project}/approval', [ProjectApprovalController::class, 'transition']);
        Route::get('/projects/{project}/approval-history', [ProjectApprovalController::class, 'history']);

        // Project audit logs (any authenticated user can view their project logs)
        Route::get('/projects/{project}/audit-logs', [AuditLogController::class, 'indexForProject']);

        // Project form submissions (any user can view/submit, review restricted below)
        Route::get('/projects/{project}/form-submissions', [ProjectFormController::class, 'index']);
        Route::post('/projects/{project}/form-submissions', [ProjectFormController::class, 'store']);

        // Profile photo upload (authenticated users)
        Route::post('/users/{user}/profile-photo', [UserController::class, 'uploadPhoto']);

        // View projects (filtered based on department in controller)
        Route::get('/projects', [ProjectController::class, 'index']);

        // View tasks (filtered based on department in controller)
        Route::get('/tasks', [TaskController::class, 'index']);

        // Update tasks (authorization in controller)
        Route::put('/tasks/{task}', [TaskController::class, 'update']);

        // ─── Task Management Forms (Progress, Time Logs, Completion, Review, Blockers) ────
        // Task progress update
        Route::patch('/tasks/{task}/progress', [TaskProgressLogController::class, 'update']);
        Route::get('/tasks/{task}/progress', [TaskProgressLogController::class, 'show']);

        // Task time logs
        Route::get('/tasks/{task}/time-logs', [TaskTimeLogController::class, 'index']);
        Route::post('/tasks/{task}/time-logs', [TaskTimeLogController::class, 'store']);
        Route::put('/tasks/{task}/time-logs/{timeLog}', [TaskTimeLogController::class, 'update']);
        Route::delete('/tasks/{task}/time-logs/{timeLog}', [TaskTimeLogController::class, 'destroy']);

        // Task completion submissions
        Route::get('/tasks/{task}/completions', [TaskCompletionController::class, 'index']);
        Route::post('/tasks/{task}/completions', [TaskCompletionController::class, 'store']);
        Route::put('/tasks/{task}/completions/{completion}', [TaskCompletionController::class, 'update']);

        // Task reviews/approvals
        Route::get('/tasks/{task}/reviews', [TaskReviewController::class, 'index']);
        Route::post('/tasks/{task}/reviews', [TaskReviewController::class, 'store']);
        Route::put('/tasks/{task}/reviews/{review}', [TaskReviewController::class, 'update']);

        // Task blockers/issues
        Route::get('/tasks/{task}/blockers', [TaskBlockerController::class, 'index']);
        Route::post('/tasks/{task}/blockers', [TaskBlockerController::class, 'store']);
        Route::put('/tasks/{task}/blockers/{blocker}', [TaskBlockerController::class, 'update']);
        Route::delete('/tasks/{task}/blockers/{blocker}', [TaskBlockerController::class, 'destroy']);

        // Task activity timeline
        Route::get('/tasks/{task}/activities', [TaskActivityController::class, 'index']);

        // Task comments (discussion threads)
        Route::get('/tasks/{task}/comments', [TaskCommentController::class, 'index']);
        Route::post('/tasks/{task}/comments', [TaskCommentController::class, 'store']);
        Route::put('/tasks/{task}/comments/{comment}', [TaskCommentController::class, 'update']);
        Route::delete('/tasks/{task}/comments/{comment}', [TaskCommentController::class, 'destroy']);

        // Sprints (per project)
        Route::get('/projects/{project}/sprints', [SprintController::class, 'index']);
        Route::post('/projects/{project}/sprints', [SprintController::class, 'store']);
        Route::put('/projects/{project}/sprints/{sprint}', [SprintController::class, 'update']);
        Route::delete('/projects/{project}/sprints/{sprint}', [SprintController::class, 'destroy']);

        // Budget requests (all can view/create, approval in controller)
        Route::get('/budget-requests', [BudgetRequestController::class, 'index']);
        Route::post('/budget-requests', [BudgetRequestController::class, 'store']);
        Route::put('/budget-requests/{budget_request}', [BudgetRequestController::class, 'update']);

        // Media
        Route::get('/media', [MediaController::class, 'index']);
        Route::post('/media', [MediaController::class, 'store']);
        Route::delete('/media/{medium}', [MediaController::class, 'destroy']);
        Route::get('/media/{medium}/download', [MediaController::class, 'download']);
        Route::get('/media/{medium}/serve', [MediaController::class, 'serve']);

        // Media versions (file versioning)
        Route::get('/media/{medium}/versions', [MediaVersionController::class, 'index']);
        Route::post('/media/{medium}/versions', [MediaVersionController::class, 'store']);
        Route::get('/media/{medium}/versions/{version}/download', [MediaVersionController::class, 'download']);

        // Time logs (legacy - proxies to task_time_logs)
        Route::get('/time-logs', [TimeLogController::class, 'index']);
        Route::post('/time-logs', [TimeLogController::class, 'store']);
        Route::delete('/time-logs/{time_log}', [TimeLogController::class, 'destroy']);

        // Issues
        Route::get('/issues', [IssueController::class, 'index']);
        Route::post('/issues', [IssueController::class, 'store']);
        Route::put('/issues/{issue}', [IssueController::class, 'update']);

    });
});

// Legacy photo path fallback for old cached SPA user payloads.
Route::get('/profile-photos/{path}', function (string $path) {
    if (!Storage::disk('public')->exists('profile-photos/' . $path)) {
        abort(404);
    }

    return Storage::disk('public')->response('profile-photos/' . $path);
})->where('path', '.*');

/*
|--------------------------------------------------------------------------
| SPA Catch-All — serves the React SPA for any client-side route
|--------------------------------------------------------------------------
| Must be the LAST route so it does not override API or auth routes.
*/
Route::get('/{any}', function () {
    return view('project-management');
})->where('any', '.*');
