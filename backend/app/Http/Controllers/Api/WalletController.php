<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Models\Customer;
use App\Models\WalletTransaction;
use App\Models\AuditLog;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WalletController extends Controller
{
    use AuthorizesRequests;
    protected $walletService;

    public function __construct(WalletService $walletService)
    {
        $this->walletService = $walletService;
    }

    public function transactions(Request $request)
    {
        $query = WalletTransaction::with(['customer']);

        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $perPage = $request->get('per_page', 15);
        $transactions = $query->latest()->paginate($perPage);

        return response()->json($transactions);
    }

    public function balance(Customer $customer)
    {
        return response()->json([
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'wallet_balance' => $customer->wallet_balance,
        ]);
    }

    public function fund(Request $request)
    {
        $this->authorize('fund-wallet', WalletTransaction::class);

        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'amount' => 'required|numeric|min:0.01',
            'source' => 'required|in:manual_funding,bank_transfer,payment_gateway',
            'payment_method' => 'required|in:cash,bank_transfer,paystack,monnify,palmpay',
            'reference' => 'nullable|string|max:255',
            'description' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $customer = Customer::findOrFail($validated['customer_id']);

            $transaction = $this->walletService->credit(
                $customer,
                $validated['amount'],
                $validated['source'],
                $validated['description'] ?? "Wallet funding via {$validated['payment_method']}",
                [
                    'payment_method' => $validated['payment_method'],
                    'reference' => $validated['reference'] ?? null,
                ]
            );

            // If bank transfer, require approval
            if ($validated['payment_method'] === 'bank_transfer') {
                $transaction->update(['status' => 'pending']);
            }

            AuditLog::log('wallet_funded', $transaction, null, $transaction->toArray(), 'Wallet funded');

            DB::commit();

            return response()->json([
                'message' => 'Wallet funded successfully',
                'transaction' => $transaction,
                'new_balance' => $customer->fresh()->wallet_balance,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to fund wallet',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    public function debit(Request $request)
    {
        $this->authorize('debit-wallet', WalletTransaction::class);

        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'amount' => 'required|numeric|min:0.01',
            'source' => 'required|in:order_payment,sale_payment,manual_debit',
            'description' => 'nullable|string',
            'reference' => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();
        try {
            $customer = Customer::findOrFail($validated['customer_id']);

            if ($customer->wallet_balance < $validated['amount']) {
                return response()->json([
                    'message' => 'Insufficient wallet balance',
                    'current_balance' => $customer->wallet_balance,
                    'required_amount' => $validated['amount'],
                ], 400);
            }

            $transaction = $this->walletService->debit(
                $customer,
                $validated['amount'],
                $validated['source'],
                $validated['description'] ?? "Wallet debit",
                [
                    'reference' => $validated['reference'] ?? null,
                ]
            );

            AuditLog::log('wallet_debited', $transaction, null, $transaction->toArray(), 'Wallet debited');

            DB::commit();

            return response()->json([
                'message' => 'Wallet debited successfully',
                'transaction' => $transaction,
                'new_balance' => $customer->fresh()->wallet_balance,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to debit wallet',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    public function approve(WalletTransaction $transaction)
    {
        $this->authorize('approve-wallet', $transaction);

        if ($transaction->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending transactions can be approved',
            ], 400);
        }

        DB::beginTransaction();
        try {
            $this->walletService->approveTransaction($transaction, auth()->id());

            AuditLog::log('wallet_approved', $transaction, ['status' => 'pending'], ['status' => 'completed'], 'Wallet transaction approved');

            DB::commit();

            return response()->json([
                'message' => 'Transaction approved successfully',
                'transaction' => $transaction->fresh(),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to approve transaction',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    public function reverse(Request $request, WalletTransaction $transaction)
    {
        $this->authorize('reverse-wallet', $transaction);

        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        DB::beginTransaction();
        try {
            $reversalTransaction = $this->walletService->reverseTransaction(
                $transaction,
                $validated['reason'],
                auth()->id()
            );

            AuditLog::log('wallet_reversed', $transaction, null, ['reason' => $validated['reason']], 'Wallet transaction reversed');

            DB::commit();

            return response()->json([
                'message' => 'Transaction reversed successfully',
                'original_transaction' => $transaction->fresh(),
                'reversal_transaction' => $reversalTransaction,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to reverse transaction',
                'error' => $e->getMessage(),
            ], 400);
        }
    }
}

