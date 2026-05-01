<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Models\PaymentGateway;
use App\Models\AuditLog;
use App\Services\PaymentGatewayService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentGatewayController extends Controller
{
    use AuthorizesRequests;

    protected $gatewayService;

    public function __construct(PaymentGatewayService $gatewayService)
    {
        $this->gatewayService = $gatewayService;
    }

    /**
     * Get all payment gateways
     */
    public function index(Request $request)
    {
        $query = PaymentGateway::query();

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $gateways = $query->orderBy('priority', 'desc')->get();

        return response()->json($gateways);
    }

    /**
     * Get active gateways (public endpoint)
     */
    public function active()
    {
        $gateways = $this->gatewayService->getActiveGateways();
        return response()->json($gateways);
    }

    /**
     * Get a specific gateway
     */
    public function show(PaymentGateway $gateway)
    {
        return response()->json($gateway);
    }

    /**
     * Create a new payment gateway
     */
    public function store(Request $request)
    {
        // Only super admin can manage gateways
        if (!$request->user()->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'driver' => 'required|string|in:paystack,monnify,palmpay|unique:payment_gateways,driver',
            'display_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'credentials' => 'required|array',
            'settings' => 'nullable|array',
            'is_active' => 'boolean',
            'is_default' => 'boolean',
            'currency' => 'string|max:3',
            'supported_channels' => 'nullable|array',
            'webhook_url' => 'nullable|url',
            'callback_url' => 'nullable|url',
            'priority' => 'integer|min:0',
        ]);

        DB::beginTransaction();
        try {
            $gateway = PaymentGateway::create($validated);

            AuditLog::log('payment_gateway_created', $gateway, null, $gateway->toArray(), 'Payment gateway created');

            DB::commit();

            return response()->json([
                'message' => 'Payment gateway created successfully',
                'gateway' => $gateway,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create gateway: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Update a payment gateway
     */
    public function update(Request $request, PaymentGateway $gateway)
    {
        // Only super admin can manage gateways
        if (!$request->user()->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'display_name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'credentials' => 'sometimes|array',
            'settings' => 'nullable|array',
            'is_active' => 'boolean',
            'is_default' => 'boolean',
            'currency' => 'string|max:3',
            'supported_channels' => 'nullable|array',
            'webhook_url' => 'nullable|url',
            'callback_url' => 'nullable|url',
            'priority' => 'integer|min:0',
        ]);

        DB::beginTransaction();
        try {
            $oldData = $gateway->toArray();
            $gateway->update($validated);

            AuditLog::log('payment_gateway_updated', $gateway, $oldData, $gateway->toArray(), 'Payment gateway updated');

            DB::commit();

            return response()->json([
                'message' => 'Payment gateway updated successfully',
                'gateway' => $gateway->fresh(),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update gateway: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Delete a payment gateway
     */
    public function destroy(Request $request, PaymentGateway $gateway)
    {
        // Only super admin can manage gateways
        if (!$request->user()->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        DB::beginTransaction();
        try {
            AuditLog::log('payment_gateway_deleted', $gateway, $gateway->toArray(), null, 'Payment gateway deleted');

            $gateway->delete();

            DB::commit();

            return response()->json(['message' => 'Payment gateway deleted successfully']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to delete gateway: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Toggle gateway active status
     */
    public function toggle(Request $request, PaymentGateway $gateway)
    {
        // Only super admin can manage gateways
        if (!$request->user()->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'is_active' => 'required|boolean',
        ]);

        try {
            $this->gatewayService->toggleGateway($gateway->id, $validated['is_active']);

            return response()->json([
                'message' => 'Gateway status updated successfully',
                'gateway' => $gateway->fresh(),
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * Set gateway as default
     */
    public function setDefault(Request $request, PaymentGateway $gateway)
    {
        // Only super admin can manage gateways
        if (!$request->user()->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $this->gatewayService->setDefaultGateway($gateway->id);

            return response()->json([
                'message' => 'Default gateway set successfully',
                'gateway' => $gateway->fresh(),
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * Test gateway connection
     */
    public function test(Request $request, PaymentGateway $gateway)
    {
        // Only super admin can manage gateways
        if (!$request->user()->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $result = $this->gatewayService->testGateway($gateway->id);

        return response()->json($result);
    }
}

