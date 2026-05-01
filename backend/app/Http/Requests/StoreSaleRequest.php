<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\Sale::class);
    }

    public function rules(): array
    {
        return [
            'customer_id' => 'nullable|exists:customers,id',
            'store_id' => 'required|exists:stores,id',
            'sale_type' => 'required|in:pos,portal,manual',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.product_variant_id' => 'nullable|exists:product_variants,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'discount_amount' => 'nullable|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'payment_method' => 'required|in:cash,card,bank_transfer,wallet,mixed',
            'amount_paid' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'items.required' => 'At least one item is required for the sale',
            'items.min' => 'At least one item is required for the sale',
            'items.*.product_id.required' => 'Product is required for each item',
            'items.*.product_id.exists' => 'Selected product does not exist',
            'items.*.quantity.required' => 'Quantity is required for each item',
            'items.*.quantity.min' => 'Quantity must be greater than 0',
            'items.*.unit_price.required' => 'Unit price is required for each item',
            'payment_method.required' => 'Payment method is required',
            'payment_method.in' => 'Invalid payment method selected',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Validate that walk-in customers can only use cash or bank transfer
            if ($this->customer_id) {
                $customer = \App\Models\Customer::find($this->customer_id);
                if ($customer && $customer->customer_type === 'walk_in') {
                    if (!in_array($this->payment_method, ['cash', 'bank_transfer'])) {
                        $validator->errors()->add('payment_method', 'Walk-in customers can only pay with cash or bank transfer');
                    }
                }
            }

            // Validate discount permission
            if ($this->discount_amount > 0 || collect($this->items)->some(fn($item) => ($item['discount_percentage'] ?? 0) > 0)) {
                if (!$this->user()->hasPermissionTo('apply_discounts')) {
                    $validator->errors()->add('discount', 'You do not have permission to apply discounts');
                }
            }
        });
    }
}

