<?php

namespace App\Support;

final class LettrageCode
{
    public static function at(int $index): string
    {
        $code = '';
        $n = $index;

        do {
            $code = chr(65 + ($n % 26)).$code;
            $n = intdiv($n, 26) - 1;
        } while ($n >= 0);

        return $code;
    }

    /** @param iterable<string> $used */
    public static function next(iterable $used): string
    {
        $taken = [];
        foreach ($used as $code) {
            $taken[$code] = true;
        }

        $index = 0;
        while (isset($taken[self::at($index)])) {
            $index++;
        }

        return self::at($index);
    }
}
