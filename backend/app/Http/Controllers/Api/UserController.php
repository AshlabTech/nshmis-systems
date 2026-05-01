<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Models\User;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $this->authorize('viewAny', User::class);

        $query = User::with(['branch', 'store', 'branches', 'stores', 'roles']);

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Filter by branch
        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        // Filter by store
        if ($request->has('store_id')) {
            $query->where('store_id', $request->store_id);
        }

        // Filter by role
        if ($request->has('role')) {
            $query->role($request->role);
        }

        // Filter by status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $perPage = $request->get('per_page', 15);
        $users = $query->latest()->paginate($perPage);

        return response()->json($users);
    }

    public function store(Request $request)
    {
        $this->authorize('create', User::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'branch_id' => 'nullable|exists:branches,id',
            'store_id' => 'nullable|exists:stores,id',
            'branch_ids' => 'nullable|array',
            'branch_ids.*' => 'exists:branches,id',
            'store_ids' => 'nullable|array',
            'store_ids.*' => 'exists:stores,id',
            'role' => 'required|string|exists:roles,name',
            'is_active' => 'boolean',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'branch_id' => $validated['branch_id'] ?? null,
            'store_id' => $validated['store_id'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        // Assign role
        $user->assignRole($validated['role']);

        // Sync multiple branches
        if (isset($validated['branch_ids'])) {
            $user->branches()->sync($validated['branch_ids']);
        }

        // Sync multiple stores
        if (isset($validated['store_ids'])) {
            $user->stores()->sync($validated['store_ids']);
        }

        AuditLog::log('created', $user, null, $user->toArray(), 'User created');

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user->load(['branch', 'store', 'branches', 'stores', 'roles']),
        ], 201);
    }

    public function show(User $user)
    {
        $this->authorize('view', $user);

        $user->load(['branch', 'store', 'branches', 'stores', 'roles', 'permissions']);

        return response()->json($user);
    }

    public function update(Request $request, User $user)
    {
        $this->authorize('update', $user);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:8',
            'branch_id' => 'nullable|exists:branches,id',
            'store_id' => 'nullable|exists:stores,id',
            'branch_ids' => 'nullable|array',
            'branch_ids.*' => 'exists:branches,id',
            'store_ids' => 'nullable|array',
            'store_ids.*' => 'exists:stores,id',
            'role' => 'sometimes|string|exists:roles,name',
            'is_active' => 'boolean',
        ]);

        $oldValues = $user->toArray();

        // Update basic fields
        $updateData = [];
        if (isset($validated['name'])) $updateData['name'] = $validated['name'];
        if (isset($validated['email'])) $updateData['email'] = $validated['email'];
        if (isset($validated['password'])) $updateData['password'] = Hash::make($validated['password']);
        if (isset($validated['branch_id'])) $updateData['branch_id'] = $validated['branch_id'];
        if (isset($validated['store_id'])) $updateData['store_id'] = $validated['store_id'];
        if (isset($validated['is_active'])) $updateData['is_active'] = $validated['is_active'];

        $user->update($updateData);

        // Update role if provided
        if (isset($validated['role'])) {
            $user->syncRoles([$validated['role']]);
        }

        // Sync multiple branches
        if (isset($validated['branch_ids'])) {
            $user->branches()->sync($validated['branch_ids']);
        }

        // Sync multiple stores
        if (isset($validated['store_ids'])) {
            $user->stores()->sync($validated['store_ids']);
        }

        AuditLog::log('updated', $user, $oldValues, $user->toArray(), 'User updated');

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user->load(['branch', 'store', 'branches', 'stores', 'roles']),
        ]);
    }

    public function destroy(User $user)
    {
        $this->authorize('delete', $user);

        // Prevent deleting yourself
        if ($user->id === auth()->id()) {
            return response()->json([
                'message' => 'You cannot delete your own account',
            ], 403);
        }

        $oldValues = $user->toArray();
        $user->delete();

        AuditLog::log('deleted', $user, $oldValues, null, 'User deleted');

        return response()->json([
            'message' => 'User deleted successfully',
        ]);
    }

    public function roles()
    {
        $roles = Role::all(['id', 'name']);

        return response()->json($roles);
    }
}

