<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Concerns\AppliesRoleScope;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    use AppliesRoleScope;

    public function index(Request $request): JsonResponse
    {
        $this->ensureStateAdmin($request->user());
        $query = User::query()
            ->when($request->filled('search'), function ($builder) use ($request) {
                $search = '%' . $request->string('search') . '%';
                $builder->where(function ($inner) use ($search) {
                    $inner->where('name', 'like', $search)
                        ->orWhere('email', 'like', $search)
                        ->orWhere('team_name', 'like', $search);
                });
            })
            ->when($request->filled('role'), fn ($builder) => $builder->where('role', $request->string('role')))
            ->latest();

        return response()->json($query->paginate((int) $request->input('per_page', 20)));
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensureStateAdmin($request->user());
        $validated = $request->validate([
            'name' => ['required', 'string'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'in:data_clerk,supervisor,state_admin'],
            'assigned_lga_uuid' => ['nullable', 'uuid'],
            'assigned_ward_uuid' => ['nullable', 'uuid'],
            'team_name' => ['nullable', 'string'],
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $user = User::create($validated);
        return response()->json($user, 201);
    }

    public function show(Request $request, User $user): JsonResponse
    {
        $this->ensureStateAdmin($request->user());
        return response()->json($user);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $this->ensureStateAdmin($request->user());
        $validated = $request->validate([
            'name' => ['sometimes', 'string'],
            'email' => ['sometimes', 'email', 'unique:users,email,'.$user->id],
            'password' => ['sometimes', 'string', 'min:8'],
            'role' => ['sometimes', 'in:data_clerk,supervisor,state_admin'],
            'assigned_lga_uuid' => ['nullable', 'uuid'],
            'assigned_ward_uuid' => ['nullable', 'uuid'],
            'team_name' => ['nullable', 'string'],
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);
        return response()->json($user);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->ensureStateAdmin($request->user());
        $user->delete();
        return response()->json(['message' => 'User deleted.']);
    }
}
