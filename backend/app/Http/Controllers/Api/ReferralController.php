<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AppliesListFilters;
use App\Http\Controllers\Api\Concerns\AppliesRoleScope;
use App\Http\Controllers\Controller;
use App\Models\Referral;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReferralController extends Controller
{
    use AppliesListFilters;
    use AppliesRoleScope;

    public function index(Request $request): JsonResponse
    {
        $query = $this->applyReferralFilters(
            $this->scopeByUser(Referral::query(), $request->user())
                ->with([
                    'patient:id,uuid,first_name,last_name',
                    'encounter:id,uuid,encounter_date',
                    'lga:id,uuid,name',
                    'ward:id,uuid,name',
                    'creator:id,name,email',
                ]),
            $request
        )
            ->latest();

        return response()->json($query->paginate((int) $request->input('per_page', 20)));
    }

    public function show(Request $request, Referral $referral): JsonResponse
    {
        $this->scopeByUser(Referral::query()->where('id', $referral->id), $request->user())->firstOrFail();
        return response()->json($referral->load(['patient', 'encounter', 'lga:id,uuid,name', 'ward:id,uuid,name', 'creator:id,name,email']));
    }

    public function updateStatus(Request $request, Referral $referral): JsonResponse
    {
        $this->scopeByUser(Referral::query()->where('id', $referral->id), $request->user())->firstOrFail();

        $validated = $request->validate([
            'status' => ['required', 'in:pending,completed,missed,cancelled'],
        ]);

        $referral->workflow_status = $validated['status'];
        if ($validated['status'] === 'completed') {
            $referral->status = 'completed';
            $referral->completed_at = now();
            $referral->completed_by = (string) $request->user()->id;
        }
        if (in_array($validated['status'], ['pending', 'missed'], true)) {
            $referral->status = 'active';
        }
        if ($validated['status'] === 'cancelled') {
            $referral->status = 'cancelled';
        }
        $referral->save();

        return response()->json($referral);
    }
}
