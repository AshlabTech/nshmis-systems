<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /**
     * Determine if the user can view any users.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('view_users') || $user->isSuperAdmin();
    }

    /**
     * Determine if the user can view the model.
     */
    public function view(User $user, User $model): bool
    {
        return $user->hasPermissionTo('view_users') || $user->isSuperAdmin();
    }

    /**
     * Determine if the user can create users.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('create_users') || $user->isSuperAdmin();
    }

    /**
     * Determine if the user can update the model.
     */
    public function update(User $user, User $model): bool
    {
        return $user->hasPermissionTo('update_users') || $user->isSuperAdmin();
    }

    /**
     * Determine if the user can delete the model.
     */
    public function delete(User $user, User $model): bool
    {
        // Cannot delete yourself
        if ($user->id === $model->id) {
            return false;
        }

        return $user->hasPermissionTo('delete_users') || $user->isSuperAdmin();
    }
}

