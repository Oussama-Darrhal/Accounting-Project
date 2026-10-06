<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Company;
use App\Models\Journal;
use App\Models\PcmClass;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AccountingSeeder extends Seeder
{
    public function run(): void
    {
        $company = Company::query()->first() ?? Company::query()->create([
            'name' => 'Atlas Conseil SARL',
            'ice' => '001234567000089',
            'fiscal_id' => '40123456',
            'fiscal_start' => '2026-01-01',
            'fiscal_end' => '2026-12-31',
            'default_tva_rate' => 20,
            'currency' => 'MAD',
        ]);

        if (! User::query()->where('email', 'sara@cabinet.ma')->exists()) {
            User::query()->create([
                'company_id' => $company->id,
                'name' => 'Sara',
                'email' => 'sara@cabinet.ma',
                'password' => Hash::make('demo'),
            ]);
        }

        $classes = [
            1 => 'Classe 1 — Financement permanent',
            2 => 'Classe 2 — Actif immobilisé',
            3 => 'Classe 3 — Actif circulant',
            4 => 'Classe 4 — Passif circulant',
            5 => 'Classe 5 — Trésorerie',
            6 => 'Classe 6 — Charges',
            7 => 'Classe 7 — Produits',
            8 => 'Classe 8 — Résultats',
        ];
        foreach ($classes as $code => $name) {
            PcmClass::query()->updateOrCreate(['code' => $code], ['name' => $name]);
        }

        $classId = fn (int $code) => PcmClass::query()->where('code', $code)->value('id');

        foreach ([
            ['ACH', 'Achats'],
            ['VT', 'Ventes'],
            ['BQ', 'Banque'],
            ['OD', 'Opérations diverses'],
        ] as [$code, $name]) {
            Journal::query()->updateOrCreate(
                ['company_id' => $company->id, 'code' => $code],
                ['name' => $name]
            );
        }

        $accounts = [
            [1, '1111', 'Capital social'],
            [1, '1140', 'Réserve légale'],
            [1, '1481', 'Emprunts auprès des établissements de crédit'],
            [2, '2332', 'Matériel et outillage'],
            [2, '2340', 'Matériel de transport'],
            [2, '2355', 'Matériel informatique'],
            [3, '3111', 'Marchandises'],
            [3, '3421', 'Clients'],
            [3, '3455', 'État — TVA récupérable'],
            [4, '4411', 'Fournisseurs'],
            [4, '4432', 'Rémunérations dues au personnel'],
            [4, '4455', 'État — TVA facturée'],
            [5, '5141', 'Banques'],
            [5, '5161', 'Caisse'],
            [6, '6111', 'Achats de marchandises'],
            [6, '6125', 'Achats non stockés de matières et fournitures'],
            [6, '6131', 'Locations et charges locatives'],
            [6, '6171', 'Rémunérations du personnel'],
            [7, '7111', 'Ventes de marchandises'],
            [7, '7121', 'Ventes de biens et services produits'],
            [8, '8110', "Résultat d'exploitation"],
            [8, '8800', 'Résultat après impôts'],
        ];

        foreach ($accounts as [$class, $code, $name]) {
            Account::query()->updateOrCreate(
                ['company_id' => $company->id, 'code' => $code],
                ['pcm_class_id' => $classId($class), 'name' => $name]
            );
        }
    }
}
