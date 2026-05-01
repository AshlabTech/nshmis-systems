<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AppliesListFilters;
use App\Http\Controllers\Api\Concerns\AppliesRoleScope;
use App\Http\Controllers\Controller;
use App\Models\Encounter;
use App\Models\Patient;
use App\Models\Referral;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    use AppliesListFilters;
    use AppliesRoleScope;

    public function patients(Request $request): StreamedResponse
    {
        $query = $this->applyPatientFilters(
            $this->scopeByUser(Patient::query(), $request->user())
                ->with(['lga:id,uuid,name', 'ward:id,uuid,name']),
            $request
        )->latest();

        return $this->streamCsv(
            'patients-export.csv',
            ['UUID', 'First Name', 'Middle Name', 'Last Name', 'Sex', 'Date Of Birth', 'Estimated Age', 'Phone', 'NHIS Status', 'LGA', 'Ward', 'Sync Status', 'Created At'],
            $query,
            fn (Patient $patient) => [
                $patient->uuid,
                $patient->first_name,
                $patient->middle_name,
                $patient->last_name,
                $patient->sex,
                optional($patient->date_of_birth)->format('Y-m-d'),
                $patient->estimated_age_years,
                $patient->phone_number,
                $patient->nhis_status,
                $patient->lga?->name,
                $patient->ward?->name,
                $patient->sync_status,
                optional($patient->created_at)->toDateTimeString(),
            ]
        );
    }

    public function encounters(Request $request): StreamedResponse
    {
        $query = $this->applyEncounterFilters(
            $this->scopeByUser(Encounter::query(), $request->user())
                ->with(['patient:id,uuid,first_name,last_name', 'lga:id,uuid,name', 'ward:id,uuid,name', 'creator:id,name']),
            $request
        )->latest('encounter_date');

        return $this->streamCsv(
            'encounters-export.csv',
            ['UUID', 'Encounter Date', 'Patient UUID', 'Patient Name', 'Disease/Program', 'Service Point', 'LGA', 'Ward', 'Data Clerk', 'Sync Status'],
            $query,
            fn (Encounter $encounter) => [
                $encounter->uuid,
                optional($encounter->encounter_date)->format('Y-m-d'),
                $encounter->patient?->uuid,
                trim(($encounter->patient?->first_name ?? '') . ' ' . ($encounter->patient?->last_name ?? '')),
                $encounter->encounter_type,
                $encounter->service_point,
                $encounter->lga?->name,
                $encounter->ward?->name,
                $encounter->creator?->name,
                $encounter->sync_status,
            ]
        );
    }

    public function referrals(Request $request): StreamedResponse
    {
        $query = $this->applyReferralFilters(
            $this->scopeByUser(Referral::query(), $request->user())
                ->with(['patient:id,uuid,first_name,last_name', 'lga:id,uuid,name', 'ward:id,uuid,name']),
            $request
        )->latest();

        return $this->streamCsv(
            'referrals-export.csv',
            ['UUID', 'Patient UUID', 'Patient Name', 'Facility', 'Reason', 'Urgency', 'Workflow Status', 'LGA', 'Ward', 'Completed At', 'Sync Status'],
            $query,
            fn (Referral $referral) => [
                $referral->uuid,
                $referral->patient?->uuid,
                trim(($referral->patient?->first_name ?? '') . ' ' . ($referral->patient?->last_name ?? '')),
                $referral->referred_to_facility,
                $referral->referral_reason,
                $referral->urgency,
                $referral->workflow_status,
                $referral->lga?->name,
                $referral->ward?->name,
                optional($referral->completed_at)->toDateTimeString(),
                $referral->sync_status,
            ]
        );
    }

    private function streamCsv(string $filename, array $headers, Builder $query, callable $map): StreamedResponse
    {
        return response()->streamDownload(function () use ($headers, $query, $map) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $headers);

            $query->chunk(250, function ($rows) use ($handle, $map) {
                foreach ($rows as $row) {
                    fputcsv($handle, $map($row));
                }
            });

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }
}
