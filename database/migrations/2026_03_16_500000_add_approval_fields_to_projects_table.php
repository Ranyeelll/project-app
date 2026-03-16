<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('approval_status')->default('draft')->after('serial');
            $table->text('approval_notes')->nullable()->after('approval_status');
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete()->after('approval_notes');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete()->after('submitted_by');
            $table->timestamp('last_reviewed_at')->nullable()->after('reviewed_by');

            $table->index('approval_status');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropIndex(['approval_status']);
            $table->dropForeign(['submitted_by']);
            $table->dropForeign(['reviewed_by']);
            $table->dropColumn(['approval_status', 'approval_notes', 'submitted_by', 'reviewed_by', 'last_reviewed_at']);
        });
    }
};
