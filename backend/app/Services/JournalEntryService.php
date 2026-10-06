<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Company;
use App\Models\Journal;
use App\Models\JournalEntry;
use App\Support\Money;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class JournalEntryService
{
    /**
     * Persist a header + lines in one transaction.
     * is_draft is computed from cents, never taken from the client.
     *
     * @param  array{lines: list<array<string, mixed>>, journal?: string, date_piece?: string, reference_piece?: string}  $payload
     */
    public function create(Company $company, array $payload): JournalEntry
    {
        $lines = $payload['lines'] ?? [];
        if ($lines === []) {
            throw ValidationException::withMessages(['lines' => 'Au moins une ligne est obligatoire.']);
        }

        return DB::transaction(function () use ($company, $payload, $lines) {
            $prepared = [];
            $debitCents = 0;
            $creditCents = 0;

            foreach ($lines as $index => $line) {
                $debit = Money::toCents($line['debit'] ?? 0);
                $credit = Money::toCents($line['credit'] ?? 0);
                if ($debit < 0 || $credit < 0) {
                    throw ValidationException::withMessages(["lines.$index" => 'Les montants ne peuvent pas être négatifs.']);
                }
                if ($debit > 0 && $credit > 0) {
                    throw ValidationException::withMessages(["lines.$index" => 'Une ligne ne peut pas porter un débit et un crédit.']);
                }
                if ($debit === 0 && $credit === 0) {
                    continue;
                }

                $account = $this->resolveAccount($company, $line, $index);
                $date = $line['date'] ?? $payload['date_piece'] ?? null;
                if (! $date) {
                    throw ValidationException::withMessages(["lines.$index.date" => 'La date est obligatoire.']);
                }

                $tvaRate = isset($line['tva']) ? (int) $line['tva'] : (isset($line['tva_rate']) ? (int) $line['tva_rate'] : $company->default_tva_rate);
                $vatCents = $this->vatCents($debit, $credit, $tvaRate);

                $prepared[] = [
                    'account' => $account,
                    'libelle' => $line['libelle'] ?? $line['facture'] ?? 'Écriture',
                    'debit' => Money::fromCents($debit),
                    'credit' => Money::fromCents($credit),
                    'tva_rate' => $tvaRate,
                    'base_ht' => Money::fromCents(max($debit, $credit) - $vatCents),
                    'montant_tva' => Money::fromCents($vatCents),
                    'due_date' => $line['due_date'] ?? ($account->isTiers() ? $this->defaultDueDate($date) : null),
                    'date' => $date,
                    'journal' => $line['journal'] ?? $payload['journal'] ?? 'OD',
                    'facture' => $line['facture'] ?? $payload['reference_piece'] ?? null,
                ];
                $debitCents += $debit;
                $creditCents += $credit;
            }

            if ($prepared === []) {
                throw ValidationException::withMessages(['lines' => 'Aucune ligne avec un montant.']);
            }

            $header = $prepared[0];
            $journal = Journal::query()
                ->where('company_id', $company->id)
                ->where('code', $header['journal'])
                ->first();
            if (! $journal) {
                throw ValidationException::withMessages(['journal' => "Journal inconnu [{$header['journal']}]."]);
            }

            $entry = JournalEntry::query()->create([
                'company_id' => $company->id,
                'journal_id' => $journal->id,
                'date_piece' => $payload['date_piece'] ?? $header['date'],
                'reference_piece' => $payload['reference_piece'] ?? $header['facture'],
                'is_draft' => $debitCents !== $creditCents,
                'debit_total' => Money::fromCents($debitCents),
                'credit_total' => Money::fromCents($creditCents),
            ]);

            foreach ($prepared as $row) {
                $entry->lines()->create([
                    'account_id' => $row['account']->id,
                    'libelle' => $row['libelle'],
                    'debit' => $row['debit'],
                    'credit' => $row['credit'],
                    'tva_rate' => $row['tva_rate'],
                    'base_ht' => $row['base_ht'],
                    'montant_tva' => $row['montant_tva'],
                    'due_date' => $row['due_date'],
                ]);
            }

            return $entry->load(['lines.account.parent', 'journal']);
        });
    }

    private function resolveAccount(Company $company, array $line, int $index): Account
    {
        $code = $line['compte'] ?? $line['account_code'] ?? null;
        if (! $code) {
            throw ValidationException::withMessages(["lines.$index.compte" => 'Le compte est obligatoire.']);
        }

        $account = Account::query()
            ->where('company_id', $company->id)
            ->where('code', $code)
            ->first();
        if (! $account) {
            throw ValidationException::withMessages(["lines.$index.compte" => "Compte inconnu [{$code}]."]);
        }

        $tiers = trim((string) ($line['tiers'] ?? ''));
        if ($tiers === '' || ! $account->isTiersCollective()) {
            return $account;
        }

        return $this->findOrCreateAuxiliary($account, $tiers);
    }

    private function findOrCreateAuxiliary(Account $collective, string $tiers): Account
    {
        $name = $tiers;
        if (preg_match('/^\d+\s*[-–]\s*(.+)$/u', $tiers, $match)) {
            $name = trim($match[1]);
        }

        $existing = Account::query()
            ->where('company_id', $collective->company_id)
            ->where('parent_id', $collective->id)
            ->where('name', $name)
            ->first();
        if ($existing) {
            return $existing;
        }

        $suffix = str_pad((string) (Account::query()->where('parent_id', $collective->id)->count() + 1), 4, '0', STR_PAD_LEFT);

        return Account::query()->create([
            'company_id' => $collective->company_id,
            'pcm_class_id' => $collective->pcm_class_id,
            'parent_id' => $collective->id,
            'code' => $collective->code.$suffix,
            'name' => $name,
        ]);
    }

    private function vatCents(int $debit, int $credit, int $rate): int
    {
        $gross = max($debit, $credit);
        if ($rate <= 0 || $gross === 0) {
            return 0;
        }

        return (int) round($gross * $rate / (100 + $rate));
    }

    private function defaultDueDate(string $date): string
    {
        return date('Y-m-d', strtotime($date.' +60 days'));
    }
}
