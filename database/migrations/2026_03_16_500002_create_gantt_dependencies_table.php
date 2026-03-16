<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gantt_dependencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('predecessor_id')->constrained('gantt_items')->cascadeOnDelete();
            $table->foreignId('successor_id')->constrained('gantt_items')->cascadeOnDelete();
            $table->string('type')->default('finish_to_start');
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['predecessor_id', 'successor_id']);
            $table->index('project_id');
            $table->index('predecessor_id');
            $table->index('successor_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gantt_dependencies');
    }
};
