<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLettrageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'line_ids' => ['required', 'array', 'min:2'],
            'line_ids.*' => ['required', 'uuid'],
        ];
    }
}
