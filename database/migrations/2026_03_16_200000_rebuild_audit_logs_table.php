<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('audit_logs');

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();  // Who performed the action
            $table->string('actor_role')->nullable();           // Role/department of the actor
            $table->string('action');                            // e.g., 'project.approval', 'project.export'
            $table->string('resource_type');                     // e.g., 'project', 'task', 'chat'
            $table->unsignedBigInteger('resource_id');           // ID of the resource
            $table->unsignedBigInteger('project_id')->nullable(); // Associated project
            $table->json('changes')->nullable();                 // What changed (old/new values)
            $table->json('snapshot')->nullable();                // Full snapshot of resource state
            $table->json('context')->nullable();                 // Additional context/metadata
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->string('request_id')->nullable();            // Request tracing ID
            $table->string('performed_via')->default('web');     // 'web', 'cli', 'api', etc.
            $table->boolean('sensitive_flag')->default(false);   // Marks sensitive operations
            $table->timestamp('created_at')->useCurrent();       // Set by DB, immutable

            // Indexes for queries
            $table->index(['resource_type', 'resource_id']);
            $table->index('action');
            $table->index('user_id');
            $table->index('project_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
