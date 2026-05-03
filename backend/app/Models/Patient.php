<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Patient extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'lga_id',
        'ward_id',
        'primary_facility_id',
        'primary_facility_uuid',
        'lga_uuid',
        'ward_uuid',
        'first_name',
        'middle_name',
        'last_name',
        'sex',
        'date_of_birth',
        'estimated_age_years',
        'is_estimated_age',
        'temporary_id_hash',
        'phone_number',
        'nhis_status',
        'nin',
        'address_line',
        'created_by_user_id',
        'sync_status',
        'synced_at',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'estimated_age_years' => 'integer',
        'is_estimated_age' => 'boolean',
        'synced_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (Patient $patient): void {
            $patient->uuid ??= (string) Str::uuid();
        });
    }

    public function lga(): BelongsTo
    {
        return $this->belongsTo(Lga::class);
    }

    public function ward(): BelongsTo
    {
        return $this->belongsTo(Ward::class);
    }

    public function primaryFacility(): BelongsTo
    {
        return $this->belongsTo(Facility::class, 'primary_facility_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function encounters(): HasMany
    {
        return $this->hasMany(Encounter::class);
    }

    public function referrals(): HasMany
    {
        return $this->hasMany(Referral::class);
    }
}
