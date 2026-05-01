<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wards', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('lga_id')->constrained('lgas')->cascadeOnUpdate()->restrictOnDelete();
            $table->string('name');
            $table->timestamps();

            $table->unique(['lga_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wards');
    }
};
