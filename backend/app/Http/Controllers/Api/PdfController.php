<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AppliesRoleScope;
use App\Http\Controllers\Controller;
use App\Models\Encounter;
use App\Models\Patient;
use App\Models\Referral;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PdfController extends Controller
{
    use AppliesRoleScope;

    public function patient(Request $request, Patient $patient): Response
    {
        $this->scopeByUser(Patient::query()->where('id', $patient->id), $request->user())->firstOrFail();

        $patient->load([
            'lga:id,uuid,name',
            'ward:id,uuid,name',
            'primaryFacility:id,uuid,name,type',
            'creator:id,name,email',
            'encounters' => fn ($q) => $q->with(['creator:id,name,email'])->latest('encounter_date')->limit(20),
            'referrals' => fn ($q) => $q->latest()->limit(10),
        ]);

        $pdf = Pdf::loadView('reports.patient-pdf', [
            'patient' => $patient,
            'generatedAt' => now()->format('d M Y, H:i'),
        ])->setPaper('a4', 'portrait');

        return $pdf->download("patient-{$patient->uuid}.pdf");
    }

    public function encounter(Request $request, Encounter $encounter): Response
    {
        $this->scopeByUser(Encounter::query()->where('id', $encounter->id), $request->user())->firstOrFail();

        $encounter->load([
            'patient',
            'lga:id,uuid,name',
            'ward:id,uuid,name',
            'creator:id,name,email',
            'referrals' => fn ($q) => $q->latest(),
        ]);

        $pdf = Pdf::loadView('reports.encounter-pdf', [
            'encounter' => $encounter,
            'generatedAt' => now()->format('d M Y, H:i'),
        ])->setPaper('a4', 'portrait');

        return $pdf->download("encounter-{$encounter->uuid}.pdf");
    }

    public function referral(Request $request, Referral $referral): Response
    {
        $this->scopeByUser(Referral::query()->where('id', $referral->id), $request->user())->firstOrFail();

        $referral->load([
            'patient',
            'encounter',
            'lga:id,uuid,name',
            'ward:id,uuid,name',
            'creator:id,name,email',
        ]);

        $pdf = Pdf::loadView('reports.referral-pdf', [
            'referral' => $referral,
            'generatedAt' => now()->format('d M Y, H:i'),
        ])->setPaper('a4', 'portrait');

        return $pdf->download("referral-{$referral->uuid}.pdf");
    }
}
