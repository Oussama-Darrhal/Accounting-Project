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
        $invoice = $this->asCompany()->postJson('/api/journal-entries', [
            'lines' => [
                ['date' => '2026-01-01', 'journal' => 'ACH', 'facture' => 'FF-1', 'compte' => '6111', 'debit' => 100, 'credit' => 0, 'tva' => 20],
                ['date' => '2026-01-01', 'journal' => 'ACH', 'facture' => 'FF-1', 'compte' => '4411', 'tiers' => '4411 - Sud Import', 'debit' => 0, 'credit' => 100, 'tva' => 20],
            ],
        ])->assertCreated();

        $payment = $this->asCompany()->postJson('/api/journal-entries', [
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

        $this->postJson('/api/lettrage', ['line_ids' => $supplierLines->all()], $this->companyHeaders())
            ->assertCreated()
            ->assertJsonPath('code', 'A')
            ->assertJsonPath('late_payment.days', 73);

        $this->getJson('/api/dashboard/alerts', $this->companyHeaders())->assertJsonPath('late_invoices', 0);
    }

    #[Test]
    public function it_letters_a_partial_payment_and_keeps_the_remainder(): void
    {
        $invoice = $this->asCompany()->postJson('/api/journal-entries', [
            'lines' => [
                ['date' => '2026-01-01', 'journal' => 'ACH', 'facture' => 'FF-R', 'compte' => '6111', 'debit' => 1000, 'credit' => 0, 'tva' => 20],
                ['date' => '2026-01-01', 'journal' => 'ACH', 'facture' => 'FF-R', 'compte' => '4411', 'tiers' => '4411 - Sud Import', 'debit' => 0, 'credit' => 1000, 'tva' => 20],
            ],
        ])->assertCreated();

        $payment = $this->asCompany()->postJson('/api/journal-entries', [
            'lines' => [
                ['date' => '2026-01-10', 'journal' => 'BQ', 'facture' => 'BQ-R', 'compte' => '4411', 'tiers' => '4411 - Sud Import', 'debit' => 400, 'credit' => 0, 'tva' => 20],
                ['date' => '2026-01-10', 'journal' => 'BQ', 'facture' => 'BQ-R', 'compte' => '5141', 'debit' => 0, 'credit' => 400, 'tva' => 20],
            ],
        ])->assertCreated();

        $supplierLines = JournalLine::query()
            ->whereHas('account', fn ($query) => $query->where('code', 'like', '4411%'))
            ->whereIn('journal_entry_id', [$invoice->json('id'), $payment->json('id')])
            ->pluck('id');

        $this->postJson('/api/lettrage', ['line_ids' => $supplierLines->all()], $this->companyHeaders())
            ->assertCreated()
            ->assertJsonPath('code', 'A')
            ->assertJsonPath('remainder.amount', '600.00');

        $lettered = JournalLine::query()->where('lettrage_code', 'A')->get();
        $this->assertSame(40000, $lettered->sum(fn ($line) => (int) round(((float) $line->debit) * 100)));
        $this->assertSame(40000, $lettered->sum(fn ($line) => (int) round(((float) $line->credit) * 100)));

        $this->assertTrue(
            JournalLine::query()->whereNull('lettrage_code')->where('libelle', 'like', '%reste%')->exists()
        );
    }

    #[Test]
    public function it_unletters_a_code(): void
    {
        $invoice = $this->asCompany()->postJson('/api/journal-entries', [
            'lines' => [
                ['date' => '2026-01-01', 'journal' => 'ACH', 'facture' => 'FF-U', 'compte' => '6111', 'debit' => 50, 'credit' => 0],
                ['date' => '2026-01-01', 'journal' => 'ACH', 'facture' => 'FF-U', 'compte' => '4411', 'debit' => 0, 'credit' => 50],
            ],
        ])->assertCreated();
        $payment = $this->asCompany()->postJson('/api/journal-entries', [
            'lines' => [
                ['date' => '2026-01-02', 'journal' => 'BQ', 'facture' => 'BQ-U', 'compte' => '4411', 'debit' => 50, 'credit' => 0],
                ['date' => '2026-01-02', 'journal' => 'BQ', 'facture' => 'BQ-U', 'compte' => '5141', 'debit' => 0, 'credit' => 50],
            ],
        ])->assertCreated();

        $ids = JournalLine::query()
            ->whereIn('journal_entry_id', [$invoice->json('id'), $payment->json('id')])
            ->whereHas('account', fn ($query) => $query->where('code', 'like', '4411%'))
            ->pluck('id')
            ->all();

        $this->postJson('/api/lettrage', ['line_ids' => $ids], $this->companyHeaders())->assertCreated();
        $this->postJson('/api/lettrage/unmatch', ['code' => 'A'], $this->companyHeaders())
            ->assertOk()
            ->assertJsonPath('cleared', 2);
        $this->assertSame(0, JournalLine::query()->whereNotNull('lettrage_code')->count());
    }

    #[Test]
    public function it_rejects_an_unbalanced_lettrage(): void
    {
        $this->asCompany()->postJson('/api/journal-entries', [
            'lines' => [
                ['date' => '2026-01-01', 'journal' => 'ACH', 'compte' => '6111', 'debit' => 100, 'credit' => 0],
                ['date' => '2026-01-01', 'journal' => 'ACH', 'compte' => '4411', 'debit' => 0, 'credit' => 100],
            ],
        ]);

        $ids = JournalLine::query()->pluck('id')->take(2)->all();
        $this->postJson('/api/lettrage', ['line_ids' => [$ids[0], $ids[0]]], $this->companyHeaders())
            ->assertStatus(422);
    }
}
