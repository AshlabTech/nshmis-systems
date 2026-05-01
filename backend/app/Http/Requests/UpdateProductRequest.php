<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('product'));
    }

    public function rules(): array
    {
        $productId = $this->route('product')->id;

        return [
            'sku' => 'sometimes|string|max:100|unique:products,sku,' . $productId,
            'barcode' => 'nullable|string|max:100|unique:products,barcode,' . $productId,
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'nullable|exists:product_categories,id',
            'unit_id' => 'sometimes|exists:units,id',
            'cost_price' => 'sometimes|numeric|min:0',
            'selling_price' => 'sometimes|numeric|min:0',
            'gain_type' => 'sometimes|in:fixed,percentage',
            'gain_value' => 'sometimes|numeric|min:0',
            'wholesale_price' => 'nullable|numeric|min:0',
            'retailer_price' => 'nullable|numeric|min:0',
            'reorder_level' => 'sometimes|integer|min:0',
            'reorder_quantity' => 'sometimes|integer|min:0',
            'valuation_method' => 'sometimes|in:weighted_average,fifo',
            'track_inventory' => 'boolean',
            'has_variants' => 'boolean',
            'is_active' => 'boolean',
            'images' => 'nullable|array',
            'images.*' => 'url',
            'meta_data' => 'nullable|array',
        ];
    }
}

