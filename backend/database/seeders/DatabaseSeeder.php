<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            NigerStateAdministrativeBoundarySeeder::class,
            WardSeeder::class,
            FacilitySeeder::class,
            DiseaseCategorySeeder::class,
            ServiceCategorySeeder::class,
        ]);
    }
}
