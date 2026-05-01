<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AppliesListFilters;
use App\Http\Controllers\Api\Concerns\AppliesRoleScope;
use App\Http\Controllers\Controller;
use App\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PatientController extends Controller
{
    use AppliesListFilters;
    use AppliesRoleScope;

    public function index(Request $request): JsonResponse
    {
        $query = $this->applyPatientFilters(
            $this->scopeByUser(Patient::query(), $request->user())
                ->with(['lga:id,uuid,name', 'ward:id,uuid,name', 'creator:id,name,email']),
            $request
        )
            ->latest();

        return response()->json($query->paginate((int) $request->input('per_page', 20)));
    }

    public function show(Request $request, Patient $patient): JsonResponse
    {
        $this->scopeByUser(Patient::query()->where('id', $patient->id), $request->user())->firstOrFail();
        $patient->load([
            'lga:id,uuid,name',
            'ward:id,uuid,name',
            'creator:id,name,email',
            'encounters' => fn ($query) => $query->with(['creator:id,name,email'])->latest('encounter_date'),
            'referrals' => fn ($query) => $query->with(['encounter:id,uuid,encounter_date'])->latest(),
        ]);
        return response()->json($patient);
    }
}
