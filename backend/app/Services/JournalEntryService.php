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
    public function __construct(private ActivityLogService $logs) {}

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

        $entry = DB::transaction(function () use ($company, $payload, $lines) {
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
                $tax = $this->taxBreakdown($line, $debit, $credit, $tvaRate, $account);

                $prepared[] = [
                    'account' => $account,
                    'libelle' => $line['libelle'] ?? $line['facture'] ?? 'Écriture',
                    'debit' => Money::fromCents($debit),
                    'credit' => Money::fromCents($credit),
                    'tva_rate' => $tvaRate,
                    'base_ht' => $tax['base_ht'],
                    'montant_tva' => $tax['montant_tva'],
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

        $piece = $entry->reference_piece ? ' · '.$entry->reference_piece : '';
        $this->logs->record(
            $company,
            $entry->is_draft ? 'journal.draft' : 'journal.posted',
            ($entry->is_draft ? 'Brouillon enregistré' : 'Écriture enregistrée').$piece,
            [
                'id' => $entry->id,
                'is_draft' => $entry->is_draft,
                'reference_piece' => $entry->reference_piece,
            ],
        );

        return $entry;
    }

    /**
     * Replace the lines of a draft. Posted entries cannot be rewritten.
     *
     * @param  array{lines: list<array<string, mixed>>, journal?: string, date_piece?: string, reference_piece?: string}  $payload
     */
    public function update(Company $company, JournalEntry $entry, array $payload): JournalEntry
    {
        if ($entry->company_id !== $company->id) {
            throw ValidationException::withMessages(['id' => 'Cette écriture n\'appartient pas au dossier courant.']);
        }
        if (! $entry->is_draft) {
            throw ValidationException::withMessages(['id' => 'Seuls les brouillons peuvent être modifiés.']);
        }

        $updated = DB::transaction(function () use ($company, $entry, $payload) {
            $prepared = $this->prepareLines($company, $payload);
            $header = $prepared['rows'][0];
            $journal = Journal::query()
                ->where('company_id', $company->id)
                ->where('code', $header['journal'])
                ->first();
            if (! $journal) {
                throw ValidationException::withMessages(['journal' => "Journal inconnu [{$header['journal']}]."]);
            }

            $entry->lines()->delete();
            $entry->update([
                'journal_id' => $journal->id,
                'date_piece' => $payload['date_piece'] ?? $header['date'],
                'reference_piece' => $payload['reference_piece'] ?? $header['facture'],
                'is_draft' => $prepared['debit_cents'] !== $prepared['credit_cents'],
                'debit_total' => Money::fromCents($prepared['debit_cents']),
                'credit_total' => Money::fromCents($prepared['credit_cents']),
            ]);

            foreach ($prepared['rows'] as $row) {
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

        $piece = $updated->reference_piece ? ' · '.$updated->reference_piece : '';
        $this->logs->record(
            $company,
            $updated->is_draft ? 'journal.draft' : 'journal.posted',
            ($updated->is_draft ? 'Brouillon mis à jour' : 'Brouillon validé').$piece,
            [
                'id' => $updated->id,
                'is_draft' => $updated->is_draft,
                'reference_piece' => $updated->reference_piece,
            ],
        );

        return $updated;
    }

    /**
     * @param  array{lines: list<array<string, mixed>>, journal?: string, date_piece?: string, reference_piece?: string}  $payload
     * @return array{rows: list<array<string, mixed>>, debit_cents: int, credit_cents: int}
     */
    private function prepareLines(Company $company, array $payload): array
    {
        $lines = $payload['lines'] ?? [];
        if ($lines === []) {
            throw ValidationException::withMessages(['lines' => 'Au moins une ligne est obligatoire.']);
        }

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
            $tax = $this->taxBreakdown($line, $debit, $credit, $tvaRate, $account);

            $prepared[] = [
                'account' => $account,
                'libelle' => $line['libelle'] ?? $line['facture'] ?? 'Écriture',
                'debit' => Money::fromCents($debit),
                'credit' => Money::fromCents($credit),
                'tva_rate' => $tvaRate,
                'base_ht' => $tax['base_ht'],
                'montant_tva' => $tax['montant_tva'],
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

        return ['rows' => $prepared, 'debit_cents' => $debitCents, 'credit_cents' => $creditCents];
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

        return $account->findOrCreateAuxiliary($tiers);
    }

    /**
     * @return array{base_ht: string, montant_tva: string}
     */
    private function taxBreakdown(array $line, int $debit, int $credit, int $tvaRate, Account $account): array
    {
        $ht = $this->optionalCents($line['ht'] ?? null);
        $ttc = $this->optionalCents($line['ttc'] ?? null);

        if ($ht !== null || $ttc !== null) {
            if ($ht === null) {
                $ht = $tvaRate > 0 ? (int) round($ttc * 100 / (100 + $tvaRate)) : $ttc;
            }
            if ($ttc === null) {
                $ttc = $ht + ($tvaRate > 0 ? (int) round($ht * $tvaRate / 100) : 0);
            }

            return [
                'base_ht' => Money::fromCents($ht),
                'montant_tva' => Money::fromCents(max(0, $ttc - $ht)),
            ];
        }

        $gross = max($debit, $credit);
        $code = (string) $account->code;

        if (str_starts_with($code, '3455') || str_starts_with($code, '4455')) {
            $vat = $gross;
            $base = $tvaRate > 0 ? (int) round($gross * 100 / $tvaRate) : 0;

            return [
                'base_ht' => Money::fromCents($base),
                'montant_tva' => Money::fromCents($vat),
            ];
        }

        if ($code !== '' && ($code[0] === '6' || $code[0] === '7')) {
            $vat = $tvaRate > 0 ? (int) round($gross * $tvaRate / 100) : 0;

            return [
                'base_ht' => Money::fromCents($gross),
                'montant_tva' => Money::fromCents($vat),
            ];
        }

        $vat = $tvaRate > 0 ? (int) round($gross * $tvaRate / (100 + $tvaRate)) : 0;

        return [
            'base_ht' => Money::fromCents($gross - $vat),
            'montant_tva' => Money::fromCents($vat),
        ];
    }

    private function optionalCents(mixed $amount): ?int
    {
        if ($amount === null || $amount === '') {
            return null;
        }

        $cents = Money::toCents($amount);

        return $cents === 0 ? null : $cents;
    }

    private function defaultDueDate(string $date): string
    {
        return date('Y-m-d', strtotime($date.' +60 days'));
    }
}
