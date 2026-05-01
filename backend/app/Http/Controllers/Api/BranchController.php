<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Models\Branch;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    use AuthorizesRequests;
    public function index(Request $request)
    {
        $query = Branch::with(['stores']);

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Non-super admins can only see their accessible branches
        if (!$request->user()->isSuperAdmin()) {
            $accessibleBranchIds = $request->user()->getAccessibleBranchIds();

            if (empty($accessibleBranchIds)) {
                return response()->json([]);
            }

            $query->whereIn('id', $accessibleBranchIds);
        }

        $perPage = $request->get('per_page', 15);
        $branches = $query->latest()->paginate($perPage);

        return response()->json($branches);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Branch::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:branches',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email',
            'manager_id' => 'nullable|exists:users,id',
            'is_active' => 'boolean',
            'settings' => 'nullable|array',
        ]);

        $branch = Branch::create($validated);

        AuditLog::log('created', $branch, null, $branch->toArray(), 'Branch created');

        return response()->json([
            'message' => 'Branch created successfully',
            'branch' => $branch,
        ], 201);
    }

    public function show(Branch $branch)
    {
        $branch->load(['stores', 'manager']);

        return response()->json($branch);
    }

    public function update(Request $request, Branch $branch)
    {
        $this->authorize('update', $branch);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50|unique:branches,code,' . $branch->id,
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email',
            'manager_id' => 'nullable|exists:users,id',
            'is_active' => 'boolean',
            'settings' => 'nullable|array',
        ]);

        $oldValues = $branch->toArray();
        $branch->update($validated);

        AuditLog::log('updated', $branch, $oldValues, $branch->toArray(), 'Branch updated');

        return response()->json([
            'message' => 'Branch updated successfully',
            'branch' => $branch,
        ]);
    }

    public function destroy(Branch $branch)
    {
        $this->authorize('delete', $branch);

        $oldValues = $branch->toArray();
        $branch->delete();

        AuditLog::log('deleted', $branch, $oldValues, null, 'Branch deleted');

        return response()->json([
            'message' => 'Branch deleted successfully',
        ]);
    }
}

