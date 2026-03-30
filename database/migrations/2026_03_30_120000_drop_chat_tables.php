<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * WARNING: This migration will DROP chat-related tables if they exist.
     * Backup your database before running in production.
     */
    public function up(): void
    {
        // Only drop tables if they exist to avoid affecting other features.
        if (Schema::hasTable('chat_notifications')) {
            Schema::dropIfExists('chat_notifications');
        }

        if (Schema::hasTable('chat_muted_users')) {
            Schema::dropIfExists('chat_muted_users');
        }

        // If there is a dedicated chat_attachments table, remove it as well.
        if (Schema::hasTable('chat_attachments')) {
            Schema::dropIfExists('chat_attachments');
        }
    }

    /**
     * Recreate minimal chat tables to allow rollback if needed.
     * Note: recreated schema is minimal and may not fully match previous structure.
     */
    public function down(): void
    {
        if (! Schema::hasTable('chat_notifications')) {
            Schema::create('chat_notifications', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('user_id')->nullable();
                $table->unsignedBigInteger('message_id')->nullable();
                $table->unsignedBigInteger('project_id')->nullable();
                $table->boolean('is_read')->default(false);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('chat_muted_users')) {
            Schema::create('chat_muted_users', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('user_id');
                $table->timestamp('muted_until')->nullable();
                $table->string('reason')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('chat_attachments')) {
            Schema::create('chat_attachments', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('message_id');
                $table->string('filename');
                $table->string('mime')->nullable();
                $table->bigInteger('size')->nullable();
                $table->timestamps();
            });
        }
    }
};
