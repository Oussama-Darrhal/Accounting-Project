<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JournalLine;
use App\Support\CurrentCompany;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LedgerController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $companyId = CurrentCompany::from($request)->id;
        $account = $request->query('account', 'all');
        $from = $request->query('from');
        $to = $request->query('to');

        $lines = JournalLine::query()
            ->with(['account', 'entry.journal'])
            ->whereHas('entry', function ($query) use ($companyId, $from, $to) {
                $query->where('company_id', $companyId)->where('is_draft', false);
                if ($from) {
                    $query->whereDate('date_piece', '>=', $from);
                }
                if ($to) {
                    $query->whereDate('date_piece', '<=', $to);
                }
            })
            ->when($account !== 'all', fn ($query) => $query->whereHas('account', fn ($inner) => $inner->where('code', $account)))
            ->get()
            ->sortBy(fn (JournalLine $line) => $line->entry->date_piece->toDateString().$line->id)
            ->values();

        $balanceCents = 0;
        $rows = $lines->map(function (JournalLine $line) use (&$balanceCents) {
            $debit = Money::toCents($line->debit);
            $credit = Money::toCents($line->credit);
            $balanceCents += $debit - $credit;

            return [
                'id' => $line->id,
                'date' => $line->entry->date_piece->toDateString(),
                'piece' => $line->entry->reference_piece ?: $line->entry->id,
                'account' => $line->account->code,
                'label' => $line->libelle,
                'debit' => (float) $line->debit,
                'credit' => (float) $line->credit,
                'balance' => (float) Money::fromCents($balanceCents),
                'lettrage_code' => $line->lettrage_code,
            ];
        });

        return response()->json([
            'data' => $rows,
            'totals' => [
                'debit' => (float) Money::fromCents($lines->sum(fn (JournalLine $line) => Money::toCents($line->debit))),
                'credit' => (float) Money::fromCents($lines->sum(fn (JournalLine $line) => Money::toCents($line->credit))),
                'balance' => (float) Money::fromCents($balanceCents),
            ],
        ]);
    }
}
