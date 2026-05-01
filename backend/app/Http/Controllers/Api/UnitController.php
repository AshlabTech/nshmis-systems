<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Models\Unit;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class UnitController extends Controller
{
    use AuthorizesRequests;
    public function index(Request $request)
    {
        $query = Unit::query();

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $perPage = $request->get('per_page', 50);
        $units = $query->latest()->paginate($perPage);

        return response()->json($units);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'short_name' => 'required|string|max:20',
            'is_active' => 'boolean',
        ]);

        $unit = Unit::create($validated);

        AuditLog::log('created', $unit, null, $unit->toArray(), 'Unit created');

        return response()->json([
            'message' => 'Unit created successfully',
            'unit' => $unit,
        ], 201);
    }

    public function show(Unit $unit)
    {
        return response()->json($unit);
    }

    public function update(Request $request, Unit $unit)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'short_name' => 'sometimes|string|max:20',
            'is_active' => 'boolean',
        ]);

        $oldValues = $unit->toArray();
        $unit->update($validated);

        AuditLog::log('updated', $unit, $oldValues, $unit->toArray(), 'Unit updated');

        return response()->json([
            'message' => 'Unit updated successfully',
            'unit' => $unit,
        ]);
    }

    public function destroy(Unit $unit)
    {
        $oldValues = $unit->toArray();
        $unit->delete();

        AuditLog::log('deleted', $unit, $oldValues, null, 'Unit deleted');

        return response()->json([
            'message' => 'Unit deleted successfully',
        ]);
    }
}

