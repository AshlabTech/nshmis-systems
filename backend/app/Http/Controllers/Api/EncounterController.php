<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AppliesListFilters;
use App\Http\Controllers\Api\Concerns\AppliesRoleScope;
use App\Http\Controllers\Controller;
use App\Models\Encounter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EncounterController extends Controller
{
    use AppliesListFilters;
    use AppliesRoleScope;

    public function index(Request $request): JsonResponse
    {
        $query = $this->applyEncounterFilters(
            $this->scopeByUser(Encounter::query(), $request->user())
                ->with([
                    'patient:id,uuid,first_name,last_name',
                    'lga:id,uuid,name',
                    'ward:id,uuid,name',
                    'creator:id,name,email',
                ]),
            $request
        )
            ->latest('encounter_date');

        return response()->json($query->paginate((int) $request->input('per_page', 20)));
    }

    public function show(Request $request, Encounter $encounter): JsonResponse
    {
        $this->scopeByUser(Encounter::query()->where('id', $encounter->id), $request->user())->firstOrFail();
        $encounter->load([
            'patient',
            'lga:id,uuid,name',
            'ward:id,uuid,name',
            'creator:id,name,email',
            'referrals' => fn ($query) => $query->with(['patient:id,uuid,first_name,last_name'])->latest(),
        ]);
        return response()->json($encounter);
    }
}
