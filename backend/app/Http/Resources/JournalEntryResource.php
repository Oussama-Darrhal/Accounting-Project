<?php

namespace App\Http\Resources;

use App\Models\JournalEntry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin JournalEntry */
class JournalEntryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'is_draft' => $this->is_draft,
            'savedAt' => $this->created_at?->toISOString(),
            'journal' => $this->journal?->code,
            'date_piece' => $this->date_piece?->toDateString(),
            'reference_piece' => $this->reference_piece,
            'debit_total' => $this->debit_total,
            'credit_total' => $this->credit_total,
            'lines' => $this->lines->map(fn ($line) => [
                'id' => $line->id,
                'date' => $this->date_piece?->toDateString(),
                'journal' => $this->journal?->code,
                'facture' => $this->reference_piece,
                'libelle' => $line->libelle,
                'compte' => $line->account?->code,
                'tiers' => $line->account?->parent_id
                    ? $line->account->parent?->code.' - '.$line->account->name
                    : '',
                'debit' => (float) $line->debit,
                'credit' => (float) $line->credit,
                'tva' => $line->tva_rate,
                'base_ht' => $line->base_ht,
                'montant_tva' => $line->montant_tva,
                'due_date' => $line->due_date?->toDateString(),
                'lettrage_code' => $line->lettrage_code,
            ]),
        ];
    }
}
