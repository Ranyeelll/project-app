<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_time_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('task_id');
            $table->unsignedBigInteger('user_id');
            $table->date('date_worked');
            $table->decimal('hours_worked', 8, 2);  // e.g., 8.5 hours
            $table->text('work_description')->nullable();
            $table->timestamps();

            $table->foreign('task_id')->references('id')->on('tasks')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();

            $table->index('task_id');
            $table->index('user_id');
            $table->index('date_worked');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_time_logs');
    }
};
