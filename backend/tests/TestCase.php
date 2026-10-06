<?php

namespace Tests;

use App\Models\Company;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function companyHeaders(?string $slug = 'jony-travel'): array
    {
        $company = $slug
            ? Company::query()->where('slug', $slug)->first()
            : Company::query()->orderBy('id')->first();

        if (! $company) {
            return [];
        }

        return ['X-Company-Id' => (string) $company->id, 'X-Actor-Name' => 'Sara'];
    }

    protected function asCompany(?string $slug = 'jony-travel'): static
    {
        return $this->withHeaders($this->companyHeaders($slug));
    }
}
