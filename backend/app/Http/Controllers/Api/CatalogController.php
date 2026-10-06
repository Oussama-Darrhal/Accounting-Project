<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Journal;
use App\Support\CurrentCompany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function accounts(Request $request): JsonResponse
    {
        $company = CurrentCompany::from($request);
        $accounts = Account::query()
            ->where('company_id', $company->id)
            ->with('pcmClass')
            ->orderBy('code')
            ->get()
            ->map(fn (Account $account) => [
                'id' => $account->id,
                'code' => $account->code,
                'name' => $account->name,
                'class' => $account->pcmClass?->code,
                'parent_id' => $account->parent_id,
            ]);

        return response()->json(['data' => $accounts]);
    }

    public function journals(Request $request): JsonResponse
    {
        $company = CurrentCompany::from($request);
        $journals = Journal::query()
            ->where('company_id', $company->id)
            ->orderBy('code')
            ->get(['id', 'code', 'name']);

        return response()->json(['data' => $journals]);
    }
}
