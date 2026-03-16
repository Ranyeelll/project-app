<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_blockers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('task_id');
            $table->unsignedBigInteger('project_id')->nullable();
            $table->string('issue_title');
            $table->text('description');
            $table->string('priority')->default('medium');  // low|medium|high|critical
            $table->date('date_reported');
            $table->string('attachment_path')->nullable();
            $table->unsignedBigInteger('reported_by_user_id')->nullable();
            $table->timestamp('resolved_at')->nullable();    // null = open, timestamp = resolved
            $table->unsignedBigInteger('resolved_by_user_id')->nullable();
            $table->timestamps();

            $table->foreign('task_id')->references('id')->on('tasks')->cascadeOnDelete();
            $table->foreign('project_id')->references('id')->on('projects')->nullOnDelete();
            $table->foreign('reported_by_user_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('resolved_by_user_id')->references('id')->on('users')->nullOnDelete();

            $table->index('task_id');
            $table->index('project_id');
            $table->index('priority');
            $table->index('resolved_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_blockers');
    }
};
