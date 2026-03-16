<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            // Make project_id nullable so DMs don't need a project
            $table->foreignId('project_id')->nullable()->change();

            // Link to a direct conversation (null for project messages)
            $table->foreignId('conversation_id')
                ->nullable()
                ->after('project_id')
                ->constrained('direct_conversations')
                ->cascadeOnDelete();

            // Moderation fields
            $table->boolean('is_flagged')->default(false)->after('read_by');
            $table->string('flag_reason')->nullable()->after('is_flagged');
            $table->foreignId('flagged_by')->nullable()->after('flag_reason')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('flagged_by');
            $table->dropColumn(['is_flagged', 'flag_reason']);
            $table->dropConstrainedForeignId('conversation_id');
            // Note: cannot easily re-add NOT NULL constraint on project_id in rollback
        });
    }
};
