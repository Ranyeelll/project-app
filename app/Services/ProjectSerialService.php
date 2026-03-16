<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Facades\DB;

class ProjectSerialService
{
    public function __construct(
        private AuditService $audit
    ) {}

    /**
     * Generate a unique project serial in the format MAP-YYYY-000000.
     * Uses advisory lock to ensure uniqueness under concurrent creation.
     */
    public function generate(?int $year = null): string
    {
        $year = $year ?? (int) date('Y');
        $prefix = "MAP-{$year}-";

        return DB::transaction(function () use ($prefix) {
            DB::statement("SELECT pg_advisory_xact_lock(hashtext('project_serial'))");

            $latestSerial = DB::table('projects')
                ->where('serial', 'like', $prefix . '%')
                ->orderByDesc('serial')
                ->value('serial');

            $nextSequence = $latestSerial
                ? (int) substr($latestSerial, -6) + 1
                : 1;

            return $prefix . str_pad($nextSequence, 6, '0', STR_PAD_LEFT);
        });
    }

    /**
     * Assign a serial to a project and log the action.
     */
    public function assignSerial(Project $project, ?int $userId = null, ?int $year = null): string
    {
        if ($project->serial) {
            return $project->serial;
        }

        $serial = $this->generate($year);
        $project->serial = $serial;
        $project->save();

        $this->audit->serialAssigned($project, $serial, $userId);

        return $serial;
    }
}
