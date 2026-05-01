<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->enum('role', ['data_clerk', 'supervisor', 'state_admin'])->default('data_clerk');
            $table->uuid('assigned_lga_uuid')->nullable()->index();
            $table->uuid('assigned_ward_uuid')->nullable()->index();
            $table->string('team_name')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        DB::table('users')->insert([
            'name' => 'State Admin',
            'email' => 'admin@nigerhmis.local',
            'password' => Hash::make('Admin@1234'),
            'role' => 'state_admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
