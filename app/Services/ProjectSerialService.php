<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ProjectSerialService
{
    public function __construct(
        private AuditService $audit
    ) {}

    /**
     * Generate a unique project serial in the format MAP-YYYY-XXXXXXXXXX.
     * XXXXXXXXXX is a random 10-digit number.
     * Uses advisory lock to ensure uniqueness under concurrent creation.
     */
    public function generate(?int $year = null): string
    {
        $year = $year ?? (int) date('Y');
        $prefix = "MAP-{$year}-";

        return DB::transaction(function () use ($prefix) {
            $driver = DB::getDriverName();

            if ($driver === 'pgsql') {
                DB::statement("SELECT pg_advisory_xact_lock(hashtext('project_serial'))");
            }

            // lockForUpdate is supported by mysql/pgsql/sqlserver and helps avoid races.
            $baseQuery = DB::table('projects');
            if (in_array($driver, ['mysql', 'pgsql', 'sqlsrv'], true)) {
                $baseQuery->lockForUpdate();
            }

            for ($attempt = 0; $attempt < 20; $attempt++) {
                $candidate = $prefix . str_pad((string) random_int(0, 9999999999), 10, '0', STR_PAD_LEFT);
                $exists = (clone $baseQuery)->where('serial', $candidate)->exists();

                if (!$exists) {
                    return $candidate;
                }
            }

            throw new RuntimeException('Unable to generate unique project serial.');
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

        $lastError = null;
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $serial = $this->generate($year);
            $project->serial = $serial;

            try {
                $project->save();
                $this->audit->serialAssigned($project, $serial, $userId);
                return $serial;
            } catch (QueryException $e) {
                $message = strtolower((string) $e->getMessage());
                $isDuplicate = str_contains($message, 'duplicate')
                    || str_contains($message, 'unique')
                    || str_contains($message, '1062')
                    || str_contains($message, '23505');

                if (!$isDuplicate) {
                    throw $e;
                }

                $lastError = $e;
                $project->serial = null;
            }
        }

        throw new RuntimeException('Unable to assign unique project serial.', 0, $lastError);
    }
}
