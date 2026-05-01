<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Referral extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'patient_id',
        'patient_uuid',
        'encounter_id',
        'encounter_uuid',
        'lga_id',
        'ward_id',
        'lga_uuid',
        'ward_uuid',
        'referred_to_facility',
        'referral_reason',
        'urgency',
        'status',
        'workflow_status',
        'completed_at',
        'completed_by',
        'created_by_user_id',
        'sync_status',
        'synced_at',
    ];

    protected $casts = [
        'completed_at' => 'datetime',
        'synced_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (Referral $referral): void {
            $referral->uuid ??= (string) Str::uuid();
        });
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function encounter(): BelongsTo
    {
        return $this->belongsTo(Encounter::class);
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
}
