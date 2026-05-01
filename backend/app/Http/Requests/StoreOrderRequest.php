<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Customers can create orders
    }

    public function rules(): array
    {
        return [
            'customer_id' => 'required|exists:customers,id',
            'store_id' => 'required|exists:stores,id',
            'delivery_address' => 'required|string|max:500',
            'delivery_phone' => 'required|string|max:20',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.product_variant_id' => 'nullable|exists:product_variants,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'customer_id.required' => 'Customer is required for orders',
            'delivery_address.required' => 'Delivery address is required',
            'delivery_phone.required' => 'Delivery phone number is required',
            'items.required' => 'At least one item is required',
            'items.min' => 'At least one item is required',
        ];
    }
}

