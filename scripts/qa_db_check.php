<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== DATABASE CONNECTION CHECK ===" . PHP_EOL;
try {
    $pdo = DB::connection()->getPdo();
    echo "Status: CONNECTED" . PHP_EOL;
    echo "Driver: " . DB::connection()->getDriverName() . PHP_EOL;
    echo "Database: " . DB::connection()->getDatabaseName() . PHP_EOL;
    echo "Server Version: " . $pdo->getAttribute(PDO::ATTR_SERVER_VERSION) . PHP_EOL;
} catch (Exception $e) {
    echo "Status: FAILED - " . $e->getMessage() . PHP_EOL;
    exit(1);
}

echo PHP_EOL . "=== TABLE ROW COUNTS ===" . PHP_EOL;
$tables = DB::select("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
echo "Total tables: " . count($tables) . PHP_EOL;
foreach ($tables as $t) {
    $count = DB::table($t->tablename)->count();
    echo str_pad($t->tablename, 35) . $count . " rows" . PHP_EOL;
}

echo PHP_EOL . "=== FOREIGN KEY CONSTRAINTS ===" . PHP_EOL;
$fks = DB::select("
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name, rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name
");
echo "Total FK constraints: " . count($fks) . PHP_EOL;
foreach ($fks as $fk) {
    echo str_pad($fk->table_name . "." . $fk->column_name, 45)
        . "-> " . str_pad($fk->foreign_table_name . "." . $fk->foreign_column_name, 20)
        . " ON DELETE " . $fk->delete_rule . PHP_EOL;
}

echo PHP_EOL . "=== ORPHAN RECORD CHECK ===" . PHP_EOL;
// Check for orphaned tasks (assigned_to pointing to non-existent users)
$orphanTasks = DB::select("SELECT t.id, t.assigned_to FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.assigned_to IS NOT NULL AND u.id IS NULL");
echo "Orphaned tasks (bad assigned_to): " . count($orphanTasks) . PHP_EOL;

// Check for orphaned tasks (project doesn't exist)
$orphanTaskProjects = DB::select("SELECT t.id, t.project_id FROM tasks t LEFT JOIN projects p ON t.project_id = p.id WHERE p.id IS NULL");
echo "Orphaned tasks (bad project_id): " . count($orphanTaskProjects) . PHP_EOL;

// Check for orphaned media (project doesn't exist)
$orphanMedia = DB::select("SELECT m.id, m.project_id FROM media m LEFT JOIN projects p ON m.project_id = p.id WHERE p.id IS NULL");
echo "Orphaned media (bad project_id): " . count($orphanMedia) . PHP_EOL;

// Check for orphaned budget requests (project doesn't exist)
$orphanBudget = DB::select("SELECT b.id, b.project_id FROM budget_requests b LEFT JOIN projects p ON b.project_id = p.id WHERE p.id IS NULL");
echo "Orphaned budget_requests (bad project_id): " . count($orphanBudget) . PHP_EOL;

// Check for orphaned gantt items (project doesn't exist)
$orphanGantt = DB::select("SELECT g.id, g.project_id FROM gantt_items g LEFT JOIN projects p ON g.project_id = p.id WHERE p.id IS NULL");
echo "Orphaned gantt_items (bad project_id): " . count($orphanGantt) . PHP_EOL;

// Check for NULL user FKs (after cascade-to-null migration)
$nullAssigned = DB::select("SELECT COUNT(*) as cnt FROM tasks WHERE assigned_to IS NULL");
echo "Tasks with NULL assigned_to: " . $nullAssigned[0]->cnt . PHP_EOL;

$nullUploader = DB::select("SELECT COUNT(*) as cnt FROM media WHERE uploaded_by IS NULL");
echo "Media with NULL uploaded_by: " . $nullUploader[0]->cnt . PHP_EOL;

$nullRequester = DB::select("SELECT COUNT(*) as cnt FROM budget_requests WHERE requested_by IS NULL");
echo "Budget requests with NULL requested_by: " . $nullRequester[0]->cnt . PHP_EOL;

echo PHP_EOL . "=== INDEX CHECK ===" . PHP_EOL;
$indexes = DB::select("
    SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname NOT LIKE '%_pkey' ORDER BY tablename, indexname
");
echo "Non-primary indexes: " . count($indexes) . PHP_EOL;
foreach ($indexes as $idx) {
    echo str_pad($idx->tablename, 35) . $idx->indexname . PHP_EOL;
}

echo PHP_EOL . "=== DUPLICATE CHECK ===" . PHP_EOL;
// Check for duplicate project serials
$dupSerials = DB::select("SELECT serial, COUNT(*) as cnt FROM projects WHERE serial IS NOT NULL GROUP BY serial HAVING COUNT(*) > 1");
echo "Duplicate project serials: " . count($dupSerials) . PHP_EOL;

// Check for duplicate user emails
$dupEmails = DB::select("SELECT email, COUNT(*) as cnt FROM users GROUP BY email HAVING COUNT(*) > 1");
echo "Duplicate user emails: " . count($dupEmails) . PHP_EOL;

echo PHP_EOL . "=== DONE ===" . PHP_EOL;
