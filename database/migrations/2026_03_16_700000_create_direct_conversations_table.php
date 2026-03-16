<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('direct_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('participant1_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('participant2_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            // Ensure a unique canonical pair (lower id always goes into participant1)
            $table->unique(['participant1_id', 'participant2_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('direct_conversations');
    }
};
