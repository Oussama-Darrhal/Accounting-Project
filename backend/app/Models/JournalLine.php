<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'journal_entry_id',
    'account_id',
    'libelle',
    'debit',
    'credit',
    'tva_rate',
    'base_ht',
    'montant_tva',
    'due_date',
    'lettrage_code',
    'lettered_at',
])]
class JournalLine extends Model
{
    use HasUuids;

    protected function casts(): array
    {
        return [
            'debit' => 'decimal:2',
            'credit' => 'decimal:2',
            'tva_rate' => 'integer',
            'base_ht' => 'decimal:2',
            'montant_tva' => 'decimal:2',
            'due_date' => 'date',
            'lettered_at' => 'datetime',
        ];
    }

    public function entry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
