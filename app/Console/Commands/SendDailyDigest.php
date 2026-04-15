<?php

namespace App\Console\Commands;

use App\Models\Task;
use App\Models\User;
use App\Models\Project;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendDailyDigest extends Command
{
    protected $signature = 'digest:send-daily';
    protected $description = 'Send daily email digest to all active users with their task and project summaries';

    public function handle(): int
    {
        $users = User::where('status', 'active')
            ->whereNotNull('email')
            ->get();

        $sentCount = 0;

        foreach ($users as $user) {
            $tasks = Task::where('assigned_to', $user->id)
                ->whereIn('status', ['todo', 'in-progress', 'review'])
                ->orderBy('end_date')
                ->limit(20)
                ->get();

            // Skip users with no active tasks
            if ($tasks->isEmpty()) {
                continue;
            }

            $overdue = $tasks->filter(function ($t) {
                return $t->end_date && $t->end_date->isPast() && $t->status !== 'completed';
            });

            $dueToday = $tasks->filter(function ($t) {
                return $t->end_date && $t->end_date->isToday();
            });

            $inProgress = $tasks->where('status', 'in-progress');

            try {
                Mail::raw($this->buildDigestBody($user, $tasks, $overdue, $dueToday, $inProgress), function ($message) use ($user) {
                    $message->to($user->email)
                        ->subject('Maptech PMS - Daily Digest ' . now()->format('M d, Y'));
                });
                $sentCount++;
            } catch (\Exception $e) {
                $this->warn("Failed to send digest to {$user->email}: {$e->getMessage()}");
            }
        }

        $this->info("Daily digest sent to {$sentCount} users.");

        return self::SUCCESS;
    }

    private function buildDigestBody(User $user, $tasks, $overdue, $dueToday, $inProgress): string
    {
        $lines = [];
        $lines[] = "Hello {$user->name},";
        $lines[] = "";
        $lines[] = "Here's your daily task summary for " . now()->format('l, F j, Y') . ":";
        $lines[] = "";
        $lines[] = "📊 Overview:";
        $lines[] = "  - Active tasks: {$tasks->count()}";
        $lines[] = "  - Overdue: {$overdue->count()}";
        $lines[] = "  - Due today: {$dueToday->count()}";
        $lines[] = "  - In progress: {$inProgress->count()}";

        if ($overdue->isNotEmpty()) {
            $lines[] = "";
            $lines[] = "⚠️ OVERDUE TASKS:";
            foreach ($overdue as $t) {
                $days = now()->diffInDays($t->end_date);
                $lines[] = "  - [{$t->title}] overdue by {$days} day(s)";
            }
        }

        if ($dueToday->isNotEmpty()) {
            $lines[] = "";
            $lines[] = "📅 DUE TODAY:";
            foreach ($dueToday as $t) {
                $lines[] = "  - {$t->title} ({$t->progress}% complete)";
            }
        }

        if ($inProgress->isNotEmpty()) {
            $lines[] = "";
            $lines[] = "🔄 IN PROGRESS:";
            foreach ($inProgress as $t) {
                $lines[] = "  - {$t->title} ({$t->progress}%)";
            }
        }

        $lines[] = "";
        $lines[] = "---";
        $lines[] = "Maptech Project Management System";

        return implode("\n", $lines);
    }
}
