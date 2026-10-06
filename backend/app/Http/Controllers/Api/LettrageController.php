<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLettrageRequest;
use App\Models\Company;
use App\Services\LettrageService;
use Illuminate\Http\JsonResponse;

class LettrageController extends Controller
{
    public function store(StoreLettrageRequest $request, LettrageService $service): JsonResponse
    {
        $company = Company::query()->firstOrFail();
        $result = $service->match($company, $request->validated('line_ids'));

        return response()->json($result, 201);
    }
}
