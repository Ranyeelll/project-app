<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add performance indexes to the notifications table and drop
     * the legacy time_logs table (data was already migrated to task_time_logs).
     */
    public function up(): void
    {
        // Add a composite index for common notification queries (unread count, listing)
        Schema::table('notifications', function (Blueprint $table) {
            $table->index(['notifiable_type', 'notifiable_id', 'read_at'], 'notifications_notifiable_read_at_idx');
            $table->index('created_at', 'notifications_created_at_idx');
        });

        // Drop the legacy time_logs table — all data has been consolidated into task_time_logs
        Schema::dropIfExists('time_logs');
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex('notifications_notifiable_read_at_idx');
            $table->dropIndex('notifications_created_at_idx');
        });

        // Recreate legacy time_logs structure (empty — data lives in task_time_logs)
        Schema::create('time_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->decimal('hours', 5, 2);
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }
};
