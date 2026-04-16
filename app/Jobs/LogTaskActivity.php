<?php

namespace App\Jobs;

use App\Services\TaskActivityLogger;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class LogTaskActivity implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public int $taskId,
        public string $fileName,
        public string $fileType,
        public int $userId,
    ) {}

    public function handle(): void
    {
        // Temporarily authenticate as the uploading user so that
        // TaskActivityLogger can resolve the actor name correctly.
        $user = \App\Models\User::find($this->userId);

        \Illuminate\Support\Facades\Auth::setUser($user);

        TaskActivityLogger::fileUploaded($this->taskId, $this->fileName, $this->fileType);
    }
}
