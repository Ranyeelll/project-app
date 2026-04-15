<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->index('status', 'projects_status_idx');
            $table->index('priority', 'projects_priority_idx');
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->index('priority', 'tasks_priority_idx');
            $table->index('end_date', 'tasks_end_date_idx');
            $table->index('completion_report_status', 'tasks_completion_report_status_idx');
        });

        Schema::table('sprints', function (Blueprint $table) {
            $table->index('start_date', 'sprints_start_date_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropIndex('projects_status_idx');
            $table->dropIndex('projects_priority_idx');
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex('tasks_priority_idx');
            $table->dropIndex('tasks_end_date_idx');
            $table->dropIndex('tasks_completion_report_status_idx');
        });

        Schema::table('sprints', function (Blueprint $table) {
            $table->dropIndex('sprints_start_date_idx');
        });
    }
};
