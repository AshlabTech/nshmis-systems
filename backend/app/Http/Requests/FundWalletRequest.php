<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class FundWalletRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('fund_wallet');
    }

    public function rules(): array
    {
        return [
            'customer_id' => 'required|exists:customers,id',
            'amount' => 'required|numeric|min:0.01|max:10000000',
            'source' => 'required|in:manual_funding,bank_transfer,payment_gateway',
            'payment_method' => 'required|in:cash,bank_transfer,paystack,monnify,palmpay',
            'reference' => 'nullable|string|max:255|unique:wallet_transactions,gateway_reference',
            'description' => 'nullable|string|max:500',
        ];
    }

    public function messages(): array
    {
        return [
            'customer_id.required' => 'Customer is required',
            'amount.required' => 'Amount is required',
            'amount.min' => 'Amount must be greater than 0',
            'amount.max' => 'Amount cannot exceed 10,000,000',
            'source.required' => 'Funding source is required',
            'payment_method.required' => 'Payment method is required',
            'reference.unique' => 'This transaction reference has already been used',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Validate payment gateway reference is provided for gateway payments
            if ($this->source === 'payment_gateway' && empty($this->reference)) {
                $validator->errors()->add('reference', 'Payment reference is required for gateway payments');
            }

            // Validate bank transfer requires reference
            if ($this->payment_method === 'bank_transfer' && empty($this->reference)) {
                $validator->errors()->add('reference', 'Bank transfer reference is required');
            }
        });
    }
}

