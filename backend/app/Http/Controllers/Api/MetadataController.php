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

        $lgas = Lga::query()
            ->when($user->role === 'supervisor' && $user->assigned_lga_uuid, fn ($query) => $query->where('uuid', $user->assigned_lga_uuid))
            ->orderBy('name')
            ->get(['id', 'uuid', 'name']);
        $wards = Ward::query()
            ->with('lga:id,uuid,name')
            ->when($user->role === 'supervisor' && $user->assigned_lga_uuid, function ($query) use ($user) {
                $query->whereHas('lga', fn ($lgaQuery) => $lgaQuery->where('uuid', $user->assigned_lga_uuid));
            })
            ->when($user->role === 'supervisor' && $user->assigned_ward_uuid, fn ($query) => $query->where('uuid', $user->assigned_ward_uuid))
            ->orderBy('name')
            ->get(['id', 'uuid', 'lga_id', 'name']);

        $facilities = Facility::query()
            ->when($user->role === 'supervisor' && $user->assigned_lga_uuid, fn ($query) => $query->where('lga_uuid', $user->assigned_lga_uuid))
            ->when($user->role === 'supervisor' && $user->assigned_ward_uuid, fn ($query) => $query->where('ward_uuid', $user->assigned_ward_uuid))
            ->orderBy('name')
            ->get(['id', 'uuid', 'name', 'lga_uuid', 'ward_uuid', 'type', 'status']);

        $diseaseCategories = DiseaseCategory::query()->orderBy('name')->get(['id', 'uuid', 'name', 'status']);
        $serviceCategories = ServiceCategory::query()->orderBy('name')->get(['id', 'uuid', 'name', 'status']);
        $users = $this->scopeUsersForAdmin($user)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'assigned_lga_uuid', 'assigned_ward_uuid', 'team_name']);

        $appSettings = AppSetting::getInstance();

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
