<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private function indexExists(string $table, string $indexName): bool
    {
        $driver = DB::getDriverName();

        return match ($driver) {
            'pgsql' => DB::table('pg_indexes')
                ->where('schemaname', 'public')
                ->where('tablename', $table)
                ->where('indexname', $indexName)
                ->exists(),
            'mysql', 'mariadb' => DB::table('information_schema.statistics')
                ->where('table_schema', DB::getDatabaseName())
                ->where('table_name', $table)
                ->where('index_name', $indexName)
                ->exists(),
            'sqlite' => collect(DB::select("PRAGMA index_list('{$table}')"))
                ->contains(fn ($row) => ($row->name ?? null) === $indexName),
            default => false,
        };
    }

    public function up(): void
    {
        if (! Schema::hasTable('audit_logs')) {
            return;
        }

        $hasResourceType = Schema::hasColumn('audit_logs', 'resource_type');
        $hasResourceId = Schema::hasColumn('audit_logs', 'resource_id');

        if (! $hasResourceType || ! $hasResourceId) {
            Schema::table('audit_logs', function (Blueprint $table) use ($hasResourceType, $hasResourceId) {
                if (! $hasResourceType) {
                    $table->string('resource_type')->nullable()->after('action');
                }

                if (! $hasResourceId) {
                    $table->unsignedBigInteger('resource_id')->nullable()->after('resource_type');
                }
            });
        }

        $hasEntityType = Schema::hasColumn('audit_logs', 'entity_type');
        $hasEntityId = Schema::hasColumn('audit_logs', 'entity_id');

        if ($hasEntityType) {
            DB::table('audit_logs')
                ->whereNull('resource_type')
                ->whereNotNull('entity_type')
                ->update(['resource_type' => DB::raw('entity_type')]);
        }

        if ($hasEntityId) {
            DB::table('audit_logs')
                ->whereNull('resource_id')
                ->whereNotNull('entity_id')
                ->update(['resource_id' => DB::raw('entity_id')]);
        }

        if (! $this->indexExists('audit_logs', 'audit_logs_resource_type_resource_id_idx')) {
            Schema::table('audit_logs', function (Blueprint $table) {
                $table->index(['resource_type', 'resource_id'], 'audit_logs_resource_type_resource_id_idx');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('audit_logs')) {
            return;
        }

        if ($this->indexExists('audit_logs', 'audit_logs_resource_type_resource_id_idx')) {
            Schema::table('audit_logs', function (Blueprint $table) {
                $table->dropIndex('audit_logs_resource_type_resource_id_idx');
            });
        }
    }
};
