<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->uuid('lga_uuid')->nullable()->index()->after('ward_id');
            $table->uuid('ward_uuid')->nullable()->index()->after('lga_uuid');
            $table->string('nhis_status')->nullable()->after('phone_number');
            $table->foreignId('created_by_user_id')->nullable()->after('temporary_id_hash')->constrained('users')->nullOnDelete();
        });

        Schema::table('encounters', function (Blueprint $table) {
            $table->uuid('lga_uuid')->nullable()->index()->after('ward_id');
            $table->uuid('ward_uuid')->nullable()->index()->after('lga_uuid');
            $table->foreignId('created_by_user_id')->nullable()->after('notes')->constrained('users')->nullOnDelete();
        });

        Schema::table('referrals', function (Blueprint $table) {
            $table->uuid('lga_uuid')->nullable()->index()->after('ward_id');
            $table->uuid('ward_uuid')->nullable()->index()->after('lga_uuid');
            $table->enum('workflow_status', ['pending', 'completed', 'missed', 'cancelled'])->default('pending')->after('status');
            $table->foreignId('created_by_user_id')->nullable()->after('completed_by')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('referrals', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by_user_id');
            $table->dropColumn(['lga_uuid', 'ward_uuid', 'workflow_status']);
        });

        Schema::table('encounters', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by_user_id');
            $table->dropColumn(['lga_uuid', 'ward_uuid']);
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by_user_id');
            $table->dropColumn(['lga_uuid', 'ward_uuid', 'nhis_status']);
        });
    }
};
