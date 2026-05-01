<?php

namespace App\Policies;

use App\Models\User;
use App\Models\StockTransfer;

class StockTransferPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('view_stock_transfers');
    }

    public function view(User $user, StockTransfer $stockTransfer): bool
    {
        return $user->hasPermissionTo('view_stock_transfers');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('create_stock_transfers');
    }

    public function approve(User $user, StockTransfer $stockTransfer): bool
    {
        return $user->hasPermissionTo('approve_stock_transfers');
    }
}

