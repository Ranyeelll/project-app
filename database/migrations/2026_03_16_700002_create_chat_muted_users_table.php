<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_muted_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('muted_by')->constrained('users')->cascadeOnDelete();
            $table->string('reason')->nullable();
            $table->timestamp('muted_until')->nullable(); // null = permanent
            $table->timestamps();

            $table->unique('user_id'); // one active mute per user
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_muted_users');
    }
};
