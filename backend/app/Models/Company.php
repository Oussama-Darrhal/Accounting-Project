<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'ice', 'fiscal_id', 'fiscal_start', 'fiscal_end', 'default_tva_rate', 'currency'])]
class Company extends Model
{
    protected function casts(): array
    {
        return [
            'fiscal_start' => 'date',
            'fiscal_end' => 'date',
            'default_tva_rate' => 'integer',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function journals(): HasMany
    {
        return $this->hasMany(Journal::class);
    }

    public function accounts(): HasMany
    {
        return $this->hasMany(Account::class);
    }

    public function journalEntries(): HasMany
    {
        return $this->hasMany(JournalEntry::class);
    }
}
