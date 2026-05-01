<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class AppSetting extends Model
{
    protected $fillable = [
        'app_name', 'app_short_name', 'app_description',
        'logo_path', 'logo_dark_path', 'favicon_path',
        'login_background_path', 'login_side_image_path',
        'primary_color', 'secondary_color', 'accent_color',
        'error_color', 'info_color', 'success_color', 'warning_color', 'color_scheme',
        'login_layout', 'login_title', 'login_subtitle', 'show_logo_on_login',
        'currency_symbol', 'currency_code', 'timezone', 'date_format', 'time_format',
        'company_email', 'company_phone', 'company_address', 'company_website',
        'social_links',
    ];

    protected $casts = [
        'show_logo_on_login' => 'boolean',
        'social_links'       => 'array',
    ];

    /** Always use the single settings row (id = 1). */
    public static function getInstance(): static
    {
        return static::firstOrCreate(
            ['id' => 1],
            [
                'app_name'           => 'Niger State HMIS Outreach',
                'app_short_name'     => 'HMIS',
                'primary_color'      => '#008080',
                'secondary_color'    => '#006666',
                'login_layout'       => 'centered',
                'show_logo_on_login' => true,
            ]
        );
    }

    // --------------- computed URL accessors ---------------

    public function getLogoUrlAttribute(): ?string
    {
        return $this->logo_path ? Storage::disk('public')->url($this->logo_path) : null;
    }

    public function getLogoDarkUrlAttribute(): ?string
    {
        return $this->logo_dark_path ? Storage::disk('public')->url($this->logo_dark_path) : null;
    }

    public function getFaviconUrlAttribute(): ?string
    {
        return $this->favicon_path ? Storage::disk('public')->url($this->favicon_path) : null;
    }

    public function getLoginBackgroundUrlAttribute(): ?string
    {
        return $this->login_background_path ? Storage::disk('public')->url($this->login_background_path) : null;
    }

    public function getLoginSideImageUrlAttribute(): ?string
    {
        return $this->login_side_image_path ? Storage::disk('public')->url($this->login_side_image_path) : null;
    }
}
