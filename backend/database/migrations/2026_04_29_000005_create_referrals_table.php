<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('referrals', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('patient_id')->nullable()->constrained('patients')->nullOnDelete();
            $table->uuid('patient_uuid')->index();
            $table->foreignId('encounter_id')->nullable()->constrained('encounters')->nullOnDelete();
            $table->uuid('encounter_uuid')->nullable()->index();
            $table->foreignId('lga_id')->nullable()->constrained('lgas')->nullOnDelete();
            $table->foreignId('ward_id')->nullable()->constrained('wards')->nullOnDelete();
            $table->string('referred_to_facility')->nullable();
            $table->text('referral_reason')->nullable();
            $table->enum('urgency', ['low', 'medium', 'high', 'critical'])->nullable();
            $table->enum('status', ['active', 'completed', 'cancelled'])->default('active');
            $table->timestamp('completed_at')->nullable();
            $table->string('completed_by')->nullable();
            $table->enum('sync_status', ['draft', 'pending', 'synced', 'failed'])->default('draft');
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('referrals');
    }
};
