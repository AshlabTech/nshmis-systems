<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Models\Supplier;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    use AuthorizesRequests;
    public function index(Request $request)
    {
        $query = Supplier::query();

        if ($request->has('search')) {
            $query->search($request->search);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $perPage = $request->get('per_page', 15);
        $suppliers = $query->latest()->paginate($perPage);

        return response()->json($suppliers);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Supplier::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|unique:suppliers',
            'phone' => 'required|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'tax_id' => 'nullable|string|max:50',
            'payment_terms' => 'nullable|string',
            'credit_limit' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
        ]);
        $validated['code'] = Supplier::generateCode();
        $supplier = Supplier::create($validated);

        AuditLog::log('created', $supplier, null, $supplier->toArray(), 'Supplier created');

        return response()->json([
            'message' => 'Supplier created successfully',
            'supplier' => $supplier,
        ], 201);
    }

    public function show(Supplier $supplier)
    {
        $supplier->load(['purchaseOrders']);

        return response()->json($supplier);
    }

    public function update(Request $request, Supplier $supplier)
    {
        $this->authorize('update', $supplier);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'nullable|email|unique:suppliers,email,' . $supplier->id,
            'phone' => 'sometimes|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'tax_id' => 'nullable|string|max:50',
            'payment_terms' => 'nullable|string',
            'credit_limit' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        $oldValues = $supplier->toArray();
        $supplier->update($validated);

        AuditLog::log('updated', $supplier, $oldValues, $supplier->toArray(), 'Supplier updated');

        return response()->json([
            'message' => 'Supplier updated successfully',
            'supplier' => $supplier,
        ]);
    }

    public function destroy(Supplier $supplier)
    {
        $this->authorize('delete', $supplier);

        $oldValues = $supplier->toArray();
        $supplier->delete();

        AuditLog::log('deleted', $supplier, $oldValues, null, 'Supplier deleted');

        return response()->json([
            'message' => 'Supplier deleted successfully',
        ]);
    }
}

