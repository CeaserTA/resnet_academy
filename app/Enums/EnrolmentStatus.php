<?php

declare(strict_types=1);

namespace App\Enums;

enum EnrolmentStatus: string
{
    case Confirmed = 'confirmed';
    case Withdrawn = 'withdrawn';
    case Waitlisted = 'waitlisted';
}
