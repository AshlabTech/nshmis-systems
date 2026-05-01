<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WalletService
{
    /**
     * Credit customer wallet
     */
    public function credit(
        Customer $customer,
        float $amount,
        string $source,
        ?string $description = null,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?array $metaData = null,
        ?int $userId = null
    ): WalletTransaction {
        return DB::transaction(function () use (
            $customer,
            $amount,
            $source,
            $description,
            $referenceType,
            $referenceId,
            $metaData,
            $userId
        ) {
            $balanceBefore = $customer->wallet_balance;
            $balanceAfter = $balanceBefore + $amount;

            // Update customer wallet balance
            $customer->update(['wallet_balance' => $balanceAfter]);

            // Create transaction record
            return WalletTransaction::create([
                'transaction_number' => $this->generateTransactionNumber(),
                'customer_id' => $customer->id,
                'type' => 'credit',
                'source' => $source,
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'status' => $source === 'manual_funding' ? 'pending' : 'completed',
                'description' => $description,
                'meta_data' => $metaData,
                'created_by' => $userId ?? auth()->id(),
            ]);
        });
    }

    /**
     * Debit customer wallet
     */
    public function debit(
        Customer $customer,
        float $amount,
        string $source,
        ?string $description = null,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?array $metaData = null,
        ?int $userId = null
    ): WalletTransaction {
        if ($customer->wallet_balance < $amount) {
            throw new \Exception('Insufficient wallet balance');
        }

        return DB::transaction(function () use (
            $customer,
            $amount,
            $source,
            $description,
            $referenceType,
            $referenceId,
            $metaData,
            $userId
        ) {
            $balanceBefore = $customer->wallet_balance;
            $balanceAfter = $balanceBefore - $amount;

            // Update customer wallet balance
            $customer->update(['wallet_balance' => $balanceAfter]);

            // Create transaction record
            return WalletTransaction::create([
                'transaction_number' => $this->generateTransactionNumber(),
                'customer_id' => $customer->id,
                'type' => 'debit',
                'source' => $source,
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'status' => 'completed',
                'description' => $description,
                'meta_data' => $metaData,
                'created_by' => $userId ?? auth()->id(),
            ]);
        });
    }

    /**
     * Approve pending wallet transaction
     */
    public function approveTransaction(WalletTransaction $transaction, int $userId): bool
    {
        if ($transaction->status !== 'pending') {
            throw new \Exception('Only pending transactions can be approved');
        }

        return DB::transaction(function () use ($transaction, $userId) {
            $transaction->update([
                'status' => 'completed',
                'approved_by' => $userId,
                'approved_at' => now(),
            ]);

            return true;
        });
    }

    /**
     * Reverse a wallet transaction
     */
    public function reverseTransaction(
        WalletTransaction $transaction,
        string $reason,
        int $userId
    ): WalletTransaction {
        return DB::transaction(function () use ($transaction, $reason, $userId) {
            // Create reverse transaction
            $reverseType = $transaction->type === 'credit' ? 'debit' : 'credit';
            $customer = $transaction->customer;

            if ($reverseType === 'debit' && $customer->wallet_balance < $transaction->amount) {
                throw new \Exception('Insufficient balance for reversal');
            }

            $balanceBefore = $customer->wallet_balance;
            $balanceAfter = $reverseType === 'credit' 
                ? $balanceBefore + $transaction->amount 
                : $balanceBefore - $transaction->amount;

            $customer->update(['wallet_balance' => $balanceAfter]);

            // Mark original as reversed
            $transaction->update(['status' => 'reversed']);

            // Create reversal transaction
            return WalletTransaction::create([
                'transaction_number' => $this->generateTransactionNumber(),
                'customer_id' => $customer->id,
                'type' => $reverseType,
                'source' => 'reversal',
                'amount' => $transaction->amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'reference_type' => WalletTransaction::class,
                'reference_id' => $transaction->id,
                'status' => 'completed',
                'description' => "Reversal: {$reason}",
                'created_by' => $userId,
            ]);
        });
    }

    protected function generateTransactionNumber(): string
    {
        return 'WT-' . date('Ymd') . '-' . strtoupper(Str::random(8));
    }
}

