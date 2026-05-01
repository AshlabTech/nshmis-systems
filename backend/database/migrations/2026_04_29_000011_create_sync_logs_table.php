<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sync_logs', function (Blueprint $table) {
            $table->id();
            $table->uuid('batch_uuid')->index();
            $table->string('entity_type')->index();
            $table->uuid('entity_uuid')->index();
            $table->enum('status', ['pending', 'synced', 'failed', 'conflict'])->default('pending');
            $table->string('message')->nullable();
            $table->text('error_message')->nullable();
            $table->string('device_id')->nullable()->index();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->json('payload')->nullable();
            $table->json('response')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_logs');
    }
};
