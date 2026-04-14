<?php

namespace App\Http\Controllers\Api;

use App\Enums\ApprovalStatus;
use App\Enums\Department;
use App\Http\Controllers\Controller;
use App\Models\BudgetRequest;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json([], 401);
        }

        $isEmployee = $user->department === Department::Employee
            && !in_array(strtolower(trim($user->role ?? '')), ['superadmin', 'admin', 'supervisor'], true);

        // Scope projects for employees
        $projectQuery = Project::query();
        if ($isEmployee) {
            $projectQuery->where(function ($q) use ($user) {
                $q->where('manager_id', $user->id)
                  ->orWhereJsonContains('team_ids', (string) $user->id);
            });
        }

        $projectIds = $projectQuery->pluck('id');

        // Project stats
        $projectsByStatus = Project::whereIn('id', $projectIds)
            ->groupBy('status')
            ->selectRaw('status, COUNT(*) as count')
            ->pluck('count', 'status');

        $totalProjects = $projectIds->count();
        $activeProjects = (int) ($projectsByStatus['active'] ?? 0);
        $completedProjects = (int) ($projectsByStatus['completed'] ?? 0);

        // Task stats
        $taskQuery = Task::whereIn('project_id', $projectIds);
        if ($isEmployee) {
            $taskQuery->where('assigned_to', $user->id);
        }
        $taskIds = $taskQuery->pluck('id');

        $tasksByStatus = Task::whereIn('id', $taskIds)
            ->groupBy('status')
            ->selectRaw('status, COUNT(*) as count')
            ->pluck('count', 'status');

        $totalTasks = $taskIds->count();
        $overdueTasks = Task::whereIn('id', $taskIds)
            ->where('end_date', '<', now())
            ->whereNotIn('status', ['completed', 'done', 'approved'])
            ->count();

        $avgTaskProgress = (int) round(
            Task::whereIn('id', $taskIds)->avg('progress') ?? 0
        );

        // Budget stats (admin/accounting only)
        $budgetStats = null;
        if (!$isEmployee) {
            $totalBudget = (float) Project::whereIn('id', $projectIds)->sum('budget');
            $totalSpent = (float) BudgetRequest::whereIn('project_id', $projectIds)
                ->where('status', ApprovalStatus::APPROVED->value)
                ->where('type', 'spending')
                ->sum('amount');
            $totalReportCosts = (float) Task::whereIn('project_id', $projectIds)
                ->where('completion_report_status', ApprovalStatus::APPROVED->value)
                ->sum('report_cost');
            $pendingRequests = BudgetRequest::whereIn('project_id', $projectIds)
                ->whereIn('status', [ApprovalStatus::PENDING->value, ApprovalStatus::ACCOUNTING_APPROVED->value, ApprovalStatus::SUPERVISOR_APPROVED->value])
                ->count();

            $budgetStats = [
                'totalBudget'      => $totalBudget,
                'totalSpent'       => $totalSpent + $totalReportCosts,
                'utilization'      => $totalBudget > 0
                    ? round((($totalSpent + $totalReportCosts) / $totalBudget) * 100, 1)
                    : 0,
                'pendingRequests'  => $pendingRequests,
            ];
        }

        // Team stats (admin only)
        $teamStats = null;
        if (!$isEmployee) {
            $teamStats = [
                'totalUsers'  => User::count(),
                'activeUsers' => User::where('status', 'active')->count(),
                'byDepartment' => User::where('status', 'active')
                    ->groupBy('department')
                    ->selectRaw('department, COUNT(*) as count')
                    ->pluck('count', 'department'),
            ];
        }

        // Recent activity (last 7 days)
        $recentTaskCompletions = Task::whereIn('project_id', $projectIds)
            ->whereIn('status', ['completed', 'done'])
            ->where('updated_at', '>=', now()->subDays(7))
            ->count();

        return response()->json([
            'projects' => [
                'total'     => $totalProjects,
                'active'    => $activeProjects,
                'completed' => $completedProjects,
                'byStatus'  => $projectsByStatus,
            ],
            'tasks' => [
                'total'       => $totalTasks,
                'overdue'     => $overdueTasks,
                'avgProgress' => $avgTaskProgress,
                'byStatus'    => $tasksByStatus,
            ],
            'budget'  => $budgetStats,
            'team'    => $teamStats,
            'recent'  => [
                'taskCompletions7d' => $recentTaskCompletions,
            ],
        ]);
    }
}
