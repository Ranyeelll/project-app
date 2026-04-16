<?php

namespace App\Console\Commands;

use App\Models\Task;
use App\Models\User;
use App\Notifications\OverdueTaskNotification;
use Illuminate\Console\Command;

class NotifyOverdueTasks extends Command
{
    protected $signature = 'tasks:notify-overdue';
    protected $description = 'Send notifications for overdue tasks';

    public function handle(): int
    {
        $overdueTasks = Task::where('status', '!=', 'completed')
            ->whereNotNull('end_date')
            ->whereDate('end_date', '<', now())
            ->with('project:id,name')
            ->get();

        $notified = 0;

        foreach ($overdueTasks as $task) {
            if (!$task->assigned_to) continue;

            $assignee = User::find($task->assigned_to);
            if (!$assignee) continue;

            // Check if we already sent a notification for this task today
            $alreadyNotified = $assignee->notifications()
                ->where('type', OverdueTaskNotification::class)
                ->whereDate('created_at', now()->toDateString())
                ->whereRaw("data::jsonb->>'task_id' = ?", [(string) $task->id])
                ->exists();

            if ($alreadyNotified) continue;

            $assignee->notify(new OverdueTaskNotification([
                'type'         => 'overdue_task',
                'task_id'      => $task->id,
                'task_title'   => $task->title,
                'project_id'   => $task->project_id,
                'project_name' => $task->project?->name ?? 'Unknown',
                'end_date'     => $task->end_date->toIso8601String(),
                'days_overdue' => (int) now()->diffInDays($task->end_date),
                'message'      => "Task \"{$task->title}\" is overdue (was due {$task->end_date->format('M j, Y')}).",
            ]));

            $notified++;
        }

        $this->info("Sent {$notified} overdue task notification(s).");

        return Command::SUCCESS;
    }
}
