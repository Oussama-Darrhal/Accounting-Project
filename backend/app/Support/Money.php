<?php

namespace App\Support;

use InvalidArgumentException;

/** Integer cents so debit/credit comparisons never use binary floats. */
final class Money
{
    public static function toCents(mixed $amount): int
    {
        if ($amount === null || $amount === '') {
            return 0;
        }

        $normalized = str_replace(["\u{00a0}", "\u{202f}", ' '], '', (string) $amount);
        $normalized = str_replace(',', '.', $normalized);

        if (! is_numeric($normalized)) {
            throw new InvalidArgumentException("Invalid money amount [{$amount}].");
        }

        $negative = str_starts_with($normalized, '-');
        $normalized = ltrim($normalized, '+-');
        [$whole, $fraction] = array_pad(explode('.', $normalized, 2), 2, '0');
        $fraction = str_pad(substr($fraction, 0, 2), 2, '0');
        $cents = ((int) $whole) * 100 + (int) $fraction;

        return $negative ? -$cents : $cents;
    }

    public static function fromCents(int $cents): string
    {
        $negative = $cents < 0;
        $absolute = abs($cents);

        return ($negative ? '-' : '').sprintf('%d.%02d', intdiv($absolute, 100), $absolute % 100);
    }
}
