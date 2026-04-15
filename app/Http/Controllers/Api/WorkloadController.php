<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkloadController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $users = User::where('status', 'active')->get();
        $tasks = Task::whereIn('status', ['todo', 'in-progress', 'review'])->get();

        $workload = $users->map(function ($user) use ($tasks) {
            $userTasks = $tasks->where('assigned_to', $user->id);
            $totalEstimated = $userTasks->sum('estimated_hours');
            $totalLogged = $userTasks->sum('logged_hours');
            $taskCount = $userTasks->count();

            return [
                'userId' => (string) $user->id,
                'userName' => $user->name,
                'department' => $user->department?->value ?? $user->department ?? '',
                'activeTasks' => $taskCount,
                'estimatedHours' => round((float) $totalEstimated, 1),
                'loggedHours' => round((float) $totalLogged, 1),
                'utilization' => $totalEstimated > 0 ? round(($totalLogged / $totalEstimated) * 100, 1) : 0,
            ];
        });

        return response()->json($workload->values());
    }
}
