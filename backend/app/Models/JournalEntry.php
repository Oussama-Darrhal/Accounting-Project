<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'company_id',
    'journal_id',
    'date_piece',
    'reference_piece',
    'is_draft',
    'debit_total',
    'credit_total',
])]
class JournalEntry extends Model
{
    use HasUuids;

    protected function casts(): array
    {
        return [
            'date_piece' => 'date',
            'is_draft' => 'boolean',
            'debit_total' => 'decimal:2',
            'credit_total' => 'decimal:2',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function journal(): BelongsTo
    {
        return $this->belongsTo(Journal::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(JournalLine::class);
    }
}
