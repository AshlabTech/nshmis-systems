<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStockTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\StockTransfer::class);
    }

    public function rules(): array
    {
        return [
            'from_store_id' => 'required|exists:stores,id',
            'to_store_id' => 'required|exists:stores,id|different:from_store_id',
            'transfer_date' => 'required|date',
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
            'from_store_id.required' => 'Source store is required',
            'to_store_id.required' => 'Destination store is required',
            'to_store_id.different' => 'Destination store must be different from source store',
            'items.required' => 'At least one item is required',
            'items.min' => 'At least one item is required',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Validate user has access to both stores
            if (!$this->user()->isSuperAdmin()) {
                if ($this->from_store_id && !$this->user()->canAccessStore($this->from_store_id)) {
                    $validator->errors()->add('from_store_id', 'You do not have access to the source store');
                }
                if ($this->to_store_id && !$this->user()->canAccessStore($this->to_store_id)) {
                    $validator->errors()->add('to_store_id', 'You do not have access to the destination store');
                }
            }
        });
    }
}

