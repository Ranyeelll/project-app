<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskTimeLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @deprecated Use TaskTimeLogController instead.
 * This controller is kept for backward compatibility and proxies to task_time_logs.
 */
class TimeLogController extends Controller
{
    /**
     * List time logs (reads from consolidated task_time_logs).
     */
    public function index(Request $request): JsonResponse
    {
        $query = TaskTimeLog::query();

        if ($request->has('task_id')) {
            $query->where('task_id', $request->input('task_id'));
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        $logs = $query->orderByDesc('date_worked')
            ->orderByDesc('created_at')
            ->limit(1000)
            ->get()
            ->map(fn ($l) => [
                'id'          => (string) $l->id,
                'taskId'      => (string) $l->task_id,
                'userId'      => (string) $l->user_id,
                'hours'       => (float) $l->hours_worked,
                'description' => $l->work_description ?? '',
                'date'        => $l->date_worked?->toIso8601String() ?? '',
            ]);

        return response()->json($logs);
    }

    /**
     * Create a time log (writes to task_time_logs).
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'task_id'     => 'required|exists:tasks,id',
            'user_id'     => 'required|exists:users,id',
            'hours'       => 'required|numeric|min:0.5|max:24',
            'description' => 'nullable|string',
            'date'        => 'required|date',
        ]);

        $log = TaskTimeLog::create([
            'task_id'          => $data['task_id'],
            'user_id'          => $data['user_id'],
            'hours_worked'     => $data['hours'],
            'work_description' => $data['description'] ?? null,
            'date_worked'      => $data['date'],
        ]);

        // Recalculate task's total logged hours
        $total = TaskTimeLog::where('task_id', $data['task_id'])->sum('hours_worked');
        Task::where('id', $data['task_id'])->update(['logged_hours' => $total]);

        return response()->json([
            'id'          => (string) $log->id,
            'taskId'      => (string) $log->task_id,
            'userId'      => (string) $log->user_id,
            'hours'       => (float) $log->hours_worked,
            'description' => $log->work_description ?? '',
            'date'        => $log->date_worked?->toIso8601String() ?? '',
        ], 201);
    }

    /**
     * Delete a time log.
     */
    public function destroy(TaskTimeLog $time_log): JsonResponse
    {
        $taskId = $time_log->task_id;
        $time_log->delete();

        // Recalculate task's total logged hours from consolidated table
        $total = TaskTimeLog::where('task_id', $taskId)->sum('hours_worked');
        Task::where('id', $taskId)->update(['logged_hours' => $total]);

        return response()->json(['message' => 'Time log deleted']);
    }
}
