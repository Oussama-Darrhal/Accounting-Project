<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\JournalLine;
use Database\Seeders\AccountingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class JournalEntryApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AccountingSeeder::class);
    }

    #[Test]
    public function it_posts_a_balanced_entry_and_lists_it_on_the_ledger(): void
    {
        $response = $this->asCompany()->postJson('/api/journal-entries', [
            'lines' => [
                ['date' => '2026-01-12', 'journal' => 'ACH', 'facture' => 'FF-0342', 'libelle' => 'Achat FF-0342', 'compte' => '6111', 'debit' => 12500, 'credit' => 0, 'tva' => 20],
                ['date' => '2026-01-12', 'journal' => 'ACH', 'facture' => 'FF-0342', 'libelle' => 'Achat FF-0342', 'compte' => '3455', 'debit' => 2500, 'credit' => 0, 'tva' => 20],
                ['date' => '2026-01-12', 'journal' => 'ACH', 'facture' => 'FF-0342', 'libelle' => 'Achat FF-0342', 'compte' => '4411', 'tiers' => '4411 - Sud Import', 'debit' => 0, 'credit' => 15000, 'tva' => 20],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('is_draft', false)
            ->assertJsonPath('reference_piece', 'FF-0342');

        $this->assertTrue(Account::query()->where('name', 'Sud Import')->exists());

        $this->getJson('/api/ledger', $this->companyHeaders())
            ->assertOk()
            ->assertJsonCount(3, 'data');

        $this->getJson('/api/dashboard/alerts', $this->companyHeaders())
            ->assertOk()
            ->assertJsonPath('drafts', 0);

        $this->getJson('/api/journal-entries', $this->companyHeaders())
            ->assertOk()
            ->assertJsonPath('0.reference_piece', 'FF-0342')
            ->assertJsonPath('0.is_draft', false);
    }

    #[Test]
    public function an_unbalanced_entry_is_stored_as_a_draft_and_stays_off_the_ledger(): void
    {
        $this->asCompany()->postJson('/api/journal-entries', [
            'lines' => [
                ['date' => '2026-03-02', 'journal' => 'ACH', 'compte' => '6111', 'debit' => 100, 'credit' => 0, 'tva' => 20],
            ],
        ])->assertCreated()->assertJsonPath('is_draft', true);

        $this->assertSame(1, JournalEntry::query()->where('is_draft', true)->count());
        $this->getJson('/api/ledger', $this->companyHeaders())->assertJsonCount(0, 'data');
        $this->getJson('/api/dashboard/alerts', $this->companyHeaders())->assertJsonPath('drafts', 1);
    }

    #[Test]
    public function a_draft_can_be_updated_and_posted_when_it_balances(): void
    {
        $created = $this->asCompany()->postJson('/api/journal-entries', [
            'lines' => [
                ['date' => '2026-03-02', 'journal' => 'ACH', 'facture' => 'BR-9', 'compte' => '6111', 'debit' => 80, 'credit' => 0, 'tva' => 20],
            ],
        ])->assertCreated();

        $id = $created->json('id');

        $this->asCompany()->putJson('/api/journal-entries/'.$id, [
            'lines' => [
                ['date' => '2026-03-02', 'journal' => 'ACH', 'facture' => 'BR-9', 'compte' => '6111', 'debit' => 80, 'credit' => 0, 'tva' => 20],
                ['date' => '2026-03-02', 'journal' => 'ACH', 'facture' => 'BR-9', 'compte' => '4411', 'debit' => 0, 'credit' => 80, 'tva' => 20],
            ],
        ])->assertOk()->assertJsonPath('is_draft', false)->assertJsonPath('id', $id);

        $this->getJson('/api/ledger', $this->companyHeaders())->assertJsonCount(2, 'data');
        $this->getJson('/api/dashboard/alerts', $this->companyHeaders())->assertJsonPath('drafts', 0);
    }

    #[Test]
    public function the_ledger_honours_from_and_to_dates(): void
    {
        $this->asCompany()->postJson('/api/journal-entries', [
            'lines' => [
                ['date' => '2026-01-05', 'journal' => 'ACH', 'facture' => 'JAN', 'compte' => '6111', 'debit' => 10, 'credit' => 0],
                ['date' => '2026-01-05', 'journal' => 'ACH', 'facture' => 'JAN', 'compte' => '4411', 'debit' => 0, 'credit' => 10],
            ],
        ]);
        $this->asCompany()->postJson('/api/journal-entries', [
            'lines' => [
                ['date' => '2026-06-05', 'journal' => 'ACH', 'facture' => 'JUN', 'compte' => '6111', 'debit' => 20, 'credit' => 0],
                ['date' => '2026-06-05', 'journal' => 'ACH', 'facture' => 'JUN', 'compte' => '4411', 'debit' => 0, 'credit' => 20],
            ],
        ]);

        $this->getJson('/api/ledger?from=2026-06-01&to=2026-06-30', $this->companyHeaders())
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.piece', 'JUN');
    }

    #[Test]
    public function it_creates_a_new_tiers_account(): void
    {
        $this->asCompany()->postJson('/api/accounts', [
            'parent_code' => '4411',
            'name' => 'Oasis Voyages',
        ])->assertCreated()->assertJsonPath('name', 'Oasis Voyages')->assertJsonPath('parent_code', '4411');

        $this->assertTrue(Account::query()->where('name', 'Oasis Voyages')->where('code', 'like', '4411%')->exists());
    }

    #[Test]
    public function it_stores_ht_and_the_tax_amount_from_the_payload(): void
    {
        $this->asCompany()->postJson('/api/journal-entries', [
            'lines' => [
                ['date' => '2026-01-12', 'journal' => 'ACH', 'facture' => 'FF-HT', 'libelle' => 'Achat', 'compte' => '6111', 'debit' => 12500, 'credit' => 0, 'tva' => 20, 'ht' => 12500, 'ttc' => 15000],
                ['date' => '2026-01-12', 'journal' => 'ACH', 'facture' => 'FF-HT', 'libelle' => 'TVA', 'compte' => '3455', 'debit' => 2500, 'credit' => 0, 'tva' => 20, 'ht' => 12500, 'ttc' => 15000],
                ['date' => '2026-01-12', 'journal' => 'ACH', 'facture' => 'FF-HT', 'libelle' => 'Fournisseur', 'compte' => '4411', 'tiers' => '4411 - Sud Import', 'debit' => 0, 'credit' => 15000, 'tva' => 20, 'ht' => 12500, 'ttc' => 15000],
            ],
        ])->assertCreated()->assertJsonPath('lines.0.ht', '12500.00')->assertJsonPath('lines.0.ttc', '15000.00');

        $charge = JournalLine::query()->where('libelle', 'Achat')->first();
        $this->assertSame('12500.00', (string) $charge->base_ht);
        $this->assertSame('2500.00', (string) $charge->montant_tva);
    }

    #[Test]
    public function a_class_6_debit_is_treated_as_ht_when_ht_is_omitted(): void
    {
        $this->asCompany()->postJson('/api/journal-entries', [
            'lines' => [
                ['date' => '2026-01-12', 'journal' => 'ACH', 'facture' => 'FF-INF', 'compte' => '6111', 'debit' => 100, 'credit' => 0, 'tva' => 20],
            ],
        ])->assertCreated();

        $line = JournalLine::query()->first();
        $this->assertSame('100.00', (string) $line->base_ht);
        $this->assertSame('20.00', (string) $line->montant_tva);
    }
}
