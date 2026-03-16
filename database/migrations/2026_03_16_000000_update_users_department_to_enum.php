<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, convert existing department values to the new enum values
        // Map existing free-form departments to the new standardized values
        DB::table('users')
            ->whereIn('department', ['Engineering', 'Development', 'QA', 'Backend', 'IT', 'DevOps'])
            ->update(['department' => 'Technical']);

        DB::table('users')
            ->whereIn('department', ['Finance', 'HR', 'Human Resources'])
            ->update(['department' => 'Accounting']);

        DB::table('users')
            ->whereNull('department')
            ->orWhere('department', '')
            ->update(['department' => 'Employee']);

        // Update admin role users to have Admin department
        DB::table('users')
            ->where('role', 'admin')
            ->update(['department' => 'Admin']);

        // Any remaining non-standard departments become Employee
        DB::table('users')
            ->whereNotIn('department', ['Admin', 'Accounting', 'Technical', 'Employee'])
            ->update(['department' => 'Employee']);

        // Now make the department column NOT NULL with a default
        Schema::table('users', function (Blueprint $table) {
            $table->string('department')->default('Employee')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('department')->nullable()->default(null)->change();
        });
    }
};
