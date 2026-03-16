<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('action');                           // e.g., 'project.serial.assigned'
            $table->string('entity_type');                      // e.g., 'project'
            $table->unsignedBigInteger('entity_id');            // ID of the entity
            $table->json('data')->nullable();                   // Additional data (old/new values)
            $table->unsignedBigInteger('user_id')->nullable();  // Who performed the action
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();

            $table->index(['entity_type', 'entity_id']);
            $table->index('action');
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
