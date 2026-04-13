<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('category', 50)->default('development')->after('priority');
            $table->string('risk_level', 20)->default('low')->after('category');
            $table->string('beneficiary_type', 20)->default('internal')->after('risk_level');
            $table->string('beneficiary_name')->nullable()->after('beneficiary_type');
            $table->string('contact_person')->nullable()->after('beneficiary_name');
            $table->string('contact_email')->nullable()->after('contact_person');
            $table->string('contact_phone', 50)->nullable()->after('contact_email');
            $table->string('location', 500)->nullable()->after('contact_phone');
            $table->text('objectives')->nullable()->after('location');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn([
                'category', 'risk_level', 'beneficiary_type', 'beneficiary_name',
                'contact_person', 'contact_email', 'contact_phone', 'location', 'objectives',
            ]);
        });
    }
};
