<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Add indexes to commonly filtered columns for better query performance.
     * Uses IF NOT EXISTS checks for compatibility with existing indexes.
     */
    public function up(): void
    {
        // Helper to check if index exists (works for both PostgreSQL and SQLite)
        $indexExists = function (string $table, string $indexName): bool {
            $connection = Schema::getConnection()->getDriverName();
            
            if ($connection === 'pgsql') {
                return DB::selectOne("SELECT 1 FROM pg_indexes WHERE indexname = ?", [$indexName]) !== null;
            }
            
            if ($connection === 'sqlite') {
                return DB::selectOne("SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = ?", [$indexName]) !== null;
            }
            
            // MySQL
            $result = DB::select("SHOW INDEX FROM {$table} WHERE Key_name = ?", [$indexName]);
            return count($result) > 0;
        };

        Schema::table('tasks', function (Blueprint $table) use ($indexExists) {
            if (!$indexExists('tasks', 'tasks_assigned_to_index')) {
                $table->index('assigned_to');
            }
            if (!$indexExists('tasks', 'tasks_status_index')) {
                $table->index('status');
            }
            if (!$indexExists('tasks', 'tasks_project_id_index')) {
                $table->index('project_id');
            }
        });

        Schema::table('budget_requests', function (Blueprint $table) use ($indexExists) {
            if (!$indexExists('budget_requests', 'budget_requests_status_index')) {
                $table->index('status');
            }
            if (!$indexExists('budget_requests', 'budget_requests_project_id_index')) {
                $table->index('project_id');
            }
        });

        // projects.approval_status index already exists in 2026_03_16_500000 migration

        Schema::table('media', function (Blueprint $table) use ($indexExists) {
            if (!$indexExists('media', 'media_project_id_index')) {
                $table->index('project_id');
            }
            if (!$indexExists('media', 'media_uploaded_by_index')) {
                $table->index('uploaded_by');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $indexExists = function (string $table, string $indexName): bool {
            $connection = Schema::getConnection()->getDriverName();
            
            if ($connection === 'pgsql') {
                return DB::selectOne("SELECT 1 FROM pg_indexes WHERE indexname = ?", [$indexName]) !== null;
            }
            
            if ($connection === 'sqlite') {
                return DB::selectOne("SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = ?", [$indexName]) !== null;
            }
            
            $result = DB::select("SHOW INDEX FROM {$table} WHERE Key_name = ?", [$indexName]);
            return count($result) > 0;
        };

        Schema::table('tasks', function (Blueprint $table) use ($indexExists) {
            if ($indexExists('tasks', 'tasks_assigned_to_index')) {
                $table->dropIndex(['assigned_to']);
            }
            if ($indexExists('tasks', 'tasks_status_index')) {
                $table->dropIndex(['status']);
            }
            if ($indexExists('tasks', 'tasks_project_id_index')) {
                $table->dropIndex(['project_id']);
            }
        });

        Schema::table('budget_requests', function (Blueprint $table) use ($indexExists) {
            if ($indexExists('budget_requests', 'budget_requests_status_index')) {
                $table->dropIndex(['status']);
            }
            if ($indexExists('budget_requests', 'budget_requests_project_id_index')) {
                $table->dropIndex(['project_id']);
            }
        });

        Schema::table('media', function (Blueprint $table) use ($indexExists) {
            if ($indexExists('media', 'media_project_id_index')) {
                $table->dropIndex(['project_id']);
            }
            if ($indexExists('media', 'media_uploaded_by_index')) {
                $table->dropIndex(['uploaded_by']);
            }
        });
    }
};
