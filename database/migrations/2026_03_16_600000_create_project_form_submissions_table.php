<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_form_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('form_type'); // project_details|project_planning|progress_update|issue_risk|approval_review|completion_handover|analytics_kpi
            $table->string('status')->default('submitted'); // submitted|reviewed|approved|rejected|revision_requested
            $table->json('data');
            $table->text('notes')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['project_id', 'form_type']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_form_submissions');
    }
};
