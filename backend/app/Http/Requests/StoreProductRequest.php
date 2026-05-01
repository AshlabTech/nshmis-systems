<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\Product::class);
    }

    public function rules(): array
    {
        return [
            'sku' => 'nullable|string|max:100|unique:products',
            'barcode' => 'nullable|string|max:100|unique:products',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'nullable|exists:product_categories,id',
            'unit_id' => 'required|exists:units,id',
            'cost_price' => 'required|numeric|min:0',
            'selling_price' => 'required|numeric|min:0|gte:cost_price',
            'gain_type' => 'required|in:fixed,percentage',
            'gain_value' => 'required|numeric|min:0',
            'wholesale_price' => 'nullable|numeric|min:0|gte:cost_price',
            'retailer_price' => 'nullable|numeric|min:0|gte:cost_price',
            'reorder_level' => 'required|integer|min:0',
            'reorder_quantity' => 'required|integer|min:0',
            'valuation_method' => 'required|in:weighted_average,fifo',
            'track_inventory' => 'boolean',
            'has_variants' => 'boolean',
            'is_active' => 'boolean',
            'images' => 'nullable|array',
            'images.*' => 'url',
            'meta_data' => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'sku.unique' => 'This SKU already exists',
            'selling_price.gte' => 'Selling price must be greater than or equal to cost price',
            'wholesale_price.gte' => 'Wholesale price must be greater than or equal to cost price',
            'retailer_price.gte' => 'Retailer price must be greater than or equal to cost price',
        ];
    }
}

