<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AppliesRoleScope;
use App\Http\Controllers\Controller;
use App\Models\Encounter;
use App\Models\Patient;
use App\Models\Referral;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    use AppliesRoleScope;

    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();

        $patients = $this->scopeByUser(Patient::query(), $user)->count();
        $encounters = $this->scopeByUser(Encounter::query(), $user)->count();
        $referrals = $this->scopeByUser(Referral::query(), $user)->count();

        $pendingSync = $this->scopeByUser(Patient::query()->where('sync_status', 'pending'), $user)->count()
            + $this->scopeByUser(Encounter::query()->where('sync_status', 'pending'), $user)->count()
            + $this->scopeByUser(Referral::query()->where('sync_status', 'pending'), $user)->count();

        $failedSync = $this->scopeByUser(Patient::query()->where('sync_status', 'failed'), $user)->count()
            + $this->scopeByUser(Encounter::query()->where('sync_status', 'failed'), $user)->count()
            + $this->scopeByUser(Referral::query()->where('sync_status', 'failed'), $user)->count();

        $completedReferrals = $this->scopeByUser(Referral::query()->where('workflow_status', 'completed'), $user)->count();
        $referralCompletionRate = $referrals > 0 ? round(($completedReferrals / $referrals) * 100, 2) : 0;

        $encountersByLga = $this->scopeByUser(Encounter::query(), $user)
            ->leftJoin('lgas', 'encounters.lga_id', '=', 'lgas.id')
            ->select('encounters.lga_uuid', DB::raw("COALESCE(lgas.name, 'Unassigned') as label"), DB::raw('COUNT(*) as total'))
            ->groupBy('encounters.lga_uuid', 'lgas.name')
            ->get();

        $encountersByWard = $this->scopeByUser(Encounter::query(), $user)
            ->leftJoin('wards', 'encounters.ward_id', '=', 'wards.id')
            ->select('encounters.ward_uuid', DB::raw("COALESCE(wards.name, 'Unassigned') as label"), DB::raw('COUNT(*) as total'))
            ->groupBy('encounters.ward_uuid', 'wards.name')
            ->get();

        $diseaseBreakdown = $this->scopeByUser(Encounter::query(), $user)
            ->select(DB::raw("COALESCE(encounter_type, 'Unspecified') as label"), DB::raw('COUNT(*) as total'))
            ->groupBy('encounter_type')
            ->get();

        $referralBreakdown = $this->scopeByUser(Referral::query(), $user)
            ->select('workflow_status as label', DB::raw('COUNT(*) as total'))
            ->groupBy('workflow_status')
            ->get();

        $dailyTrend = $this->buildEncounterTrend('daily', $user);
        $weeklyTrend = $this->buildEncounterTrend('weekly', $user);
        $monthlyTrend = $this->buildEncounterTrend('monthly', $user);

        return response()->json([
            'cards' => [
                'total_patients' => $patients,
                'total_encounters' => $encounters,
                'total_referrals' => $referrals,
                'pending_sync_records' => $pendingSync,
                'failed_sync_records' => $failedSync,
                'referral_completion_rate' => $referralCompletionRate,
            ],
            'charts' => [
                'encounters_by_lga' => $encountersByLga,
                'encounters_by_ward' => $encountersByWard,
                'disease_program_breakdown' => $diseaseBreakdown,
                'referral_status_breakdown' => $referralBreakdown,
                'daily_trend' => $dailyTrend,
                'weekly_trend' => $weeklyTrend,
                'monthly_trend' => $monthlyTrend,
            ],
        ]);
    }

    private function buildEncounterTrend(string $granularity, $user)
    {
        $driver = DB::connection()->getDriverName();

        $expression = match ($granularity) {
            'weekly' => $driver === 'sqlite'
                ? "strftime('%Y-%W', encounter_date)"
                : 'YEARWEEK(encounter_date, 1)',
            'monthly' => $driver === 'sqlite'
                ? "strftime('%Y-%m', encounter_date)"
                : "DATE_FORMAT(encounter_date, '%Y-%m')",
            default => $driver === 'sqlite'
                ? 'DATE(encounter_date)'
                : 'DATE(encounter_date)',
        };

        return $this->scopeByUser(Encounter::query(), $user)
            ->select(DB::raw($expression.' as period'), DB::raw('COUNT(*) as total'))
            ->groupBy('period')
            ->orderBy('period')
            ->get();
    }
}
