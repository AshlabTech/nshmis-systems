<?php

namespace Database\Seeders;

use App\Models\Lga;
use App\Models\Ward;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class WardSeeder extends Seeder
{
    public function run(): void
    {
        $wardNames = ['Central Ward', 'North Ward', 'South Ward'];

        foreach (Lga::query()->orderBy('name')->get() as $lga) {
            foreach ($wardNames as $wardName) {
                Ward::firstOrCreate(
                    ['lga_id' => $lga->id, 'name' => $wardName],
                    ['uuid' => (string) Str::uuid()]
                );
            }
        }
    }
}