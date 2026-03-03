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
        // First, drop the existing enum constraint and recreate with new value
        DB::statement("ALTER TABLE budget_requests DROP CONSTRAINT IF EXISTS budget_requests_status_check");
        DB::statement("ALTER TABLE budget_requests ADD CONSTRAINT budget_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested'))");

        Schema::table('budget_requests', function (Blueprint $table) {
            $table->text('admin_remarks')->nullable()->after('review_comment');
            $table->decimal('original_amount', 12, 2)->nullable()->after('admin_remarks');
            $table->integer('revision_count')->default(0)->after('original_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('budget_requests', function (Blueprint $table) {
            $table->dropColumn(['admin_remarks', 'original_amount', 'revision_count']);
        });

        DB::statement("ALTER TABLE budget_requests DROP CONSTRAINT IF EXISTS budget_requests_status_check");
        DB::statement("ALTER TABLE budget_requests ADD CONSTRAINT budget_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected'))");
    }
};
