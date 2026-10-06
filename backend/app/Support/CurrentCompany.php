<?php

namespace App\Support;

use App\Models\Company;
use Illuminate\Http\Request;

class CurrentCompany
{
    public static function from(Request $request): Company
    {
        $company = $request->attributes->get('company');
        if ($company instanceof Company) {
            return $company;
        }

        abort(404, 'Société introuvable.');
    }
}
