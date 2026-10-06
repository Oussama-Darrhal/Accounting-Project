<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Company;
use Illuminate\Support\Facades\Log;

class ActivityLogService
{
    /**
     * Persist a row in activity_logs and write the same event to the Laravel log.
     *
     * @param  array<string, mixed>  $meta
     */
    public function record(Company $company, string $action, string $message, array $meta = [], ?string $actor = null): ActivityLog
    {
        $actor = $actor ?: (request()?->header('X-Actor-Name') ?: 'Système');

        Log::info($message, [
            'company_id' => $company->id,
            'company' => $company->slug ?? $company->name,
            'action' => $action,
            'actor' => $actor,
            'meta' => $meta,
        ]);

        return ActivityLog::query()->create([
            'company_id' => $company->id,
            'actor' => $actor,
            'action' => $action,
            'message' => $message,
            'meta' => $meta ?: null,
        ]);
    }
}
