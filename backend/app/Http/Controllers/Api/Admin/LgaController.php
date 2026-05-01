<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Concerns\AppliesRoleScope;
use App\Http\Controllers\Controller;
use App\Models\Lga;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class LgaController extends Controller
{
    use AppliesRoleScope;

    public function index(Request $request): JsonResponse
    {
        $query = Lga::query()
            ->when($request->filled('search'), fn ($builder) => $builder->where('name', 'like', '%' . $request->string('search') . '%'))
            ->orderBy('name');

        return response()->json($query->paginate((int) $request->input('per_page', 30)));
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensureStateAdmin($request->user());
        $validated = $request->validate(['name' => ['required', 'string', 'unique:lgas,name']]);
        $lga = Lga::create(['uuid' => (string) Str::uuid(), 'name' => $validated['name']]);
        return response()->json($lga, 201);
    }

    public function update(Request $request, Lga $lga): JsonResponse
    {
        $this->ensureStateAdmin($request->user());
        $validated = $request->validate(['name' => ['required', 'string', 'unique:lgas,name,'.$lga->id]]);
        $lga->update($validated);
        return response()->json($lga);
    }

    public function destroy(Request $request, Lga $lga): JsonResponse
    {
        $this->ensureStateAdmin($request->user());
        $lga->delete();
        return response()->json(['message' => 'LGA deleted.']);
    }
}
