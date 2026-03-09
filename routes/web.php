<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BudgetRequestController;
use App\Http\Controllers\Api\IssueController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TimeLogController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

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
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
    Route::post('/verify-recovery', [AuthController::class, 'verifyRecovery']);
    Route::post('/reset-password-offline', [AuthController::class, 'resetPasswordOffline']);
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{user}', [UserController::class, 'update']);
    Route::delete('/users/{user}', [UserController::class, 'destroy']);
    Route::post('/users/{user}/profile-photo', [UserController::class, 'uploadPhoto']);
    Route::post('/users/{user}/regenerate-recovery', [UserController::class, 'regenerateRecovery']);

    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::put('/projects/{project}', [ProjectController::class, 'update']);
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);

    Route::get('/tasks', [TaskController::class, 'index']);
    Route::post('/tasks', [TaskController::class, 'store']);
    Route::put('/tasks/{task}', [TaskController::class, 'update']);
    Route::delete('/tasks/{task}', [TaskController::class, 'destroy']);

    Route::get('/media', [MediaController::class, 'index']);
    Route::post('/media', [MediaController::class, 'store']);
    Route::delete('/media/{medium}', [MediaController::class, 'destroy']);
    Route::get('/media/{medium}/download', [MediaController::class, 'download']);
    Route::get('/media/{medium}/serve', [MediaController::class, 'serve']);

    Route::get('/time-logs', [TimeLogController::class, 'index']);
    Route::post('/time-logs', [TimeLogController::class, 'store']);
    Route::delete('/time-logs/{time_log}', [TimeLogController::class, 'destroy']);

    Route::get('/budget-requests', [BudgetRequestController::class, 'index']);
    Route::post('/budget-requests', [BudgetRequestController::class, 'store']);
    Route::put('/budget-requests/{budget_request}', [BudgetRequestController::class, 'update']);
    Route::delete('/budget-requests/{budget_request}', [BudgetRequestController::class, 'destroy']);
    Route::get('/budget-report', [BudgetRequestController::class, 'report']);
    Route::get('/budget-report/export-pdf', [BudgetRequestController::class, 'exportPdf']);

    Route::get('/issues', [IssueController::class, 'index']);
    Route::post('/issues', [IssueController::class, 'store']);
    Route::put('/issues/{issue}', [IssueController::class, 'update']);
    Route::delete('/issues/{issue}', [IssueController::class, 'destroy']);
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
