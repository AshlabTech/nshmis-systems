<?php

namespace Database\Seeders;

use App\Models\DiseaseCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DiseaseCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            'Malaria',
            'Maternal and Child Health',
            'Nutrition',
            'Immunization',
            'NCD',
            'Respiratory Infection',
            'Diarrheal Disease',
            'Wound and Injury',
        ];

        foreach ($categories as $name) {
            DiseaseCategory::firstOrCreate(
                ['name' => $name],
                ['uuid' => (string) Str::uuid(), 'status' => 'active']
            );
        }
    }
}