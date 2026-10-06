<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Company;
use Database\Seeders\AccountingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CompanyDossierTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AccountingSeeder::class);
    }

    #[Test]
    public function it_seeds_the_three_group_companies_with_their_own_books(): void
    {
        $this->assertEqualsCanonicalizing(
            ['Jony Travel', 'Astrolabe Voyage', 'CG Mobility'],
            Company::query()->pluck('name')->all()
        );
        $this->assertFalse(Company::query()->where('name', 'like', 'Atlas%')->exists());

        foreach (AccountingSeeder::COMPANIES as $row) {
            $company = Company::query()->where('slug', $row['slug'])->firstOrFail();
            $this->assertSame(AccountingSeeder::UMBRELLA, $company->umbrella);
            $this->assertSame(4, $company->journals()->count());
            $this->assertTrue($company->accounts()->where('code', '6111')->exists());
        }
    }

    #[Test]
    public function an_entry_on_one_dossier_stays_off_the_others(): void
    {
        $this->asCompany('jony-travel')->postJson('/api/journal-entries', [
            'lines' => [
                ['date' => '2026-04-01', 'journal' => 'ACH', 'facture' => 'JT-1', 'libelle' => 'Achat Jony', 'compte' => '6111', 'debit' => 100, 'credit' => 0, 'tva' => 20],
                ['date' => '2026-04-01', 'journal' => 'ACH', 'facture' => 'JT-1', 'libelle' => 'Achat Jony', 'compte' => '4411', 'debit' => 0, 'credit' => 100, 'tva' => 20],
            ],
        ])->assertCreated()->assertJsonPath('reference_piece', 'JT-1');

        $this->getJson('/api/ledger', $this->companyHeaders('jony-travel'))
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/ledger', $this->companyHeaders('astrolabe-voyage'))
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->getJson('/api/journal-entries', $this->companyHeaders('cg-mobility'))
            ->assertOk()
            ->assertExactJson([]);
    }

    #[Test]
    public function posting_an_entry_writes_an_activity_log_for_that_company_only(): void
    {
        $this->asCompany('cg-mobility')->postJson('/api/journal-entries', [
            'lines' => [
                ['date' => '2026-05-01', 'journal' => 'ACH', 'facture' => 'CG-9', 'compte' => '6111', 'debit' => 50, 'credit' => 0, 'tva' => 20],
            ],
        ])->assertCreated();

        $cg = Company::query()->where('slug', 'cg-mobility')->firstOrFail();
        $this->assertSame(1, ActivityLog::query()->where('company_id', $cg->id)->count());
        $this->assertSame(0, ActivityLog::query()->where('company_id', '!=', $cg->id)->count());

        $this->getJson('/api/activity-logs', $this->companyHeaders('cg-mobility'))
            ->assertOk()
            ->assertJsonPath('data.0.action', 'journal.draft')
            ->assertJsonPath('data.0.message', 'Brouillon enregistré · CG-9');

        $this->getJson('/api/activity-logs', $this->companyHeaders('jony-travel'))
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    #[Test]
    public function selecting_a_dossier_is_logged(): void
    {
        $company = Company::query()->where('slug', 'astrolabe-voyage')->firstOrFail();

        $this->postJson('/api/companies/'.$company->id.'/select', [], $this->companyHeaders('astrolabe-voyage'))
            ->assertOk()
            ->assertJsonPath('name', 'Astrolabe Voyage');

        $this->getJson('/api/activity-logs', $this->companyHeaders('astrolabe-voyage'))
            ->assertJsonPath('data.0.action', 'company.opened');
    }
}
