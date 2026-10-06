<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreJournalEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'journal' => ['nullable', 'string', 'max:8'],
            'date_piece' => ['nullable', 'date'],
            'reference_piece' => ['nullable', 'string', 'max:64'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.date' => ['nullable', 'date'],
            'lines.*.journal' => ['nullable', 'string', 'max:8'],
            'lines.*.facture' => ['nullable', 'string', 'max:64'],
            'lines.*.libelle' => ['nullable', 'string', 'max:255'],
            'lines.*.compte' => ['required', 'string', 'max:32'],
            'lines.*.tiers' => ['nullable', 'string', 'max:128'],
            'lines.*.debit' => ['nullable', 'numeric', 'min:0'],
            'lines.*.credit' => ['nullable', 'numeric', 'min:0'],
            'lines.*.tva' => ['nullable', 'integer', 'in:0,7,10,14,20'],
            'lines.*.tva_rate' => ['nullable', 'integer', 'in:0,7,10,14,20'],
            'lines.*.due_date' => ['nullable', 'date'],
        ];
    }
}
