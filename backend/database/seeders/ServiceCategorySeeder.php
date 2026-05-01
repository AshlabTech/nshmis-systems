<?php

namespace Database\Seeders;

use App\Models\ServiceCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ServiceCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            'Outreach Consultation',
            'Health Education',
            'Deworming',
            'Malaria Testing',
            'ANC Review',
            'Immunization',
            'Vitamin A Supplementation',
            'Wound Dressing',
        ];

        foreach ($categories as $name) {
            ServiceCategory::firstOrCreate(
                ['name' => $name],
                ['uuid' => (string) Str::uuid(), 'status' => 'active']
            );
        }
    }
}