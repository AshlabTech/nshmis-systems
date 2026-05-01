<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Product;

class ProductPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('view_products');
    }

    public function view(User $user, Product $product): bool
    {
        return $user->hasPermissionTo('view_products');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('create_products');
    }

    public function update(User $user, Product $product): bool
    {
        return $user->hasPermissionTo('edit_products');
    }

    public function delete(User $user, Product $product): bool
    {
        return $user->hasPermissionTo('delete_products');
    }
}

