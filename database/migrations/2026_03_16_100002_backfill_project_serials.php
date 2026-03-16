<?php

use App\Models\AuditLog;
use App\Models\Project;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Backfill existing projects with unique serials based on created_at order.
     */
    public function up(): void
    {
        $projects = Project::whereNull('serial')
            ->orWhere('serial', '')
            ->orderBy('created_at', 'asc')
            ->get();

        foreach ($projects as $project) {
            $year = $project->created_at->year;
            $prefix = "MAP-{$year}-";

            DB::transaction(function () use ($project, $prefix) {
                DB::statement("SELECT pg_advisory_xact_lock(hashtext('project_serial'))");

                $latestSerial = DB::table('projects')
                    ->where('serial', 'like', $prefix . '%')
                    ->orderByDesc('serial')
                    ->value('serial');

                $nextSequence = $latestSerial
                    ? (int) substr($latestSerial, -6) + 1
                    : 1;

                $serial = $prefix . str_pad($nextSequence, 6, '0', STR_PAD_LEFT);

                $project->serial = $serial;
                $project->save();

                AuditLog::create([
                    'action'      => 'project.serial.backfilled',
                    'entity_type' => 'project',
                    'entity_id'   => $project->id,
                    'data'        => [
                        'serial'             => $serial,
                        'project_name'       => $project->name,
                        'backfilled_at'      => now()->toIso8601String(),
                        'original_created_at' => $project->created_at->toIso8601String(),
                    ],
                    'user_id'    => null,
                    'ip_address' => null,
                    'user_agent' => 'Migration: backfill_project_serials',
                ]);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Project::whereNotNull('serial')->update(['serial' => null]);
    }
};
