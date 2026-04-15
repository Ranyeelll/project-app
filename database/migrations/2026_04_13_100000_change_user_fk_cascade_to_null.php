<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Change user-related foreign keys from cascadeOnDelete to nullOnDelete
 * to preserve audit trails and historical data when users are deleted.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            // SQLite does not support dropping/recreating foreign keys
            return;
        }

        // budget_requests.requested_by
        Schema::table('budget_requests', function (Blueprint $table) {
            $table->dropForeign(['requested_by']);
            $table->foreign('requested_by')
                ->references('id')->on('users')
                ->nullOnDelete();
        });

        // media.uploaded_by
        Schema::table('media', function (Blueprint $table) {
            $table->dropForeign(['uploaded_by']);
            $table->foreign('uploaded_by')
                ->references('id')->on('users')
                ->nullOnDelete();
        });

        // time_logs.user_id
        Schema::table('time_logs', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->foreign('user_id')
                ->references('id')->on('users')
                ->nullOnDelete();
        });

        // task_reviews.reviewer_id
        Schema::table('task_reviews', function (Blueprint $table) {
            $table->dropForeign(['reviewer_id']);
            $table->foreign('reviewer_id')
                ->references('id')->on('users')
                ->nullOnDelete();
        });

        // task_blockers.reported_by_user_id
        Schema::table('task_blockers', function (Blueprint $table) {
            $table->dropForeign(['reported_by_user_id']);
            $table->foreign('reported_by_user_id')
                ->references('id')->on('users')
                ->nullOnDelete();
        });

        // tasks.assigned_to
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['assigned_to']);
            $table->foreign('assigned_to')
                ->references('id')->on('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        // Revert back to cascadeOnDelete
        $tables = [
            'budget_requests' => 'requested_by',
            'media'           => 'uploaded_by',
            'time_logs'       => 'user_id',
            'task_reviews'    => 'reviewer_id',
            'task_blockers'   => 'reported_by_user_id',
            'tasks'           => 'assigned_to',
        ];

        foreach ($tables as $tableName => $column) {
            Schema::table($tableName, function (Blueprint $table) use ($column) {
                $table->dropForeign([$column]);
                $table->foreign($column)
                    ->references('id')->on('users')
                    ->cascadeOnDelete();
            });
        }
    }
};
