<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Migrate legacy time_logs rows into task_time_logs, then add legacy_id tracking column.
     */
    public function up(): void
    {
        // Add a nullable column to track which legacy log was migrated
        Schema::table('task_time_logs', function (Blueprint $table) {
            $table->unsignedBigInteger('legacy_time_log_id')->nullable()->after('id');
            $table->index('legacy_time_log_id');
        });

        // Copy any legacy time_logs that don't already exist in task_time_logs
        if (Schema::hasTable('time_logs')) {
            DB::statement("
                INSERT INTO task_time_logs (legacy_time_log_id, task_id, user_id, date_worked, hours_worked, work_description, created_at, updated_at)
                SELECT tl.id, tl.task_id, tl.user_id, tl.date, tl.hours, tl.description, tl.created_at, tl.updated_at
                FROM time_logs tl
                WHERE NOT EXISTS (
                    SELECT 1 FROM task_time_logs ttl WHERE ttl.legacy_time_log_id = tl.id
                )
            ");
        }
    }

    /**
     * Remove the legacy tracking column (data stays in task_time_logs).
     */
    public function down(): void
    {
        Schema::table('task_time_logs', function (Blueprint $table) {
            $table->dropIndex(['legacy_time_log_id']);
            $table->dropColumn('legacy_time_log_id');
        });
    }
};
