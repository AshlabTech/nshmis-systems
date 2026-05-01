<?php

namespace App\Http\Controllers\Api\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

trait AppliesListFilters
{
    private function applyPatientFilters(Builder $query, Request $request): Builder
    {
        return $query
            ->when($request->filled('search'), function (Builder $q) use ($request) {
                $search = '%' . $request->string('search') . '%';
                $q->where(function (Builder $inner) use ($search) {
                    $inner->where('first_name', 'like', $search)
                        ->orWhere('last_name', 'like', $search)
                        ->orWhere('middle_name', 'like', $search)
                        ->orWhere('uuid', 'like', $search)
                        ->orWhere('phone_number', 'like', $search);
                });
            })
            ->when($request->filled('lga_uuid'), fn (Builder $q) => $q->where('lga_uuid', $request->string('lga_uuid')))
            ->when($request->filled('ward_uuid'), fn (Builder $q) => $q->where('ward_uuid', $request->string('ward_uuid')))
            ->when($request->filled('sex'), fn (Builder $q) => $q->where('sex', $request->string('sex')))
            ->when($request->filled('nhis_status'), fn (Builder $q) => $q->where('nhis_status', $request->string('nhis_status')))
            ->when($request->filled('date_from'), fn (Builder $q) => $q->whereDate('created_at', '>=', $request->string('date_from')))
            ->when($request->filled('date_to'), fn (Builder $q) => $q->whereDate('created_at', '<=', $request->string('date_to')));
    }

    private function applyEncounterFilters(Builder $query, Request $request): Builder
    {
        return $query
            ->when($request->filled('search'), function (Builder $q) use ($request) {
                $search = '%' . $request->string('search') . '%';
                $q->where(function (Builder $inner) use ($search) {
                    $inner->where('uuid', 'like', $search)
                        ->orWhere('encounter_type', 'like', $search)
                        ->orWhere('service_point', 'like', $search)
                        ->orWhereHas('patient', function (Builder $patientQuery) use ($search) {
                            $patientQuery->where('first_name', 'like', $search)
                                ->orWhere('last_name', 'like', $search)
                                ->orWhere('uuid', 'like', $search);
                        });
                });
            })
            ->when($request->filled('lga_uuid'), fn (Builder $q) => $q->where('lga_uuid', $request->string('lga_uuid')))
            ->when($request->filled('ward_uuid'), fn (Builder $q) => $q->where('ward_uuid', $request->string('ward_uuid')))
            ->when($request->filled('disease_program'), fn (Builder $q) => $q->where('encounter_type', $request->string('disease_program')))
            ->when($request->filled('date_from'), fn (Builder $q) => $q->whereDate('encounter_date', '>=', $request->string('date_from')))
            ->when($request->filled('date_to'), fn (Builder $q) => $q->whereDate('encounter_date', '<=', $request->string('date_to')))
            ->when($request->filled('user_id'), fn (Builder $q) => $q->where('created_by_user_id', $request->integer('user_id')));
    }

    private function applyReferralFilters(Builder $query, Request $request): Builder
    {
        return $query
            ->when($request->filled('search'), function (Builder $q) use ($request) {
                $search = '%' . $request->string('search') . '%';
                $q->where(function (Builder $inner) use ($search) {
                    $inner->where('uuid', 'like', $search)
                        ->orWhere('referred_to_facility', 'like', $search)
                        ->orWhere('referral_reason', 'like', $search)
                        ->orWhereHas('patient', function (Builder $patientQuery) use ($search) {
                            $patientQuery->where('first_name', 'like', $search)
                                ->orWhere('last_name', 'like', $search)
                                ->orWhere('uuid', 'like', $search);
                        });
                });
            })
            ->when($request->filled('status'), fn (Builder $q) => $q->where('workflow_status', $request->string('status')))
            ->when($request->filled('urgency'), fn (Builder $q) => $q->where('urgency', $request->string('urgency')))
            ->when($request->filled('facility'), fn (Builder $q) => $q->where('referred_to_facility', 'like', '%' . $request->string('facility') . '%'))
            ->when($request->filled('lga_uuid'), fn (Builder $q) => $q->where('lga_uuid', $request->string('lga_uuid')))
            ->when($request->filled('ward_uuid'), fn (Builder $q) => $q->where('ward_uuid', $request->string('ward_uuid')))
            ->when($request->filled('date_from'), fn (Builder $q) => $q->whereDate('created_at', '>=', $request->string('date_from')))
            ->when($request->filled('date_to'), fn (Builder $q) => $q->whereDate('created_at', '<=', $request->string('date_to')));
    }
}
