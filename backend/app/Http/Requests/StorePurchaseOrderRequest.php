<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\PurchaseOrder::class);
    }

    public function rules(): array
    {
        return [
            'supplier_id' => 'required|exists:suppliers,id',
            'store_id' => 'required|exists:stores,id',
            'order_date' => 'required|date',
            'expected_delivery_date' => 'nullable|date|after:order_date',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.product_variant_id' => 'nullable|exists:product_variants,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_cost' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'supplier_id.required' => 'Supplier is required',
            'store_id.required' => 'Store is required',
            'order_date.required' => 'Order date is required',
            'expected_delivery_date.after' => 'Expected delivery date must be after order date',
            'items.required' => 'At least one item is required',
            'items.min' => 'At least one item is required',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Validate user has access to the selected store
            if ($this->store_id && !$this->user()->isSuperAdmin()) {
                if (!$this->user()->canAccessStore($this->store_id)) {
                    $validator->errors()->add('store_id', 'You do not have access to this store');
                }
            }
        });
    }
}

