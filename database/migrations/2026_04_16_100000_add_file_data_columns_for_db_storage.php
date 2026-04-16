<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Store uploaded files in the database (BYTEA) instead of local disk.
     * Railway containers have ephemeral filesystems — uploaded files are lost on redeploy.
     */
    public function up(): void
    {
        Schema::table('media', function (Blueprint $table) {
            $table->binary('file_data')->nullable()->after('file_path');
            $table->string('file_mime')->nullable()->after('file_data');
        });

        Schema::table('media_versions', function (Blueprint $table) {
            $table->binary('file_data')->nullable()->after('file_path');
            $table->string('file_mime')->nullable()->after('file_data');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->binary('profile_photo_data')->nullable()->after('profile_photo');
            $table->string('profile_photo_mime')->nullable()->after('profile_photo_data');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('media', function (Blueprint $table) {
            $table->dropColumn(['file_data', 'file_mime']);
        });

        Schema::table('media_versions', function (Blueprint $table) {
            $table->dropColumn(['file_data', 'file_mime']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['profile_photo_data', 'profile_photo_mime']);
        });
    }
};
