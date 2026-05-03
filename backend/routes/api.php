<?php

use App\Http\Controllers\Api\Admin\DiseaseCategoryController;
use App\Http\Controllers\Api\Admin\FacilityController;
use App\Http\Controllers\Api\Admin\LgaController;
use App\Http\Controllers\Api\Admin\ServiceCategoryController;
use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\Admin\WardController;
use App\Http\Controllers\Api\AppSettingController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EncounterController;
use App\Http\Controllers\Api\ExportController;
use App\Http\Controllers\Api\MetadataController;
use App\Http\Controllers\Api\PatientController;
use App\Http\Controllers\Api\PdfController;
use App\Http\Controllers\Api\ReferralController;
use App\Http\Controllers\Api\SyncController;
use App\Http\Controllers\Api\SyncLogController;
use Illuminate\Support\Facades\Route;

$registerRoutes = function (): void {
    // Public — no authentication required
    Route::get('/settings', [AppSettingController::class, 'index']);
    Route::post('/auth/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->post('/sync', [SyncController::class, 'store']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);

        Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
        Route::get('/metadata', [MetadataController::class, 'index']);

        Route::get('/patients', [PatientController::class, 'index']);
        Route::get('/patients/{patient:uuid}', [PatientController::class, 'show']);
        Route::get('/patients/{patient:uuid}/pdf', [PdfController::class, 'patient']);
        Route::get('/exports/patients', [ExportController::class, 'patients']);

        Route::get('/encounters', [EncounterController::class, 'index']);
        Route::get('/encounters/{encounter:uuid}', [EncounterController::class, 'show']);
        Route::get('/encounters/{encounter:uuid}/pdf', [PdfController::class, 'encounter']);
        Route::get('/exports/encounters', [ExportController::class, 'encounters']);

        Route::get('/referrals', [ReferralController::class, 'index']);
        Route::get('/referrals/{referral:uuid}', [ReferralController::class, 'show']);
        Route::get('/referrals/{referral:uuid}/pdf', [PdfController::class, 'referral']);
        Route::patch('/referrals/{referral:uuid}/status', [ReferralController::class, 'updateStatus']);
        Route::get('/exports/referrals', [ExportController::class, 'referrals']);

        Route::get('/sync-logs', [SyncLogController::class, 'index']);

        // App settings (state_admin only, enforced inside the controller)
        // match(['post','patch']) so multipart file uploads work from browsers (PATCH+FormData can fail in some PHP configs)
        Route::match(['post', 'patch'], '/admin/settings', [AppSettingController::class, 'update']);
        Route::delete('/admin/settings/images/{type}', [AppSettingController::class, 'deleteImage']);
        Route::post('/admin/settings/reset', [AppSettingController::class, 'reset']);

        Route::apiResource('/admin/users', UserController::class);
        Route::get('/admin/users/{user}/lgas', [UserController::class, 'getLgas']);
        Route::post('/admin/users/{user}/lgas', [UserController::class, 'syncLgas']);
        Route::apiResource('/admin/lgas', LgaController::class)->except(['show']);
        Route::apiResource('/admin/wards', WardController::class)->except(['show']);
        Route::apiResource('/admin/facilities', FacilityController::class)->except(['show']);
        Route::apiResource('/admin/disease-categories', DiseaseCategoryController::class)->except(['show']);
        Route::apiResource('/admin/service-categories', ServiceCategoryController::class)->except(['show']);
    });
};

Route::prefix('v1')->group(function () use ($registerRoutes) {
    $registerRoutes();
});

