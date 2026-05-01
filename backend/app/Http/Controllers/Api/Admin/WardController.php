<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Concerns\AppliesRoleScope;
use App\Http\Controllers\Controller;
use App\Models\Ward;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WardController extends Controller
{
    use AppliesRoleScope;

    public function index(Request $request): JsonResponse
    {
        return response()->json(
            Ward::query()
                ->with('lga:id,uuid,name')
                ->when($request->filled('lga_id'), fn ($q) => $q->where('lga_id', $request->integer('lga_id')))
                ->when($request->filled('search'), fn ($q) => $q->where('name', 'like', '%' . $request->string('search') . '%'))
                ->orderBy('name')
                ->paginate((int) $request->input('per_page', 30))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensureStateAdmin($request->user());
        $validated = $request->validate([
            'lga_id' => ['required', 'integer', 'exists:lgas,id'],
            'name' => ['required', 'string'],
        ]);
        $ward = Ward::create([
            'uuid' => (string) Str::uuid(),
            'lga_id' => $validated['lga_id'],
            'name' => $validated['name'],
        ]);
        return response()->json($ward, 201);
    }

    public function update(Request $request, Ward $ward): JsonResponse
    {
        $this->ensureStateAdmin($request->user());
        $validated = $request->validate([
            'lga_id' => ['required', 'integer', 'exists:lgas,id'],
            'name' => ['required', 'string'],
        ]);
        $ward->update($validated);
        return response()->json($ward);
    }

    public function destroy(Request $request, Ward $ward): JsonResponse
    {
        $this->ensureStateAdmin($request->user());
        $ward->delete();
        return response()->json(['message' => 'Ward deleted.']);
    }
}
