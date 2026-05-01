<?php

namespace App\Services;

use App\Models\AppSetting;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\UploadedFile;

class AppSettingService
{
    /**
     * Get all app settings
     */
    public function getSettings()
    {
        $settings = AppSetting::getInstance();

        return [
            'app_name' => $settings->app_name,
            'app_short_name' => $settings->app_short_name,
            'app_description' => $settings->app_description,
            'logo_url' => $settings->logo_url,
            'logo_dark_url' => $settings->logo_dark_url,
            'favicon_url' => $settings->favicon_url,
            'login_background_url' => $settings->login_background_url,
            'login_side_image_url' => $settings->login_side_image_url,
            'primary_color' => $settings->primary_color,
            'secondary_color' => $settings->secondary_color,
            'accent_color' => $settings->accent_color,
            'error_color' => $settings->error_color,
            'info_color' => $settings->info_color,
            'success_color' => $settings->success_color,
            'warning_color' => $settings->warning_color,
            'color_scheme' => $settings->color_scheme,
            'login_layout' => $settings->login_layout,
            'login_title' => $settings->login_title,
            'login_subtitle' => $settings->login_subtitle,
            'show_logo_on_login' => $settings->show_logo_on_login,
            'currency_symbol' => $settings->currency_symbol,
            'currency_code' => $settings->currency_code,
            'timezone' => $settings->timezone,
            'date_format' => $settings->date_format,
            'time_format' => $settings->time_format,
            'company_email' => $settings->company_email,
            'company_phone' => $settings->company_phone,
            'company_address' => $settings->company_address,
            'company_website' => $settings->company_website,
            'social_links' => $settings->social_links,
        ];
    }

    /**
     * Update app settings
     */
    public function updateSettings(array $data)
    {
        $settings = AppSetting::getInstance();

        // Handle file uploads
        if (isset($data['logo']) && $data['logo'] instanceof UploadedFile) {
            $data['logo_path'] = $this->uploadFile($data['logo'], 'logos', $settings->logo_path);
            unset($data['logo']);
        }

        if (isset($data['logo_dark']) && $data['logo_dark'] instanceof UploadedFile) {
            $data['logo_dark_path'] = $this->uploadFile($data['logo_dark'], 'logos', $settings->logo_dark_path);
            unset($data['logo_dark']);
        }

        if (isset($data['favicon']) && $data['favicon'] instanceof UploadedFile) {
            $data['favicon_path'] = $this->uploadFile($data['favicon'], 'logos', $settings->favicon_path);
            unset($data['favicon']);
        }

        if (isset($data['login_background']) && $data['login_background'] instanceof UploadedFile) {
            try {
                $data['login_background_path'] = $this->uploadFile($data['login_background'], 'backgrounds', $settings->login_background_path);
                unset($data['login_background']);
            } catch (\Exception $e) {
                $errorMsg = $e->getMessage() ?: 'Unknown error occurred';
                Log::error('Login background upload failed in service', [
                    'error' => $errorMsg,
                    'file' => $data['login_background']->getClientOriginalName(),
                    'exception_class' => get_class($e),
                ]);
                throw new \Exception('The login background failed to upload. Error: ' . $errorMsg);
            }
        }

        if (isset($data['login_side_image']) && $data['login_side_image'] instanceof UploadedFile) {
            $data['login_side_image_path'] = $this->uploadFile($data['login_side_image'], 'backgrounds', $settings->login_side_image_path);
            unset($data['login_side_image']);
        }

        // Update settings
        $settings->update($data);

        return $this->getSettings();
    }

    /**
     * Upload file and delete old one
     */
    private function uploadFile(UploadedFile $file, string $folder, ?string $oldPath = null): string
    {
        try {
            Log::info('Starting file upload', [
                'folder' => $folder,
                'file_name' => $file->getClientOriginalName(),
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
                'is_valid' => $file->isValid(),
                'error_code' => $file->getError(),
            ]);

            // Validate file
            if (!$file->isValid()) {
                $errorMsg = 'Invalid file upload. Error code: ' . $file->getError() . '. ' . $file->getErrorMessage();
                Log::error('File validation failed', ['error' => $errorMsg]);
                throw new \Exception($errorMsg);
            }

            // Delete old file if exists
            if ($oldPath && Storage::disk('public')->exists($oldPath)) {
                Log::info('Deleting old file', ['path' => $oldPath]);
                Storage::disk('public')->delete($oldPath);
            }

            // Store new file
            Log::info('Attempting to store file', ['folder' => $folder]);
            $path = $file->store($folder, 'public');

            if (!$path) {
                throw new \Exception('Failed to store file - store() returned false/null');
            }

            Log::info('File uploaded successfully', ['path' => $path]);
            return $path;
        } catch (\Exception $e) {
            Log::error('File upload failed', [
                'folder' => $folder,
                'error' => $e->getMessage(),
                'file_name' => $file->getClientOriginalName(),
                'file_size' => $file->getSize(),
                'exception_class' => get_class($e),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Delete a specific image
     */
    public function deleteImage(string $type)
    {
        $settings = AppSetting::getInstance();
        
        $fieldMap = [
            'logo' => 'logo_path',
            'logo_dark' => 'logo_dark_path',
            'favicon' => 'favicon_path',
            'login_background' => 'login_background_path',
            'login_side_image' => 'login_side_image_path',
        ];

        if (!isset($fieldMap[$type])) {
            throw new \InvalidArgumentException("Invalid image type: {$type}");
        }

        $field = $fieldMap[$type];
        $path = $settings->$field;

        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }

        $settings->$field = null;
        $settings->save();

        return $this->getSettings();
    }

    /**
     * Reset to default settings
     */
    public function resetToDefaults()
    {
        $settings = AppSetting::getInstance();

        // Delete all uploaded files
        $this->deleteAllImages($settings);

        // Reset to defaults
        $settings->update([
            'app_name' => 'Inventory Management System',
            'app_short_name' => 'IMS',
            'app_description' => null,
            'logo_path' => null,
            'logo_dark_path' => null,
            'favicon_path' => null,
            'login_background_path' => null,
            'login_side_image_path' => null,
            'primary_color' => '#1976D2',
            'secondary_color' => '#424242',
            'accent_color' => '#82B1FF',
            'error_color' => '#FF5252',
            'info_color' => '#2196F3',
            'success_color' => '#4CAF50',
            'warning_color' => '#FB8C00',
            'login_layout' => 'split',
            'login_title' => null,
            'login_subtitle' => null,
            'show_logo_on_login' => true,
        ]);

        return $this->getSettings();
    }

    /**
     * Delete all uploaded images
     */
    private function deleteAllImages(AppSetting $settings)
    {
        $paths = [
            $settings->logo_path,
            $settings->logo_dark_path,
            $settings->favicon_path,
            $settings->login_background_path,
            $settings->login_side_image_path,
        ];

        foreach ($paths as $path) {
            if ($path && Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
            }
        }
    }
}

