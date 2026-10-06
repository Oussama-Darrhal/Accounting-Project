<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Services\DashboardAlertService;
use Illuminate\Http\JsonResponse;

class DashboardAlertController extends Controller
{
    public function __invoke(DashboardAlertService $service): JsonResponse
    {
        $company = Company::query()->firstOrFail();

        return response()->json($service->forCompany($company));
    }
}
