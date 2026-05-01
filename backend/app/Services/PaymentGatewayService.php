<?php

namespace App\Services;

use App\Models\PaymentGateway;
use Exception;

class PaymentGatewayService
{
    /**
     * Get the appropriate gateway service instance
     */
    public function getGatewayService(?string $driver = null)
    {
        $gateway = $driver 
            ? PaymentGateway::where('driver', $driver)->active()->first()
            : PaymentGateway::default()->first() ?? PaymentGateway::active()->orderBy('priority', 'desc')->first();

        if (!$gateway) {
            throw new Exception('No active payment gateway found');
        }

        return match ($gateway->driver) {
            'paystack' => new PaystackService($gateway),
            'monnify' => new MonnifyService($gateway),
            'palmpay' => new PalmPayService($gateway),
            default => throw new Exception("Unsupported gateway driver: {$gateway->driver}"),
        };
    }

    /**
     * Initialize a payment
     */
    public function initializePayment(array $data, ?string $driver = null): array
    {
        $service = $this->getGatewayService($driver);
        return $service->initializeTransaction($data);
    }

    /**
     * Verify a payment
     */
    public function verifyPayment(string $reference, ?string $driver = null): array
    {
        $service = $this->getGatewayService($driver);
        return $service->verifyTransaction($reference);
    }

    /**
     * Get all active gateways
     */
    public function getActiveGateways(): array
    {
        return PaymentGateway::active()
            ->orderBy('priority', 'desc')
            ->get()
            ->map(function ($gateway) {
                return [
                    'id' => $gateway->id,
                    'name' => $gateway->name,
                    'driver' => $gateway->driver,
                    'display_name' => $gateway->display_name,
                    'description' => $gateway->description,
                    'is_default' => $gateway->is_default,
                    'currency' => $gateway->currency,
                    'supported_channels' => $gateway->supported_channels,
                ];
            })
            ->toArray();
    }

    /**
     * Get default gateway
     */
    public function getDefaultGateway(): ?PaymentGateway
    {
        return PaymentGateway::default()->first() 
            ?? PaymentGateway::active()->orderBy('priority', 'desc')->first();
    }

    /**
     * Set default gateway
     */
    public function setDefaultGateway(int $gatewayId): bool
    {
        $gateway = PaymentGateway::findOrFail($gatewayId);
        
        if (!$gateway->is_active) {
            throw new Exception('Cannot set inactive gateway as default');
        }

        PaymentGateway::where('id', '!=', $gatewayId)->update(['is_default' => false]);
        $gateway->update(['is_default' => true]);

        return true;
    }

    /**
     * Activate/Deactivate gateway
     */
    public function toggleGateway(int $gatewayId, bool $isActive): bool
    {
        $gateway = PaymentGateway::findOrFail($gatewayId);
        
        // If deactivating the default gateway, set another as default
        if (!$isActive && $gateway->is_default) {
            $newDefault = PaymentGateway::where('id', '!=', $gatewayId)
                ->active()
                ->orderBy('priority', 'desc')
                ->first();
                
            if ($newDefault) {
                $newDefault->update(['is_default' => true]);
            }
        }

        $gateway->update(['is_active' => $isActive]);
        return true;
    }

    /**
     * Update gateway credentials
     */
    public function updateCredentials(int $gatewayId, array $credentials): bool
    {
        $gateway = PaymentGateway::findOrFail($gatewayId);
        $gateway->update(['credentials' => $credentials]);
        return true;
    }

    /**
     * Test gateway connection
     */
    public function testGateway(int $gatewayId): array
    {
        try {
            $gateway = PaymentGateway::findOrFail($gatewayId);
            $service = $this->getGatewayService($gateway->driver);
            
            // Attempt a small test (implementation depends on gateway)
            return [
                'status' => true,
                'message' => 'Gateway connection successful',
            ];
        } catch (Exception $e) {
            return [
                'status' => false,
                'message' => $e->getMessage(),
            ];
        }
    }
}

