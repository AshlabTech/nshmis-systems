<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AppliesRoleScope;
use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\DiseaseCategory;
use App\Models\Facility;
use App\Models\Lga;
use App\Models\ServiceCategory;
use App\Models\User;
use App\Models\Ward;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MetadataController extends Controller
{
    use AppliesRoleScope;

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Build LGA query based on role
        $lgaQuery = Lga::query()->orderBy('name');
        if ($user->role === 'supervisor' && $user->assigned_lga_uuid) {
            $lgaQuery->where('uuid', $user->assigned_lga_uuid);
        } elseif ($user->role === 'data_clerk') {
            $assignedLgaIds = $user->assignedLgas()->pluck('lgas.id');
            if ($assignedLgaIds->isNotEmpty()) {
                $lgaQuery->whereIn('id', $assignedLgaIds);
            } else {
                // No LGAs assigned — return empty so mobile shows the no-LGA warning
                $lgaQuery->whereRaw('1 = 0');
            }
        }
        $lgas = $lgaQuery->get(['id', 'uuid', 'name']);

        // Build ward query scoped to accessible LGAs
        $wardQuery = Ward::query()->with('lga:id,uuid,name')->orderBy('name');
        if ($user->role === 'supervisor') {
            if ($user->assigned_lga_uuid) {
                $wardQuery->whereHas('lga', fn ($q) => $q->where('uuid', $user->assigned_lga_uuid));
            }
            if ($user->assigned_ward_uuid) {
                $wardQuery->where('uuid', $user->assigned_ward_uuid);
            }
        } elseif ($user->role === 'data_clerk') {
            $assignedLgaIds = $user->assignedLgas()->pluck('lgas.id');
            if ($assignedLgaIds->isNotEmpty()) {
                $wardQuery->whereIn('lga_id', $assignedLgaIds);
            } else {
                $wardQuery->whereRaw('1 = 0');
            }
        }
        $wards = $wardQuery
            ->get(['id', 'uuid', 'lga_id', 'name'])
            ->map(fn (Ward $ward) => [
                'id' => $ward->id,
                'uuid' => $ward->uuid,
                'lga_id' => $ward->lga_id,
                'lga_uuid' => $ward->lga?->uuid,
                'name' => $ward->name,
            ]);

        // Build facility query scoped to accessible LGAs
        $facilityQuery = Facility::query()->orderBy('name');
        if ($user->role === 'supervisor') {
            if ($user->assigned_lga_uuid) {
                $facilityQuery->where('lga_uuid', $user->assigned_lga_uuid);
            }
            if ($user->assigned_ward_uuid) {
                $facilityQuery->where('ward_uuid', $user->assigned_ward_uuid);
            }
        } elseif ($user->role === 'data_clerk') {
            $assignedLgaUuids = $user->assignedLgas()->pluck('lgas.uuid');
            if ($assignedLgaUuids->isNotEmpty()) {
                $facilityQuery->whereIn('lga_uuid', $assignedLgaUuids);
            } else {
                $facilityQuery->whereRaw('1 = 0');
            }
        }
        $facilities = $facilityQuery->get(['id', 'uuid', 'name', 'lga_uuid', 'ward_uuid', 'type', 'status']);

        $diseaseCategories = DiseaseCategory::query()->orderBy('name')->get(['id', 'uuid', 'name', 'status']);
        $serviceCategories = ServiceCategory::query()->orderBy('name')->get(['id', 'uuid', 'name', 'status']);
        $users = $this->scopeUsersForAdmin($user)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'assigned_lga_uuid', 'assigned_ward_uuid', 'team_name']);

        $appSettings = AppSetting::getInstance();

        // For data_clerk: expose their specific LGA assignments for mobile enforcement
        $assignedLgas = $user->role === 'data_clerk'
            ? $user->assignedLgas()->get(['lgas.id', 'lgas.uuid', 'lgas.name'])
            : null;

        return response()->json([
            'branding' => [
                'app_name' => $appSettings->app_name,
                'logo_url' => $appSettings->logo_url,
            ],
            'lgas' => $lgas,
            'wards' => $wards,
            'facilities' => $facilities,
            'disease_categories' => $diseaseCategories,
            'service_categories' => $serviceCategories,
            'users' => $users,
            'assigned_lgas' => $assignedLgas,
            'roles' => [
                ['value' => 'data_clerk', 'label' => 'Data Clerk'],
                ['value' => 'supervisor', 'label' => 'Supervisor'],
                ['value' => 'state_admin', 'label' => 'State Admin'],
            ],
            'referral_statuses' => ['pending', 'completed', 'missed', 'cancelled'],
            'sync_statuses' => ['pending', 'synced', 'failed', 'conflict'],
            'urgency_levels' => ['low', 'medium', 'high', 'critical'],
        ]);
    }
}
