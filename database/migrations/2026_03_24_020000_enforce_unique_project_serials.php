<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ensure every project has a valid, unique serial at the database level.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('projects', 'serial')) {
            return;
        }

        $driver = DB::getDriverName();
        $rows = DB::table('projects')
            ->select(['id', 'serial', 'created_at'])
            ->orderBy('id')
            ->get();

        $seen = [];

        foreach ($rows as $row) {
            $current = is_string($row->serial) ? trim($row->serial) : '';
            $isValidFormat = preg_match('/^MAP-\d{4}-\d{10}$/', $current) === 1;
            $isDuplicate = $current !== '' && isset($seen[$current]);

            if (!$isValidFormat || $isDuplicate) {
                $createdAt = is_string($row->created_at) ? $row->created_at : (string) $row->created_at;
                $year = preg_match('/^\d{4}/', $createdAt) === 1
                    ? (int) substr($createdAt, 0, 4)
                    : (int) date('Y');
                $candidate = $this->generateUniqueSerial($year, $seen);

                DB::table('projects')->where('id', $row->id)->update([
                    'serial' => $candidate,
                    'updated_at' => now(),
                ]);

                $seen[$candidate] = true;
                continue;
            }

            $seen[$current] = true;
        }

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE projects ALTER COLUMN serial SET NOT NULL');
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS projects_serial_unique ON projects (serial)');
            return;
        }

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE projects MODIFY serial VARCHAR(20) NOT NULL");

            $indexExists = DB::table('information_schema.statistics')
                ->whereRaw('LOWER(table_schema) = LOWER(DATABASE())')
                ->where('table_name', 'projects')
                ->where('index_name', 'projects_serial_unique')
                ->exists();

            if (!$indexExists) {
                DB::statement('CREATE UNIQUE INDEX projects_serial_unique ON projects (serial)');
            }

            return;
        }

        if ($driver === 'sqlite') {
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS projects_serial_unique ON projects (serial)');
        }
    }

    /**
     * Keep down() intentionally non-destructive for data integrity.
     */
    public function down(): void
    {
        // Intentionally left blank.
    }

    private function generateUniqueSerial(int $year, array $seen): string
    {
        $prefix = 'MAP-' . $year . '-';

        for ($attempt = 0; $attempt < 100; $attempt++) {
            $candidate = $prefix . str_pad((string) random_int(0, 9999999999), 10, '0', STR_PAD_LEFT);

            if (isset($seen[$candidate])) {
                continue;
            }

            $exists = DB::table('projects')->where('serial', $candidate)->exists();
            if (!$exists) {
                return $candidate;
            }
        }

        throw new \RuntimeException('Unable to generate a unique project serial during migration.');
    }
};
