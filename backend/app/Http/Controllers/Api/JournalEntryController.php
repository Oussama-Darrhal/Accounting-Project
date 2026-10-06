<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreJournalEntryRequest;
use App\Http\Resources\JournalEntryResource;
use App\Models\Company;
use App\Models\JournalEntry;
use App\Services\JournalEntryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JournalEntryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $entries = JournalEntry::query()
            ->where('company_id', Company::query()->value('id'))
            ->with(['lines.account.parent', 'journal'])
            ->orderByDesc('created_at')
            ->get();

        return JournalEntryResource::collection($entries)->response();
    }

    public function store(StoreJournalEntryRequest $request, JournalEntryService $service): JsonResponse
    {
        $company = Company::query()->firstOrFail();
        $entry = $service->create($company, $request->validated());

        return (new JournalEntryResource($entry))
            ->response()
            ->setStatusCode(201);
    }

    public function show(string $journalEntry): JsonResponse
    {
        $entry = JournalEntry::query()
            ->with(['lines.account.parent', 'journal'])
            ->findOrFail($journalEntry);

        return (new JournalEntryResource($entry))->response();
    }
}
