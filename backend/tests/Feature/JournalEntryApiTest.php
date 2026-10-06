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
        $response = $this->postJson('/api/journal-entries', [
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

        $this->getJson('/api/ledger')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        $this->getJson('/api/dashboard/alerts')
            ->assertOk()
            ->assertJsonPath('drafts', 0);
    }

    #[Test]
    public function an_unbalanced_entry_is_stored_as_a_draft_and_stays_off_the_ledger(): void
    {
        $this->postJson('/api/journal-entries', [
            'lines' => [
                ['date' => '2026-03-02', 'journal' => 'ACH', 'compte' => '6111', 'debit' => 100, 'credit' => 0, 'tva' => 20],
            ],
        ])->assertCreated()->assertJsonPath('is_draft', true);

        $this->assertSame(1, JournalEntry::query()->where('is_draft', true)->count());
        $this->getJson('/api/ledger')->assertJsonCount(0, 'data');
        $this->getJson('/api/dashboard/alerts')->assertJsonPath('drafts', 1);
    }
}
