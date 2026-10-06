<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Company;
use App\Models\Journal;
use Illuminate\Http\JsonResponse;

class CatalogController extends Controller
{
    public function accounts(): JsonResponse
    {
        $companyId = Company::query()->value('id');
        $accounts = Account::query()
            ->where('company_id', $companyId)
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

    public function journals(): JsonResponse
    {
        $companyId = Company::query()->value('id');
        $journals = Journal::query()
            ->where('company_id', $companyId)
            ->orderBy('code')
            ->get(['id', 'code', 'name']);

        return response()->json(['data' => $journals]);
    }
}
