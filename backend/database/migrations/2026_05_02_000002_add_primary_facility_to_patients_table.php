<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->foreignId('primary_facility_id')->nullable()->after('ward_id')->constrained('facilities')->nullOnDelete();
            $table->uuid('primary_facility_uuid')->nullable()->after('primary_facility_id')->index();
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropForeign(['primary_facility_id']);
            $table->dropColumn(['primary_facility_id', 'primary_facility_uuid']);
        });
    }
};
