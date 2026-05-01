<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WalletTransaction;

class WalletTransactionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('view_wallet_transactions');
    }

    public function fundWallet(User $user): bool
    {
        return $user->hasPermissionTo('fund_wallet');
    }

    public function debitWallet(User $user): bool
    {
        return $user->hasPermissionTo('debit_wallet');
    }

    public function approveWallet(User $user, WalletTransaction $transaction): bool
    {
        return $user->hasPermissionTo('approve_wallet_funding');
    }

    public function reverseWallet(User $user, WalletTransaction $transaction): bool
    {
        return $user->hasPermissionTo('reverse_wallet_transaction');
    }
}

