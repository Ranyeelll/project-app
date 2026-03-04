<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('budget_requests', function (Blueprint $table) {
            $table->string('type', 30)->default('spending')->after('amount');
        });
    }

    public function down(): void
    {
        Schema::table('budget_requests', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }
};
