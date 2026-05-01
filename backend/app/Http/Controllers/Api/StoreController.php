<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Models\Store;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class StoreController extends Controller
{
    use AuthorizesRequests;
    public function index(Request $request)
    {
        $query = Store::with(['branch']);

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Non-super admins can only see stores they have access to
        if (!$request->user()->isSuperAdmin()) {
            $accessibleStoreIds = $request->user()->getAccessibleStoreIds();

            if (empty($accessibleStoreIds)) {
                return response()->json([]);
            }

            $query->whereIn('id', $accessibleStoreIds);
        }

        $perPage = $request->get('per_page', 15);
        $stores = $query->latest()->paginate($perPage);

        return response()->json($stores);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Store::class);

        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:stores',
            'type' => 'required|in:warehouse,retail,showroom',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:20',
            'manager_id' => 'nullable|exists:users,id',
            'is_active' => 'boolean',
        ]);

        $store = Store::create($validated);

        AuditLog::log('created', $store, null, $store->toArray(), 'Store created');

        return response()->json([
            'message' => 'Store created successfully',
            'store' => $store->load('branch'),
        ], 201);
    }

    public function show(Store $store)
    {
        $store->load(['branch', 'manager']);

        return response()->json($store);
    }

    public function update(Request $request, Store $store)
    {
        $this->authorize('update', $store);

        $validated = $request->validate([
            'branch_id' => 'sometimes|exists:branches,id',
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50|unique:stores,code,' . $store->id,
            'type' => 'sometimes|in:warehouse,retail,showroom',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:20',
            'manager_id' => 'nullable|exists:users,id',
            'is_active' => 'boolean',
        ]);

        $oldValues = $store->toArray();
        $store->update($validated);

        AuditLog::log('updated', $store, $oldValues, $store->toArray(), 'Store updated');

        return response()->json([
            'message' => 'Store updated successfully',
            'store' => $store->load('branch'),
        ]);
    }

    public function destroy(Store $store)
    {
        $this->authorize('delete', $store);

        $oldValues = $store->toArray();
        $store->delete();

        AuditLog::log('deleted', $store, $oldValues, null, 'Store deleted');

        return response()->json([
            'message' => 'Store deleted successfully',
        ]);
    }
}

