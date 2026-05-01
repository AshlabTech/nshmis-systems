<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Sale;

class SalePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('view_sales');
    }

    public function view(User $user, Sale $sale): bool
    {
        return $user->hasPermissionTo('view_sales');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('create_sales');
    }

    public function void(User $user, Sale $sale): bool
    {
        return $user->hasPermissionTo('void_sales');
    }
}

