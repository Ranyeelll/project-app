<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BudgetRequestController;
use App\Http\Controllers\Api\IssueController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TaskActivityController;
use App\Http\Controllers\Api\TaskProgressLogController;
use App\Http\Controllers\Api\TaskTimeLogController;
use App\Http\Controllers\Api\TaskCompletionController;
use App\Http\Controllers\Api\TaskReviewController;
use App\Http\Controllers\Api\TaskBlockerController;
use App\Http\Controllers\Api\TimeLogController;
use App\Http\Controllers\Api\GanttController;
use App\Http\Controllers\Api\ProjectApprovalController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

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
    // Public routes (no auth required)
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/verify-recovery', [AuthController::class, 'verifyRecovery']);
    Route::post('/reset-password-offline', [AuthController::class, 'resetPasswordOffline']);

    // Authenticated routes
    Route::middleware('auth.api')->group(function () {
        // Password change (any authenticated user)
        Route::post('/change-password', [AuthController::class, 'changePassword']);

        // ─── Admin Only ───────────────────────────────────────────
        Route::middleware('department:Admin')->group(function () {
            // User management
            Route::get('/users', [UserController::class, 'index']);
            Route::post('/users', [UserController::class, 'store']);
            Route::put('/users/{user}', [UserController::class, 'update']);
            Route::delete('/users/{user}', [UserController::class, 'destroy']);
            Route::post('/users/{user}/regenerate-recovery', [UserController::class, 'regenerateRecovery']);

            // Project management (full CRUD)
            Route::post('/projects', [ProjectController::class, 'store']);
            Route::put('/projects/{project}', [ProjectController::class, 'update']);
            Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);

            // Task delete (Admin only)
            Route::delete('/tasks/{task}', [TaskController::class, 'destroy']);

            // Issue delete (Admin only)
            Route::delete('/issues/{issue}', [IssueController::class, 'destroy']);
        });

        // ─── Admin + Technical (Task management + Gantt) ──────────
        Route::middleware('department:Admin,Technical')->group(function () {
            // Admin and Technical can create tasks
            Route::post('/tasks', [TaskController::class, 'store']);

            // Gantt items (Admin + Technical can edit gantt charts)
            Route::get('/projects/{project}/gantt-items', [GanttController::class, 'index']);
            Route::post('/projects/{project}/gantt-items', [GanttController::class, 'store']);
            Route::put('/projects/{project}/gantt-items/{item}', [GanttController::class, 'update']);
            Route::delete('/projects/{project}/gantt-items/{item}', [GanttController::class, 'destroy']);
            Route::patch('/projects/{project}/gantt-items/{item}/move', [GanttController::class, 'move']);

            // Gantt dependencies
            Route::get('/projects/{project}/gantt-dependencies', [GanttController::class, 'indexDependencies']);
            Route::post('/projects/{project}/gantt-dependencies', [GanttController::class, 'storeDependency']);
            Route::delete('/projects/{project}/gantt-dependencies/{dependency}', [GanttController::class, 'destroyDependency']);
        });

        // ─── Admin + Accounting (Budget management) ───────────────
        Route::middleware('department:Admin,Accounting')->group(function () {
            // Budget approvals and management
            Route::put('/budget-requests/{budget_request}', [BudgetRequestController::class, 'update']);
            Route::delete('/budget-requests/{budget_request}', [BudgetRequestController::class, 'destroy']);

            // Budget reports
            Route::get('/budget-report', [BudgetRequestController::class, 'report']);
            Route::get('/budget-report/export-pdf', [BudgetRequestController::class, 'exportPdf']);
            Route::get('/budget-report/export-sheet', [BudgetRequestController::class, 'exportSheet']);
        });

        // ─── Any Authenticated User ───────────────────────────────
        // Project approval workflow (authorization enforced in service)
        Route::post('/projects/{project}/approval', [ProjectApprovalController::class, 'transition']);
        Route::get('/projects/{project}/approval-history', [ProjectApprovalController::class, 'history']);

        // Profile photo (users can access)
        Route::post('/users/{user}/profile-photo', [UserController::class, 'uploadPhoto']);
        Route::get('/users/{user}/photo', [UserController::class, 'servePhoto']);

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

        // Budget requests (all can view/create, approval in controller)
        Route::get('/budget-requests', [BudgetRequestController::class, 'index']);
        Route::post('/budget-requests', [BudgetRequestController::class, 'store']);

        // Media
        Route::get('/media', [MediaController::class, 'index']);
        Route::post('/media', [MediaController::class, 'store']);
        Route::delete('/media/{medium}', [MediaController::class, 'destroy']);
        Route::get('/media/{medium}/download', [MediaController::class, 'download']);
        Route::get('/media/{medium}/serve', [MediaController::class, 'serve']);

        // Time logs
        Route::get('/time-logs', [TimeLogController::class, 'index']);
        Route::post('/time-logs', [TimeLogController::class, 'store']);
        Route::delete('/time-logs/{time_log}', [TimeLogController::class, 'destroy']);

        // Issues
        Route::get('/issues', [IssueController::class, 'index']);
        Route::post('/issues', [IssueController::class, 'store']);
        Route::put('/issues/{issue}', [IssueController::class, 'update']);

        // Chat (all departments)
        Route::get('/projects/{project}/messages', [MessageController::class, 'index']);
        Route::post('/projects/{project}/messages', [MessageController::class, 'store']);
        Route::post('/projects/{project}/messages/read', [MessageController::class, 'markRead']);
        Route::post('/projects/{project}/messages/typing', [MessageController::class, 'typing']);
        Route::patch('/messages/{message}', [MessageController::class, 'update']);
        Route::delete('/messages/{message}', [MessageController::class, 'destroy']);
        Route::get('/chat-attachments/{message}/{index}', [MessageController::class, 'serveAttachment']);
    });
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';

/*
|--------------------------------------------------------------------------
| SPA Catch-All — serves the React SPA for any client-side route
|--------------------------------------------------------------------------
| Must be the LAST route so it does not override API or auth routes.
*/
Route::get('/{any}', function () {
    return view('project-management');
})->where('any', '.*');
