<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Supplier;

class SupplierPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('view_suppliers');
    }

    public function view(User $user, Supplier $supplier): bool
    {
        return $user->hasPermissionTo('view_suppliers');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('create_suppliers');
    }

    public function update(User $user, Supplier $supplier): bool
    {
        return $user->hasPermissionTo('edit_suppliers');
    }

    public function delete(User $user, Supplier $supplier): bool
    {
        return $user->hasPermissionTo('delete_suppliers');
    }
}

