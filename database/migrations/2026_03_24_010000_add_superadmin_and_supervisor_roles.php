<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Promote legacy admin role naming to superadmin.
        DB::table('users')
            ->where('role', 'admin')
            ->update(['role' => 'superadmin']);
    }

    public function down(): void
    {
        DB::table('users')
            ->where('role', 'superadmin')
            ->update(['role' => 'admin']);
    }
};
