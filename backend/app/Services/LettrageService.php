<?php

namespace App\Services;

use App\Models\Company;
use App\Models\JournalLine;
use App\Support\LettrageCode;
use App\Support\Money;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LettrageService
{
    /**
     * @param  list<string>  $lineIds
     * @return array{code: string, late_payment: ?array{days: int, invoice_date: string, payment_date: string}}
     */
    public function match(Company $company, array $lineIds): array
    {
        $ids = array_values(array_unique($lineIds));
        if (count($ids) < 2) {
            throw ValidationException::withMessages(['line_ids' => 'Sélectionnez au moins deux lignes.']);
        }

        return DB::transaction(function () use ($company, $ids) {
            $lines = JournalLine::query()
                ->with(['entry.journal', 'account'])
                ->whereIn('id', $ids)
                ->whereHas('entry', fn ($query) => $query->where('company_id', $company->id)->where('is_draft', false))
                ->lockForUpdate()
                ->get();

            if ($lines->count() !== count($ids)) {
                throw ValidationException::withMessages(['line_ids' => 'Une ligne est introuvable, déjà un brouillon, ou hors dossier.']);
            }
            if ($lines->contains(fn (JournalLine $line) => $line->lettrage_code)) {
                throw ValidationException::withMessages(['line_ids' => 'Une ligne de la sélection est déjà lettrée.']);
            }

            $debit = $lines->sum(fn (JournalLine $line) => Money::toCents($line->debit));
            $credit = $lines->sum(fn (JournalLine $line) => Money::toCents($line->credit));
            if ($debit !== $credit) {
                throw ValidationException::withMessages([
                    'line_ids' => 'Le lettrage exige un débit égal au crédit ('.Money::fromCents($debit).' / '.Money::fromCents($credit).').',
                ]);
            }

            $code = LettrageCode::next(
                JournalLine::query()
                    ->whereHas('entry', fn ($query) => $query->where('company_id', $company->id))
                    ->whereNotNull('lettrage_code')
                    ->pluck('lettrage_code')
            );

            $now = now();
            foreach ($lines as $line) {
                $line->forceFill([
                    'lettrage_code' => $code,
                    'lettered_at' => $now,
                ])->save();
            }

            return [
                'code' => $code,
                'late_payment' => $this->loi69Warning($lines),
            ];
        });
    }

    /**
     * Loi 69-21: delay runs from the invoice date (date_piece of the 34/44 line),
     * not from due_date. due_date is kept for the dashboard alert.
     *
     * @param  \Illuminate\Support\Collection<int, JournalLine>  $lines
     */
    private function loi69Warning($lines): ?array
    {
        $invoice = $lines
            ->filter(fn (JournalLine $line) => $line->account?->isTiers())
            ->sortBy(fn (JournalLine $line) => $line->entry->date_piece->toDateString())
            ->first();
        $payment = $lines
            ->filter(fn (JournalLine $line) => $line->account?->isTiers() || $line->account?->isBank())
            ->sortByDesc(fn (JournalLine $line) => $line->entry->date_piece->toDateString())
            ->first();
        if (! $invoice || ! $payment || $invoice->id === $payment->id) {
            return null;
        }

        $invoiceDate = Carbon::parse($invoice->entry->date_piece)->startOfDay();
        $paymentDate = Carbon::parse($payment->entry->date_piece)->startOfDay();
        $days = (int) $invoiceDate->diffInDays($paymentDate);
        if ($days <= 60) {
            return null;
        }

        return [
            'days' => $days,
            'invoice_date' => $invoiceDate->toDateString(),
            'payment_date' => $paymentDate->toDateString(),
        ];
    }
}
