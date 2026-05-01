<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AppliesRoleScope;
use App\Http\Controllers\Controller;
use App\Models\SyncLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SyncLogController extends Controller
{
    use AppliesRoleScope;

    public function index(Request $request): JsonResponse
    {
        $query = SyncLog::query()
            ->with('user:id,name,email,role,assigned_lga_uuid,assigned_ward_uuid,team_name')
            ->when($request->user()->role === 'data_clerk', fn ($q) => $q->where('user_id', $request->user()->id))
            ->when($request->user()->role === 'supervisor', function ($q) use ($request) {
                $user = $request->user();
                $q->whereHas('user', function ($userQuery) use ($user) {
                    $userQuery
                        ->when($user->assigned_lga_uuid, fn ($scopedQuery) => $scopedQuery->where('assigned_lga_uuid', $user->assigned_lga_uuid))
                        ->when($user->assigned_ward_uuid, fn ($scopedQuery) => $scopedQuery->where('assigned_ward_uuid', $user->assigned_ward_uuid))
                        ->when($user->team_name, fn ($scopedQuery) => $scopedQuery->where('team_name', $user->team_name));
                });
            })
            ->when($request->filled('user_id'), fn ($q) => $q->where('user_id', $request->integer('user_id')))
            ->when($request->filled('device_id'), fn ($q) => $q->where('device_id', $request->string('device_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('created_at', '>=', $request->string('date_from')))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('created_at', '<=', $request->string('date_to')))
            ->latest();

        $paginated = $query->paginate((int) $request->input('per_page', 30));
        $batchUuids = $paginated->getCollection()->pluck('batch_uuid')->filter()->unique()->values();
        $batchCounts = SyncLog::query()
            ->selectRaw('batch_uuid, entity_type, COUNT(*) as total')
            ->whereIn('batch_uuid', $batchUuids)
            ->groupBy('batch_uuid', 'entity_type')
            ->get()
            ->groupBy('batch_uuid');

        $paginated->getCollection()->transform(function (SyncLog $log) use ($batchCounts) {
            $counts = ($batchCounts->get($log->batch_uuid) ?? collect())
                ->mapWithKeys(fn ($item) => [$item->entity_type => (int) $item->total]);

            $log->setAttribute('entity_counts', [
                'patient' => $counts->get('patient', 0),
                'encounter' => $counts->get('encounter', 0),
                'referral' => $counts->get('referral', 0),
            ]);

            return $log;
        });

        return response()->json($paginated);
    }
}
