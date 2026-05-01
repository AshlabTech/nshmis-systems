<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;
    use HasFactory;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'assigned_lga_uuid',
        'assigned_ward_uuid',
        'team_name',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];
}
