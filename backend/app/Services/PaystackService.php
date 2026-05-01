<?php

namespace App\Services;

use App\Models\PaymentGateway;
use Yabacon\Paystack;
use Illuminate\Support\Facades\Log;
use Exception;

class PaystackService
{
    protected $paystack;
    protected $gateway;

    public function __construct(?PaymentGateway $gateway = null)
    {
        $this->gateway = $gateway ?? PaymentGateway::where('driver', 'paystack')->active()->first();
        
        if ($this->gateway) {
            $this->paystack = new Paystack($this->gateway->getSecretKey());
        }
    }

    /**
     * Initialize a payment transaction
     */
    public function initializeTransaction(array $data): array
    {
        try {
            if (!$this->gateway || !$this->gateway->is_active) {
                throw new Exception('Paystack gateway is not configured or inactive');
            }

            $tranx = $this->paystack->transaction->initialize([
                'amount' => $data['amount'] * 100, // Convert to kobo
                'email' => $data['email'],
                'reference' => $data['reference'] ?? $this->generateReference(),
                'callback_url' => $data['callback_url'] ?? $this->gateway->callback_url,
                'metadata' => $data['metadata'] ?? [],
                'channels' => $data['channels'] ?? $this->gateway->supported_channels,
                'currency' => $data['currency'] ?? $this->gateway->currency,
            ]);

            if ($tranx->status) {
                return [
                    'status' => true,
                    'message' => 'Transaction initialized',
                    'data' => [
                        'authorization_url' => $tranx->data->authorization_url,
                        'access_code' => $tranx->data->access_code,
                        'reference' => $tranx->data->reference,
                    ],
                ];
            }

            throw new Exception($tranx->message ?? 'Failed to initialize transaction');
        } catch (Exception $e) {
            Log::error('Paystack initialization error: ' . $e->getMessage());
            
            return [
                'status' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Verify a transaction
     */
    public function verifyTransaction(string $reference): array
    {
        try {
            if (!$this->gateway || !$this->gateway->is_active) {
                throw new Exception('Paystack gateway is not configured or inactive');
            }

            $tranx = $this->paystack->transaction->verify([
                'reference' => $reference,
            ]);

            if ($tranx->status && $tranx->data->status === 'success') {
                return [
                    'status' => true,
                    'message' => 'Transaction verified successfully',
                    'data' => [
                        'reference' => $tranx->data->reference,
                        'amount' => $tranx->data->amount / 100, // Convert from kobo
                        'currency' => $tranx->data->currency,
                        'status' => $tranx->data->status,
                        'paid_at' => $tranx->data->paid_at,
                        'channel' => $tranx->data->channel,
                        'customer' => [
                            'email' => $tranx->data->customer->email,
                            'customer_code' => $tranx->data->customer->customer_code,
                        ],
                        'metadata' => $tranx->data->metadata,
                    ],
                ];
            }

            return [
                'status' => false,
                'message' => 'Transaction verification failed',
                'data' => [
                    'status' => $tranx->data->status ?? 'failed',
                ],
            ];
        } catch (Exception $e) {
            Log::error('Paystack verification error: ' . $e->getMessage());
            
            return [
                'status' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Verify webhook signature
     */
    public function verifyWebhookSignature(string $input, string $signature): bool
    {
        if (!$this->gateway) {
            return false;
        }

        $hash = hash_hmac('sha512', $input, $this->gateway->getSecretKey());
        return $hash === $signature;
    }

    /**
     * Generate a unique reference
     */
    public function generateReference(): string
    {
        return 'PAY_' . time() . '_' . uniqid();
    }

    /**
     * Get transaction details
     */
    public function getTransaction(string $reference): array
    {
        return $this->verifyTransaction($reference);
    }
}

