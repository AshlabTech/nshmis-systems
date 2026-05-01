<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Concerns\AppliesRoleScope;
use App\Http\Controllers\Controller;
use App\Models\Facility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class FacilityController extends Controller
{
    use AppliesRoleScope;

    public function index(Request $request): JsonResponse
    {
        $query = Facility::query()
            ->when($request->filled('search'), fn ($builder) => $builder->where('name', 'like', '%' . $request->string('search') . '%'))
            ->when($request->filled('lga_uuid'), fn ($builder) => $builder->where('lga_uuid', $request->string('lga_uuid')))
            ->when($request->filled('ward_uuid'), fn ($builder) => $builder->where('ward_uuid', $request->string('ward_uuid')))
            ->when($request->filled('status'), fn ($builder) => $builder->where('status', $request->string('status')))
            ->orderBy('name');

        return response()->json($query->paginate((int) $request->input('per_page', 30)));
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensureStateAdmin($request->user());
        $validated = $request->validate([
            'name' => ['required', 'string'],
            'lga_uuid' => ['nullable', 'uuid'],
            'ward_uuid' => ['nullable', 'uuid'],
            'type' => ['nullable', 'string'],
            'status' => ['required', 'in:active,inactive'],
        ]);
        $facility = Facility::create(['uuid' => (string) Str::uuid(), ...$validated]);
        return response()->json($facility, 201);
    }

    public function update(Request $request, Facility $facility): JsonResponse
    {
        $this->ensureStateAdmin($request->user());
        $validated = $request->validate([
            'name' => ['required', 'string'],
            'lga_uuid' => ['nullable', 'uuid'],
            'ward_uuid' => ['nullable', 'uuid'],
            'type' => ['nullable', 'string'],
            'status' => ['required', 'in:active,inactive'],
        ]);
        $facility->update($validated);
        return response()->json($facility);
    }

    public function destroy(Request $request, Facility $facility): JsonResponse
    {
        $this->ensureStateAdmin($request->user());
        $facility->delete();
        return response()->json(['message' => 'Facility deleted.']);
    }
}
