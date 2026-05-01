<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Customer;

class CustomerPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('view_customers');
    }

    public function view(User $user, Customer $customer): bool
    {
        return $user->hasPermissionTo('view_customers');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('create_customers');
    }

    public function update(User $user, Customer $customer): bool
    {
        return $user->hasPermissionTo('edit_customers');
    }

    public function delete(User $user, Customer $customer): bool
    {
        return $user->hasPermissionTo('delete_customers');
    }

    public function managePricing(User $user, Customer $customer): bool
    {
        return $user->hasPermissionTo('manage_customer_pricing');
    }
}

