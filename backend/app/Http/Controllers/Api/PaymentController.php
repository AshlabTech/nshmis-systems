<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Models\WalletTransaction;
use App\Models\Customer;
use App\Models\AuditLog;
use App\Services\PaymentGatewayService;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    use AuthorizesRequests;

    protected $gatewayService;
    protected $walletService;

    public function __construct(PaymentGatewayService $gatewayService, WalletService $walletService)
    {
        $this->gatewayService = $gatewayService;
        $this->walletService = $walletService;
    }

    /**
     * Initialize a payment
     */
    public function initialize(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'amount' => 'required|numeric|min:100',
            'gateway' => 'nullable|string|in:paystack,monnify,palmpay',
            'description' => 'nullable|string',
            'metadata' => 'nullable|array',
        ]);

        try {
            $customer = Customer::findOrFail($validated['customer_id']);

            // Create pending wallet transaction
            $transaction = WalletTransaction::create([
                'customer_id' => $customer->id,
                'type' => 'credit',
                'amount' => $validated['amount'],
                'source' => 'online_payment',
                'status' => 'pending',
                'description' => $validated['description'] ?? 'Wallet funding via online payment',
                'metadata' => json_encode(array_merge(
                    $validated['metadata'] ?? [],
                    ['gateway' => $validated['gateway'] ?? 'default']
                )),
            ]);

            // Initialize payment with gateway
            $paymentData = [
                'amount' => $validated['amount'],
                'email' => $customer->email,
                'reference' => 'TXN_' . $transaction->id . '_' . time(),
                'metadata' => [
                    'transaction_id' => $transaction->id,
                    'customer_id' => $customer->id,
                    'customer_name' => $customer->name,
                    'description' => $validated['description'] ?? 'Wallet funding',
                ],
            ];

            $result = $this->gatewayService->initializePayment($paymentData, $validated['gateway'] ?? null);

            if ($result['status']) {
                // Update transaction with payment reference
                $transaction->update([
                    'metadata' => json_encode(array_merge(
                        json_decode($transaction->metadata, true),
                        ['payment_reference' => $result['data']['reference']]
                    )),
                ]);

                AuditLog::log('payment_initialized', $transaction, null, $result['data'], 'Payment initialized');

                return response()->json([
                    'status' => true,
                    'message' => 'Payment initialized successfully',
                    'data' => [
                        'transaction_id' => $transaction->id,
                        'authorization_url' => $result['data']['authorization_url'],
                        'access_code' => $result['data']['access_code'],
                        'reference' => $result['data']['reference'],
                    ],
                ]);
            }

            // Payment initialization failed
            $transaction->update(['status' => 'failed']);

            return response()->json([
                'status' => false,
                'message' => $result['message'] ?? 'Payment initialization failed',
            ], 400);

        } catch (\Exception $e) {
            Log::error('Payment initialization error: ' . $e->getMessage());
            
            return response()->json([
                'status' => false,
                'message' => 'Payment initialization failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Verify a payment
     */
    public function verify(Request $request)
    {
        $validated = $request->validate([
            'reference' => 'required|string',
            'gateway' => 'nullable|string|in:paystack,monnify,palmpay',
        ]);

        try {
            $result = $this->gatewayService->verifyPayment($validated['reference'], $validated['gateway'] ?? null);

            if ($result['status'] && isset($result['data']['metadata']['transaction_id'])) {
                $transaction = WalletTransaction::find($result['data']['metadata']['transaction_id']);

                if ($transaction && $transaction->status === 'pending') {
                    DB::beginTransaction();
                    try {
                        // Update transaction status
                        $transaction->update([
                            'status' => 'completed',
                            'metadata' => json_encode(array_merge(
                                json_decode($transaction->metadata, true),
                                [
                                    'payment_verified_at' => now(),
                                    'payment_channel' => $result['data']['channel'] ?? null,
                                ]
                            )),
                        ]);

                        // Credit customer wallet
                        $customer = $transaction->customer;
                        $customer->increment('wallet_balance', $transaction->amount);

                        AuditLog::log('payment_verified', $transaction, ['status' => 'pending'], ['status' => 'completed'], 'Payment verified and wallet credited');

                        DB::commit();

                        return response()->json([
                            'status' => true,
                            'message' => 'Payment verified successfully',
                            'data' => [
                                'transaction_id' => $transaction->id,
                                'amount' => $transaction->amount,
                                'new_balance' => $customer->wallet_balance,
                            ],
                        ]);
                    } catch (\Exception $e) {
                        DB::rollBack();
                        throw $e;
                    }
                }
            }

            return response()->json([
                'status' => false,
                'message' => $result['message'] ?? 'Payment verification failed',
            ], 400);

        } catch (\Exception $e) {
            Log::error('Payment verification error: ' . $e->getMessage());
            
            return response()->json([
                'status' => false,
                'message' => 'Payment verification failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Handle Paystack webhook
     */
    public function paystackWebhook(Request $request)
    {
        // Verify webhook signature
        $signature = $request->header('x-paystack-signature');
        $input = $request->getContent();

        $paystackService = new \App\Services\PaystackService();

        if (!$paystackService->verifyWebhookSignature($input, $signature)) {
            Log::warning('Invalid Paystack webhook signature');
            return response()->json(['message' => 'Invalid signature'], 400);
        }

        $event = $request->input('event');
        $data = $request->input('data');

        Log::info('Paystack webhook received', ['event' => $event, 'reference' => $data['reference'] ?? null]);

        try {
            if ($event === 'charge.success') {
                // Find transaction by reference
                $metadata = $data['metadata'] ?? [];
                $transactionId = $metadata['transaction_id'] ?? null;

                if ($transactionId) {
                    $transaction = WalletTransaction::find($transactionId);

                    if ($transaction && $transaction->status === 'pending') {
                        DB::beginTransaction();
                        try {
                            $transaction->update([
                                'status' => 'completed',
                                'metadata' => json_encode(array_merge(
                                    json_decode($transaction->metadata, true),
                                    [
                                        'webhook_received_at' => now(),
                                        'payment_channel' => $data['channel'] ?? null,
                                        'paid_at' => $data['paid_at'] ?? null,
                                    ]
                                )),
                            ]);

                            // Credit customer wallet
                            $customer = $transaction->customer;
                            $customer->increment('wallet_balance', $transaction->amount);

                            AuditLog::log('payment_webhook_processed', $transaction, null, $data, 'Payment webhook processed');

                            DB::commit();

                            Log::info('Payment webhook processed successfully', ['transaction_id' => $transactionId]);
                        } catch (\Exception $e) {
                            DB::rollBack();
                            throw $e;
                        }
                    }
                }
            }

            return response()->json(['message' => 'Webhook processed'], 200);

        } catch (\Exception $e) {
            Log::error('Webhook processing error: ' . $e->getMessage());
            return response()->json(['message' => 'Webhook processing failed'], 500);
        }
    }

    /**
     * Handle Monnify webhook (placeholder)
     */
    public function monnifyWebhook(Request $request)
    {
        Log::info('Monnify webhook received', $request->all());
        // TODO: Implement Monnify webhook handling
        return response()->json(['message' => 'Webhook received'], 200);
    }

    /**
     * Handle PalmPay webhook (placeholder)
     */
    public function palmpayWebhook(Request $request)
    {
        Log::info('PalmPay webhook received', $request->all());
        // TODO: Implement PalmPay webhook handling
        return response()->json(['message' => 'Webhook received'], 200);
    }
}

