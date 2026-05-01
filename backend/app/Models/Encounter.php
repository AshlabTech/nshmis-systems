<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Encounter extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'patient_id',
        'patient_uuid',
        'lga_id',
        'ward_id',
        'lga_uuid',
        'ward_uuid',
        'encounter_type',
        'service_point',
        'encounter_date',
        'version_stamp',
        'supersedes_uuid',
        'findings',
        'notes',
        'created_by_user_id',
        'sync_status',
        'synced_at',
    ];

    protected $casts = [
        'encounter_date' => 'date',
        'version_stamp' => 'integer',
        'findings' => 'array',
        'synced_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (Encounter $encounter): void {
            $encounter->uuid ??= (string) Str::uuid();
        });
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function lga(): BelongsTo
    {
        return $this->belongsTo(Lga::class);
    }

    public function ward(): BelongsTo
    {
        return $this->belongsTo(Ward::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function referrals(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Referral::class);
    }
}
