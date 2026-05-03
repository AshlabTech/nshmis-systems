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
            // data_clerk: own records only, further constrained by their LGA assignments if any exist
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

    /**
     * Returns the LGA UUIDs a data_clerk is allowed to operate in.
     * Returns null for non-data_clerk roles (no restriction by this mechanism).
     *
     * @return string[]|null
     */
    private function getDataClerkAllowedLgaUuids(User $user): ?array
    {
        if ($user->role !== 'data_clerk') {
            return null;
        }

        $uuids = $user->assignedLgas()->pluck('uuid')->toArray();

        return $uuids;
    }

    /**
     * Throws 403 if the given lga_uuid is not in the data_clerk's assigned LGAs.
     * No-op for other roles.
     */
    private function assertDataClerkLgaAllowed(User $user, ?string $lgaUuid): void
    {
        if ($user->role !== 'data_clerk') {
            return;
        }

        $allowed = $this->getDataClerkAllowedLgaUuids($user);

        if (empty($allowed)) {
            throw new \RuntimeException('Your account has no LGA assignments. Please contact your supervisor.');
        }

        if ($lgaUuid && ! in_array($lgaUuid, $allowed, true)) {
            throw new \RuntimeException('You are not authorised to submit records for LGA: '.$lgaUuid);
        }
    }
}
