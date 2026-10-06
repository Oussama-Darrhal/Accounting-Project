<?php

namespace App\Services;

use App\Models\Company;
use App\Models\JournalEntry;
use App\Models\JournalLine;
use App\Support\Money;
use Illuminate\Support\Carbon;

class DashboardAlertService
{
    /** @return array{drafts: int, late_invoices: int, solde_restant: string} */
    public function forCompany(Company $company): array
    {
        $drafts = JournalEntry::query()
            ->where('company_id', $company->id)
            ->where('is_draft', true)
            ->count();

        $cutoff = Carbon::today()->subDays(60)->toDateString();

        $unlettered = JournalLine::query()
            ->whereHas('entry', fn ($query) => $query->where('company_id', $company->id)->where('is_draft', false))
            ->whereNull('lettrage_code')
            ->whereHas('account', function ($query) {
                $query->where('code', 'like', '3421%')
                    ->orWhere('code', 'like', '4411%');
            });

        $lateInvoices = (clone $unlettered)
            ->where(function ($query) use ($cutoff) {
                $query->whereDate('due_date', '<=', $cutoff)
                    ->orWhere(function ($inner) use ($cutoff) {
                        $inner->whereNull('due_date')
                            ->whereHas('entry', fn ($entry) => $entry->whereDate('date_piece', '<=', $cutoff));
                    });
            })
            ->count();

        $soldeCents = $unlettered->get()->sum(
            fn (JournalLine $line) => Money::toCents($line->debit) - Money::toCents($line->credit)
        );

        return [
            'drafts' => $drafts,
            'late_invoices' => $lateInvoices,
            'solde_restant' => Money::fromCents(abs($soldeCents)),
        ];
    }
}
