<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lga extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'name',
    ];

    public function wards(): HasMany
    {
        return $this->hasMany(Ward::class);
    }

    public function patients(): HasMany
    {
        return $this->hasMany(Patient::class);
    }

    public function assignedUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_lga_assignments', 'lga_id', 'user_id')
            ->withPivot('assigned_by')
            ->withTimestamps();
    }
}
