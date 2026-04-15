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
        Schema::create('dashboard_widgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('widget_type');
            $table->string('title');
            $table->integer('position')->default(0);
            $table->integer('col_span')->default(1);
            $table->json('config')->nullable();
            $table->boolean('is_visible')->default(true);
            $table->timestamps();

            $table->index(['user_id', 'position'], 'dashboard_widgets_user_pos_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dashboard_widgets');
    }
};
