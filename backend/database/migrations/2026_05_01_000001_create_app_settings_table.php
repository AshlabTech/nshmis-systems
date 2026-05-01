<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_settings', function (Blueprint $table) {
            $table->id();

            // Identity
            $table->string('app_name')->default('Niger State HMIS Outreach');
            $table->string('app_short_name', 50)->nullable()->default('HMIS');
            $table->text('app_description')->nullable();

            // Image paths (relative to public storage disk)
            $table->string('logo_path')->nullable();
            $table->string('logo_dark_path')->nullable();
            $table->string('favicon_path')->nullable();
            $table->string('login_background_path')->nullable();
            $table->string('login_side_image_path')->nullable();

            // Brand colours
            $table->string('primary_color', 10)->default('#008080');
            $table->string('secondary_color', 10)->default('#006666');
            $table->string('accent_color', 10)->nullable();
            $table->string('error_color', 10)->nullable();
            $table->string('info_color', 10)->nullable();
            $table->string('success_color', 10)->nullable();
            $table->string('warning_color', 10)->nullable();
            $table->string('color_scheme')->nullable();

            // Login UI
            $table->enum('login_layout', ['centered', 'split', 'background'])->default('centered');
            $table->string('login_title')->nullable();
            $table->text('login_subtitle')->nullable();
            $table->boolean('show_logo_on_login')->default(true);

            // Localisation
            $table->string('currency_symbol', 10)->nullable();
            $table->string('currency_code', 3)->nullable();
            $table->string('timezone', 50)->nullable();
            $table->string('date_format', 20)->nullable();
            $table->string('time_format', 20)->nullable();

            // Contact
            $table->string('company_email')->nullable();
            $table->string('company_phone', 20)->nullable();
            $table->text('company_address')->nullable();
            $table->string('company_website')->nullable();
            $table->json('social_links')->nullable();

            $table->timestamps();
        });

        // Seed the single settings row
        DB::table('app_settings')->insert([
            'id'               => 1,
            'app_name'         => 'Niger State HMIS Outreach',
            'app_short_name'   => 'HMIS',
            'primary_color'    => '#008080',
            'secondary_color'  => '#006666',
            'login_layout'     => 'centered',
            'show_logo_on_login' => true,
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('app_settings');
    }
};
