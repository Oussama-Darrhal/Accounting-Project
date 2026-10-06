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
     * @return array{code: string, remainder: ?array{line_id: string, amount: string, piece: ?string}, late_payment: ?array{days: int, invoice_date: string, payment_date: string}}
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
                $remainder = $this->splitRemainder($lines, $debit, $credit);
                $lines = $remainder['lines'];
                $remainderPayload = $remainder['remainder'];
            } else {
                $remainderPayload = null;
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
                'remainder' => $remainderPayload,
                'late_payment' => $this->loi69Warning($lines),
            ];
        });
    }

    /**
     * When débit ≠ crédit, split the largest line on the heavier side so the
     * matched slice letters and the leftover stays unlettered.
     *
     * @param  \Illuminate\Support\Collection<int, JournalLine>  $lines
     * @return array{lines: \Illuminate\Support\Collection<int, JournalLine>, remainder: array{line_id: string, amount: string, piece: ?string}}
     */
    private function splitRemainder($lines, int $debit, int $credit): array
    {
        $gap = abs($debit - $credit);
        $heavierIsDebit = $debit > $credit;
        $candidate = $lines
            ->filter(function (JournalLine $line) use ($heavierIsDebit, $gap) {
                $amount = Money::toCents($heavierIsDebit ? $line->debit : $line->credit);

                return $amount >= $gap;
            })
            ->sortByDesc(fn (JournalLine $line) => Money::toCents($heavierIsDebit ? $line->debit : $line->credit))
            ->first();

        if (! $candidate) {
            throw ValidationException::withMessages([
                'line_ids' => 'Le reste ('.Money::fromCents($gap).') dépasse chaque ligne du côté le plus élevé. Lettrez d\'abord un montant égal.',
            ]);
        }

        $originalDebit = Money::toCents($candidate->debit);
        $originalCredit = Money::toCents($candidate->credit);
        $originalAmount = max($originalDebit, $originalCredit);
        $matchedCents = $originalAmount - $gap;
        $vatOriginal = Money::toCents($candidate->montant_tva);
        $vatRemainder = $originalAmount === 0 ? 0 : (int) round($vatOriginal * $gap / $originalAmount);
        $vatMatched = $vatOriginal - $vatRemainder;

        if ($heavierIsDebit) {
            $candidate->debit = Money::fromCents($matchedCents);
            $remainderDebit = Money::fromCents($gap);
            $remainderCredit = Money::fromCents(0);
        } else {
            $candidate->credit = Money::fromCents($matchedCents);
            $remainderDebit = Money::fromCents(0);
            $remainderCredit = Money::fromCents($gap);
        }

        $candidate->montant_tva = Money::fromCents($vatMatched);
        $candidate->base_ht = Money::fromCents($matchedCents - $vatMatched);
        $candidate->save();

        $remainderLine = $candidate->entry->lines()->create([
            'account_id' => $candidate->account_id,
            'libelle' => rtrim($candidate->libelle).' (reste)',
            'debit' => $remainderDebit,
            'credit' => $remainderCredit,
            'tva_rate' => $candidate->tva_rate,
            'base_ht' => Money::fromCents($gap - $vatRemainder),
            'montant_tva' => Money::fromCents($vatRemainder),
            'due_date' => $candidate->due_date,
        ]);

        return [
            'lines' => $lines,
            'remainder' => [
                'line_id' => $remainderLine->id,
                'amount' => Money::fromCents($gap),
                'piece' => $candidate->entry->reference_piece,
            ],
        ];
    }

    public function unmatch(Company $company, string $code): array
    {
        return DB::transaction(function () use ($company, $code) {
            $lines = JournalLine::query()
                ->where('lettrage_code', $code)
                ->whereHas('entry', fn ($query) => $query->where('company_id', $company->id))
                ->lockForUpdate()
                ->get();

            if ($lines->isEmpty()) {
                throw ValidationException::withMessages(['code' => 'Aucune ligne lettrée avec ce code.']);
            }

            foreach ($lines as $line) {
                $line->forceFill([
                    'lettrage_code' => null,
                    'lettered_at' => null,
                ])->save();
            }

            return ['code' => $code, 'cleared' => $lines->count()];
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
