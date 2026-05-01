<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SyncLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'batch_uuid',
        'entity_type',
        'entity_uuid',
        'status',
        'message',
        'error_message',
        'device_id',
        'user_id',
        'payload',
        'response',
    ];

    protected $casts = [
        'payload' => 'array',
        'response' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
