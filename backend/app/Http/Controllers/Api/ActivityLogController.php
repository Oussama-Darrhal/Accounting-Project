<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Support\CurrentCompany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $company = CurrentCompany::from($request);
        $logs = ActivityLog::query()
            ->where('company_id', $company->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(200)
            ->get()
            ->map(fn (ActivityLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'message' => $log->message,
                'actor' => $log->actor,
                'meta' => $log->meta,
                'createdAt' => $log->created_at?->toISOString(),
            ]);

        return response()->json(['data' => $logs]);
    }
}
