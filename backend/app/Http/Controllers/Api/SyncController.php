<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AppliesRoleScope;
use App\Http\Controllers\Controller;
use App\Models\Encounter;
use App\Models\Facility;
use App\Models\Lga;
use App\Models\Patient;
use App\Models\Referral;
use App\Models\SyncLog;
use App\Models\Ward;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SyncController extends Controller
{
    use AppliesRoleScope;
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.entity' => ['required', Rule::in(['patient', 'encounter', 'referral'])],
            'items.*.uuid' => ['required', 'uuid'],
            'items.*.data' => ['required', 'array'],
        ]);

        $results = [];
        $summary = [
            'success' => 0,
            'failed' => 0,
            'total' => 0,
        ];

        $batchUuid = (string) Str::uuid();

        foreach ($validated['items'] as $item) {
            try {
                $result = $this->syncItem($item);
            } catch (\Throwable $throwable) {
                $result = [
                    'uuid' => $item['uuid'],
                    'entity' => $item['entity'],
                    'status' => 'failed',
                    'message' => $throwable->getMessage(),
                    'server_id' => null,
                    'updated_at' => null,
                ];
            }

            $results[] = $result;
            $summary[$result['status'] === 'success' ? 'success' : 'failed']++;
            $summary['total']++;

            try {
                $this->logSync($batchUuid, $item, $result);
            } catch (\Throwable $logError) {
                report($logError);
            }
        }

        return response()->json([
            'message' => $summary['failed'] > 0 ? 'Sync completed with partial failures.' : 'Sync completed successfully.',
            'results' => $results,
            'results_by_uuid' => collect($results)->keyBy('uuid'),
            'summary' => $summary,
        ]);
    }

    private function syncItem(array $item): array
    {
        return match ($item['entity']) {
            'patient' => $this->syncPatient($item),
            'encounter' => $this->syncEncounter($item),
            'referral' => $this->syncReferral($item),
        };
    }

    private function syncPatient(array $item): array
    {
        return DB::transaction(function () use ($item): array {
            $data = $item['data'];
            $data['uuid'] = $item['uuid'];

            $syncUser = request()->user();

            // Enforce LGA assignment for data_clerk
            $this->assertDataClerkLgaAllowed($syncUser, $data['lga_uuid'] ?? null);

            $lgaId = $this->resolveLgaId($data);
            $wardId = $this->resolveWardId($data, $lgaId);

            // Resolve primary_facility_id from uuid if provided
            $primaryFacilityId = null;
            $primaryFacilityUuid = $data['primary_facility_uuid'] ?? null;
            if ($primaryFacilityUuid) {
                $primaryFacilityId = Facility::where('uuid', $primaryFacilityUuid)->value('id');
            }

            $payload = [
                'uuid' => $item['uuid'],
                'lga_id' => $lgaId,
                'ward_id' => $wardId,
                'primary_facility_id' => $primaryFacilityId,
                'primary_facility_uuid' => $primaryFacilityUuid,
                'lga_uuid' => $data['lga_uuid'] ?? null,
                'ward_uuid' => $data['ward_uuid'] ?? null,
                'first_name' => $data['first_name'] ?? null,
                'middle_name' => $data['middle_name'] ?? null,
                'last_name' => $data['last_name'] ?? null,
                'sex' => $data['sex'] ?? null,
                'date_of_birth' => $data['date_of_birth'] ?? null,
                'estimated_age_years' => $data['estimated_age_years'] ?? null,
                'is_estimated_age' => (bool) ($data['is_estimated_age'] ?? false),
                'temporary_id_hash' => $data['temporary_id_hash'] ?? null,
                'phone_number' => $data['phone_number'] ?? null,
                'nhis_status' => $data['nhis_status'] ?? null,
                'nin' => $data['nin'] ?? null,
                'address_line' => $data['address_line'] ?? null,
                'created_by_user_id' => $syncUser?->id,
                'sync_status' => 'synced',
                'synced_at' => now(),
            ];

            $existing = Patient::where('uuid', $item['uuid'])->first();
            $patient = Patient::updateOrCreate(['uuid' => $item['uuid']], $payload);

            return $this->buildSuccessResult(
                $item,
                $existing ? 'Patient updated.' : 'Patient created.',
                $patient
            );
        });
    }

    private function syncEncounter(array $item): array
    {
        return DB::transaction(function () use ($item): array {
            $data = $item['data'];
            $data['uuid'] = $item['uuid'];

            $syncUser = request()->user();

            $patientUuid = $data['patient_uuid'] ?? null;
            if (! $patientUuid) {
                throw new \InvalidArgumentException('Encounter requires patient_uuid.');
            }

            $patient = Patient::where('uuid', $patientUuid)->first();
            if (! $patient) {
                throw new \RuntimeException('Patient not found for encounter sync: '.$patientUuid);
            }

            // Enforce LGA assignment for data_clerk
            $lgaUuidForCheck = $data['lga_uuid'] ?? $patient->lga_uuid;
            $this->assertDataClerkLgaAllowed($syncUser, $lgaUuidForCheck);

            $incomingVersion = (int) ($data['version_stamp'] ?? 1);
            $existing = Encounter::where('uuid', $item['uuid'])->first();

            if ($existing && $incomingVersion < (int) $existing->version_stamp) {
                return $this->buildSuccessResult($item, 'Encounter skipped because the stored version is newer.', $existing);
            }

            $lgaId = $this->resolveLgaId($data);
            $wardId = $this->resolveWardId($data, $lgaId);

            $payload = [
                'uuid' => $item['uuid'],
                'patient_id' => $patient->id,
                'patient_uuid' => $patientUuid,
                'lga_id' => $lgaId,
                'ward_id' => $wardId,
                'lga_uuid' => $data['lga_uuid'] ?? null,
                'ward_uuid' => $data['ward_uuid'] ?? null,
                'encounter_type' => $data['encounter_type'] ?? null,
                'service_point' => $data['service_point'] ?? null,
                'encounter_date' => $data['encounter_date'] ?? null,
                'version_stamp' => $incomingVersion,
                'supersedes_uuid' => $data['supersedes_uuid'] ?? null,
                'findings' => $data['findings'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by_user_id' => $syncUser?->id,
                'sync_status' => 'synced',
                'synced_at' => now(),
            ];

            $encounter = Encounter::updateOrCreate(['uuid' => $item['uuid']], $payload);

            return $this->buildSuccessResult(
                $item,
                $existing ? 'Encounter updated.' : 'Encounter created.',
                $encounter
            );
        });
    }

    private function syncReferral(array $item): array
    {
        return DB::transaction(function () use ($item): array {
            $data = $item['data'];
            $data['uuid'] = $item['uuid'];

            $syncUser = request()->user();

            $patientUuid = $data['patient_uuid'] ?? null;
            $patient = $patientUuid ? Patient::where('uuid', $patientUuid)->first() : null;

            if (! $patient) {
                throw new \RuntimeException('Referral requires a valid patient_uuid.');
            }

            // Enforce LGA assignment for data_clerk
            $lgaUuidForCheck = $data['lga_uuid'] ?? $patient->lga_uuid;
            $this->assertDataClerkLgaAllowed($syncUser, $lgaUuidForCheck);

            $encounter = null;
            if (! empty($data['encounter_uuid'])) {
                $encounter = Encounter::where('uuid', $data['encounter_uuid'])->first();
                if (! $encounter) {
                    throw new \RuntimeException('Referral requires a valid encounter_uuid when provided.');
                }
            }

            $status = $data['status'] ?? 'active';
            $reason = $data['referral_reason'] ?? null;
            $urgency = $data['urgency'] ?? null;

            if (in_array($status, ['active', 'referred'], true) && (! $reason || ! $urgency)) {
                throw new \InvalidArgumentException('Referral Reason and Urgency are required for active referrals.');
            }

            $lgaId = $this->resolveLgaId($data);
            $wardId = $this->resolveWardId($data, $lgaId);

            $payload = [
                'uuid' => $item['uuid'],
                'patient_id' => $patient->id,
                'patient_uuid' => $patientUuid,
                'encounter_id' => $encounter?->id,
                'encounter_uuid' => $data['encounter_uuid'] ?? null,
                'lga_id' => $lgaId,
                'ward_id' => $wardId,
                'lga_uuid' => $data['lga_uuid'] ?? null,
                'ward_uuid' => $data['ward_uuid'] ?? null,
                'referred_to_facility' => $data['referred_to_facility'] ?? null,
                'referral_reason' => $reason,
                'urgency' => $urgency,
                'status' => $status === 'referred' ? 'active' : $status,
                'workflow_status' => $status === 'completed' ? 'completed' : 'pending',
                'completed_at' => $data['completed_at'] ?? null,
                'completed_by' => $data['completed_by'] ?? null,
                'created_by_user_id' => $syncUser?->id,
                'sync_status' => 'synced',
                'synced_at' => now(),
            ];

            $existing = Referral::where('uuid', $item['uuid'])->first();
            $referral = Referral::updateOrCreate(['uuid' => $item['uuid']], $payload);

            return $this->buildSuccessResult(
                $item,
                $existing ? 'Referral updated.' : 'Referral created.',
                $referral
            );
        });
    }

    private function resolveLgaId(array $data): ?int
    {
        $lgaUuid = $data['lga_uuid'] ?? null;

        if (! $lgaUuid) {
            return null;
        }

        $lgaId = Lga::where('uuid', $lgaUuid)->value('id');

        if (! $lgaId) {
            throw new \RuntimeException('LGA not found: '.$lgaUuid);
        }

        return (int) $lgaId;
    }

    private function resolveWardId(array $data, ?int $lgaId = null): ?int
    {
        $wardUuid = $data['ward_uuid'] ?? null;

        if (! $wardUuid) {
            return null;
        }

        $ward = Ward::where('uuid', $wardUuid)->first();

        if (! $ward) {
            throw new \RuntimeException('Ward not found: '.$wardUuid);
        }

        if ($lgaId && (int) $ward->lga_id !== (int) $lgaId) {
            throw new \RuntimeException('Ward does not belong to the selected LGA.');
        }

        return $ward->id;
    }

    private function buildSuccessResult(array $item, string $message, $model): array
    {
        return [
            'uuid' => $item['uuid'],
            'entity' => $item['entity'],
            'status' => 'success',
            'message' => $message,
            'server_id' => $model->id ?? null,
            'updated_at' => optional($model->updated_at)->toIso8601String(),
        ];
    }

    private function logSync(string $batchUuid, array $item, array $result): void
    {
        SyncLog::create([
            'batch_uuid' => $batchUuid,
            'entity_type' => $item['entity'],
            'entity_uuid' => $item['uuid'],
            'status' => $result['status'] === 'success' ? 'synced' : 'failed',
            'message' => $result['message'],
            'error_message' => $result['status'] === 'success' ? null : $result['message'],
            'device_id' => request()->header('X-Device-Id'),
            'user_id' => request()->user()?->id,
            'payload' => $item['data'] ?? null,
            'response' => $result,
        ]);
    }
}
