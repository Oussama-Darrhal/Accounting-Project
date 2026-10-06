<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:128'],
            'ice' => ['nullable', 'string', 'max:32'],
            'fiscal_id' => ['nullable', 'string', 'max:32'],
            'fiscal_start' => ['sometimes', 'date'],
            'fiscal_end' => ['sometimes', 'date'],
            'default_tva_rate' => ['sometimes', 'integer', 'in:0,7,10,14,20'],
            'currency' => ['sometimes', 'string', 'size:3'],
        ];
    }
}
