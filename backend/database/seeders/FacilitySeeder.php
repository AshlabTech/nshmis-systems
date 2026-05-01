<?php

namespace Database\Seeders;

use App\Models\Facility;
use App\Models\Lga;
use App\Models\Ward;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class FacilitySeeder extends Seeder
{
    public function run(): void
    {
        foreach (Lga::query()->orderBy('name')->get() as $lga) {
            $ward = Ward::query()->where('lga_id', $lga->id)->orderBy('name')->first();

            Facility::firstOrCreate(
                ['name' => $lga->name.' Primary Health Centre'],
                [
                    'uuid' => (string) Str::uuid(),
                    'lga_uuid' => $lga->uuid,
                    'ward_uuid' => $ward?->uuid,
                    'type' => 'Primary Health Centre',
                    'status' => 'active',
                ]
            );

            Facility::firstOrCreate(
                ['name' => $lga->name.' General Hospital'],
                [
                    'uuid' => (string) Str::uuid(),
                    'lga_uuid' => $lga->uuid,
                    'ward_uuid' => $ward?->uuid,
                    'type' => 'General Hospital',
                    'status' => 'active',
                ]
            );
        }
    }
}