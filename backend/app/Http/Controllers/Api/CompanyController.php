<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCompanyRequest;
use App\Http\Resources\CompanyResource;
use App\Models\Company;
use App\Services\ActivityLogService;
use App\Support\CurrentCompany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    public function index(): JsonResponse
    {
        $companies = Company::query()->orderBy('id')->get();

        return CompanyResource::collection($companies)->response();
    }

    public function select(Request $request, Company $company, ActivityLogService $logs): JsonResponse
    {
        $logs->record(
            $company,
            'company.opened',
            'Dossier ouvert : '.$company->name,
            ['slug' => $company->slug],
        );

        return (new CompanyResource($company))->response();
    }

    public function update(UpdateCompanyRequest $request, Company $company, ActivityLogService $logs): JsonResponse
    {
        $current = CurrentCompany::from($request);
        abort_unless($current->is($company), 403, 'Cette société n\'est pas le dossier courant.');

        $company->update($request->validated());
        $logs->record(
            $company,
            'company.updated',
            'Paramètres enregistrés pour '.$company->name,
            $request->validated(),
        );

        return (new CompanyResource($company->fresh()))->response();
    }
}
