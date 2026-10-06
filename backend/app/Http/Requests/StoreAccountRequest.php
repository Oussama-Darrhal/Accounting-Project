<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'parent_code' => ['required', 'string', 'in:3421,4411'],
            'name' => ['required', 'string', 'max:128'],
        ];
    }
}
