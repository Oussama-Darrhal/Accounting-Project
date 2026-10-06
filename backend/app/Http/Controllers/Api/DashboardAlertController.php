<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DashboardAlertService;
use App\Support\CurrentCompany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardAlertController extends Controller
{
    public function __invoke(Request $request, DashboardAlertService $service): JsonResponse
    {
        return response()->json($service->forCompany(CurrentCompany::from($request)));
    }
}
