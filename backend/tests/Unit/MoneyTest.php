<?php

namespace Tests\Unit;

use App\Support\LettrageCode;
use App\Support\Money;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MoneyTest extends TestCase
{
    #[Test]
    public function it_converts_french_and_plain_amounts_to_cents(): void
    {
        $this->assertSame(1250000, Money::toCents('12500.00'));
        $this->assertSame(250050, Money::toCents('2500.50'));
        $this->assertSame(0, Money::toCents(0));
        $this->assertSame('15000.00', Money::fromCents(1500000));
    }

    #[Test]
    public function it_allocates_the_next_lettrage_letter(): void
    {
        $this->assertSame('A', LettrageCode::next([]));
        $this->assertSame('C', LettrageCode::next(['A', 'B']));
        $this->assertSame('AA', LettrageCode::next(range('A', 'Z')));
    }
}
