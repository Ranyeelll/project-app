<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            // Speeds up incremental chat polling and initial recent-message loads.
            $table->index(['conversation_id', 'id'], 'messages_conversation_id_id_idx');
            $table->index(['project_id', 'id'], 'messages_project_id_id_idx');
            $table->index(['conversation_id', 'deleted_at'], 'messages_conversation_deleted_idx');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex('messages_conversation_id_id_idx');
            $table->dropIndex('messages_project_id_id_idx');
            $table->dropIndex('messages_conversation_deleted_idx');
        });
    }
};
