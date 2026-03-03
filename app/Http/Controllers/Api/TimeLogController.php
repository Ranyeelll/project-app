<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TimeLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TimeLogController extends Controller
{
    /**
     * List all time logs.
     */
    public function index(Request $request): JsonResponse
    {
        $query = TimeLog::query();

        if ($request->has('task_id')) {
            $query->where('task_id', $request->input('task_id'));
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        $logs = $query->orderByDesc('date')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($l) => $this->formatTimeLog($l));

        return response()->json($logs);
    }

    /**
     * Create a new time log and update the task's logged_hours.
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

        $log = TimeLog::create($data);

        // Recalculate task's total logged hours
        $this->recalcTaskHours($log->task_id);

        return response()->json($this->formatTimeLog($log), 201);
    }

    /**
     * Delete a time log and update the task's logged_hours.
     */
    public function destroy(TimeLog $time_log): JsonResponse
    {
        $taskId = $time_log->task_id;
        $time_log->delete();

        // Recalculate task's total logged hours
        $this->recalcTaskHours($taskId);

        return response()->json(['message' => 'Time log deleted']);
    }

    /**
     * Recalculate and update the task's logged_hours from all its time logs.
     */
    private function recalcTaskHours(int $taskId): void
    {
        $total = TimeLog::where('task_id', $taskId)->sum('hours');
        Task::where('id', $taskId)->update(['logged_hours' => $total]);
    }

    /**
     * Format a time log for the frontend (camelCase).
     */
    private function formatTimeLog(TimeLog $l): array
    {
        return [
            'id'          => (string) $l->id,
            'taskId'      => (string) $l->task_id,
            'userId'      => (string) $l->user_id,
            'hours'       => (float) $l->hours,
            'description' => $l->description ?? '',
            'date'        => $l->date?->toDateString() ?? '',
        ];
    }
}
