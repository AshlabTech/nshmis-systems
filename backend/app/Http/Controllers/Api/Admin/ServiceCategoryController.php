<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Concerns\AppliesRoleScope;
use App\Http\Controllers\Controller;
use App\Models\ServiceCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ServiceCategoryController extends Controller
{
    use AppliesRoleScope;

    public function index(Request $request): JsonResponse
    {
        $query = ServiceCategory::query()
            ->when($request->filled('search'), fn ($builder) => $builder->where('name', 'like', '%' . $request->string('search') . '%'))
            ->when($request->filled('status'), fn ($builder) => $builder->where('status', $request->string('status')))
            ->orderBy('name');

        return response()->json($query->paginate((int) $request->input('per_page', 30)));
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensureStateAdmin($request->user());
        $validated = $request->validate([
            'name' => ['required', 'string', 'unique:service_categories,name'],
            'status' => ['required', 'in:active,inactive'],
        ]);
        $item = ServiceCategory::create(['uuid' => (string) Str::uuid(), ...$validated]);
        return response()->json($item, 201);
    }

    public function update(Request $request, ServiceCategory $serviceCategory): JsonResponse
    {
        $this->ensureStateAdmin($request->user());
        $validated = $request->validate([
            'name' => ['required', 'string', 'unique:service_categories,name,'.$serviceCategory->id],
            'status' => ['required', 'in:active,inactive'],
        ]);
        $serviceCategory->update($validated);
        return response()->json($serviceCategory);
    }

    public function destroy(Request $request, ServiceCategory $serviceCategory): JsonResponse
    {
        $this->ensureStateAdmin($request->user());
        $serviceCategory->delete();
        return response()->json(['message' => 'Service category deleted.']);
    }
}
