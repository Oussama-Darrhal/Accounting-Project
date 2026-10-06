<?php

namespace Tests\Feature;

use App\Models\JournalLine;
use Database\Seeders\AccountingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LettrageApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AccountingSeeder::class);
    }

    #[Test]
    public function it_letters_matching_lines_and_flags_a_69_21_delay(): void
    {
        $invoice = $this->postJson('/api/journal-entries', [
            'lines' => [
                ['date' => '2026-01-01', 'journal' => 'ACH', 'facture' => 'FF-1', 'compte' => '6111', 'debit' => 100, 'credit' => 0, 'tva' => 20],
                ['date' => '2026-01-01', 'journal' => 'ACH', 'facture' => 'FF-1', 'compte' => '4411', 'tiers' => '4411 - Sud Import', 'debit' => 0, 'credit' => 100, 'tva' => 20],
            ],
        ])->assertCreated();

        $payment = $this->postJson('/api/journal-entries', [
            'lines' => [
                ['date' => '2026-03-15', 'journal' => 'BQ', 'facture' => 'BQ-9', 'compte' => '4411', 'tiers' => '4411 - Sud Import', 'debit' => 100, 'credit' => 0, 'tva' => 20],
                ['date' => '2026-03-15', 'journal' => 'BQ', 'facture' => 'BQ-9', 'compte' => '5141', 'debit' => 0, 'credit' => 100, 'tva' => 20],
            ],
        ])->assertCreated();

        $supplierLines = JournalLine::query()
            ->whereHas('account', fn ($query) => $query->where('code', 'like', '4411%'))
            ->whereIn('journal_entry_id', [$invoice->json('id'), $payment->json('id')])
            ->pluck('id');

        $this->assertCount(2, $supplierLines);

        $this->postJson('/api/lettrage', ['line_ids' => $supplierLines->all()])
            ->assertCreated()
            ->assertJsonPath('code', 'A')
            ->assertJsonPath('late_payment.days', 73);

        $this->getJson('/api/dashboard/alerts')->assertJsonPath('late_invoices', 0);
    }

    #[Test]
    public function it_rejects_an_unbalanced_lettrage(): void
    {
        $this->postJson('/api/journal-entries', [
            'lines' => [
                ['date' => '2026-01-01', 'journal' => 'ACH', 'compte' => '6111', 'debit' => 100, 'credit' => 0],
                ['date' => '2026-01-01', 'journal' => 'ACH', 'compte' => '4411', 'debit' => 0, 'credit' => 100],
            ],
        ]);

        $ids = JournalLine::query()->pluck('id')->take(2)->all();
        $this->postJson('/api/lettrage', ['line_ids' => [$ids[0], $ids[0]]])
            ->assertStatus(422);
    }
}
