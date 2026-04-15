<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    
    public function up(): void
    {
        $projects = DB::table('projects')->orderBy('created_at', 'asc')->get();

        foreach ($projects as $project) {
            $createdAt = $project->created_at ? date('Y', strtotime($project->created_at)) : date('Y');
            $year = (int) $createdAt;
            $prefix = "MAP-{$year}-";

            if (is_string($project->serial) && preg_match('/^MAP-\d{4}-\d{10}$/', $project->serial)) {
                continue;
            }

            DB::transaction(function () use ($project, $prefix) {
                $driver = DB::getDriverName();

                if ($driver === 'pgsql') {
                    DB::statement("SELECT pg_advisory_xact_lock(hashtext('project_serial'))");
                }

                $query = DB::table('projects');
                if (in_array($driver, ['mysql', 'pgsql', 'sqlsrv'], true)) {
                    $query->lockForUpdate();
                }

                for ($attempt = 0; $attempt < 50; $attempt++) {
                    $candidate = $prefix . str_pad((string) random_int(0, 9999999999), 10, '0', STR_PAD_LEFT);
                    $exists = (clone $query)->where('serial', $candidate)->exists();

                    if (!$exists) {
                        DB::table('projects')
                            ->where('id', $project->id)
                            ->update(['serial' => $candidate]);
                        return;
                    }
                }

                throw new RuntimeException('Unable to generate unique 10-digit serial for project ' . $project->id);
            });
        }
    }

    
    public function down(): void
    {
       
    }
};
