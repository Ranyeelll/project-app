<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Backfill existing projects with unique serials based on created_at order.
     */
    public function up(): void
    {
        $projects = DB::table('projects')
            ->whereNull('serial')
            ->orWhere('serial', '')
            ->orderBy('created_at', 'asc')
            ->get();

        foreach ($projects as $project) {
            $year = $project->created_at->year;
            $prefix = "MAP-{$year}-";

            DB::transaction(function () use ($project, $prefix) {
                if (DB::getDriverName() === 'pgsql') {
                    DB::statement("SELECT pg_advisory_xact_lock(hashtext('project_serial'))");
                }

                $latestSerial = DB::table('projects')
                    ->where('serial', 'like', $prefix . '%')
                    ->orderByDesc('serial')
                    ->value('serial');

                $nextSequence = $latestSerial
                    ? (int) substr($latestSerial, -6) + 1
                    : 1;

                $serial = $prefix . str_pad($nextSequence, 6, '0', STR_PAD_LEFT);

                DB::table('projects')
                    ->where('id', $project->id)
                    ->update(['serial' => $serial]);

                DB::table('audit_logs')->insert([
                    'action'      => 'project.serial.backfilled',
                    'resource_type' => 'project',
                    'resource_id'   => $project->id,
                    'changes'       => json_encode([
                        'serial'             => $serial,
                        'project_name'       => $project->name,
                        'backfilled_at'      => now()->toIso8601String(),
                        'original_created_at' => $project->created_at,
                    ]),
                    'user_id'    => null,
                    'performed_via' => 'migration',
                    'ip_address' => null,
                    'user_agent' => 'Migration: backfill_project_serials',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('projects')->whereNotNull('serial')->update(['serial' => null]);
    }
};
