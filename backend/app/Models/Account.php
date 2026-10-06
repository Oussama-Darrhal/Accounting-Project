<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['company_id', 'pcm_class_id', 'parent_id', 'code', 'name'])]
class Account extends Model
{
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function pcmClass(): BelongsTo
    {
        return $this->belongsTo(PcmClass::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(JournalLine::class);
    }

    public function isTiersCollective(): bool
    {
        return in_array($this->code, ['3421', '4411'], true);
    }

    public function isBank(): bool
    {
        return str_starts_with((string) $this->code, '51');
    }

    public function isTiers(): bool
    {
        $code = (string) $this->code;

        return str_starts_with($code, '3421') || str_starts_with($code, '4411');
    }
}
