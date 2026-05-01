<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('encounters', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('patient_id')->nullable()->constrained('patients')->nullOnDelete();
            $table->uuid('patient_uuid')->index();
            $table->foreignId('lga_id')->nullable()->constrained('lgas')->nullOnDelete();
            $table->foreignId('ward_id')->nullable()->constrained('wards')->nullOnDelete();
            $table->string('encounter_type')->nullable();
            $table->string('service_point')->nullable();
            $table->date('encounter_date')->nullable();
            $table->unsignedInteger('version_stamp')->default(1);
            $table->uuid('supersedes_uuid')->nullable()->index();
            $table->json('findings')->nullable();
            $table->text('notes')->nullable();
            $table->enum('sync_status', ['draft', 'pending', 'synced', 'failed'])->default('draft');
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('encounters');
    }
};
