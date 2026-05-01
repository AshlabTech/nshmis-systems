<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

trait AppliesRoleScope
{
    private function scopeByUser(Builder $query, User $user, string $table = ''): Builder
    {
        $prefix = $table ? $table.'.' : '';

        return match ($user->role) {
            'state_admin' => $query,
            'supervisor' => $query
                ->when($user->assigned_lga_uuid, fn (Builder $q) => $q->where($prefix.'lga_uuid', $user->assigned_lga_uuid))
                ->when($user->assigned_ward_uuid, fn (Builder $q) => $q->where($prefix.'ward_uuid', $user->assigned_ward_uuid)),
            default => $query->where($prefix.'created_by_user_id', $user->id),
        };
    }

    private function scopeUsersForAdmin(User $user): Builder
    {
        return match ($user->role) {
            'state_admin' => User::query(),
            'supervisor' => User::query()
                ->when($user->assigned_lga_uuid, fn (Builder $q) => $q->where('assigned_lga_uuid', $user->assigned_lga_uuid))
                ->when($user->assigned_ward_uuid, fn (Builder $q) => $q->where('assigned_ward_uuid', $user->assigned_ward_uuid))
                ->when($user->team_name, fn (Builder $q) => $q->where('team_name', $user->team_name)),
            default => User::query()->where('id', $user->id),
        };
    }

    private function ensureStateAdmin(User $user): void
    {
        abort_if($user->role !== 'state_admin', 403, 'Only state admin can access this resource.');
    }
}
