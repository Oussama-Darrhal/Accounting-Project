<?php

namespace App\Http\Resources;

use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Company */
class CompanyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'umbrella' => $this->umbrella,
            'ice' => $this->ice,
            'fiscal_id' => $this->fiscal_id,
            'fiscal_start' => $this->fiscal_start?->toDateString(),
            'fiscal_end' => $this->fiscal_end?->toDateString(),
            'default_tva_rate' => $this->default_tva_rate,
            'currency' => $this->currency,
        ];
    }
}
