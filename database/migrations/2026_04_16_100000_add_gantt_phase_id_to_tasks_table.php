<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->unsignedBigInteger('gantt_phase_id')->nullable()->after('project_id');
            $table->foreign('gantt_phase_id')
                  ->references('id')
                  ->on('gantt_items')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['gantt_phase_id']);
            $table->dropColumn('gantt_phase_id');
        });
    }
};
