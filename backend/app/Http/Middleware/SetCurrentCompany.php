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
        if ($header) {
            return Company::query()
                ->where('id', $header)
                ->orWhere('slug', $header)
                ->first();
        }

        $routeCompany = $request->route('company');
        if ($routeCompany instanceof Company) {
            return $routeCompany;
        }

        return Company::query()->orderBy('id')->first();
    }
}
