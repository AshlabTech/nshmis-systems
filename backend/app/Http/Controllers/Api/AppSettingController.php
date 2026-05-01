<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AppSettingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AppSettingController extends Controller
{
    protected $appSettingService;

    public function __construct(AppSettingService $appSettingService)
    {
        $this->appSettingService = $appSettingService;
    }

    /**
     * Get app settings (public - no auth required)
     */
    public function index()
    {
        return response()->json($this->appSettingService->getSettings());
    }

    /**
     * Update app settings (admin only)
     */
    public function update(Request $request)
    {
        if (!$request->user() || $request->user()->role !== 'state_admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            // Debug: Check what files are in the request
            $debugInfo = [
                'has_login_background' => $request->hasFile('login_background'),
                'all_files' => array_keys($request->allFiles()),
                'all_inputs' => array_keys($request->all()),
            ];

            // Log file upload details for debugging
            if ($request->hasFile('login_background')) {
                $file = $request->file('login_background');
                $debugInfo['file_details'] = [
                    'original_name' => $file->getClientOriginalName(),
                    'size' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                    'is_valid' => $file->isValid(),
                    'error' => $file->getError(),
                    'error_message' => $file->getErrorMessage(),
                ];
            }

            Log::info('App settings update request', $debugInfo);

            $validated = $request->validate([
                'app_name' => 'nullable|string|max:255',
                'app_short_name' => 'nullable|string|max:50',
                'app_description' => 'nullable|string',
                'logo' => 'nullable|image|mimes:jpeg,png,jpg,svg|max:2048',
                'logo_dark' => 'nullable|image|mimes:jpeg,png,jpg,svg|max:2048',
                'favicon' => 'nullable|image|mimes:ico,png|max:512',
                'login_background' => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
                'login_side_image' => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
                'primary_color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
                'secondary_color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
                'accent_color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
                'error_color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'info_color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'success_color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'warning_color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'login_layout' => 'nullable|in:centered,split,background',
            'login_title' => 'nullable|string|max:255',
            'login_subtitle' => 'nullable|string',
            'show_logo_on_login' => 'nullable|boolean',
            'currency_symbol' => 'nullable|string|max:10',
            'currency_code' => 'nullable|string|max:3',
            'timezone' => 'nullable|string|max:50',
            'date_format' => 'nullable|string|max:20',
            'time_format' => 'nullable|string|max:20',
            'company_email' => 'nullable|email|max:255',
            'company_phone' => 'nullable|string|max:20',
            'company_address' => 'nullable|string',
            'company_website' => 'nullable|url|max:255',
            'social_links' => 'nullable|array',
        ], [
            'login_background.image' => 'The login background must be an image file.',
            'login_background.mimes' => 'The login background must be a file of type: jpeg, png, jpg.',
            'login_background.max' => 'The login background must not be larger than 2MB. Current PHP upload limit is 2MB.',
            'login_side_image.image' => 'The login side image must be an image file.',
            'login_side_image.mimes' => 'The login side image must be a file of type: jpeg, png, jpg.',
            'login_side_image.max' => 'The login side image must not be larger than 2MB. Current PHP upload limit is 2MB.',
            'logo.max' => 'The logo must not be larger than 2MB.',
            'logo_dark.max' => 'The logo (dark) must not be larger than 2MB.',
            'favicon.max' => 'The favicon must not be larger than 512KB.',
        ]);

            $settings = $this->appSettingService->updateSettings($validated);

            return response()->json([
                'message' => 'Settings updated successfully',
                'data' => $settings,
            ]);
        } catch (ValidationException $e) {
            Log::error('Validation failed for app settings', [
                'errors' => $e->errors(),
                'message' => $e->getMessage(),
            ]);

            // Re-throw validation exceptions so they're handled properly
            throw $e;
        } catch (\Exception $e) {
            Log::error('Failed to update app settings', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to update settings: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a specific image
     */
    public function deleteImage(Request $request, string $type)
    {
        if (!$request->user() || $request->user()->role !== 'state_admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $settings = $this->appSettingService->deleteImage($type);

            return response()->json([
                'message' => 'Image deleted successfully',
                'data' => $settings,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    /**
     * Reset to default settings
     */
    public function reset(Request $request)
    {
        if (!$request->user() || $request->user()->role !== 'state_admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $settings = $this->appSettingService->resetToDefaults();

        return response()->json([
            'message' => 'Settings reset to defaults successfully',
            'data' => $settings,
        ]);
    }
}

