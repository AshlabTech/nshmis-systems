<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Facility extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'name',
        'lga_uuid',
        'ward_uuid',
        'type',
        'status',
    ];
}
