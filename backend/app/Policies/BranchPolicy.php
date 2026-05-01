<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Branch;

class BranchPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('view_branches');
    }

    public function view(User $user, Branch $branch): bool
    {
        return $user->hasPermissionTo('view_branches');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('create_branches');
    }

    public function update(User $user, Branch $branch): bool
    {
        return $user->hasPermissionTo('edit_branches');
    }

    public function delete(User $user, Branch $branch): bool
    {
        return $user->hasPermissionTo('delete_branches');
    }
}

