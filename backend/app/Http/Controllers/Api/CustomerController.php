<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Models\Customer;
use App\Models\CustomerPricing;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    use AuthorizesRequests;
    public function index(Request $request)
    {
        $query = Customer::query();

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($request->has('customer_type')) {
            $query->where('type', $request->customer_type);
        }

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $perPage = $request->get('per_page', 15);
        $customers = $query->latest()->paginate($perPage);

        return response()->json($customers);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Customer::class);

        $validated = $request->validate([
            'customer_type' => 'required|in:walk_in,registered',
            'category' => 'nullable|in:general,retailer,wholesaler',
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|unique:customers',
            'phone' => 'required|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'tax_id' => 'nullable|string|max:50',
            'credit_limit' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        // Map customer_type to type field
        $validated['type'] = $validated['customer_type'];
        unset($validated['customer_type']);

        // call generateCode() on the Customer model
        $validated['code'] = Customer::generateCode();
        $customer = Customer::create($validated);

        AuditLog::log('created', $customer, null, $customer->toArray(), 'Customer created');

        return response()->json([
            'message' => 'Customer created successfully',
            'customer' => $customer,
        ], 201);
    }

    public function show(Customer $customer)
    {
        $customer->load(['customerPricing', 'orders', 'sales', 'walletTransactions']);

        return response()->json($customer);
    }

    public function update(Request $request, Customer $customer)
    {
        $this->authorize('update', $customer);

        $validated = $request->validate([
            'customer_type' => 'sometimes|in:walk_in,registered',
            'category' => 'nullable|in:general,retailer,wholesaler',
            'name' => 'sometimes|string|max:255',
            'email' => 'nullable|email|unique:customers,email,' . $customer->id,
            'phone' => 'sometimes|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'tax_id' => 'nullable|string|max:50',
            'credit_limit' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        // Map customer_type to type field if present
        if (isset($validated['customer_type'])) {
            $validated['type'] = $validated['customer_type'];
            unset($validated['customer_type']);
        }

        $oldValues = $customer->toArray();
        $customer->update($validated);

        AuditLog::log('updated', $customer, $oldValues, $customer->toArray(), 'Customer updated');

        return response()->json([
            'message' => 'Customer updated successfully',
            'customer' => $customer,
        ]);
    }

    public function destroy(Customer $customer)
    {
        $this->authorize('delete', $customer);

        $oldValues = $customer->toArray();
        $customer->delete();

        AuditLog::log('deleted', $customer, $oldValues, null, 'Customer deleted');

        return response()->json([
            'message' => 'Customer deleted successfully',
        ]);
    }

    public function pricing(Customer $customer)
    {
        $pricing = $customer->customerPricing()
            ->with(['product', 'variant'])
            ->get();

        return response()->json($pricing);
    }

    public function setPricing(Request $request, Customer $customer)
    {
        $this->authorize('manage-pricing', $customer);

        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'product_variant_id' => 'nullable|exists:product_variants,id',
            'special_price' => 'required|numeric|min:0',
            'effective_from' => 'nullable|date',
            'effective_to' => 'nullable|date|after:effective_from',
        ]);

        DB::beginTransaction();
        try {
            $pricing = CustomerPricing::updateOrCreate(
                [
                    'customer_id' => $customer->id,
                    'product_id' => $validated['product_id'],
                    'product_variant_id' => $validated['product_variant_id'] ?? null,
                ],
                [
                    'special_price' => $validated['special_price'],
                    'effective_from' => $validated['effective_from'] ?? null,
                    'effective_to' => $validated['effective_to'] ?? null,
                ]
            );

            AuditLog::log('pricing_set', $pricing, null, $pricing->toArray(), 'Customer pricing set');

            DB::commit();

            return response()->json([
                'message' => 'Customer pricing set successfully',
                'pricing' => $pricing->load(['product', 'variant']),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to set customer pricing',
                'error' => $e->getMessage(),
            ], 400);
        }
    }
}

