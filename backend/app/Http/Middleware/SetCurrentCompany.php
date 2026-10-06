<?php

namespace App\Http\Middleware;

use App\Models\Company;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetCurrentCompany
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethod('get') && $request->is('api/companies')) {
            return $next($request);
        }

        $company = $this->resolve($request);
        if (! $company) {
            return response()->json(['message' => 'Aucune société. Passez X-Company-Id.'], 404);
        }

        $request->attributes->set('company', $company);

        return $next($request);
    }

    private function resolve(Request $request): ?Company
    {
        $header = $request->header('X-Company-Id');
        if (is_string($header) && $header !== '') {
            // Postgres rejects `where id = 'jony-travel'` (bigint). Match slug always;
            // only compare id when the header is a numeric primary key.
            return Company::query()
                ->where(function ($query) use ($header) {
                    $query->where('slug', $header);
                    if (ctype_digit($header)) {
                        $query->orWhere('id', (int) $header);
                    }
                })
                ->first();
        }

        $routeCompany = $request->route('company');
        if ($routeCompany instanceof Company) {
            return $routeCompany;
        }

        return Company::query()->orderBy('id')->first();
    }
}
