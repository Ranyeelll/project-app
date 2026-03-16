<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use App\Models\AuditLog;

return new class extends Migration
{
    /**
     * Backfill audit logs for serials that were assigned via ProjectSerialService.
     * This creates historical records for projects that already have serials.
     */
    public function up(): void
    {
        // Get all projects that have a serial number
        $projectsWithSerials = DB::table('projects')
            ->whereNotNull('serial')
            ->orderBy('created_at')
            ->get();

        foreach ($projectsWithSerials as $project) {
            // Check if we already have an audit log for this serial assignment
            $exists = AuditLog::where('resource_type', 'project')
                ->where('resource_id', $project->id)
                ->where('action', 'project.serial_assignment')
                ->exists();

            if (!$exists) {
                // Create an audit log for the serial assignment
                AuditLog::create([
                    'user_id'       => $project->manager_id,
                    'actor_role'    => 'Manager', // Assumed role for backfill
                    'action'        => 'project.serial_assignment',
                    'resource_type' => 'project',
                    'resource_id'   => $project->id,
                    'project_id'    => $project->id,
                    'changes'       => ['serial' => $project->serial],
                    'context'       => ['backfill' => true],
                    'ip_address'    => null,
                    'user_agent'    => null,
                    'request_id'    => null,
                    'performed_via' => 'system',
                    'sensitive_flag' => false,
                    'created_at'    => $project->created_at,
                ]);
            }
        }
    }

    public function down(): void
    {
        // Remove backfilled serial assignment logs
        AuditLog::where('action', 'project.serial_assignment')
            ->whereJsonContains('context->backfill', true)
            ->delete();
    }
};
