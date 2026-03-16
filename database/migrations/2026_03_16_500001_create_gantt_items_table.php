<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gantt_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('gantt_items')->cascadeOnDelete();
            // type: phase | step | subtask | milestone
            $table->string('type');
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable(); // equals start_date for milestones
            $table->unsignedTinyInteger('progress')->default(0);
            $table->unsignedInteger('position')->default(0); // ordering within siblings
            $table->json('assignee_ids')->nullable();       // user ID strings
            $table->json('visible_to_roles')->nullable();   // Department enum values; [] = no restriction
            $table->json('visible_to_users')->nullable();   // user ID strings; [] = no restriction
            $table->timestamps();

            $table->index('project_id');
            $table->index(['project_id', 'parent_id']);
            $table->index(['project_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gantt_items');
    }
};
