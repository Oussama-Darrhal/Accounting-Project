<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLettrageRequest;
use App\Http\Requests\UnmatchLettrageRequest;
use App\Services\ActivityLogService;
use App\Services\LettrageService;
use App\Support\CurrentCompany;
use Illuminate\Http\JsonResponse;

class LettrageController extends Controller
{
    public function store(StoreLettrageRequest $request, LettrageService $service, ActivityLogService $logs): JsonResponse
    {
        $company = CurrentCompany::from($request);
        $result = $service->match($company, $request->validated('line_ids'));
        $logs->record(
            $company,
            'lettrage.matched',
            'Lettrage '.$result['code'].' enregistré',
            ['code' => $result['code'], 'line_ids' => $request->validated('line_ids')],
        );

        return response()->json($result, 201);
    }

    public function unmatch(UnmatchLettrageRequest $request, LettrageService $service, ActivityLogService $logs): JsonResponse
    {
        $company = CurrentCompany::from($request);
        $result = $service->unmatch($company, $request->validated('code'));
        $logs->record(
            $company,
            'lettrage.unmatched',
            'Lettrage '.$result['code'].' annulé',
            $result,
        );

        return response()->json($result);
    }
}
