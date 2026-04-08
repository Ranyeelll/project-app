<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE budget_requests DROP CONSTRAINT IF EXISTS budget_requests_status_check");
            DB::statement("ALTER TABLE budget_requests ADD CONSTRAINT budget_requests_status_check CHECK (status IN ('pending', 'accounting_approved', 'supervisor_approved', 'approved', 'rejected', 'revision_requested'))");
            return;
        }

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE budget_requests MODIFY status ENUM('pending', 'accounting_approved', 'supervisor_approved', 'approved', 'rejected', 'revision_requested') NOT NULL DEFAULT 'pending'");
            return;
        }

        if ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF');

            DB::statement("CREATE TABLE budget_requests_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                project_id INTEGER NOT NULL,
                requested_by INTEGER NOT NULL,
                amount NUMERIC NOT NULL,
                type VARCHAR(30) NOT NULL DEFAULT 'spending',
                purpose TEXT NOT NULL,
                status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accounting_approved', 'supervisor_approved', 'approved', 'rejected', 'revision_requested')),
                review_comment TEXT NULL,
                reviewed_at DATETIME NULL,
                attachment VARCHAR NULL,
                admin_remarks TEXT NULL,
                original_amount NUMERIC NULL,
                revision_count INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME NULL,
                updated_at DATETIME NULL,
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY(requested_by) REFERENCES users(id) ON DELETE CASCADE
            )");

            DB::statement("INSERT INTO budget_requests_new (
                id, project_id, requested_by, amount, type, purpose, status, review_comment, reviewed_at, attachment,
                admin_remarks, original_amount, revision_count, created_at, updated_at
            )
            SELECT
                id, project_id, requested_by, amount, type, purpose, status, review_comment, reviewed_at, attachment,
                admin_remarks, original_amount, revision_count, created_at, updated_at
            FROM budget_requests");

            DB::statement('DROP TABLE budget_requests');
            DB::statement('ALTER TABLE budget_requests_new RENAME TO budget_requests');
            DB::statement('PRAGMA foreign_keys = ON');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE budget_requests DROP CONSTRAINT IF EXISTS budget_requests_status_check");
            DB::statement("ALTER TABLE budget_requests ADD CONSTRAINT budget_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested'))");
            return;
        }

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE budget_requests MODIFY status ENUM('pending', 'approved', 'rejected', 'revision_requested') NOT NULL DEFAULT 'pending'");
            return;
        }

        if ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF');

            DB::statement("CREATE TABLE budget_requests_old (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                project_id INTEGER NOT NULL,
                requested_by INTEGER NOT NULL,
                amount NUMERIC NOT NULL,
                type VARCHAR(30) NOT NULL DEFAULT 'spending',
                purpose TEXT NOT NULL,
                status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested')),
                review_comment TEXT NULL,
                reviewed_at DATETIME NULL,
                attachment VARCHAR NULL,
                admin_remarks TEXT NULL,
                original_amount NUMERIC NULL,
                revision_count INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME NULL,
                updated_at DATETIME NULL,
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY(requested_by) REFERENCES users(id) ON DELETE CASCADE
            )");

            DB::statement("INSERT INTO budget_requests_old (
                id, project_id, requested_by, amount, type, purpose, status, review_comment, reviewed_at, attachment,
                admin_remarks, original_amount, revision_count, created_at, updated_at
            )
            SELECT
                id, project_id, requested_by, amount, type, purpose,
                CASE
                    WHEN status IN ('accounting_approved', 'supervisor_approved') THEN 'pending'
                    ELSE status
                END,
                review_comment, reviewed_at, attachment,
                admin_remarks, original_amount, revision_count, created_at, updated_at
            FROM budget_requests");

            DB::statement('DROP TABLE budget_requests');
            DB::statement('ALTER TABLE budget_requests_old RENAME TO budget_requests');
            DB::statement('PRAGMA foreign_keys = ON');
        }
    }
};
