<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Store;

class StorePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('view_stores');
    }

    public function view(User $user, Store $store): bool
    {
        return $user->hasPermissionTo('view_stores');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('create_stores');
    }

    public function update(User $user, Store $store): bool
    {
        return $user->hasPermissionTo('edit_stores');
    }

    public function delete(User $user, Store $store): bool
    {
        return $user->hasPermissionTo('delete_stores');
    }
}

