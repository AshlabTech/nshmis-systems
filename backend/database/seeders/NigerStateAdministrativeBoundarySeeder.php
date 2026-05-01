<?php

namespace Database\Seeders;

use App\Models\Lga;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class NigerStateAdministrativeBoundarySeeder extends Seeder
{
    public function run(): void
    {
        $lgas = [
            'Agaie',
            'Agwara',
            'Bida',
            'Borgu',
            'Bosso',
            'Chanchaga',
            'Edati',
            'Gbako',
            'Gurara',
            'Katcha',
            'Kontagora',
            'Lapai',
            'Lavun',
            'Magama',
            'Mariga',
            'Mashegu',
            'Mokwa',
            'Muya',
            'Paikoro',
            'Rafi',
            'Rijau',
            'Shiroro',
            'Suleja',
            'Tafa',
            'Wushishi',
        ];

        foreach ($lgas as $name) {
            Lga::firstOrCreate(
                ['name' => $name],
                ['uuid' => (string) Str::uuid()]
            );
        }
    }
}
