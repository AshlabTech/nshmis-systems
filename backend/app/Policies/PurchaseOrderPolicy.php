<?php

namespace App\Policies;

use App\Models\User;
use App\Models\PurchaseOrder;

class PurchaseOrderPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('view_purchase_orders');
    }

    public function view(User $user, PurchaseOrder $purchaseOrder): bool
    {
        return $user->hasPermissionTo('view_purchase_orders');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('create_purchase_orders');
    }

    public function update(User $user, PurchaseOrder $purchaseOrder): bool
    {
        return $user->hasPermissionTo('edit_purchase_orders');
    }

    public function delete(User $user, PurchaseOrder $purchaseOrder): bool
    {
        return $user->hasPermissionTo('delete_purchase_orders');
    }

    public function approve(User $user, PurchaseOrder $purchaseOrder): bool
    {
        return $user->hasPermissionTo('approve_purchase_orders');
    }

    public function receive(User $user, PurchaseOrder $purchaseOrder): bool
    {
        return $user->hasPermissionTo('receive_purchase_orders');
    }
}

