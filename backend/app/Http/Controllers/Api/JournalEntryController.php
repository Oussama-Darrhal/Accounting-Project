<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreJournalEntryRequest;
use App\Http\Resources\JournalEntryResource;
use App\Models\JournalEntry;
use App\Services\JournalEntryService;
use App\Support\CurrentCompany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JournalEntryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $company = CurrentCompany::from($request);
        $entries = JournalEntry::query()
            ->where('company_id', $company->id)
            ->with(['lines.account.parent', 'journal'])
            ->orderByDesc('created_at')
            ->get();

        return JournalEntryResource::collection($entries)->response();
    }

    public function store(StoreJournalEntryRequest $request, JournalEntryService $service): JsonResponse
    {
        $entry = $service->create(CurrentCompany::from($request), $request->validated());

        return (new JournalEntryResource($entry))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, string $journalEntry): JsonResponse
    {
        $entry = JournalEntry::query()
            ->where('company_id', CurrentCompany::from($request)->id)
            ->with(['lines.account.parent', 'journal'])
            ->findOrFail($journalEntry);

        return (new JournalEntryResource($entry))->response();
    }

    public function update(StoreJournalEntryRequest $request, string $journalEntry, JournalEntryService $service): JsonResponse
    {
        $company = CurrentCompany::from($request);
        $entry = JournalEntry::query()
            ->where('company_id', $company->id)
            ->findOrFail($journalEntry);

        $updated = $service->update($company, $entry, $request->validated());

        return (new JournalEntryResource($updated))->response();
    }
}
