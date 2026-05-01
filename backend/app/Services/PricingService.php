<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductVariant;

class PricingService
{
    /**
     * Calculate the price for a product based on customer and pricing rules
     * Priority: Customer-specific > Category price > Default price
     */
    public function calculatePrice(
        Product $product,
        Customer $customer,
        ?ProductVariant $variant = null,
        float $quantity = 1
    ): array {
        $basePrice = $variant ? $variant->selling_price : $product->selling_price;
        $originalPrice = $basePrice;
        $discountAmount = 0;
        $discountPercentage = 0;
        $discountSource = null;

        // Priority 1: Customer-specific pricing
        $customerPricing = $customer->getSpecialPrice(
            $product->id,
            $variant?->id
        );

        if ($customerPricing) {
            if ($customerPricing->special_price) {
                $basePrice = $customerPricing->special_price;
                $discountSource = 'customer_special_price';
            } elseif ($customerPricing->discount_percentage) {
                $discountPercentage = $customerPricing->discount_percentage;
                $discountAmount = ($originalPrice * $discountPercentage) / 100;
                $basePrice = $originalPrice - $discountAmount;
                $discountSource = 'customer_percentage_discount';
            } elseif ($customerPricing->discount_amount) {
                $discountAmount = $customerPricing->discount_amount;
                $basePrice = $originalPrice - $discountAmount;
                $discountSource = 'customer_fixed_discount';
            }
        }
        // Priority 2: Customer category pricing
        elseif ($customer->category === 'wholesaler' && $product->wholesale_price) {
            $basePrice = $product->wholesale_price;
            $discountSource = 'wholesaler_price';
        } elseif ($customer->category === 'retailer' && $product->retailer_price) {
            $basePrice = $product->retailer_price;
            $discountSource = 'retailer_price';
        }

        return [
            'original_price' => $originalPrice,
            'unit_price' => $basePrice,
            'quantity' => $quantity,
            'line_total' => $basePrice * $quantity,
            'discount_amount' => $discountAmount,
            'discount_percentage' => $discountPercentage,
            'discount_source' => $discountSource,
        ];
    }

    /**
     * Apply additional discount to a line item
     * Requires authorization and audit logging
     */
    public function applyDiscount(
        float $originalPrice,
        float $quantity,
        ?float $discountPercentage = null,
        ?float $discountAmount = null,
        ?float $overridePrice = null
    ): array {
        $unitPrice = $originalPrice;
        $totalDiscount = 0;
        $finalPercentage = 0;

        if ($overridePrice !== null) {
            $unitPrice = $overridePrice;
            $totalDiscount = ($originalPrice - $overridePrice) * $quantity;
            $finalPercentage = (($originalPrice - $overridePrice) / $originalPrice) * 100;
        } elseif ($discountPercentage !== null) {
            $finalPercentage = $discountPercentage;
            $totalDiscount = ($originalPrice * $discountPercentage / 100) * $quantity;
            $unitPrice = $originalPrice - ($originalPrice * $discountPercentage / 100);
        } elseif ($discountAmount !== null) {
            $totalDiscount = $discountAmount;
            $unitPrice = $originalPrice - ($discountAmount / $quantity);
            $finalPercentage = ($discountAmount / ($originalPrice * $quantity)) * 100;
        }

        return [
            'original_price' => $originalPrice,
            'unit_price' => $unitPrice,
            'quantity' => $quantity,
            'discount_amount' => $totalDiscount,
            'discount_percentage' => $finalPercentage,
            'line_total' => $unitPrice * $quantity,
        ];
    }

    /**
     * Calculate order totals with discounts and taxes
     */
    public function calculateOrderTotal(
        array $items,
        ?float $orderDiscountPercentage = null,
        ?float $orderDiscountAmount = null,
        float $taxRate = 0
    ): array {
        $subtotal = array_sum(array_column($items, 'line_total'));
        $itemDiscounts = array_sum(array_column($items, 'discount_amount'));
        
        $orderDiscount = 0;
        if ($orderDiscountPercentage) {
            $orderDiscount = ($subtotal * $orderDiscountPercentage) / 100;
        } elseif ($orderDiscountAmount) {
            $orderDiscount = $orderDiscountAmount;
        }

        $totalAfterDiscount = $subtotal - $orderDiscount;
        $taxAmount = ($totalAfterDiscount * $taxRate) / 100;
        $total = $totalAfterDiscount + $taxAmount;

        return [
            'subtotal' => $subtotal,
            'item_discounts' => $itemDiscounts,
            'order_discount' => $orderDiscount,
            'total_discount' => $itemDiscounts + $orderDiscount,
            'tax_amount' => $taxAmount,
            'total_amount' => $total,
        ];
    }
}

