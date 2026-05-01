<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patients', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('lga_id')->nullable()->constrained('lgas')->nullOnDelete();
            $table->foreignId('ward_id')->nullable()->constrained('wards')->nullOnDelete();
            $table->string('first_name')->nullable();
            $table->string('middle_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('sex', 20)->nullable();
            $table->date('date_of_birth')->nullable();
            $table->unsignedTinyInteger('estimated_age_years')->nullable();
            $table->boolean('is_estimated_age')->default(false);
            $table->char('temporary_id_hash', 64)->nullable()->unique();
            $table->string('phone_number')->nullable();
            $table->text('address_line')->nullable();
            $table->enum('sync_status', ['draft', 'pending', 'synced', 'failed'])->default('draft');
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
